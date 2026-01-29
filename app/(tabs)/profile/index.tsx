import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import storage from "@/app/storage";

const api_url = process.env.EXPO_PUBLIC_API_URL;

type RowProps = {
  label: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  rightIcon?: React.ComponentProps<typeof Ionicons>["name"] | null;
  disabled?: boolean;
};

function Row({
  label,
  onPress,
  rightContent,
  rightIcon = "chevron-forward",
  disabled = false,
}: RowProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.row,
        pressed && !disabled && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      android_ripple={disabled ? undefined : { color: "rgba(0,0,0,0.08)" }}
    >
      <View style={styles.rowLeft}>
        <Text style={[styles.rowLabel, disabled && styles.rowLabelDisabled]}>
          {label}
        </Text>
      </View>

      <View style={styles.rowRight}>
        {rightContent}
        {rightIcon ? (
          <Ionicons
            name={rightIcon}
            size={18}
            color={disabled ? "#9CA3AF" : "#111827"}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const langOptions: Array<{ label: string; code: string}> = [
    { label: "English", code: "en" },
    { label: "Español", code: "es" },
    { label: "Français", code: "fr" },
    { label: "Deutsch", code: "de" },
];

function labelFromCode(code: string | null | undefined): string {
  const found = langOptions.find((x) => x.code === code);
  return found ? found.label : "English";
}

function codeFromLabel(label: string): string {
  const found = langOptions.find((x) => x.label === label);
  return found ? found.code : "en";
}

export default function ProfileScreen() {
  const router = useRouter();

  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  const [langModalVisible, setLangModalVisible] = useState(false);

  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [profilePictureUri, setProfilePictureUri] = useState<string | null>(null);

  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string>("");
  const [accountReadingLevel, setAccountReadingLevel] = useState<number | null>(null);

  const getTokenOrRedirect = async (): Promise<string | null> => {
    const token = await storage.getItem("access_token");
    return token;
  };

  useEffect(() => {
    (async () => {
      const token = await storage.getItem("access_token");

      const res = await fetch(`${api_url}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const user = await res.json();

      setPreferredLanguage(labelFromCode(user.language));

      setProfilePictureUri(user.profile_photo ?? null);
      await storage.setItem("profile_photo", user.profile_photo ?? "");

      setAccountEmail(user.email ?? "");
      setAccountReadingLevel(
        typeof user.reading_level === "number" ? user.reading_level : null
      );
      
      const resAuth = await fetch(`${api_url}/users/me/auth-method`, {
       headers: { Authorization: `Bearer ${token}` },
    });

    const data = await resAuth.json();
    setIsOAuthUser(!!data.is_oauth);
    })();
  }, []);

  const languageChip = useMemo(() => {
    return (
      <Pressable
        onPress={() => setLangModalVisible(true)}
        style={({ pressed }) => [
          styles.languageChip,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={styles.languageChipText}>{preferredLanguage}</Text>
        <Ionicons name="chevron-down" size={14} color="#111827" />
      </Pressable>
    );
  }, [preferredLanguage]);

  const updateLanguageInDb = async (newLabel: string) => {

    // do nothing if same language is selected
    if (newLabel === preferredLanguage) return;

    const token = await getTokenOrRedirect();

    const res = await fetch(`${api_url}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ language: codeFromLabel(newLabel) }),
    });

    if (!res.ok) {
      Alert.alert("Couldn’t update language", "Please try again.");
      return;
    }

    setPreferredLanguage(newLabel);
  };

  const saveProfilePictureToDb = async (uri: string) => {
    const token = await getTokenOrRedirect();
    const res = await fetch(`${api_url}/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ profile_photo: uri }),
    });
    setProfilePictureUri(uri);
    await storage.setItem("profile_photo", uri);
  };

  const pickProfilePicture = async () => {
    const { status, canAskAgain } =
      await ImagePicker.getMediaLibraryPermissionsAsync();

    let finalStatus = status;

    if (finalStatus !== "granted") {
      const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
      finalStatus = req.status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to choose a profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (result.canceled) return;

    const uri = result.assets?.[0]?.uri;
    if (!uri) return;

    await saveProfilePictureToDb(uri);
  };

  const onSelectLanguage = async (newLabel: string) => {
    setLangModalVisible(false);
    await updateLanguageInDb(newLabel);
  };

  const onCalibrate = () => {
    Alert.alert("Calibrate Simplification");
  };

  const onAccountDetails = () => {
    setAccountModalVisible(true);
  };

  const onChangePassword = () => {
    if (isOAuthUser) return;

    setPw1("");
    setPw2("");
    setPwError(null);
    setPwModalVisible(true);
  };

  const submitPasswordChange = async () => {
    if (isOAuthUser) return;
    setPwError(null);

    const p1 = pw1;
    const p2 = pw2;

    if (!p1 || !p2){
      setPwError("Please fill out both password fields.");
      return;
    }
    if (p1 !== p2) {
      setPwError("Passwords do not match.");
      return;
    }
    if (p1.length < 8) {
      setPwError("Password must be at least 8 characters long.");
      return;
    }

    const token = await getTokenOrRedirect();
    setPwSubmitting(true);
    const res = await fetch(`${api_url}/users/me/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: p1 }),
    });

    if (!res.ok) {
      setPwError("Failed to update password.");
      setPwSubmitting(false);
      return;
    }

    setPwSubmitting(false);
    Alert.alert("Password Updated", "Your password has been successfully updated.");
    setPwModalVisible(false);
  };

  const onSettings = () => {
    router.push("/(tabs)/profile/settings");
  };

  const onLogout = () => {
    Alert.alert("Log Out","Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out", style: "destructive",
          onPress: async () => {
            await storage.deleteItem("access_token");
            await storage.deleteItem("profile_photo");
            router.replace("/log-in");
          },
        },
      ]
    );
  };

  const onDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This is permanent. Doing this will erase all user data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getTokenOrRedirect();

            const res = await fetch(`${api_url}/users/me`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            await storage.deleteItem("access_token");
            await storage.deleteItem("profile_photo");
            router.replace("/log-in");
          }
        },
      ]
    );
  };
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#B7D7E3", "#F3F4F6"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>

          <View style={styles.avatarWrap}>
            <View style={styles.avatarCircle}>
              {profilePictureUri ? (
                <Image
                  source={{ uri: profilePictureUri }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={54} color="#9CA3AF" />
              )}

              <Pressable
                onPress={pickProfilePicture}
                style={({ pressed }) => [
                  styles.pickProfileButton,
                  pressed && { opacity: 0.85 },
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.25)" }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reading &amp; Language</Text>

          <View style={styles.card}>
            <Row
              label="Preferred Language"
              onPress={undefined}
              rightContent={languageChip}
              rightIcon={null}
            />
          </View>

          <View style={styles.card}>
            <Row label="Calibrate Simplification" onPress={onCalibrate} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account &amp; Security</Text>

          <View style={styles.card}>
            <Row label="Account Details" onPress={onAccountDetails} />
          </View>

          <View style={styles.card}>
            <Row label="Change Password" onPress={onChangePassword} disabled={isOAuthUser}/>
          </View>

          {isOAuthUser ? (
            <Text style={styles.oauthHint}>
              Password changes are managed through your sign in provider.
            </Text>
          ) : null}

          <View style={styles.card}>
            <Row
              label="Settings"
              onPress={onSettings}
              rightIcon="settings-outline"
            />
          </View>
        </View>

        <Pressable
          onPress={onLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
          android_ripple={{ color: "rgba(255,255,255,0.18)" }}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.dangerTitle}>DANGER ZONE</Text>
        <View style={styles.dangerWrap}>
          <Pressable
            onPress={onDeleteAccount}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.14)" }}
          >
            <Text style={styles.deleteText}>Delete Account</Text>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal to show account details */}
      <Modal visible={accountModalVisible} transparent animationType="fade" onRequestClose={() => setAccountModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.accountModalCard}>
            <Text style={styles.accountModalTitle}>Account Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{accountEmail || "—"}</Text>
            </View>

            <View style={styles.detailDivider} />

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Account Type</Text>
              <Text style={styles.detailValue}>
                {isOAuthUser ? "Google" : "Email"}
              </Text>
            </View>

            <Pressable
              onPress={() => setAccountModalVisible(false)}
              style={({ pressed }) => [
                styles.detailCloseButton,
                pressed && { opacity: 0.85 },
              ]}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
            >
              <Text style={styles.detailCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal to select preferred language */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangModalVisible(false)}>
          <Pressable style={styles.dropdownCard} onPress={() => {}}>
            <Text style={styles.dropdownTitle}>Select Preferred Language</Text>

            {langOptions.map((opt) => {
              const selected = opt.label === preferredLanguage;
              return (
                <Pressable key={opt.code} style={[styles.dropdownRow, selected && styles.dropdownRowSelected,]}
                  onPress={() => onSelectLanguage(opt.label)}
                >
                  <Text style={styles.dropdownRowText}>{opt.label}</Text>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color="#111827" />
                  ) : null
                  }
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal to change password */}
      <Modal visible={pwModalVisible} transparent animationType="fade" onRequestClose={() => setPwModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.pwModalCard}>
            <Text style={styles.pwModalTitle}>Change Password</Text>

            <Text style={styles.modalLabel}>New Password</Text>
            <TextInput
              value={pw1}
              onChangeText={setPw1}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter new password"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Confirm Password</Text>
            <TextInput
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="re-type password"
              style={styles.modalInput}
            />
            {pwError ? <Text style={styles.modalError}>{pwError}</Text> : null}

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setPwModalVisible(false)}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  pressed && styles.modalButtonPressed,
                ]}
                android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                disabled={pwSubmitting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={submitPasswordChange}
                disabled={pwSubmitting}
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  pressed && styles.modalButtonPressed,
                  pwSubmitting && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.modalButtonPrimaryText}>{pwSubmitting ? "Saving..." : "Submit"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  scrollContent: {
    paddingBottom: 8,
  },

  header: {
    paddingTop: 8,
    paddingBottom: 18,
    alignItems: "center",
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginTop: 6,
  },

  avatarWrap: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarImage: {
  width: "100%",
  height: "100%",
  borderRadius: 46, // match avatarCircle borderRadius
},
pickProfileButton: {
  position: "absolute",
  right: -2,
  bottom: -2,
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: "#1F7A88",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 2,
  borderColor: "#F3F4F6",
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},

  section: {
    paddingHorizontal: 18,
    marginTop: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#E9E6F4",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowPressed: { opacity: 0.75 },
  rowDisabled: { 
    backgroundColor: "rgba(229,231,235,0.6)",
    opacity: 0.55
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  rowLabelDisabled: {
    color: "#6B7280",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.15)",
  },
  languageChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },

  oauthHint: {
    textAlign: "center",
    color: "#6B7280",
    marginTop: -4,
    marginBottom: 8,
    fontWeight: "700",
    paddingHorizontal: 18,
  },

  accountModalCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  padding: 16,
  },

  accountModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },

  detailRow: {
    paddingVertical: 10,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  detailDivider: {
    height: 1,
    backgroundColor: "rgba(17,24,39,0.1)",
  },

  detailCloseButton: {
    marginTop: 14,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },

  detailCloseButtonText: {
    color: "#111827",
    fontWeight: "900",
  },

  logoutButton: {
    marginTop: 6,
    marginHorizontal: 18,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#1F7A88",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoutButtonPressed: { opacity: 0.85 },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  dangerTitle: {
    marginTop: 14,
    textAlign: "center",
    fontWeight: "900",
    color: "#B42318",
    letterSpacing: 0.7,
  },
  dangerWrap: {
    marginTop: 10,
    marginHorizontal: 18,
    padding: 12,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(180,35,24,0.55)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.55)",
  },

  deleteButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "#8B2C1B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  deleteButtonPressed: { opacity: 0.85 },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  rowDanger: {},
  rowLabelDanger: {
    color: "#B42318",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  dropdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(17,24,39,0.1)",
  },
  dropdownRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownRowSelected: {
    backgroundColor: "rgba(31, 122, 136, 0.08)",
  },
  dropdownRowText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },

  pwModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
  },
  pwModalTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    marginTop: 8,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "rgba(17,24,39,0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
  },
  modalError: {
    marginTop: 10,
    color: "#B42318",
    fontWeight: "800",
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPressed: {
    opacity: 0.85,
  },
  modalCancelButton: {
    backgroundColor: "#E5E7EB",
  },
  modalCancelButtonText: {
    color: "#111827",
    fontWeight: "900",
  },
  modalButtonPrimary: {
    backgroundColor: "#1F7A88",
  },
  modalButtonPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});