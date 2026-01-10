import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles as dashStyles } from "@/constants/styles";
import { CaptureItem, getCaptures } from "../doc-storage";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function DocumentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<CaptureItem[]>([]);

  const load = useCallback(async () => {
    const list = await getCaptures();
    setItems(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openDoc = (item: CaptureItem) => {
    router.push({
      pathname: "/camera/reader",
      params: { imageUri: item.uri, mode: item.mode },
    });
  };

  const renderItem = ({ item }: { item: CaptureItem }) => (
    <Pressable style={local.row} onPress={() => openDoc(item)}>
      {/* thumbnail */}
      <View style={local.thumbWrap}>
        <Image source={{ uri: item.uri }} style={local.thumb} resizeMode="cover" />
      </View>

      {/* text */}
      <View style={local.textCol}>
        <Text style={local.title}>{item.mode}</Text>
        <Text style={local.subtitle}>{formatDate(item.createdAt)}</Text>
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

  return (
    <SafeAreaView style={dashStyles.dashSafe}>
      <View style={dashStyles.dashContainer}>
        {items.length === 0 ? (
          <View style={local.empty}>
            <Text style={local.emptyTitle}>No documents yet</Text>
            <Text style={local.emptyText}>
              Take a picture or upload one from your gallery.
            </Text>
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
    width: 46,
    height: 46,
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