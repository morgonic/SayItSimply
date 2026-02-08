import storage from "@/app/storage";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { profileStyles } from "@/constants/styles";

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
        profileStyles.row,
        pressed && !disabled && profileStyles.rowPressed,
        disabled && profileStyles.rowDisabled,
      ]}
      android_ripple={disabled ? undefined : { color: "rgba(0,0,0,0.08)" }}
    >
      <View style={profileStyles.rowLeft}>
        <Text style={[profileStyles.rowLabel, disabled && profileStyles.rowLabelDisabled]}>
          {label}
        </Text>
      </View>

      <View style={profileStyles.rowRight}>
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

//calibration functions
function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function calibSimplificationLvl(current: number) {
  if (current === 1) return { left: 2, right: 3 };
  if (current === 9) return { left: 7, right: 8 };
  return { left: clampInt(current - 1, 1, 9), right: clampInt(current + 1, 1, 9) };
}

const calibSampleText =
  "The gods realized that ordinary chains would not hold the monstrous wolf Fenrir, so they sought help from the dark elves of Svartalfheimr after he easily shattered the heavy iron links of Laeding and Dromi. In response, the elves forged Gleipnir, a magical ribbon as soft as silk but made from six impossible things: the sound of a cat’s footfall, the beard of a woman, the roots of a mountain, the sinews of a bear, the breath of a fish, and the spittle of a bird. Although Fenrir suspected a trick, he agreed to the binding only on the condition that a god placed a hand in his mouth as a pledge of good faith. Tyr bravely stepped forward, sacrificing his sword hand to ensure the wolf was successfully tethered and muzzled with a sword, forever ending the threat to Asgard.";

type GeminiResponse = {
  summary?: string;
  simplification?: string;
  action_items?: string[];
  translation?: string | null;
  mode?: string;
  reading_level?: number;
};

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

  const [calibVis, setCalibVis] = useState(false);
  const [calibLoad, setCalibLoad] = useState(false);
  const [calibErr, setCalibErr] = useState<string | null>(null);

  const [calibLower, setCalibLower] = useState<number | null>(null);
  const [calibHigher, setCalibHigher] = useState<number | null>(null);
  const [calibLowerTxt, setCalibLowerTxt] = useState<string>("");
  const [calibHigherTxt, setCalibHigherTxt] = useState<string>("");

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
          profileStyles.languageChip,
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={profileStyles.languageChipText}>{preferredLanguage}</Text>
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

  const onCalibrate = async () => {
    const curr = accountReadingLevel ?? 9;
    await openCalibModal(curr);
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

  async function getAuthTokenHeaders() {
    const token = await storage.getItem("access_token");
    const tokenType = (await storage.getItem("token_type")) ?? "bearer";
    return {
      ...(token ? { Authorization: `${tokenType} ${token}` } : {}),
    };
  }

  async function fetchSimplifiedTxt(level: number): Promise<string> {
    const tokenHeaders = await getAuthTokenHeaders();
    const res = await fetch(`${api_url}/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...tokenHeaders },
      body: JSON.stringify({ text: calibSampleText, mode: "Document", reading_level: level }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Gemini response failed (HTTP ${res.status})`);
    }
    const json: GeminiResponse = await res.json();
    return (json.simplification ?? "").trim();
  }

  async function dbUpdateReadingLvl(payload: { new_level: number; choice: "lower" | "stay" | "higher" }): Promise<boolean> {
    try {
      const tokenHeaders = await getAuthTokenHeaders();
      const res = await fetch(`${api_url}/user/reading_level`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tokenHeaders },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (e) {
      console.error("Error updating reading level:", e);
      return false;
    }
  }

  function closeCalibModal() {
    setCalibVis(false);
    setCalibLoad(false);
    setCalibErr(null);
  }

  async function openCalibModal(currLevel: number) {
    const { left, right } = calibSimplificationLvl(currLevel);

    setCalibLower(left);
    setCalibHigher(right);
    setCalibVis(true);
    setCalibLoad(true);
    setCalibErr(null);
    setCalibLowerTxt("Loading...");
    setCalibHigherTxt("Loading...");

    try {
      const [lowerTxt, higherTxt] = await Promise.all([
        fetchSimplifiedTxt(left),
        fetchSimplifiedTxt(right),
      ]);
      setCalibLowerTxt(lowerTxt);
      setCalibHigherTxt(higherTxt);
    } catch (e: any) {
      setCalibErr(e?.message ?? "Failed to load calibration text");
    } finally {
      setCalibLoad(false);
    }
  }

  async function setCalibChoice(choice: "lower" | "stay" | "higher") {
    const currLevel = accountReadingLevel ?? 9;
    const lowLevel = calibLower ?? calibSimplificationLvl(currLevel).left;
    const highLevel = calibHigher ?? calibSimplificationLvl(currLevel).right;

    const newLevel = choice === "lower" ? lowLevel : choice === "higher" ? highLevel : currLevel;

    const saved = await dbUpdateReadingLvl({ new_level: newLevel, choice });
    if (!saved) {
      Alert.alert("Couldn’t save your preference", "Please try again.");
      return;
    }

    setAccountReadingLevel(newLevel);
    try {
      await storage.setItem("user_reading_level", String(newLevel));
    } catch {}

    closeCalibModal();
  }

  return (
    <SafeAreaView style={profileStyles.safe}>
      <ScrollView contentContainerStyle={profileStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#B7D7E3", "#F3F4F6"]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={profileStyles.header}>
          <Text style={profileStyles.headerTitle}>Profile</Text>

          <View style={profileStyles.avatarWrap}>
            <View style={profileStyles.avatarCircle}>
              {profilePictureUri ? (
                <Image
                  source={{ uri: profilePictureUri }}
                  style={profileStyles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={54} color="#9CA3AF" />
              )}

              <Pressable
                onPress={pickProfilePicture}
                style={({ pressed }) => [
                  profileStyles.pickProfileButton,
                  pressed && { opacity: 0.85 },
                ]}
                android_ripple={{ color: "rgba(255,255,255,0.25)" }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Reading &amp; Language</Text>

          <View style={profileStyles.card}>
            <Row
              label="Preferred Language"
              onPress={undefined}
              rightContent={languageChip}
              rightIcon={null}
            />
          </View>

          <View style={profileStyles.card}>
            <Row label="Calibrate Simplification" onPress={onCalibrate} />
          </View>
        </View>

        <View style={profileStyles.section}>
          <Text style={profileStyles.sectionTitle}>Account &amp; Security</Text>

          <View style={profileStyles.card}>
            <Row label="Account Details" onPress={onAccountDetails} />
          </View>

          <View style={profileStyles.card}>
            <Row label="Change Password" onPress={onChangePassword} disabled={isOAuthUser}/>
          </View>

          {isOAuthUser ? (
            <Text style={profileStyles.oauthHint}>
              Password changes are managed through your sign in provider.
            </Text>
          ) : null}

          <View style={profileStyles.card}>
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
            profileStyles.logoutButton,
            pressed && profileStyles.logoutButtonPressed,
          ]}
          android_ripple={{ color: "rgba(255,255,255,0.18)" }}
        >
          <Text style={profileStyles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={profileStyles.dangerTitle}>DANGER ZONE</Text>
        <View style={profileStyles.dangerWrap}>
          <Pressable
            onPress={onDeleteAccount}
            style={({ pressed }) => [
              profileStyles.deleteButton,
              pressed && profileStyles.deleteButtonPressed,
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.14)" }}
          >
            <Text style={profileStyles.deleteText}>Delete Account</Text>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal to show account details */}
      <Modal visible={accountModalVisible} transparent animationType="fade" onRequestClose={() => setAccountModalVisible(false)}>
        <View style={profileStyles.modalBackdrop}>
          <View style={profileStyles.accountModalCard}>
            <Text style={profileStyles.accountModalTitle}>Account Details</Text>

            <View style={profileStyles.detailRow}>
              <Text style={profileStyles.detailLabel}>Email</Text>
              <Text style={profileStyles.detailValue}>{accountEmail || "—"}</Text>
            </View>

            <View style={profileStyles.detailDivider} />

            <View style={profileStyles.detailRow}>
              <Text style={profileStyles.detailLabel}>Account Type</Text>
              <Text style={profileStyles.detailValue}>
                {isOAuthUser ? "Google" : "Email"}
              </Text>
            </View>

            <Pressable
              onPress={() => setAccountModalVisible(false)}
              style={({ pressed }) => [
                profileStyles.detailCloseButton,
                pressed && { opacity: 0.85 },
              ]}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
            >
              <Text style={profileStyles.detailCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal to select preferred language */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={profileStyles.modalBackdrop} onPress={() => setLangModalVisible(false)}>
          <Pressable style={profileStyles.dropdownCard} onPress={() => {}}>
            <Text style={profileStyles.dropdownTitle}>Select Preferred Language</Text>

            {langOptions.map((opt) => {
              const selected = opt.label === preferredLanguage;
              return (
                <Pressable key={opt.code} style={[profileStyles.dropdownRow, selected && profileStyles.dropdownRowSelected,]}
                  onPress={() => onSelectLanguage(opt.label)}
                >
                  <Text style={profileStyles.dropdownRowText}>{opt.label}</Text>
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
        <View style={profileStyles.modalBackdrop}>
          <View style={profileStyles.pwModalCard}>
            <Text style={profileStyles.pwModalTitle}>Change Password</Text>

            <Text style={profileStyles.modalLabel}>New Password</Text>
            <TextInput
              value={pw1}
              onChangeText={setPw1}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter new password"
              style={profileStyles.modalInput}
            />

            <Text style={profileStyles.modalLabel}>Confirm Password</Text>
            <TextInput
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="re-type password"
              style={profileStyles.modalInput}
            />
            {pwError ? <Text style={profileStyles.modalError}>{pwError}</Text> : null}

            <View style={profileStyles.modalButtons}>
              <Pressable
                onPress={() => setPwModalVisible(false)}
                style={({ pressed }) => [
                  profileStyles.modalButton,
                  profileStyles.modalCancelButton,
                  pressed && profileStyles.modalButtonPressed,
                ]}
                android_ripple={{ color: "rgba(0,0,0,0.08)" }}
                disabled={pwSubmitting}
              >
                <Text style={profileStyles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={submitPasswordChange}
                disabled={pwSubmitting}
                style={({ pressed }) => [
                  profileStyles.modalButton,
                  profileStyles.modalButtonPrimary,
                  pressed && profileStyles.modalButtonPressed,
                  pwSubmitting && { opacity: 0.6 },
                ]}
              >
                <Text style={profileStyles.modalButtonPrimaryText}>{pwSubmitting ? "Saving..." : "Submit"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={calibVis}
        animationType="fade"
        onRequestClose={closeCalibModal}
      >
        <View style={profileStyles.calibBackground}>
          <Pressable style={profileStyles.fullFill} onPress={closeCalibModal}/>
          <View style={profileStyles.calibCenter} pointerEvents='box-none'>
            <View style={profileStyles.calibModalCard}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={profileStyles.calibBodyContent}
                showsVerticalScrollIndicator keyboardShouldPersistTaps="handled"
              >
                <Text style={profileStyles.calibTitle}>Calibrate Simplification</Text>

                {calibLoad ? (
                  <View style={profileStyles.calibLoadRow}>
                    <Text style={profileStyles.calibLoadTxt}>Loading...</Text>
                  </View>
                ) : calibErr ? (
                  <Text style={profileStyles.calibErrTxt}>{calibErr}</Text>
                ) : (
                  <View style={profileStyles.calibOptsRow}>
                    <View style={profileStyles.calibOpt}>
                      <View style={profileStyles.calibOptHeader}>
                        <Text style={profileStyles.calibOptHeaderTxt}> Option A - Lower</Text>
                      </View>
                      <Text style={profileStyles.calibOptTxt}>{calibLowerTxt}</Text>
                    </View>

                    <View style={profileStyles.calibOpt}>
                      <View style={profileStyles.calibOptHeader}>
                        <Text style={profileStyles.calibOptHeaderTxt}> Option B - Higher</Text>
                      </View>
                      <Text style={profileStyles.calibOptTxt}>{calibHigherTxt}</Text>
                    </View>
                  </View>
                )}

                <View style={profileStyles.calibBtnRow}>
                  <Pressable
                    style={[profileStyles.calibBtn, profileStyles.calibBtnLow]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("lower");
                    }}
                  >
                    <Text style={profileStyles.calibChoiceTxt}>Choose Option A</Text>
                  </Pressable>

                  <Pressable
                    style={[profileStyles.calibBtn, profileStyles.calibBtnStay]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("stay");
                    }}
                  >
                    <Text style={profileStyles.calibChoiceDarkTxt}>Neither - Don't change</Text>
                  </Pressable>

                  <Pressable
                    style={[profileStyles.calibBtn, profileStyles.calibBtnHigh]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("higher");
                    }}
                  >
                    <Text style={profileStyles.calibChoiceTxt}>Choose Option B</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}