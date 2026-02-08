import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addCapture } from "../../doc-storage";
import { cameraStyles } from '@/constants/styles';

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
      <SafeAreaView style={cameraStyles.safe}>
        <View style={cameraStyles.container}>
          <View style={cameraStyles.header}>
            <Pressable style={cameraStyles.headerIconBtn} onPress={() => {}}>
              <Text style={cameraStyles.headerIcon}>☰</Text>
            </Pressable>

            <Text style={cameraStyles.headerTitle}>SayItSimply</Text>

            <Pressable style={cameraStyles.avatarBtn} onPress={() => {}}>
              <View style={cameraStyles.avatarPlaceholder} />
            </Pressable>
          </View>

          {/* Camera Preview */}
          <View style={[cameraStyles.previewWrap, { height: previewHeight }]}>
            <View style={cameraStyles.preview}>
              {!permission && (
                <View style={cameraStyles.previewOverlay}>
                  <ActivityIndicator />
                  <Text style={cameraStyles.previewHintDark}>Checking permissions</Text>
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
                    <Text style={cameraStyles.previewHintDark}>Activating camera</Text>
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
                  <Text style={[cameraStyles.modeText, selected && cameraStyles.modeTextSelected]}>
                    {m}
                  </Text>
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