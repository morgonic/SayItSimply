import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addCapture } from "../../doc-storage";

const MODES = ["Auto-detect", "Sign", "Menu", "Form", "Label", "Receipt", "Document",  "Medical", "Instructions", "Article", "Book", "Board"] as const;
type Mode = (typeof MODES)[number];



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

      const saved = await addCapture({
        tempUri: pic.uri, mode, source: "camera",
      });

      setLastCaptureUri(saved.uri)

      router.push({
        pathname: "/camera/reader", params: { imageUri: saved.uri, mode },
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
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Pressable style={styles.headerIconBtn} onPress={() => {}}>
              <Text style={styles.headerIcon}>☰</Text>
            </Pressable>

            <Text style={styles.headerTitle}>SayItSimply</Text>

            <Pressable style={styles.avatarBtn} onPress={() => {}}>
              <View style={styles.avatarPlaceholder} />
            </Pressable>
          </View>

          {/* Camera Preview */}
          <View style={[styles.previewWrap, { height: previewHeight }]}>
            <View style={styles.preview}>
              {!permission && (
                <View style={styles.previewOverlay}>
                  <ActivityIndicator />
                  <Text style={styles.previewHintDark}>Checking permissions</Text>
                </View>
              )}
              {showPermissionUI && (
                <View style={styles.previewOverlay}>
                </View>
              )}
              {permission?.granted && (
                <>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  onCameraReady={() => setCameraReady(true)}
                />
                {!cameraReady && (
                  <View style={styles.previewOverlay}>
                    <ActivityIndicator />
                    <Text style={styles.previewHintDark}>Activating camera</Text>
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
            contentContainerStyle={styles.modeScrollContent}
          >
            {MODES.map((m) => {
              const selected = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={styles.modeItem}
                  hitSlop={10}
                  disabled={isCapturing}
                >
                  <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                    {m}
                  </Text>
                  <View style={[styles.modeUnderline, selected && styles.modeUnderlineSelected]} />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Shutter Row */}
          <View style={styles.shutterRow}>
            <Pressable style={styles.thumbBtn} onPress={() => router.push("/(tabs)/documents")}
              disabled={isCapturing}>
              <Image source={ lastCaptureUri ? { uri: lastCaptureUri } : require("../../../assets/images/logo.png")}
                style={styles.thumbImage} resizeMode={lastCaptureUri ? "cover" : "contain"} />
            </Pressable>

            <Pressable style={styles.shutterBtn} onPress={handleTakePic} disabled={!permission?.granted || !cameraReady || isCapturing}>
              <View style={[styles.shutterOuter, isCapturing && { opacity: 0.6 }]}>
                <View style={styles.shutterInner} />
              </View>
            </Pressable>

            <View style={styles.smallBtnPlaceholder} />
          </View>
        </View>
      </SafeAreaView>
    );
}

const BG = "#0B1020";
const ACCENT = "#E9C6A6";
const PREVIEW_BG = "#C8D7F0";
const TEXT_MUTED = "rgba(255,255,255,0.65)";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 16 },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerIcon: { color: "white", fontSize: 22 },
  headerTitle: {
    color: ACCENT,
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  avatarBtn: { width: 44, height: 44, alignItems: "flex-end", justifyContent: "center" },
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.35)" },
  avatar: { width: 32, height: 32, borderRadius: 16 },

  thumbBtn: {
  width: 52,
  height: 52,
  borderRadius: 14,
  overflow: "hidden",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.06)",
},
thumbImage: { width: "100%", height: "100%" },

  previewWrap: {
    marginTop: 6,
    borderRadius: 36,
    overflow: "hidden",
  },
  preview: {
    flex: 1,
    backgroundColor: PREVIEW_BG,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  camera: { flex: 1, width: "100%", height: "100%", },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  previewHintDark: { color: "rgba(0,0,0,0.45)", fontWeight: "600" },
  permissionBtn: {
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permissionBtnText: { color: "white", fontWeight: "700" },

  modeScrollContent: {
    paddingHorizontal: 6,
    paddingVertical: 10,
    alignItems: "center",
    gap: 22,
  },
  modeItem: {alignItems: "center", minWidth: 64,},
  modeText: { color: TEXT_MUTED, fontSize: 16, fontWeight: "600" },
  modeTextSelected: { color: "white" },
  modeUnderline: {
    height: 2,
    width: 52,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  modeUnderlineSelected: { backgroundColor: "white" },

  shutterRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  smallBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnIcon: { fontSize: 26, color: "white" },
  smallBtnPlaceholder: { width: 52, height: 52 },

  shutterBtn: { alignItems: "center", justifyContent: "center" },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(255,255,255,0.25)",
  }
});