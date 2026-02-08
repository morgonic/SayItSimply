import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { styles as dashStyles, documentStyles } from "@/constants/styles";
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
    <Pressable style={documentStyles.row} onPress={() => openDoc(item)}>
      {/* thumbnail */}
      <View style={documentStyles.thumbWrap}>
        <Image source={{ uri: item.uri }} style={documentStyles.thumb} resizeMode="cover" />
      </View>

      {/* text */}
      <View style={documentStyles.textCol}>
        <Text style={documentStyles.title}>{item.mode}</Text>
        <Text style={documentStyles.subtitle}>{formatDate(item.createdAt)}</Text>
      </View>

      <Pressable
        onPress={() => openDoc(item)}
        hitSlop={12}
        style={documentStyles.chevBtn}
        accessibilityRole="button"
        accessibilityLabel="Open document"
      >
        <Text style={documentStyles.chev}>›</Text>
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={dashStyles.dashSafe}>
      <View style={[dashStyles.dashContainer, {
        marginLeft: Dimensions.get('window').width * 0.1, 
        marginRight: Dimensions.get('window').width * 0.1
      }]}>
        {items.length === 0 ? (
          <View style={documentStyles.empty}>
            <Text style={documentStyles.emptyTitle}>No documents yet</Text>
            <Text style={documentStyles.emptyText}>
              Take a picture or upload one from your gallery.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(x) => x.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={documentStyles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
}