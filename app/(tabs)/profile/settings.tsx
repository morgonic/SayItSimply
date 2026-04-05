import { TextSizeValues, useTextSize } from "@/app/context/TextSizeContext";
import { useTheme } from "@/app/context/ThemeContext";
import { clearFaceIdCredentials, getDeviceId, getFaceIdCapability, promptFaceIdAuth, saveFaceIdCredentials } from "@/app/face_id";
import storage from '@/app/storage';
import AppText from '@/components/TextSize';
import { settingsStyles } from '@/constants/styles';
import { Ionicons } from '@expo/vector-icons';
import Slider from "@react-native-community/slider";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
import * as MediaLibrary from "expo-media-library";
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// base api url from .env
const api_url = process.env.EXPO_PUBLIC_API_URL;

const TEXT_SIZE_VALS: TextSizeValues[] = ["XS", "S", "M", "L", "XL"];

type DeleteDocValues = | { label: string; value: null } | { label: string; value: 30 | 90 | 180 | 365 };
const DELETE_DOC_VALS: DeleteDocValues[] = [
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
  scan_doc_save: boolean;
  scan_doc_delete: number | null;
  save_photos: boolean;
  notif: boolean;
  face_id_supported: boolean;
  face_id: boolean;
  tts_rate: number;
  tts_pitch: number;
};

const DEFAULTS: UserSettings = {
  challenge_mode: false,
  highlight_difficult_words: true,
  dark_mode: false,
  text_size: "M",
  scan_doc_save: true,
  scan_doc_delete: 30,
  save_photos: false,
  notif: true,
  face_id_supported: true,
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

async function deleteAllDocScans(): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${api_url}/documents`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Could not delete document scans.");
}

//face id
async function registerFaceIdLogin(deviceId: string): Promise<{ face_id_token: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${api_url}/users/me/faceid/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      device_id: deviceId,
      platform: Platform.OS,
      label: Platform.OS === "ios" ? "iPhone" : "Android"
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Could not enable Face ID sign in.");
  }

  return res.json();
}

async function disableFaceIdLogin(deviceId: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${api_url}/users/me/faceid`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ device_id: deviceId }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Could not disable Face ID sign in.");
  }
}

async function faceIdSupportToBackend(next: boolean): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${api_url}/users/me/settings`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ face_id_supported: next }),
  });

  if (!res.ok) {
    throw new Error("Unable to pull Face ID support status");
  }
}

// settings screen
export default function SettingsScreen() {
  const { setTextSize } = useTextSize();

  // loading state for initial settings
  const [loading, setLoading] = useState(true);
  // backend settings
  const [settings, setSettings] = useState<UserSettings>(DEFAULTS);
  // saving state for updating settings
  const [saving, setSaving] = useState<Partial<Record<keyof UserSettings, boolean>>>({});

  const [scanDocDeleteModalVis, setScanDocDeleteModalVis] = useState(false);

  const scanDocDeleteLabel = useMemo(() => {
    const val = DELETE_DOC_VALS.find((o) => o.value === settings.scan_doc_delete);
    return val?.label ?? "30 days";
  }, [settings.scan_doc_delete]);
  
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

  useEffect(() => {
    if (loading) return;
    (async () => {
      try {
        const capability = await getFaceIdCapability();
        const supported = capability.supportedForApp;

        if (settings.face_id_supported !== supported) {
          setSettings((cur) => ({ ...cur, face_id_supported: supported }));
          await faceIdSupportToBackend(supported);
        }
      } catch (e) {
        console.warn("Unable to push Face ID capability:", e);
      }
    })();
  }, [loading, settings.face_id_supported]);

  const isSaving = (key: keyof UserSettings) => Boolean(saving[key]);

  const updateSetting = async <K extends keyof UserSettings>(key: K, next: UserSettings[K]) => {
    const prev = settings[key];
    const prevDarkMode = darkMode;

    setSettings((cur) => ({ ...cur, [key]: next }));
    setSaving((cur) => ({ ...cur, [String(key)]: true }));

    if (key === "text_size") {
      await setTextSize(next as TextSizeValues);
    }

    if (key === "dark_mode") {
      setDarkMode(Boolean(next));
    }

    try {
      await patchSettings({ [key]: next } as Partial<UserSettings>);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Unknown error");
      setSettings((cur) => ({ ...cur, [key]: prev }));

      if (key === "text_size") {
        await setTextSize(prev as TextSizeValues);
      }

      if (key === "dark_mode") {
        setDarkMode(prev as boolean);
      }
    } finally {
      setSaving((cur) => ({ ...cur, [String(key)]: false }));
    }
  };

  const { darkMode, setDarkMode } = useTheme();

  useEffect(() => {
    setSettings((cur) => {
      if (cur.dark_mode === darkMode) return cur;
      return { ...cur, dark_mode: darkMode };
    });
  }, [darkMode]);

  const C = useMemo(() => {
    const isDark = !!darkMode;
    return {
      isDark,
      bg: isDark ? "#0B1220" : "#F3F4F6",
      card: isDark ? "#101A2D" : "#FFFFFF",
      text: isDark ? "#E5E7EB" : "#111827",
      subtext: isDark ? "#AAB4C3" : "#6B7280",
      border: isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.08)",
      icon: isDark ? "#E5E7EB" : "#111827",
      overlay: isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.35)",
      pill: isDark ? "#0F1B33" : "#F3F4F6",
    };
  }, [darkMode]);

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

  const openNotif = async () => {
    try {
      if (Platform.OS === "ios"){
        await Linking.openURL("app-settings:");
        return;
      }
      const pkg = Application.applicationId;
      await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS, {
        extra: {
          "android.provider.extra.APP_PACKAGE": pkg
        }
      });
    } catch {
      Alert.alert("Unable to open notification settings.");
    }
  };

  const confirmDeleteAllDocScans = () => {
    Alert.alert("Delete All Document Scans", "Are you sure you want to delete all your scanned documents? -- This action is permanent.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try {
          await deleteAllDocScans();
          Alert.alert("Delete Success\nAll scans have been deleted.");
        } catch (e: any) {
          Alert.alert("Error", e?.message ?? "Could not delete scans.");
        }
      }}
    ]);
  };

  //save photos to gallery logic
  const handleSavePhotosToggle = async (next: boolean) => {
    if (!next) {
      await updateSetting("save_photos", false);
      return;
    }

    try {
      const perm = await MediaLibrary.getPermissionsAsync();

      if (perm.granted) {
        await updateSetting("save_photos", true);
        return;
      }

      if (perm.canAskAgain === false) {
        Alert.alert(
          "Gallery Permission Required",
          "Photo Gallery permission is currently disabled for SayItSimply.\nPlease enable it from device settings to save photos to the gallery.",
          [
            { text: "Cancel", style: "cancel", onPress: () => setSettings((c) => ({ ...c, save_photos: false })) },
            { text: "Open Settings", onPress: openPermissions },
          ]
        );
        setSettings((perm) => ({ ...perm, save_photos: false }));
        return;
      }

      const req = await MediaLibrary.requestPermissionsAsync();
      if (!req.granted) {
        Alert.alert(
          "Gallery Permission Required",
          "To save photos to the gallery, enable Photo Library permissions for SayItSimply.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Permissions", onPress: openPermissions }
          ]
        );
        setSettings((cur) => ({ ...cur, save_photos: false }));
        return;
      }

      await updateSetting("save_photos", true);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not enable 'Save Photos to Gallery'");
      setSettings((cur) => ({ ...cur, save_photos: false }));
    }
  };
  
  //disable and gray out faceid toggle if device does not support (checked at onboarding to set flag in db)
  const disableFaceId = loading || isSaving("face_id") || !settings.face_id_supported;
  
  //faceid logic
  const handleFaceIdToggle = async (next: boolean) => {
    const deviceId = await getDeviceId();

    if (!next) {
      try {
      await disableFaceIdLogin(deviceId);
      await clearFaceIdCredentials();
      await updateSetting("face_id", false);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not disable Face ID sign in.");
      setSettings((cur) => ({ ...cur, face_id: true }));
    }
      return;
    }
    try {
      const capability = await getFaceIdCapability();

    if (!capability.hasHardware) {
      Alert.alert(
        "Face ID Sign In Unavailable",
        "This device does not support Face ID authentication."
      );
      setSettings((cur) => ({ ...cur, face_id: false }));
      return;
    }

    if (!capability.isEnrolled) {
      Alert.alert(
        "Face ID Setup Required",
        "Set up Face ID in your device settings first."
      );
      setSettings((cur) => ({ ...cur, face_id: false }));
      return;
    }

    const auth = await promptFaceIdAuth("Enable Face ID sign in");
    if (!auth.success) {
      setSettings((cur) => ({ ...cur, face_id: false }));
      return;
    }

    const reg = await registerFaceIdLogin(deviceId);

    await saveFaceIdCredentials({
      faceIdToken: reg.face_id_token,
    });

    await updateSetting("face_id", true);
    Alert.alert("Enabled", "Face ID sign in is enabled.");

    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Face ID could not be enabled");
      setSettings((cur) => ({ ...cur, face_id: false }));
      await clearFaceIdCredentials().catch(() => {});
    }
  };

  return (
    <SafeAreaView style={[settingsStyles.safe, { backgroundColor: C.bg }]} edges={["bottom"]}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerShown: true,
          headerTitleAlign: 'center',
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'generic',
          headerStyle: { backgroundColor: C.bg },
          headerTitleStyle: { color: C.text },
          headerTintColor: C.text
        }}
      />

      <ScrollView style={[{ flex: 1 }, { backgroundColor: C.bg }]}
        contentContainerStyle={settingsStyles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
        <View style={settingsStyles.list}>
          {/* Challenge Mode */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Challenge Mode</AppText>
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
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            When enabled, text will be simplified less than your current simplification level.
          </AppText>

          {/* Highlight Difficult Words */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Highlight Difficult Words</AppText>
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
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            When enabled, complex words will be highlighted, and when pressed, will show a definition of the word.
          </AppText>

          {/* Dark Mode */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Dark Mode</AppText>
            {loading ? (
              <ActivityIndicator/>
            ) : (
              <ToggleButton
                value={settings.dark_mode}
                onChange={(next) => {
                  updateSetting("dark_mode", next);
                }}
                disabled={isSaving("dark_mode")}
              />
            )}
          </View>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            When enabled, the app will display in "Dark Mode" -- the background is darker and font is lighter
          </AppText>

          {/* Text Size */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Text Size</AppText>
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

                <AppText style={settingsStyles.sizeVal}>{settings.text_size}</AppText>

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
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            This setting changes the font size for the entire app
          </AppText>

          {/* Scan Documents (Save) */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Save Scans to App</AppText>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.scan_doc_save}
                onChange={(next) => updateSetting("scan_doc_save", next)}
                disabled={isSaving("scan_doc_save")}
              />
            )}
          </View>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            When enabled, captured and uploaded pictures will be saved to the "Documents" tab
          </AppText>

          {/* Scan Documents (Delete) */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Auto-Delete Document Scans</AppText>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <Pressable
                onPress={() => !isSaving("scan_doc_delete") && setScanDocDeleteModalVis(true)}
                style={({ pressed }) => [
                  settingsStyles.dropdownPill,
                  isSaving("scan_doc_delete") ? { opacity: 0.7 } : null,
                  pressed ? { opacity: 0.85 } : null,
                ]}
                hitSlop={8}
              >
                <AppText style={settingsStyles.dropdownText}>{scanDocDeleteLabel}</AppText>
                <Ionicons name="chevron-down" size={16} color="#000" />
              </Pressable>
            )}
          </View>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            This enables saved scans to be deleted automatically after the specified amount of days have passed
          </AppText>

          {/* Delete All Scans */}
          <Pressable onPress={confirmDeleteAllDocScans} style={({ pressed }) => [settingsStyles.row, pressed ? { opacity: 0.85 } : null]}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Delete All Document Scans</AppText>
              <Ionicons name="chevron-forward" size={20} color={C.icon}/>
          </Pressable>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            This deletes all items in the Documents tab
          </AppText>

          {/* Save Photos */}
          <View style={settingsStyles.row}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Save Photos to Gallery</AppText>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.save_photos}
                onChange={handleSavePhotosToggle}
                disabled={isSaving("save_photos")}
              />
            )}
          </View>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            When enabled, captured photos to also be saved to the device's photo gallery
          </AppText>

          {/* Face ID --grayed out & disabled if device cant support */}
          <View style={[settingsStyles.row, !settings.face_id_supported ? { opacity: 0.45 } : null]}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Sign in with Face ID</AppText>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={settings.face_id}
                onChange={handleFaceIdToggle}
                disabled={disableFaceId}
              />
            )}
          </View>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            This enables login using Face ID. If grayed out, device does not have this capability
          </AppText>

          {/* Permissions */}
          <Pressable onPress={openPermissions} style={({ pressed }) => [settingsStyles.row, pressed ? { opacity: 0.85 } : null]}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Permissions</AppText>
            <Ionicons name="chevron-forward" size={20} color={C.icon} />
          </Pressable>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            This opens the app's permissions settings from device settings
          </AppText>

          {/* Notifications */}
          <Pressable onPress={openNotif} style={({ pressed }) => [settingsStyles.row, pressed ? { opacity: 0.85 } : null]}>
            <AppText style={[settingsStyles.rowLabel, { color: C.text }]}>Notifications</AppText>
            <Ionicons name="chevron-forward" size={20} color={C.icon} />
          </Pressable>
          <AppText style={[settingsStyles.hint, { color: C.subtext }]}>
            This opens the app's notification settings from device settings
          </AppText>

          {/* TTS Card */}
          <View style={settingsStyles.ttsCard}>
            <AppText style={settingsStyles.ttsTitle}>Text-to-Speech Output Settings</AppText>

            <View style={settingsStyles.ttsRow}>
              <AppText style={settingsStyles.ttsLabel}>Speech Rate</AppText>

              {loading ? (
                <ActivityIndicator />
              ) : (
                <Slider
                  style={settingsStyles.slider}
                  minimumValue={-2.0}
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
              <AppText style={settingsStyles.ttsLabel}>Pitch</AppText>

              {loading ? (
                <ActivityIndicator />
              ) : (
                <Slider
                  style={settingsStyles.slider}
                  minimumValue={-2.0}
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
        visible={scanDocDeleteModalVis}
        animationType='fade'
        onRequestClose={() => setScanDocDeleteModalVis(false)}
      >
        <Pressable style={[settingsStyles.modOverlay, { backgroundColor: C.overlay }]} onPress={() => setScanDocDeleteModalVis(false)}>
          <Pressable style={[settingsStyles.modCard, { backgroundColor: C.card }]} onPress={() => {}}>
            <AppText style={[settingsStyles.modTitle, { color: C.text }]}>Auto-Delete History</AppText>

            {DELETE_DOC_VALS.map((opt) => {
              const selected = opt.value === settings.scan_doc_delete;
              return (
                <Pressable
                  key={String(opt.value)}
                  onPress={async () => {
                    setScanDocDeleteModalVis(false);
                    await updateSetting("scan_doc_delete", opt.value);
                  }}
                  style={({ pressed }) => [
                    settingsStyles.modOpt,
                    selected ? settingsStyles.modOptSelected : null,
                    pressed ? { opacity: 0.85 } : null,
                  ]}
                >
                  <AppText style={[settingsStyles.modOptText, selected ? { fontWeight: "800" } : null]}>{opt.label}</AppText>
                    {selected ? <Ionicons name="checkmark" size={18} color={C.icon}/> : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => setScanDocDeleteModalVis(false)}
              style={({ pressed }) => [settingsStyles.modClose, pressed ? { opacity: 0.85 } : null]}
            >
              <AppText style={[settingsStyles.modCloseText, { color: C.text }]}>Close</AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}