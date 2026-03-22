import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import { cameraStyles } from '@/constants/styles';
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const api_url = process.env.EXPO_PUBLIC_API_URL;

const MODES = ["Auto-detect", "Sign", "Menu", "Form", "Label", "Receipt", "Document",  "Medical", "Instructions", "Article", "Book", "Board"] as const;
type Mode = (typeof MODES)[number];

type SaveSettings = {
  scan_doc_save: boolean;
  save_photos: boolean;
};

type ScannedPage = {
  uri: string;
  page_num: number;
  ocr_text?: string | null;
  language?: string | null;
};

function clampToTwoSentences(text: string): string {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

async function ocrImageUri(params: {
  imageUri: string; 
  mode: string;
}): Promise<{ text: string; language: string }> {
  const response = await fetch(params.imageUri);
  if (!response.ok) {
    throw new Error("Unable to read iamge for (OCR)");
  }
  const blob = await response.blob();

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => {
      const result = reader.result as string;
      const encoded = result.split(",")[1] ?? "";
      if (!encoded) reject(new Error("base64 - unable to convert image"));
      else resolve(encoded);
    };
    reader.readAsDataURL(blob);
  });

  const res = await fetch(`${api_url}/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_base64: base64,
      mode: params.mode
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `OCR failed (${res.status})`);
  }

  const json = await res.json();
  return {
    text: (json.text ?? "").trim(),
    language: (json.language ?? "unknown").trim() || "unknown"
  };
}

async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem("access_token");
  return token ?? null;
}

async function getTokenHeaders(): Promise<Record<string, string>> {
  const token = await storage.getItem("access_token");
  const tokenType = (await storage.getItem("token_type")) ?? "bearer";
  return token ? { Authorization: `${tokenType} ${token}` } : {};
}

function normalizeBaseUrl(url?: string) {
  if (!url) return "";
  return url.replace(/\/$/, "");
}

async function fetchSaveSettings(): Promise<SaveSettings> {
  if (!api_url) return { scan_doc_save: true, save_photos: false };

  const headers = await getTokenHeaders();
  const res = await fetch(`${api_url}/users/me/settings`, { headers });
  if (!res.ok) return { scan_doc_save: true, save_photos: false };

  const json = await res.json().catch(() => ({} as any));
  return {
    scan_doc_save: typeof json.scan_doc_save === "boolean" ? json.scan_doc_save : true,
    save_photos: typeof json.save_photos === "boolean" ? json.save_photos : false
  };
}

async function checkDevMediaPerms(): Promise<boolean> {
  const cur = await MediaLibrary.getPermissionsAsync(false, ["photo"]);
  if (cur.granted) return true;

  const req = await MediaLibrary.requestPermissionsAsync(false, ["photo"]);
  return req.granted;
}

async function uploadDocument(params: {
  imageUri: string;
  mode: string;
  sourceAssetId?: string | null;
  pages?: ScannedPage[];
}): Promise<string> {
  const baseUrl = normalizeBaseUrl(api_url);
  if (!baseUrl) throw new Error("EXPO_PUBLIC_API_URL is not set.");

  const token = await getAccessToken();
  if (!token) throw new Error("Not logged in.");

  const thumb = await manipulateAsync(
    params.imageUri,
    [{ resize: { width: 96 } }],
    { compress: 0.6, format: SaveFormat.JPEG }
  );

  const form = new FormData();

  // mode
  form.append("mode", params.mode);

  // full image
  form.append("image", {
    uri: params.imageUri,
    name: "capture.jpg",
    type: "image/jpeg",
  } as any);

  // thumb
  form.append("thumb", {
    uri: thumb.uri,
    name: "thumb.jpg",
    type: "image/jpeg",
  } as any);

  form.append("source_asset_id", params.sourceAssetId ?? "");

  const pages = Array.isArray(params.pages) && params.pages.length
    ? params.pages : [{
        uri: params.imageUri,
        page_num: 1,
        ocr_text: null,
        language: "unknown"
    }];

  const normalizedPages = pages.map((p, index) => ({
    page_num: p.page_num ?? index + 1,
    ocr_text: (p.ocr_text ?? "").trim() || null,
    language: (p.language ?? "").trim() || null
  }));

  const combinedOcrText = normalizedPages.map((p) =>
    (p.ocr_text ?? "").trim())
    .filter(Boolean).join("\n\n").trim();

  const previewText = clampToTwoSentences(combinedOcrText);

  form.append("page_count", String(Math.max(normalizedPages.length, 1)));
  form.append("combined_ocr_text", combinedOcrText);
  form.append("pages_json", JSON.stringify(normalizedPages));
  form.append("preview_text", previewText);

  const res = await fetch(`${baseUrl}/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // DO NOT set Content-Type manually for FormData in RN
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}). ${text}`.trim());
  }
  const data = (await res.json().catch(() => null)) as any;
  const docId = data?.id ? String(data.id) : null;
  if (!docId) throw new Error("Upload succeeded but no document ID returned");
  return docId;
}

export default function CameraScreen() {
  const [mode, setMode] = useState<Mode>("Auto-detect");

  const screen = Dimensions.get("window");
  const previewHeight = useMemo(() => Math.min(screen.height * 0.56, 520), [screen.height]);
  const [lastCaptureUri, setLastCaptureUri] = useState<string | null>(null);

   const router = useRouter();

   const cameraRef = useRef<CameraView>(null);
   const [permission, requestPermission] = useCameraPermissions();
   const [cameraReady, setCameraReady] = useState(false);
   const [isCapturing, setIsCapturing] = useState(false);

   const [capturedPages, setCapturedPages] = useState<ScannedPage[]>([]);
   const [isFinishingDoc, setIsFinishingDoc] = useState(false);

   useEffect(() => {
    (async () => {
      if (!permission) return;
      if (!permission.granted) {
        await requestPermission();
      }
    })();
   }, [permission, requestPermission]);

   const handleTakePic = async () => {
    try {
      if (!permission?.granted) {
        Alert.alert("Camera permission needed", "Allow SayItSimply to access the camera to use this feature.");
        const res = await requestPermission();
        if (!res.granted) return;
      }
      if (!cameraRef.current || !cameraReady || isCapturing) return;

      setIsCapturing(true);

      const saveSettings = await fetchSaveSettings();

      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.9, skipProcessing: false
      });

      if (!pic?.uri) throw new Error("Photo path not returned");

      setLastCaptureUri(pic.uri)

      if (saveSettings.save_photos) {
        const ok = await checkDevMediaPerms();
        if (!ok) {
          Alert.alert(
            "Gallery Permission Required",
            "To save photos to the gallery, enable Photo Library permissions for SayItSimply.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Open Settings", onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          try {
            await MediaLibrary.createAssetAsync(pic.uri);
          } catch (e: any) {
            Alert.alert("Error", e?.message ?? "Could not enable 'Save Photos to Gallery'");
            console.warn("Unable to save photo to device gallery:", e?.message ?? e);
          }
        }
      }

      setCapturedPages((prev) => [
        ...prev,
        {
          uri: pic.uri,
          page_num: prev.length + 1,
          ocr_text: null,
          language: "unknown",
        },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Failed to take picture", e?.message ?? "Capture failed");
    } finally {
      setIsCapturing(false);
    }
   };

   const showPermissionUI = permission && !permission.granted;

   const handleRemoveLastPage = () => {
    if (isCapturing || isFinishingDoc) return;
    setCapturedPages((prev) => prev.slice(0, -1).map((p, index) => ({
      ...p,
      page_num: index + 1
    })));
   }

   const handleFinishDocument = async () => {
    try {
      if (isCapturing || isFinishingDoc) return;
      if (!capturedPages.length) {
        Alert.alert("No pages", "Scan at least 1 page before finishing");
        return;
      }

      setIsFinishingDoc(true);

      const pagesWithOcr: ScannedPage[] = [];
      for (const page of capturedPages) {
        const ocr = await ocrImageUri({
          imageUri: page.uri,
          mode,
        });

        pagesWithOcr.push({
          ...page,
          ocr_text: ocr.text,
          language: ocr.language,
        });
      }

      const saveSettings = await fetchSaveSettings();

      let docId: string | undefined = undefined;
      if (saveSettings.scan_doc_save) {
        docId = await uploadDocument({
          imageUri: pagesWithOcr[0].uri,
          mode,
          sourceAssetId: null,
          pages: pagesWithOcr,
        });
      }

      router.push({
        pathname: "/camera/reader",
        params: {
          mode,
          ...(docId ? { docId } : { imageUri: pagesWithOcr[0].uri }),
        },
      });

      setCapturedPages([]);
    } catch (e: any) {
      console.error(e);
    Alert.alert("Unable to finish document", e?.message ?? "Could not process all pages.");
    } finally {
      setIsFinishingDoc(false);
      setCapturedPages([]);
      setLastCaptureUri(null);
    }
   }

    return (
      <SafeAreaView style={cameraStyles.safe}>
        <View style={cameraStyles.container}>
          <View style={cameraStyles.header}>
            <Pressable style={cameraStyles.headerIconBtn} onPress={() => router.push('/(tabs)/profile/settings')}>
              <AppText style={cameraStyles.headerIcon}>☰</AppText>
            </Pressable>

            <AppText style={cameraStyles.headerTitle}>SayItSimply</AppText>

            <Pressable style={cameraStyles.avatarBtn} onPress={() => router.push('/(tabs)/profile')}>
              <View style={cameraStyles.avatarPlaceholder} />
            </Pressable>
          </View>

          {/* Camera Preview */}
          <View style={[cameraStyles.previewWrap, { height: previewHeight }]}>
            <View style={cameraStyles.preview}>
              {!permission && (
                <View style={cameraStyles.previewOverlay}>
                  <ActivityIndicator />
                  <AppText style={cameraStyles.previewHintDark}>Checking permissions</AppText>
                </View>
              )}
              {showPermissionUI && (
                <View style={cameraStyles.previewOverlay}>
                </View>
              )}
              {permission?.granted && (
                <>
                <CameraView
                  ref={cameraRef}
                  style={cameraStyles.camera}
                  facing="back"
                  onCameraReady={() => setCameraReady(true)}
                />
                {!cameraReady && (
                  <View style={cameraStyles.previewOverlay}>
                    <ActivityIndicator />
                    <AppText style={cameraStyles.previewHintDark}>Activating camera</AppText>
                  </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Mode Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={cameraStyles.modeScrollContent}
          >
            {MODES.map((m) => {
              const selected = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={cameraStyles.modeItem}
                  hitSlop={10}
                  disabled={isCapturing}
                >
                  <AppText style={[cameraStyles.modeText, selected && cameraStyles.modeTextSelected]}>
                    {m}
                  </AppText>
                  <View style={[cameraStyles.modeUnderline, selected && cameraStyles.modeUnderlineSelected]} />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Shutter Row */}
          {capturedPages.length > 0 && (
            <View style={{ alignItems: "center", marginTop: 8 }}>
              <AppText style={{ color: "white", fontWeight: "800" }}>
                {capturedPages.length} page{capturedPages.length === 1 ? "" : "s"} captured
              </AppText>
            </View>
          )}

          <View style={cameraStyles.shutterRow}>
            <Pressable style={cameraStyles.thumbBtn} onPress={() => {
              if (capturedPages.length > 0) {
                handleRemoveLastPage();
              } else {
                router.push("/(tabs)/documents");
              }
            }}
              disabled={isCapturing || isFinishingDoc}>
              <Image source={ lastCaptureUri ? { uri: lastCaptureUri } : require("../../../assets/images/logo.png")}
                style={cameraStyles.thumbImage} resizeMode={lastCaptureUri ? "cover" : "contain"} />
            </Pressable>

            <Pressable style={cameraStyles.shutterBtn} onPress={handleTakePic} disabled={!permission?.granted || !cameraReady || isCapturing}>
              <View style={[cameraStyles.shutterOuter, isCapturing && { opacity: 0.6 }]}>
                <View style={cameraStyles.shutterInner} />
              </View>
            </Pressable>

            <Pressable style={[cameraStyles.smallBtn, { opacity: capturedPages.length ? 1 : 0.5 }]}
              onPress={handleFinishDocument} disabled={!capturedPages.length || isCapturing || isFinishingDoc}
            >
              {isFinishingDoc ? (
                <ActivityIndicator color="white" />
              ) : (
                <AppText style={cameraStyles.smallBtnIcon}>✓</AppText>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
}