import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import { styles as dashStyles, localStyles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, Image, Modal, Pressable, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const api_url = process.env.EXPO_PUBLIC_API_URL;

type DocItem = {
  id: string;
  mode: string;
  timestamp: string;
  thumb_uri: string;
  thumb_b64?: string | null;
  thumb_mime?: string | null;
  page_count?: number;
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

function validateMode(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "Text is required";
  if (v.length > 20) return "Input must be no longer than 20 characters";
  if (!/^[A-Za-z ]+$/.test(v)) return "Input must only contain letters and spaces";
  return null;
}

export default function DocumentsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editDocId, setEditDocId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delDocId, setDelDocId] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);

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

  const openEdit = (item: DocItem) => {
    setEditErr(null);
    setEditDocId(item.id);
    setEditValue(item.mode ?? "");
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editBusy) return;
    setEditOpen(false);
    setEditDocId(null);
    setEditValue("");
    setEditErr(null);
  };

  const saveEdit = async () => {
    try {
      if (!baseUrl || !editDocId) return;

      const err = validateMode(editValue);
      if (err) {
        setEditErr(err);
        return;
      }

      setEditBusy(true);
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`${baseUrl}/documents/${editDocId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mode: editValue.trim() }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Could not update document");
      }

      const updated = (await res.json()) as { id: string; mode: string };

      setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, mode: updated.mode } : x)));
      closeEdit();
    } catch (e: any) {
      setEditErr("Update failed. Try again.");
    } finally {
      setEditBusy(false);
    }
  };

  const openDelete = (item: DocItem) => {
    setDelDocId(item.id);
    setDelOpen(true);
  };

  const closeDelete = () => {
    if (delBusy) return;
    setDelOpen(false);
    setDelDocId(null);
  };

  const confirmDelete = async () => {
    try {
      if (!baseUrl || !delDocId) return;

      setDelBusy(true);
      const token = await getAccessToken();
      if (!token) return;

      const res = await fetch(`${baseUrl}/documents/${delDocId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Could not delete document");
      }

      setItems((prev) => prev.filter((x) => x.id !== delDocId));
      closeDelete();
    } catch (e) {
    } finally {
      setDelBusy(false);
    }
  };


  const renderItem = ({ item }: { item: DocItem }) => {
    const thumbUri = `${baseUrl}${item.thumb_uri}`;
    const thumbSource =
      item.thumb_b64 ? { uri: `data:${item.thumb_mime ?? "image/jpeg"};base64,${item.thumb_b64}` }
      : require("@/assets/images/logo.png");

    return (
      <View style={localStyles.row}>
        <Pressable style={localStyles.mainTap} onPress={() => openDoc(item)}>
          {/* thumbnail */}
          <View style={localStyles.thumbWrap}>
            <Image source={thumbSource}
            style={localStyles.thumb} resizeMode="cover"/>
          </View>
          {/* text */}
          <View style={localStyles.textCol}>
            <AppText style={localStyles.title}>{item.mode}</AppText>
            <AppText style={localStyles.subtitle}>{formatDate(item.timestamp)}
              {item.page_count && item.page_count > 1 ? `- ${item.page_count} pages`: ""}
            </AppText>
          </View>
        </Pressable>

        <View style={localStyles.actions}>
          <Pressable
            onPress={() => openEdit(item)}
            hitSlop={6}
            style={({ pressed }) => [
              localStyles.actionTile,
              localStyles.editTile,
              pressed && localStyles.tilePressed,
            ]}
          >
            <Ionicons name="pencil" size={22} color="#111111"/>
          </Pressable>

          <Pressable
            onPress={() => openDelete(item)}
            hitSlop={6}
            style={({ pressed }) => [
              localStyles.actionTile,
              localStyles.deleteTile,
              pressed && localStyles.tilePressed,
            ]}
          >
            <Ionicons name="trash" size={22} color="#FFFFFF"/>
          </Pressable>

          <Pressable
            onPress={() => openDoc(item)}
            hitSlop={12}
            style={localStyles.chevBtn}
          >
            <AppText style={localStyles.chev}>›</AppText>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={dashStyles.dashSafe}>
      <View style={[dashStyles.dashContainer, {
        marginLeft: Dimensions.get('window').width * 0.1, 
        marginRight: Dimensions.get('window').width * 0.1
      }]}>
        {items.length === 0 ? (
          <View style={localStyles.empty}>
            <AppText style={localStyles.emptyTitle}>{loading ? "Loading..." : "No documents yet"}</AppText>
            <AppText style={localStyles.emptyText}>Capture a picture or upload one from your gallery</AppText>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(x) => x.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={localStyles.listContent}
          />
        )}
      </View>

      {/* Document Edit Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={localStyles.modalBackdrop}>
          <View style={localStyles.modalCard}>
            <AppText style={localStyles.modalTitle}>Edit source type of text</AppText>
            <AppText style={localStyles.modalHint}>Letters and spaces only; 15 characters or less.</AppText>

            <TextInput
              value={editValue}
              onChangeText={(t) => {
                setEditValue(t);
                setEditErr(null);
              }}
              placeholder="e.g. Receipt"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={localStyles.input}
              autoCapitalize="words"
              maxLength={20}
              editable={!editBusy}
            />

            {!!editErr && <AppText style={localStyles.errText}>{editErr}</AppText>}

            <View style={localStyles.modalBtns}>
              <Pressable onPress={closeEdit} disabled={editBusy} style={[localStyles.btn, localStyles.btnGhost]}>
                <AppText style={localStyles.btnText}>Cancel</AppText>
              </Pressable>

              <Pressable onPress={saveEdit} disabled={editBusy} style={[localStyles.btn, localStyles.btnPrimary]}>
                <AppText style={localStyles.btnText}>{editBusy ? "Saving..." : "Save"}</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Document Delete Modal */}
      <Modal visible={delOpen} transparent animationType="fade" onRequestClose={closeDelete}>
        <View style={localStyles.modalBackdrop}>
          <View style={localStyles.modalCard}>
            <AppText style={localStyles.modalTitle}>Are you sure you want to delete this document?</AppText>
            <AppText style={localStyles.modalHint}>This is permanent and cannot be reversed.</AppText>

            <View style={localStyles.modalBtns}>
              <Pressable onPress={closeDelete} disabled={delBusy} style={[localStyles.btn, localStyles.btnGhost]}>
                <AppText style={localStyles.btnText}>No</AppText>
              </Pressable>

              <Pressable onPress={confirmDelete} disabled={delBusy} style={[localStyles.btn, localStyles.btnDanger]}>
                <AppText style={localStyles.btnText}>{delBusy ? "Deleting..." : "Yes"}</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}