import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import { cameraStyles } from '@/constants/styles';
import { CameraView, useCameraPermissions } from "expo-camera";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const api_url = process.env.EXPO_PUBLIC_API_URL;

const MODES = ["Auto-detect", "Sign", "Menu", "Form", "Label", "Receipt", "Document",  "Medical", "Instructions", "Article", "Book", "Board"] as const;
type Mode = (typeof MODES)[number];

async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem("access_token");
  return token ?? null;
}

function normalizeBaseUrl(url?: string) {
  if (!url) return "";
  return url.replace(/\/$/, "");
}

async function uploadDocument(params: {
  imageUri: string;
  mode: string;
  sourceAssetId?: string | null;
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

      const pic = await cameraRef.current.takePictureAsync({
        quality: 0.9, skipProcessing: false,
      });
      if (!pic?.uri) throw new Error("Photo path not returned");

      setLastCaptureUri(pic.uri)

      const docId = await uploadDocument({ imageUri: pic.uri, mode, sourceAssetId: null  });

      router.push({
        pathname: "/camera/reader", params: { imageUri: pic.uri, mode, docId },
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Failed to take picture", e?.message ?? "Capture failed");
    } finally {
      setIsCapturing(false);
    }
   };

   const showPermissionUI = permission && !permission.granted;

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
          <View style={cameraStyles.shutterRow}>
            <Pressable style={cameraStyles.thumbBtn} onPress={() => router.push("/(tabs)/documents")}
              disabled={isCapturing}>
              <Image source={ lastCaptureUri ? { uri: lastCaptureUri } : require("../../../assets/images/logo.png")}
                style={cameraStyles.thumbImage} resizeMode={lastCaptureUri ? "cover" : "contain"} />
            </Pressable>

            <Pressable style={cameraStyles.shutterBtn} onPress={handleTakePic} disabled={!permission?.granted || !cameraReady || isCapturing}>
              <View style={[cameraStyles.shutterOuter, isCapturing && { opacity: 0.6 }]}>
                <View style={cameraStyles.shutterInner} />
              </View>
            </Pressable>

            <View style={cameraStyles.smallBtnPlaceholder} />
          </View>
        </View>
      </SafeAreaView>
    );
}