import { styles } from "@/constants/styles";
import { FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addCapture, CaptureItem, getCaptures } from "../doc-storage";
import storage from '../storage';

const api_url = process.env.EXPO_PUBLIC_API_URL;

export default function DashboardScreen() {

  const router = useRouter();
  const [latest, setLatest] = useState<CaptureItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadLatest = useCallback(async () => {
    const list = await getCaptures();
    setLatest(list[0] ?? null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLatest();
    }, [loadLatest])
  );

  function formatDate(iso: string) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown date";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  async function handleLogout() {
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) ?? "bearer";

    if (token && api_url) {
      try {
        const response = await fetch(`${api_url}/auth/jwt/logout`, {
          method: 'POST',
          headers: { Authorization: `${tokenType} ${token}` }
        });
      }
      catch (e) {
        console.warn("Logout request failed:", e);
      }
    }

    await storage.deleteItem("access_token");
    await storage.deleteItem("token_type");

    await storage.deleteItem("onboarding");

    router.replace('/log-in');

  }

  const handleUploadPress = async () => {
    try {
      if (isUploading) return;
      setIsUploading(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Allow access to upload images");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        selectionLimit: 1,
      });
      if (result.canceled) return;

      const uri = result.assets?.[0]?.uri;
      if (!uri) throw new Error("No image selected");

      const saved = await addCapture({
        tempUri: uri,
        mode: "Document",
        source: "gallery",
      });

      await loadLatest();

      router.push({
        pathname: "/camera/reader",
        params: { imageUri: saved.uri, mode: saved.mode },
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Upload failed", e?.message ?? "Could not upload image");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.dashSafe}>
      <View style={styles.dashContainer}>
        {/* Header */}
        <View style={styles.dashHeader}>
          <Pressable style={styles.dashHeaderIconBtn} onPress={() => { }}>
            <Text style={styles.dashHeaderIcon}>☰</Text>
          </Pressable>

          <Text style={styles.dashHeaderTitle}>SayItSimply</Text>

          <Pressable style={styles.dashAvatarBtn} onPress={() => { }}>
            <View style={styles.dashAvatarPlaceholder} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{

          }}
          showsVerticalScrollIndicator
          indicatorStyle='white'
        >
          <View style={styles.dashContent}>
            {/* Scan New Text */}
            <Text style={styles.dashSectionTitle}>Scan New Text</Text>

            <View style={styles.dashScanRow}>
              <Pressable style={styles.dashScanBtn} onPress={() => router.replace("/camera")}>
                <FontAwesome name="camera" size={36} color="#000000" />
              </Pressable>

              <Pressable style={[styles.dashScanBtn, isUploading && { opacity: 0.6 }]} onPress={handleUploadPress} disabled={isUploading}>
                <FontAwesome name="upload" size={36} color="#000000" />
              </Pressable>
            </View>

            {/* Continue Reading */}
            <View style={styles.dashContinueCardWrap}>
              <View style={styles.dashBookmark}>
                <View style={styles.dashBookmarkNotch} />
              </View>
              <View style={styles.dashContinueCard}>
                <Text style={styles.dashContinueTitle}>Phone Bill - Dec 2025</Text>

                <Pressable style={styles.dashContinueBtn} onPress={() => router.replace("/(tabs)/camera/reader")}>
                  <Text style={styles.dashContinueBtnText}>Continue Reading</Text>
                  <Text style={styles.dashContinueBtnArrow}>›</Text>
                </Pressable>
              </View>
            </View>

            {/* Shortcuts */}
            <Text style={[styles.dashSectionTitle, styles.dashShortcutsTitleSpacing]}>
              Shortcuts
            </Text>

            <View style={styles.dashShortcutRow}>
              {/* Urgent Tasks */}
              <View style={styles.dashShortcutCardOuter}>
                <View style={styles.dashShortcutCardInnerOuter}>
                  <View style={styles.dashShortcutCard}>
                    <Text style={styles.dashShortcutTitle}>Urgent Tasks</Text>

                    <View style={styles.dashBulletGroup}>
                      <Text style={styles.dashBullet}>• Pay $52.50 to AT&amp;T</Text>
                      <Text style={styles.dashBullet}>• Call Dr. Smith</Text>
                    </View>

                    <Pressable style={styles.dashViewAllBtn} onPress={() => router.replace("/(tabs)/todo-list")}>
                      <Text style={styles.dashViewAllText}>View All</Text>
                      <Text style={styles.dashViewAllArrow}>›</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Recent Scans */}
              <View style={styles.dashShortcutCardOuter}>
                <View style={styles.dashShortcutCardInnerOuter}>
                  <View style={styles.dashShortcutCard}>
                    <Text style={styles.dashShortcutTitle}>Recent Scans</Text>

                    <View style={styles.dashBulletGroup}>
                      <Text style={styles.dashBullet}>• Medical Bill - Yesterday</Text>
                      <Text style={styles.dashBullet}>
                        • Financial Aid Letter - 3 days ago
                      </Text>
                    </View>

                    <Pressable style={styles.dashViewAllBtn} onPress={() => router.push("/(tabs)/documents")}>
                      <Text style={styles.dashViewAllText}>View All</Text>
                      <Text style={styles.dashViewAllArrow}>›</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 36 }} />

          {/* login button (maybe temporary?) */}
          <View style={styles.dashLoginWrap}>
            <Pressable
              onPress={handleLogout}
              style={styles.dashLoginBtn}
            >
              <Text style={styles.dashLoginText}>Log Out</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}