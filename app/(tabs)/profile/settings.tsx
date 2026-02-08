import storage from '@/app/storage';
import { Ionicons } from '@expo/vector-icons';
import Slider from "@react-native-community/slider";
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { settingsStyles } from '@/constants/styles';

// base api url from .env
const api_url = process.env.EXPO_PUBLIC_API_URL;

type TextSizeValues = "XS" | "S" | "M" | "L" | "XL";
const TEXT_SIZE_VALS: TextSizeValues[] = ["XS", "S", "M", "L", "XL"];

type DeleteHistValues = | { label: string; value: null } | { label: string; value: 30 | 90 | 180 | 365 };
const DELETE_HIST_VALS: DeleteHistValues[] = [
  { label: "Never", value: null },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
  { label: "365 days", value: 365 },
];

type UserSettings = {
  challenge_mode: boolean;
  highlight_difficult_words: boolean;
  dark_mode: boolean;
  text_size: TextSizeValues;
  scan_history_save: boolean;
  scan_history_delete: number | null;
  save_photos: boolean;
  notif: boolean;
  face_id: boolean;
  tts_rate: number;
  tts_pitch: number;
};

const DEFAULTS: UserSettings = {
  challenge_mode: false,
  highlight_difficult_words: true,
  dark_mode: false,
  text_size: "M",
  scan_history_save: true,
  scan_history_delete: 30,
  save_photos: false,
  notif: true,
  face_id: false,
  tts_rate: 1.0,
  tts_pitch: 1.0,
};

// toggle button component for settings
function ToggleButton({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: boolean; 
  onChange: (value: boolean) => void | Promise<void>; 
  disabled: boolean; 
}) {
  return (
    // pressable switch control
    <Pressable
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled }}
      onPress={() => !disabled && onChange(!value)}
      style={[settingsStyles.toggle, value ? {backgroundColor: "#9DB17C"} : {backgroundColor: "#E65F5C"}]}
      hitSlop={8}
    >
      {/* movable knob */}
      <View
        style={[
          settingsStyles.toggleKnob,
          value ? [settingsStyles.toggleKnobOn, {backgroundColor: "#9DB17C"}] 
          : [settingsStyles.toggleKnobOff, {backgroundColor: "#E65F5C"}]
        ]}
      >
        {/* inner colored dot */}
        <View
          style={[
            settingsStyles.toggleDot,
            { backgroundColor: value ? "#9DB17C" : "#E65F5C"}
          ]}
        />
      </View>
    </Pressable>
  );
}

// load access token from storage
async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem("access_token");
  return token ?? null;
}

async function fetchSettings(): Promise<UserSettings> {
  const token = await getAccessToken();
  const res = await fetch(`${api_url}/users/me/settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Settings failed to load.");

  const user = await res.json();
  const merged: UserSettings = {
    ...DEFAULTS,
    ...user,
  };
  return merged;
}

async function patchSettings(patch: Partial<UserSettings>): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${api_url}/users/me/settings`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Could not save changes.");
}

// settings screen
export default function SettingsScreen() {

  // loading state for initial settings
  const [loading, setLoading] = useState(true);
  // backend settings
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  // saving state for updating settings
  const [saving, setSaving] = useState<Partial<Record<keyof UserSettings, boolean>>>({});

  const [scanHistoryDeleteModalVis, setScanHistoryDeleteModalVis] = useState(false);

  const scanHistoryDeleteLabel = useMemo(() => {
    const val = DELETE_HIST_VALS.find((o) => o.value === settings.scan_history_delete);
    return val?.label ?? "30 days";
  }, [settings.scan_history_delete]);
  
  // fetch current user settings
  useEffect(() => {
    (async () => {
      try {
        const setting = await fetchSettings();
        setSettings(setting);

      } catch (e: any) {
        // show error to user
        Alert.alert("Error:", e?.message ?? "Unknown error");
      }
      finally {
        // stop loading
        setLoading(false);
      }
    })();
  }, []); // run once on mount

  const isSaving = (key: keyof UserSettings) => Boolean(saving[key]);

  const updateSetting = async <K extends keyof UserSettings>(key: K, next: UserSettings[K]) => {
    const prev = settings[key];

    setSettings((cur) => ({ ...cur, [key]: next }));
    setSaving((cur) => ({ ...cur, [String(key)]: true }));

    try {
      await patchSettings({ [key]: next } as Partial<UserSettings>);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unknown error");
      setSettings((cur) => ({ ...cur, [key]: prev }));
    } finally {
      setSaving((cur) => ({ ...cur, [String(key)]: false }));
    }
  };

  const updateTextSize = async (direction: -1 | 1) => {
    const idx = TEXT_SIZE_VALS.indexOf(settings.text_size);
    const nIdx = Math.min(TEXT_SIZE_VALS.length - 1, Math.max(0, idx + direction));
    const next = TEXT_SIZE_VALS[nIdx];
    await updateSetting("text_size", next);
  };

  const openPermissions = async () => {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert("Unable to open device settings.")
    }
  };

  return (
    <SafeAreaView style={settingsStyles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerShown: true,
          headerTitleAlign: 'center',
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'generic'
        }}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={settingsStyles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <View style={settingsStyles.list}>
          {/* Challenge Mode */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Challenge Mode</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.challenge_mode}
                onChange={(next) => updateSetting("challenge_mode", next)}
                disabled={isSaving("challenge_mode")}
              />
            )}
          </View>
          <Text style={settingsStyles.hint}>
            When enabled, text will be simplified less than your current simplification level.
          </Text>

          {/* Highlight Difficult Words */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Highlight Difficult Words</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.highlight_difficult_words}
                onChange={(next) => updateSetting("highlight_difficult_words", next)}
                disabled={isSaving("highlight_difficult_words")}
              />
            )}
          </View>

          {/* Dark Mode */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Dark Mode</Text>
            {loading ? (
              <ActivityIndicator/>
            ) : (
              <ToggleButton
                value={settings.dark_mode}
                onChange={(next) => updateSetting("dark_mode", next)}
                disabled={isSaving("dark_mode")}
              />
            )}
          </View>

          {/* Text Size */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Text Size</Text>
            {loading ? (
              <ActivityIndicator/>
            ) : (
              <View style={[settingsStyles.sizePill, isSaving("text_size") ? { opacity: 0.7 } : null]}>
                <Pressable
                  onPress={() => !isSaving("text_size") && updateTextSize(-1)}
                  style={({ pressed }) => [settingsStyles.sizeBtn, pressed ? { opacity: 0.7 } : null]}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-back" size={18} color="#000"/>
                </Pressable>

                <Text style={settingsStyles.sizeVal}>{settings.text_size}</Text>

                <Pressable
                  onPress={() => !isSaving("text_size") && updateTextSize(1)}
                  style={({ pressed }) => [settingsStyles.sizeBtn, pressed ? { opacity: 0.7 } : null]}
                  hitSlop={10}
                >
                  <Ionicons name="chevron-forward" size={18} color="#000"/>
                </Pressable>
              </View>
            )}
          </View>

          {/* Scan History (Save) */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Save Scans to History</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.scan_history_save}
                onChange={(next) => updateSetting("scan_history_save", next)}
                disabled={isSaving("scan_history_save")}
              />
            )}
          </View>

          {/* Scan History (Delete) */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Auto-Delete History</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Pressable
                onPress={() => !isSaving("scan_history_delete") && setScanHistoryDeleteModalVis(true)}
                style={({ pressed }) => [
                  settingsStyles.dropdownPill,
                  isSaving("scan_history_delete") ? { opacity: 0.7 } : null,
                  pressed ? { opacity: 0.85 } : null,
                ]}
                hitSlop={8}
              >
                <Text style={settingsStyles.dropdownText}>{scanHistoryDeleteLabel}</Text>
                <Ionicons name="chevron-down" size={16} color="#000" />
              </Pressable>
            )}
          </View>

          {/* Save Photos */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Auto-Delete History</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.save_photos}
                onChange={(next) => updateSetting("save_photos", next)}
                disabled={isSaving("save_photos")}
              />
            )}
          </View>

          {/* Notifications */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Notifications</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.notif}
                onChange={(next) => updateSetting("notif", next)}
                disabled={isSaving("notif")}
              />
            )}
          </View>

          {/* Face ID */}
          <View style={settingsStyles.row}>
            <Text style={settingsStyles.rowLabel}>Sign in with Face ID</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.face_id}
                onChange={(next) => updateSetting("face_id", next)}
                disabled={isSaving("face_id")}
              />
            )}
          </View>

          {/* Permissions */}
          <Pressable onPress={openPermissions} style={({ pressed }) => [settingsStyles.row, pressed ? { opacity: 0.85 } : null]}>
            <Text style={settingsStyles.rowLabel}>Permissions</Text>
            <Ionicons name="chevron-forward" size={20} color="#000" />
          </Pressable>

          {/* TTS Card */}
          <View style={settingsStyles.ttsCard}>
            <Text style={settingsStyles.ttsTitle}>Text-to-Speech Output Settings</Text>

            <View style={settingsStyles.ttsRow}>
              <Text style={settingsStyles.ttsLabel}>Speech Rate</Text>

              {loading ? (
                <ActivityIndicator />
              ) : (
                <Slider
                  style={settingsStyles.slider}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  value={settings.tts_rate}
                  onValueChange={(v) => {
                    // snaps to value
                    setSettings((cur) => ({ ...cur, tts_rate: v }));
                  }}
                  onSlidingComplete={(v) => updateSetting("tts_rate", v)}
                  minimumTrackTintColor="#6B7280"
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor="#111827"
                  disabled={isSaving("tts_rate")}
                />
              )}
            </View>

            <View style={settingsStyles.ttsRow}>
              <Text style={settingsStyles.ttsLabel}>Pitch</Text>

              {loading ? (
                <ActivityIndicator />
              ) : (
                <Slider
                  style={settingsStyles.slider}
                  minimumValue={0.5}
                  maximumValue={2.0}
                  value={settings.tts_pitch}
                  onValueChange={(v) => {
                    setSettings((cur) => ({ ...cur, tts_pitch: v }));
                  }}
                  onSlidingComplete={(v) => updateSetting("tts_pitch", v)}
                  minimumTrackTintColor="#6B7280"
                  maximumTrackTintColor="#D1D5DB"
                  thumbTintColor="#111827"
                  disabled={isSaving("tts_pitch")}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Scan History Delete Modal */}
      <Modal
        transparent
        visible={scanHistoryDeleteModalVis}
        animationType='fade'
        onRequestClose={() => setScanHistoryDeleteModalVis(false)}
      >
        <Pressable style={settingsStyles.modOverlay} onPress={() => setScanHistoryDeleteModalVis(false)}>
          <Pressable style={settingsStyles.modCard} onPress={() => {}}>
            <Text style={settingsStyles.modTitle}>Auto-Delete History</Text>

            {DELETE_HIST_VALS.map((opt) => {
              const selected = opt.value === settings.scan_history_delete;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={async () => {
                    setScanHistoryDeleteModalVis(false);
                    await updateSetting("scan_history_delete", opt.value);
                  }}
                  style={({ pressed }) => [
                    settingsStyles.modOpt,
                    selected ? settingsStyles.modOptSelected : null,
                    pressed ? { opacity: 0.85 } : null,
                  ]}
                >
                  <Text style={[settingsStyles.modOptText, selected ? { fontWeight: "800" } : null]}>{opt.label}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color="#000"/> : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setScanHistoryDeleteModalVis(false)}
              style={({ pressed }) => [settingsStyles.modClose, pressed ? { opacity: 0.85 } : null]}
            >
              <Text style={settingsStyles.modCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}