import { useTheme } from "@/app/context/ThemeContext";
import storage from '@/app/storage';
import AppText from "@/components/TextSize";
import { styles } from "@/constants/styles";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const api_url = process.env.EXPO_PUBLIC_API_URL;

async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem("access_token");
  return token ?? null;
}

function normalizeBaseUrl(url?: string) {
  if (!url) return "";
  return url.replace(/\/$/, "");
}

type DocumentListItem = {
  id: string;
  mode?: string | null;
  created_at?: string | null;
  thumb_url?: string | null;
  preview_text?: string | null;
};

type TodoItem = {
  id?: string;
  action_item: string;
  deadline?: string | null;
  completed?: boolean;
};

function safeTimeline(raw?: string | null): number | null {
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? null : t;
}

function timelineFormat(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return "";

  const now = Date.now();
  const diffMs = Math.max(0, now - t);
  const mins = Math.floor(diffMs / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) {
    return "Yesterday";
  } else if (days > 1 && days < 30) {
    return `${days} days ago`;
  } else {
    return "A month or more ago";
  }
}

function fallbackTimelineFormat(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function clampToTwoSentences(text: string): string {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

async function uploadDocument(params: {
  imageUri: string;
  mode: string;
  sourceAssetId?: string | null
}): Promise<string> {
  const baseUrl = normalizeBaseUrl(api_url);
  const token = await getAccessToken();
  const thumb = await manipulateAsync(
    params.imageUri,
    [{ resize: { width: 96 } }],
    { compress: 0.6, format: SaveFormat.JPEG }
  );

  const form = new FormData();
  form.append("mode", params.mode);

  form.append("image", {
    uri: params.imageUri,
    name: "upload.jpg",
    type: "image/jpeg",
  } as any);

  form.append("thumb", {
    uri: thumb.uri,
    name: "thumb.jpg",
    type: "image/jpeg",
  } as any);

  form.append("source_asset_id", params.sourceAssetId ?? "");

  const res = await fetch(`${baseUrl}/documents`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed (${res.status}). ${text}`.trim());
  }
  const data = (await res.json().catch(() => null)) as any;
  const docId = data?.id ? String(data.id) : null;
  if (!docId) {
    throw new Error("Upload succeeded but no document ID returned");
  }
  return docId;
}

async function fetchRecentDocs(limit = 5): Promise<DocumentListItem[]> {
  const baseUrl = normalizeBaseUrl(api_url);
  const token = await getAccessToken();
  if (!baseUrl || !token) return [];

  const res = await fetch(`${baseUrl}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const data = (await res.json().catch(() => null)) as any;
  const items: any[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];

  const normalized = items
    .map((x) => ({
      id: String(x.id),
      mode: x.mode ?? null,
      created_at: x.created_at ?? x.createdAt ?? x.timestamp ?? null,
      thumb_url: x.thumb_url ?? x.thumbUrl ?? null,
      preview_text: x.preview_text ?? x.previewText ?? null
    }))
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

  return normalized.slice(0, limit);
}

async function fetchTodoItems(limit = 2): Promise<TodoItem[]> {
  if (!api_url) return [];
  const token = await storage.getItem("access_token");
  const tokenType = (await storage.getItem("token_type")) ?? "bearer";
  if (!token) return [];

  const res = await fetch(`${api_url}/users/me/todo`, {
    headers: { Authorization: `${tokenType} ${token}` },
  });

  if (!res.ok) return [];

  const todoItems: TodoItem[] = await res.json();

  const sorted = [...todoItems]
    .filter((t) => !t.completed)
    .sort((a, b) => {
      const ad = safeTimeline(a.deadline);
      const bd = safeTimeline(b.deadline);

      if (ad === null && bd === null) return 0;
      if (ad === null) return 1;
      if (bd === null) return -1;
      return ad - bd;
    });

  return sorted.slice(0, limit);
}

function docLabel(doc: DocumentListItem | null): string {
  if (!doc) return "";
  const mode = (doc.mode || "Scan").toString().trim() || "Scan";
  const rel = timelineFormat(doc.created_at);
  const fallback = fallbackTimelineFormat(doc.created_at);
  const when = rel || fallback;
  return when ? `${mode} (${when})` : mode;
}



export default function DashboardScreen() {
  const router = useRouter();

  const { darkMode } = useTheme();
  const C = useMemo(() => {
    const isDark = !!darkMode;

    const DM_BG = "#0B1220";
    const DM_CARD = "#2B2B2B";
    const DM_TEXT = "#E5E7EB";

    return {
      isDark,

      // background and text
      bg: isDark ? DM_BG : "#0D1321",
      text: isDark ? DM_TEXT : "#000000",

      // buttons and icons for scan/upload
      scanBtnBg: isDark ? "#809BCE" : "#2E8B9C",
      scanIcon: isDark ? DM_CARD : "#000000",

      // cards around text sections
      continueBg: isDark ? DM_CARD : "#fffffff2",
      continueText: isDark ? DM_TEXT : "#1B1B1B",

      // bookmark
      notchColor: isDark ? DM_CARD: "#fffffff2",

      //Shortcut
      shortcutOuterBg: isDark ? "rgba(128,155,206,0.18)" : "rgba(233,198,166,0.9)",
      shortcutInnerOuterBg: isDark ? "rgba(11,18,32,0.85)" : "#277A8C",
      shortcutCardBg: isDark ? DM_CARD : "#fffffff2",

      // buttons for "View All" and "Continue Reading"
      btnBg: isDark ? "#000000" : "rgba(255,255,255,0.96)",
      btnText: isDark ? DM_TEXT : "#222",

      // checkbox in tasks list
      taskIcon: isDark ? DM_TEXT : "#FFFFFF",

      // loading indicator and scrollbar
      indicator: isDark ? DM_TEXT : "#000000",
      scrollIndicatorStyle: isDark ? "white" : "black",
    };
  }, [darkMode]);

  const [isUploading, setIsUploading] = useState(false);

  const [loadingDash, setLoadingDash] = useState(true);
  const [recentDocs, setRecentDocs] = useState<DocumentListItem[]>([]);
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [lastScanSummary, setLastScanSummary] = useState<string>("");

  const continueReadingDoc = useMemo(() => recentDocs?.[0] ?? null, [recentDocs]);

  const loadDash = useCallback(async () => {
    setLoadingDash(true);
    try {
      const [docs, tasks] = await Promise.all([
        fetchRecentDocs(5),
        fetchTodoItems(5),
      ]);
      setRecentDocs(docs);
      setTasks(tasks);

      const preview = docs?.[0]?.preview_text ?? "";
      setLastScanSummary(clampToTwoSentences(preview));
    } finally {
      setLoadingDash(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDash();
    }, [loadDash])
  );

  async function handleLogout() {
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) ?? "bearer";

    if (token && api_url) {
      try {
        await fetch(`${api_url}/auth/jwt/logout`, {
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

      const asset = result.assets?.[0];
      const uri = asset?.uri;
      if (!uri) throw new Error("No image selected");
      const sourceAssetId: string | null = (asset as any)?.assetId ?? null;

      const mode = "Auto-detect";

      const docId = await uploadDocument({ imageUri: uri, mode, sourceAssetId });

      router.push({
        pathname: "/camera/reader",
        params: { imageUri: uri, mode: mode, docId }
      });
    } catch (e: any) {
      console.error(e);
      Alert.alert("Upload failed", e?.message ?? "Could not upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const continueReadingLabel = useMemo(() => {
    if (!continueReadingDoc) return "No documents yet";
    return docLabel(continueReadingDoc);
  }, [continueReadingDoc]);

  return (
    <SafeAreaView style={[styles.dashSafe, { backgroundColor: C.bg }]}>
      <View style={[styles.dashContainer, { backgroundColor: C.bg }]}>
        {/* Header */}
        <View style={styles.dashHeader}>
          <Pressable style={styles.dashHeaderIconBtn} onPress={() => { }}>
            <AppText style={styles.dashHeaderIcon}>☰</AppText>
          </Pressable>

          <AppText style={styles.dashHeaderTitle}>SayItSimply</AppText>

          <Pressable style={styles.dashAvatarBtn} onPress={() => { }}>
            <View style={styles.dashAvatarPlaceholder} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 20}}
          showsVerticalScrollIndicator
          indicatorStyle={C.scrollIndicatorStyle as any}
        >
          {/* Scan New Text */}
          <View style={[styles.dashContent, { paddingTop: 6 }]}>
            <AppText style={styles.dashSectionTitle}>Scan New Text</AppText>

            <View style={[styles.dashScanRow, { marginTop: 12 }]}>
              <Pressable style={[styles.dashScanBtn, { backgroundColor: C.scanBtnBg }]} onPress={() => router.replace("/camera")}>
                <FontAwesome name="camera" size={24} color={C.scanIcon} />
              </Pressable>

              <Pressable style={[styles.dashScanBtn, { backgroundColor: C.scanBtnBg }, isUploading && { opacity: 0.6 }]} 
                onPress={handleUploadPress} disabled={isUploading}
              >
                <FontAwesome name="upload" size={24} color={C.scanIcon}/>
              </Pressable>
            </View>

            {/* Continue Reading */}
            <View style={[styles.dashContinueCardWrap, { paddingHorizontal: 16 }]}>
              <View style={styles.dashBookmark}>
                <View style={[styles.dashBookmarkNotch, { borderBottomColor: C.notchColor}]}/>
              </View>
              <View style={[styles.dashContinueCard, { backgroundColor: C.continueBg, borderWidth: C.isDark ? 2 : 1.5 }]}>
                <AppText style={[styles.dashContinueTitle, { color: C.continueText }]}>{continueReadingLabel}</AppText>

                {loadingDash ? (
                  <View style={{ paddingTop: 10, paddingBottom: 2 }}>
                    <ActivityIndicator color={C.indicator}/>
                  </View>
                ) : (
                  <AppText style={[styles.dashBullet, { color: C.continueText }]}>
                    {lastScanSummary
                      ? lastScanSummary
                      : "Capture or upload a picture and we will show a quick preview here!"}
                  </AppText>
                )}
                <Pressable style={[styles.dashContinueBtn, { backgroundColor: C.btnBg }]}
                  onPress={() => router.replace("/(tabs)/camera/reader")}
                >
                  <AppText style={[styles.dashContinueBtnText, { color: C.btnText }]}>Continue Reading</AppText>
                  <AppText style={[styles.dashContinueBtnArrow, { color: C.btnText }]}>›</AppText>
                </Pressable>
              </View>
            </View>

            {/* Shortcuts */}
            <AppText style={[styles.dashSectionTitle, styles.dashShortcutsTitleSpacing]}>
              Shortcuts
            </AppText>

            {/* Urgent Tasks */}
            <View style={styles.dashShortcutRow}>
              <View style={[styles.dashShortcutCardOuter,
                C.isDark && { backgroundColor: C.shortcutCardBg }]}
              >
                <View style={[styles.dashShortcutCardInnerOuter, 
                  C.isDark && { backgroundColor: C.scanBtnBg }]}
                >
                  <View style={[styles.dashShortcutCard, { backgroundColor: C.shortcutCardBg }]}>
                    <AppText style={[styles.dashShortcutTitle, { color: C.text }]}>Urgent Tasks</AppText>

                    <View style={styles.dashBulletGroup}>
                      {loadingDash ? (
                        <ActivityIndicator color={C.indicator}/>
                      ) : tasks.length ? (
                        tasks.slice(0, 2).map((t) => {
                          const checked = t.completed === true;
                          return (
                            <View
                              key={t.id}
                              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                            >
                              <Ionicons
                                name={checked ? "checkbox-outline" : "square-outline"}
                                size={18}
                                color={C.taskIcon}
                              />
                              <AppText style={[styles.dashBullet, { color: C.text }]}>
                                {t.action_item}
                              </AppText>
                            </View>
                          );
                        })
                      ) : (
                        <AppText style={[styles.dashBullet, { color: C.text }]}>
                          No urgent tasks yet. Add tasks in your to-do list and we will show the top ones here.
                        </AppText>
                      )}
                    </View>

                    <Pressable style={[styles.dashViewAllBtn, { backgroundColor: C.btnBg }]} 
                      onPress={() => router.replace("/(tabs)/todo-list")}
                    >
                      <AppText style={[styles.dashViewAllText, { color: C.btnText }]}>View All</AppText>
                      <AppText style={[styles.dashViewAllArrow, { color: C.btnText }]}>›</AppText>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Recent Scans */}
              <View style={[styles.dashShortcutCardOuter, 
                C.isDark && { backgroundColor: C.shortcutCardBg }]}
              >
                <View style={[styles.dashShortcutCardInnerOuter, 
                  C.isDark && { backgroundColor: C.scanBtnBg }]}
                >
                  <View style={[styles.dashShortcutCard, { backgroundColor: C.shortcutCardBg }]}>
                    <AppText style={[styles.dashShortcutTitle, { color: C.text }]}>Recent Scans</AppText>

                    <View style={styles.dashBulletGroup}>
                      {loadingDash ? (
                        <ActivityIndicator color={C.indicator}/>
                      ) : recentDocs.length ? (
                        recentDocs.slice(0, 5).map((d) => (
                          <AppText key={d.id} style={[styles.dashBullet, { color: C.text }]}>
                            • {docLabel(d)}
                          </AppText>
                        ))
                      ) : (
                        <AppText style={[styles.dashBullet, { color: C.text }]}>
                          Capture or upload an image and it will show up here!
                        </AppText>
                      )}
                    </View>

                    <Pressable style={[styles.dashViewAllBtn, { backgroundColor: C.btnBg }]} 
                      onPress={() => router.push("/(tabs)/documents")}
                    >
                      <AppText style={[styles.dashViewAllText, { color: C.btnText }]}>View All</AppText>
                      <AppText style={[styles.dashViewAllArrow, { color: C.btnText }]}>›</AppText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={{ height: 36 }} />

          {/* logout button */}
          <View style={styles.dashLoginWrap}>
            <Pressable
              onPress={handleLogout}
              style={[styles.dashLoginBtn, { backgroundColor: C.scanBtnBg }]}
            >
              <AppText style={[styles.dashLoginText, { color: C.scanIcon }]}>Log Out</AppText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}