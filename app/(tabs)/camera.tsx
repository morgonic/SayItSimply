import React, { useMemo, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MODES = ["Sign", "Document", "Book", "Board"] as const;
type Mode = (typeof MODES)[number];

export default function CameraScreen() {
  const [mode, setMode] = useState<Mode>("Document");

  const screen = Dimensions.get("window");
  const previewHeight = useMemo(() => Math.min(screen.height * 0.56, 520), [screen.height]);
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.headerIconBtn} onPress={() => {}}>
              <Text style={styles.headerIcon}>☰</Text>
            </Pressable>

            <Text style={styles.headerTitle}>SayItSimply</Text>

            <Pressable style={styles.avatarBtn} onPress={() => {}}>
              <View style={styles.avatarPlaceholder} />
            </Pressable>
          </View>

          {/* Camera Preview Placeholder */}
          <View style={[styles.previewWrap, { height: previewHeight }]}>
            <View style={styles.preview}>
              {/* This is where expo-camera preview will go later */}
              <Text style={styles.previewHint}>Camera Preview</Text>
            </View>
          </View>

          {/* Mode Selector */}
          <View style={styles.modeRow}>
            {MODES.map((m) => {
              const selected = m === mode;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={styles.modeItem}
                  hitSlop={8}
                >
                  <Text style={[styles.modeText, selected && styles.modeTextSelected]}>
                    {m}
                  </Text>
                  <View style={[styles.modeUnderline, selected && styles.modeUnderlineSelected]} />
                </Pressable>
              );
            })}
          </View>

          {/* Shutter Row */}
          <View style={styles.shutterRow}>
            <Pressable style={styles.smallBtn} onPress={() => {}}>
              <Text style={styles.smallBtnIcon}>🖼️</Text>
            </Pressable>

            <Pressable style={styles.shutterBtn} onPress={() => {}}>
              <View style={styles.shutterOuter}>
                <View style={styles.shutterInner} />
              </View>
            </Pressable>

            {/* Spacer to balance layout */}
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
  previewHint: { color: "rgba(0,0,0,0.45)", fontWeight: "600" },

  modeRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  modeItem: { alignItems: "center", gap: 6 },
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