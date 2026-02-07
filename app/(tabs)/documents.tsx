import storage from "@/app/storage";
import { styles as dashStyles } from "@/constants/styles";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const api_url = process.env.EXPO_PUBLIC_API_URL;

type DocItem = {
  id: string;
  mode: string;
  timestamp: string;
  thumb_uri: string;
  thumb_b64?: string | null;
  thumb_mime?: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem("access_token");
  return token ?? null;
}

export default function DocumentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const baseUrl = useMemo(() => {
    if (!api_url) return "";
    return api_url.replace(/\/$/, "");
  }, []);

  const load = useCallback(async () => {
    try {
      if (!baseUrl) return;

      setLoading(true);
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`${baseUrl}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Could not load documents");

      const data = (await res.json()) as DocItem[];
      setItems(data);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDoc = (item: DocItem) => {
    const fileUri = `${baseUrl}/documents/${item.id}/file`;

    router.push({
      pathname: "/camera/reader",
      params: { imageUri: fileUri, mode: item.mode },
    });
  };

  const renderItem = ({ item }: { item: DocItem }) => {
    const thumbUri = `${baseUrl}${item.thumb_uri}`;

    const thumbSource =
      item.thumb_b64 ? { uri: `data:${item.thumb_mime ?? "image/jpeg"};base64,${item.thumb_b64}` }
      : require("@/assets/images/logo.png");

    return (
      <Pressable style={local.row} onPress={() => openDoc(item)}>
        {/* thumbnail */}
        <View style={local.thumbWrap}>
          <Image source={thumbSource}
          style={local.thumb} resizeMode="cover"/>
        </View>

        {/* text */}
        <View style={local.textCol}>
          <Text style={local.title}>{item.mode}</Text>
          <Text style={local.subtitle}>{formatDate(item.timestamp)}</Text>
        </View>

        <Pressable
          onPress={() => openDoc(item)}
          hitSlop={12}
          style={local.chevBtn}
          accessibilityRole="button"
          accessibilityLabel="Open document"
        >
          <Text style={local.chev}>›</Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={dashStyles.dashSafe}>
      <View style={[dashStyles.dashContainer, {
        marginLeft: Dimensions.get('window').width * 0.1, 
        marginRight: Dimensions.get('window').width * 0.1
      }]}>
        {items.length === 0 ? (
          <View style={local.empty}>
            <Text style={local.emptyTitle}>{loading ? "Loading..." : "No documents yet"}</Text>
            <Text style={local.emptyText}>Capture a picture or upload one from your gallery</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(x) => x.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={local.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  listContent: {
    paddingVertical: 8,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },

  thumbWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },

  textCol: { flex: 1 },
  title: { color: "white", fontSize: 15, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.65)", marginTop: 2 },

  chevBtn: { paddingLeft: 10, paddingVertical: 6 },
  chev: { color: "rgba(255,255,255,0.75)", fontSize: 28, lineHeight: 28 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: "rgba(255,255,255,0.7)", textAlign: "center" },
});