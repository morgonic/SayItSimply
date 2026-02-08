import storage from "@/app/storage";
import { styles as dashStyles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
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

function validateMode(raw: string): string | null {
  const v = (raw ?? "").trim();
  if (!v) return "Text is required";
  if (v.length > 15) return "Input must be no longer than 15 characters";
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
      <View style={local.row}>
        <Pressable style={local.mainTap} onPress={() => openDoc(item)}>
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
        </Pressable>

        <View style={local.actions}>
          <Pressable
            onPress={() => openEdit(item)}
            hitSlop={6}
            style={({ pressed }) => [
              local.actionTile,
              local.editTile,
              pressed && local.tilePressed,
            ]}
          >
            <Ionicons name="pencil" size={22} color="#111111"/>
          </Pressable>

          <Pressable
            onPress={() => openDelete(item)}
            hitSlop={6}
            style={({ pressed }) => [
              local.actionTile,
              local.deleteTile,
              pressed && local.tilePressed,
            ]}
          >
            <Ionicons name="trash" size={22} color="#FFFFFF"/>
          </Pressable>

          <Pressable
            onPress={() => openDoc(item)}
            hitSlop={12}
            style={local.chevBtn}
          >
            <Text style={local.chev}>›</Text>
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

      {/* Document Edit Modal */}
      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={closeEdit}>
        <View style={local.modalBackdrop}>
          <View style={local.modalCard}>
            <Text style={local.modalTitle}>Edit source type of text</Text>
            <Text style={local.modalHint}>Letters and spaces only; 15 characters or less.</Text>

            <TextInput
              value={editValue}
              onChangeText={(t) => {
                setEditValue(t);
                setEditErr(null);
              }}
              placeholder="e.g. Receipt"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={local.input}
              autoCapitalize="words"
              maxLength={20}
              editable={!editBusy}
            />

            {!!editErr && <Text style={local.errText}>{editErr}</Text>}

            <View style={local.modalBtns}>
              <Pressable onPress={closeEdit} disabled={editBusy} style={[local.btn, local.btnGhost]}>
                <Text style={local.btnText}>Cancel</Text>
              </Pressable>

              <Pressable onPress={saveEdit} disabled={editBusy} style={[local.btn, local.btnPrimary]}>
                <Text style={local.btnText}>{editBusy ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Document Delete Modal */}
      <Modal visible={delOpen} transparent animationType="fade" onRequestClose={closeDelete}>
        <View style={local.modalBackdrop}>
          <View style={local.modalCard}>
            <Text style={local.modalTitle}>Are you sure you want to delete this document?</Text>
            <Text style={local.modalHint}>This is permanent and cannot be reversed.</Text>

            <View style={local.modalBtns}>
              <Pressable onPress={closeDelete} disabled={delBusy} style={[local.btn, local.btnGhost]}>
                <Text style={local.btnText}>No</Text>
              </Pressable>

              <Pressable onPress={confirmDelete} disabled={delBusy} style={[local.btn, local.btnDanger]}>
                <Text style={local.btnText}>{delBusy ? "Deleting..." : "Yes"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  listContent: {
    paddingVertical: 8
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)"
  },

  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },

  thumbWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  thumb: {
    width: "100%",
    height: "100%"
  },

  textCol: { flex: 1 },
  title: { color: "white", fontSize: 15, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.65)", marginTop: 2 },

  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  actionTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },

  editTile: { backgroundColor: "#A8B98A" },
  deleteTile: { backgroundColor: "#8B3B2E" },
  tilePressed: { opacity: 0.85 },
  iconBtn: { paddingHorizontal: 10, paddingVertical: 8 },

  chevBtn: { paddingLeft: 10, paddingVertical: 6 },
  chev: { color: "rgba(255,255,255,0.75)", fontSize: 28, lineHeight: 28 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: "rgba(255,255,255,0.7)", textAlign: "center" },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(25,25,25,0.95)",
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)"
  },
  modalTitle: { color: "white", fontSize: 16, fontWeight: "900" },
  modalHint: { marginTop: 6, color: "rgba(255,255,255,0.7)" },

  input: {
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
    color: "white"
  },

  errText: { marginTop: 10, color: "#ffb4b4", fontWeight: "700" },

  modalBtns: { flexDirection: "row", gap: 10, marginTop: 16, justifyContent: "flex-end" },
  btn: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth
  },
  btnGhost: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.18)" },
  btnPrimary: { backgroundColor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.22)" },
  btnDanger: { backgroundColor: "rgba(255,0,0,0.18)", borderColor: "rgba(255,0,0,0.35)" },
  btnText: { color: "white", fontWeight: "900" }
});