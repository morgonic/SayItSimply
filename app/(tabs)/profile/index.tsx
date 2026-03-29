import { useTheme } from "@/app/context/ThemeContext";
import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import { profileStyles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from 'expo-linking';
import { useRouter } from "expo-router";
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const api_url = process.env.EXPO_PUBLIC_API_URL;

WebBrowser.maybeCompleteAuthSession();

type RowProps = {
  label: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  rightIcon?: React.ComponentProps<typeof Ionicons>["name"] | null;
  disabled?: boolean;
  //dark mode
  iconColor?: string;
  textColor?: string;
  cardBg?: string;
  borderColor?: string;
  pressedBg?: string;
};

function Row({
  label,
  onPress,
  rightContent,
  rightIcon = "chevron-forward",
  disabled = false,
  textColor = "#111827",
  iconColor = "#111827",
  cardBg = "#FFFFFF",
  borderColor = "rgba(17,24,39,0.08)",
  pressedBg = "rgba(0,0,0,0.06)"
}: RowProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        profileStyles.row,
        { backgroundColor: cardBg, borderColor },
        pressed && !disabled && {backgroundColor: pressedBg },
        disabled && profileStyles.rowDisabled
      ]}
      android_ripple={disabled ? undefined : { color: pressedBg }}
    >
      <View style={profileStyles.rowLeft}>
        <AppText style={[profileStyles.rowLabel, { color: disabled ? "#9CA3AF" : textColor }, disabled && profileStyles.rowLabelDisabled]}>
          {label}
        </AppText>
      </View>

      <View style={profileStyles.rowRight}>
        {rightContent}
        {rightIcon ? (
          <Ionicons
            name={rightIcon}
            size={18}
            color={disabled ? "#9CA3AF" : iconColor}
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

  const [emailModalVisible, setEmailModalVisible] = useState(false);

  const [calibVis, setCalibVis] = useState(false);
  const [calibLoad, setCalibLoad] = useState(false);
  const [calibErr, setCalibErr] = useState<string | null>(null);

  const [calibLower, setCalibLower] = useState<number | null>(null);
  const [calibHigher, setCalibHigher] = useState<number | null>(null);
  const [calibLowerTxt, setCalibLowerTxt] = useState<string>("");
  const [calibHigherTxt, setCalibHigherTxt] = useState<string>("");

  const [calibExpandVis, setCalibExpandVis] = useState(false);
  const [calibExpandTitle, setCalibExpandTitle] = useState<string>("");
  const [calibExpandText, setCalibExpandText] = useState<string>("");

  // state to track whether google is currently being linked (in the process)
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  function parseOAuthFragment(url: string) {
    // get everything after # to get oauth fragment
    const fragment = url.split('#')[1] ?? "";

    // split fragment into key/value pairs
    const pairs = fragment.split('&').filter(Boolean);

    // build map of parameters
    const params: Record<string, string> = {};

    for (const pair of pairs) {
      // split pairs into key, value
      const [key, val] = pair.split('=');

      // no key, skip
      if (!key) {
        continue;
      }

      // decode and store params
      params[decodeURIComponent(key)] = decodeURIComponent(val ?? "");
    }

    // return token and token type for auth header
    return {
      access_token: params['access_token'],
      token_type: params['token_type'] || "bearer"
    }
  }

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

  const { darkMode } = useTheme();

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
      overlay: isDark ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.35)",
      gradTop: isDark ? "#0F1B33" : "#B7D7E3",
      gradBot: isDark ? "#0B1220" : "#F3F4F6",
      inputBg: isDark ? "#0F1B33" : "#FFFFFF",
      inputText: isDark ? "#E5E7EB" : "#111827",
      placeholder: isDark ? "#94A3B8" : "#9CA3AF",
      logoutBg: isDark ? "#6B8FD6" : "#1F7A88"
    };
  }, [darkMode]);

  const languageChip = useMemo(() => {
    return (
      <Pressable
        onPress={() => setLangModalVisible(true)}
        style={({ pressed }) => [
          profileStyles.languageChip,
          pressed && { opacity: 0.85 },
        ]}
      >
        <AppText style={profileStyles.languageChipText}>{preferredLanguage}</AppText>
        <Ionicons name="chevron-down" size={14} color="#111827"/>
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

  const onLinkGoogle = async () => {
    // if already linked or in linking process, just return
    if (isOAuthUser || linkingGoogle) {
      return;
    }

    // storing the current auth to revert in case of mismatch/failure
    const oldToken = await storage.getItem('access_token');
    const oldTokenType = (await storage.getItem('token_type')) ?? "bearer";
    const oldEmail = (accountEmail ?? "").trim().toLowerCase();

    // build redirect and auth urls for oauth webbrowser flow
    const redirectUrl = process.env.EXPO_PUBLIC_MOBILE_REDIRECT_URL ?? Linking.createURL("oauth");
    const authUrl = `${api_url}/auth/google/authorize`;

    try{
      // lock button and show loading state
      setLinkingGoogle(true);

      // open browser session for google oauth
      const response = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      // anything other than success or no url in response, return
      if (response.type !== 'success' || !('url' in response)) {
        return;
      }

      // get jwt from deep link
      const url = response.url;
      const { access_token, token_type } = parseOAuthFragment(url);

      // no token, oauth failed
      if (!access_token) {
        Alert.alert("Google link failed.", "No token was returned.");
        return;
      }

      // make temp header to use before saving new token
      const temporaryAuthHeader = {Authorization: `${token_type} ${access_token}`};

      // verify jwt, get user email
      const userResponse = await fetch(`${api_url}/users/me`, {
        headers: temporaryAuthHeader
      });

      // invalid/fail, error
      if (!userResponse.ok) {
        throw new Error("Failed to link Google account.");
      }
      
      const user = await userResponse.json();
      const newEmail = (user.email ?? "").trim().toLowerCase();

      // if google email and existing email don't match, revert auth and inform user
      if (oldEmail && newEmail && newEmail !== oldEmail) {
        try {
          await fetch(`${api_url}/users/me`, {
            method: 'DELETE',
            headers: temporaryAuthHeader
          });
        } 
        catch (e) {
          console.error("Failed to delete user:", e);
        }

        Alert.alert(
          "Wrong Google account", 
          "The Google email MUST match your SayItSimply account email."
        );

        return;
      }

      // save new jwt from oauth
      await storage.setItem('access_token', access_token);
      await storage.setItem('token_type', token_type);

      // refresh oauth so ui disabled link button
      const responseAuth = await fetch(`${api_url}/users/me/auth-method`, {
        headers: temporaryAuthHeader
      });

      const data = await responseAuth.json();

      setIsOAuthUser(!!data.is_oauth);
      
      // success message
      Alert.alert("Success!", "Your account has been linked with Google.");
    }
    catch (e: any) {
      // fail message
      Alert.alert("Google link failed.", e?.message.detail ?? "Please try again.");
    }
    finally {
      // unlock ui
      setLinkingGoogle(false);
    }
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
            console.log("Delete response:", res);
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
    setCalibExpandVis(false);
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

  function openCalibExpanded(which: "lower" | "higher") {
    if (calibLoad) return;
    if (calibErr) return;

    if (which === "lower") {
      setCalibExpandTitle("Option A - Lower");
      setCalibExpandText(calibLowerTxt || "");
    } else {
      setCalibExpandTitle("Option B - Higher");
      setCalibExpandText(calibHigherTxt || "");
    }
    setCalibVis(false);
    setTimeout(() => {
      setCalibExpandVis(true);
    }, 0);
  }

  function closeCalibExpanded() {
    setCalibExpandVis(false);
    setCalibVis(true);
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

  // function for changing user email calling PATCH /users/me/email
  async function onChangeEmail(newEmail: string) {
    try {
      const token = await storage.getItem("access_token");
      const tokenType = (await storage.getItem("token_type")) ?? "bearer";

      const response = await fetch(`${api_url}/users/me/email`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${tokenType} ${token}`
        },
        body: JSON.stringify({email: newEmail})
      });

      if (!response.ok) {
        const text = await response.text();
        Alert.alert("Failed to update email", text || "Please try again.");
        return;
      };
    }
    catch (e: any) {
      Alert.alert("Failed to update email", e?.message ?? "Please try again.");
      return;
    }
    finally {
      return;
    }
  }

  return (
    <SafeAreaView style={[profileStyles.safe, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={profileStyles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[C.gradTop, C.gradBot]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={profileStyles.header}>
          <AppText style={[profileStyles.headerTitle, { color: C.text }]}>Profile</AppText>

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
          <AppText style={[profileStyles.sectionTitle, { color: C.text }]}>Reading &amp; Language</AppText>

          <View style={[profileStyles.card, { backgroundColor: C.card }]}>
            <Row
              label="Preferred Language"
              onPress={undefined}
              rightContent={languageChip}
              rightIcon={null}
            />
          </View>

          <View style={[profileStyles.card, { backgroundColor: C.card }]}>
            <Row label="Tune Responses" onPress={onCalibrate} />
          </View>
        </View>

        <View style={profileStyles.section}>
          <AppText style={[profileStyles.sectionTitle, { color: C.text }]}>Account &amp; Security</AppText>

          <View style={[profileStyles.card, { backgroundColor: C.card }]}>
            <Row label="Account Details" onPress={onAccountDetails} />
          </View>
          
          {/*change email*/}
          <View style={profileStyles.card}>
            <Row
              label={"Change Email"}
              onPress={() => setEmailModalVisible(true)}
              rightIcon='mail-outline'
              disabled={isOAuthUser}
            />
          </View>

          {isOAuthUser ? (
            <AppText style={[profileStyles.oauthHint, { color: C.text }]}>
              Email changes are disabled for Google accounts.
            </AppText>
          ) : null}

          <View style={profileStyles.card}>
            <Row
              label={linkingGoogle ? "Linking Google..." : "Link Google"}
              onPress={onLinkGoogle}
              disabled={isOAuthUser || linkingGoogle}
              rightIcon='logo-google'
            />
          </View>

          {isOAuthUser ? (
            <AppText style={[profileStyles.oauthHint, { color: C.text }]}>
              Your account is already linked to Google.
            </AppText>
          ) : null}

          <View style={profileStyles.card}>
            <Row label="Change Password" onPress={onChangePassword} disabled={isOAuthUser}/>
          </View>

          {isOAuthUser ? (
            <AppText style={[profileStyles.oauthHint, { color: C.text }]}>
              Password changes are managed through your sign in provider.
            </AppText>
          ) : null}

          <View style={[profileStyles.card, { backgroundColor: C.card }]}>
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
            {
              backgroundColor: C.logoutBg,
              borderColor: C.isDark ? "rgba(255,255,255,0.10)" : "transparent",
              borderWidth: C.isDark ? 1 : 0
            },
            pressed && profileStyles.logoutButtonPressed,
          ]}
          android_ripple={{ color: C.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)" }}
        >
          <AppText style={[profileStyles.logoutText, { color: C.text }]}>Log Out</AppText>
        </Pressable>

        <AppText style={[profileStyles.dangerTitle, { color: C.text }]}>DANGER ZONE</AppText>
        <View style={profileStyles.dangerWrap}>
          <Pressable
            onPress={onDeleteAccount}
            style={({ pressed }) => [
              profileStyles.deleteButton,
              pressed && profileStyles.deleteButtonPressed,
            ]}
            android_ripple={{ color: "rgba(255,255,255,0.14)" }}
          >
            <AppText style={[profileStyles.deleteText, { color: C.text }]}>Delete Account</AppText>
            <Ionicons name="trash-outline" size={20} color={C.icon} />
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Modal to show account details */}
      <Modal visible={accountModalVisible} transparent animationType="fade" onRequestClose={() => setAccountModalVisible(false)}>
        <View style={profileStyles.modalBackdrop}>
          <View style={profileStyles.accountModalCard}>
            <AppText style={profileStyles.accountModalTitle}>Account Details</AppText>

            <View style={profileStyles.detailRow}>
              <AppText style={profileStyles.detailLabel}>Email</AppText>
              <AppText style={profileStyles.detailValue}>{accountEmail || "—"}</AppText>
            </View>

            <View style={profileStyles.detailDivider} />

            <View style={profileStyles.detailRow}>
              <AppText style={profileStyles.detailLabel}>Account Type</AppText>
              <AppText style={profileStyles.detailValue}>
                {isOAuthUser ? "Google" : "Email"}
              </AppText>
              <View style={{height: 12}}/>
              <Row
                label={linkingGoogle ? "Linking Google..." : "Link Google"}
                onPress={onLinkGoogle}
                disabled={isOAuthUser || linkingGoogle}
                rightIcon='logo-google'
                pressedBg="rgba(0,0,0,0.1)"
              />
            </View>

            <Pressable
              onPress={() => setAccountModalVisible(false)}
              style={({ pressed }) => [
                profileStyles.detailCloseButton,
                pressed && { opacity: 0.85 },
              ]}
              android_ripple={{ color: "rgba(0,0,0,0.08)" }}
            >
              <AppText style={profileStyles.detailCloseButtonText}>Close</AppText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal to change email */}
      <Modal visible={emailModalVisible} transparent animationType="fade" onRequestClose={() => setEmailModalVisible(false)}>
        <View style={profileStyles.modalBackdrop}>
          <View style={profileStyles.accountModalCard}>
            <AppText style={profileStyles.accountModalTitle}>Change Email</AppText>
            <TextInput
              value={accountEmail}
              onChangeText={setAccountEmail}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter new email"
              keyboardType="email-address"
              style={profileStyles.modalInput}
            />
            <View style={profileStyles.modalButtons}>
              <Pressable
                onPress={() => setEmailModalVisible(false)}
                style={({ pressed }) => [
                  profileStyles.modalButton,
                  profileStyles.modalCancelButton,
                  pressed && profileStyles.modalButtonPressed,
                ]}
              >
                <AppText style={profileStyles.modalCancelButtonText}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  onChangeEmail(accountEmail);
                  setEmailModalVisible(false);
                }}
                style={({ pressed }) => [
                  profileStyles.modalButton,
                  profileStyles.modalButtonPrimary,
                  pressed && profileStyles.modalButtonPressed,
                ]}
              >
                <AppText style={profileStyles.modalButtonPrimaryText}>Submit</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal to select preferred language */}
      <Modal visible={langModalVisible} transparent animationType="fade" onRequestClose={() => setLangModalVisible(false)}>
        <Pressable style={profileStyles.modalBackdrop} onPress={() => setLangModalVisible(false)}>
          <Pressable style={profileStyles.dropdownCard} onPress={() => {}}>
            <AppText style={profileStyles.dropdownTitle}>Select Preferred Language</AppText>

            {langOptions.map((opt) => {
              const selected = opt.label === preferredLanguage;
              return (
                <Pressable key={opt.code} style={[profileStyles.dropdownRow, selected && profileStyles.dropdownRowSelected,]}
                  onPress={() => onSelectLanguage(opt.label)}
                >
                  <AppText style={profileStyles.dropdownRowText}>{opt.label}</AppText>
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
            <AppText style={profileStyles.pwModalTitle}>Change Password</AppText>

            <AppText style={profileStyles.modalLabel}>New Password</AppText>
            <TextInput
              value={pw1}
              onChangeText={setPw1}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter new password"
              style={profileStyles.modalInput}
            />

            <AppText style={profileStyles.modalLabel}>Confirm Password</AppText>
            <TextInput
              value={pw2}
              onChangeText={setPw2}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="re-type password"
              style={profileStyles.modalInput}
            />
            {pwError ? <AppText style={profileStyles.modalError}>{pwError}</AppText> : null}

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
                <AppText style={profileStyles.modalCancelButtonText}>Cancel</AppText>
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
                <AppText style={profileStyles.modalButtonPrimaryText}>{pwSubmitting ? "Saving..." : "Submit"}</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calibration Modal */}
      <Modal
        transparent
        visible={calibVis}
        animationType="fade"
        onRequestClose={closeCalibModal}
      >
        <View style={profileStyles.calibBackground}>
          <Pressable style={profileStyles.calibBackdrop} onPress={closeCalibModal}/>
          <View style={profileStyles.calibCenter} pointerEvents="box-none">
            <View style={profileStyles.calibModalCard}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={profileStyles.calibBodyContent}
                showsVerticalScrollIndicator keyboardShouldPersistTaps="handled"
              >
                <AppText style={profileStyles.calibTitle}>Tune Responses</AppText>

                {calibLoad ? (
                  <View style={profileStyles.calibLoadRow}>
                    <AppText style={profileStyles.calibLoadTxt}>Loading...</AppText>
                  </View>
                ) : calibErr ? (
                  <AppText style={profileStyles.calibErrTxt}>{calibErr}</AppText>
                ) : (
                  <View style={profileStyles.calibOptsRow}>
                    <Pressable
                      style={profileStyles.calibOpt}
                      onPress={() => openCalibExpanded("lower")}
                      disabled={calibLoad || !!calibErr}
                    >
                      <View style={profileStyles.calibOptHeader}>
                        <AppText style={profileStyles.calibOptHeaderTxt}> Option A - Lower</AppText>
                      </View>
                      <AppText style={profileStyles.calibOptTxt}>{calibLowerTxt}</AppText>
                    </Pressable>

                    <Pressable
                      style={profileStyles.calibOpt}
                      onPress={() => openCalibExpanded("higher")}
                      disabled={calibLoad || !!calibErr}
                    >
                      <View style={profileStyles.calibOptHeader}>
                        <AppText style={profileStyles.calibOptHeaderTxt}> Option B - Higher</AppText>
                      </View>
                      <AppText style={profileStyles.calibOptTxt}>{calibHigherTxt}</AppText>
                    </Pressable>
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
                    <AppText style={profileStyles.calibChoiceTxt}>Choose Option A</AppText>
                  </Pressable>

                  <Pressable
                    style={[profileStyles.calibBtn, profileStyles.calibBtnStay]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("stay");
                    }}
                  >
                    <AppText style={profileStyles.calibChoiceDarkTxt}>Neither - Don't change</AppText>
                  </Pressable>

                  <Pressable
                    style={[profileStyles.calibBtn, profileStyles.calibBtnHigh]}
                    disabled={calibLoad}
                    onPress={async () => {
                      await setCalibChoice("higher");
                    }}
                  >
                    <AppText style={profileStyles.calibChoiceTxt}>Choose Option B</AppText>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Option Expander Modal */}
      <Modal
        transparent
        visible={calibExpandVis}
        animationType="fade"
        onRequestClose={closeCalibExpanded}
      >
        <View style={profileStyles.calibBackground}>
          <Pressable style={profileStyles.calibBackdrop} onPress={closeCalibExpanded}/>
          <View style={profileStyles.calibCenter} pointerEvents="box-none">
            <View style={profileStyles.calibModalCard}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 6,
                  paddingTop: 4,
                  marginBottom: 6,
                }}
              >
                <AppText style={profileStyles.calibTitle}>{calibExpandTitle}</AppText>
                <Pressable onPress={closeCalibExpanded} hitSlop={10}>
                  <Ionicons name="close" size={26} color={"black"} />
                </Pressable>
              </View>

              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={profileStyles.calibBodyContent}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                <AppText style={profileStyles.calibOptTxt}>{calibExpandText}</AppText>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
