import { useTheme } from "@/app/context/ThemeContext";
import { getFaceIdCapability, getSavedFaceIdCredentials, promptFaceIdAuth } from "@/app/face_id";
import storage from "@/app/storage";
import AppText from "@/components/TextSize";
import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { styles } from "@/constants/styles";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, TextInput, View } from "react-native";

WebBrowser.maybeCompleteAuthSession()

const api_url = process.env.EXPO_PUBLIC_API_URL;

console.log("API URL:", api_url);

type SavedFaceIdState = {
  faceIdToken: string | null;
  deviceId: string | null;
  email: string | null;
};

async function faceIdLogin(params: { deviceId: string; faceIdToken: string }) {
  const res = await fetch(`${api_url}/auth/faceid/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      device_id: params.deviceId,
      face_id_token: params.faceIdToken,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Face ID sign in failed.");
  }

  return res.json();
}

export default function LogInScreen() {
  const { refreshTheme } = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [checkingFaceId, setCheckingFaceId] = useState(true);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [savedFaceId, setSavedFaceId] = useState<SavedFaceIdState>({
    faceIdToken: null,
    deviceId: null,
    email: null
  });
  const [faceIdLabel, setFaceIdLabel] = useState("Face ID Sign In");
  const faceIdReady = useMemo(() => {
    return !!savedFaceId.faceIdToken && !!savedFaceId.deviceId;
  }, [savedFaceId]);

  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [saved, capability] = await Promise.all([
          getSavedFaceIdCredentials(),
          getFaceIdCapability(),
        ]);
        setSavedFaceId(saved);
        setFaceIdLabel("Sign In with Face ID");

      } catch (e) {
        console.warn("Face ID preload failed:", e);
      } finally {
        setCheckingFaceId(false);
      }
    })();
  }, []);



  // route to dashboard or onboarding after checking user onboarding_done flag
  async function routeAfterLogin(accessToken: string) {
    await storage.setItem("access_token", accessToken);
    await storage.setItem("token_type", "bearer");

    const response = await fetch(`${api_url}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}`}
    });

    if (!response.ok) {
      await storage.deleteItem("access_token");
      await storage.deleteItem("token_type");
      router.replace('/log-in');
      return;
    }

    const user = await response.json();
    const onboarded = (user.onboarding_done === true);

    await refreshTheme();

    router.replace(onboarded ? '/(tabs)' : '/onboarding');
  }
  
  async function logIn() {
    try {
      const body = new URLSearchParams({
        username: email.trim(),
        password: password
      });

      const response = await fetch(`${api_url}/auth/jwt/login`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      });

      if (!response.ok) {
        throw new Error(`Login failed: HTTP ${response.status}`);
      }

      const json = await response.json();
      await routeAfterLogin(json.access_token);
    }
    catch (e: any) {
      Alert.alert(`Login failed: ${e.message}`);
    }
  }

  async function handleFaceIdLogin() {
    try {
      if (faceIdLoading) return;
      setFaceIdLoading(true);

      const saved = await getSavedFaceIdCredentials();
      if (!saved.faceIdToken || !saved.deviceId) {
        Alert.alert("Face ID Setup Required", "Face ID sign in is not set up on yet.");
        return;
      }

      const capability = await getFaceIdCapability();
      if (!capability.hasHardware) {
        Alert.alert("Face ID not Available", "This device does not have the required hardware to support Face ID.");
        return;
      }
      if (!capability.isEnrolled) {
        Alert.alert("Face ID Setup Required", "Set up Face ID in your device settings.");
        return;
      }

      const auth = await promptFaceIdAuth("Sign in using Face ID");
      if (!auth.success) {
        return;
      }

      const data = await faceIdLogin({
        deviceId: saved.deviceId,
        faceIdToken: saved.faceIdToken
      });

      await routeAfterLogin(data.access_token);
    } catch (e: any) {
      Alert.alert("Sign In Failed", e?.message ?? "Could not sign in with Face ID.");
    } finally {
      setFaceIdLoading(false);
    }
  }

  async function continueWithGoogle() {
    try {
      // deep link redirect URL for browser to return to after oauth
      const redirectUrl = Linking.createURL("oauth");
      // start oauth with authorize endpoint in browser
      const startUrl = `${api_url}/auth/google/authorize?ts=${Date.now()}`;

      // launch expo web browser auth session
      // wait to return to redirect url
      const result = await WebBrowser.openAuthSessionAsync(startUrl, redirectUrl)

      // if login didn't complete or was cancelled, exit
      if (result.type !== "success" || !result.url) {
        return;
      }

      // get oauth tokens url fragment after #
      const fragment = result.url.split("#")[1] ?? "";
      // parse fragment into key/value pairs
      const params = new URLSearchParams(fragment);

      // get jwt access token
      const access_token = params.get("access_token");
      // get token type
      const token_type = params.get("token_type") ?? "bearer";

      if (!access_token) {
        throw new Error("Google login succeeded but no access token was returned.");
      }

      // navigate to main app or onboarding
      await routeAfterLogin(access_token);
    }
    catch (e: any) {
      Alert.alert("Google sign in failed", e.message);
    }
  }


  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
        backgroundColor: '#0D1321'
      }}
    >
      <AppText
        style={{
          fontSize: 34.56,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 10,
          color: '#ECC8AF',
        }}
      >
        SayItSimply
      </AppText>

      <DisplayLogoWithStyle />

      <AppText
        style={{
          fontSize: 16,
          fontWeight: "600",
          fontStyle: 'italic',
          textAlign: "center",
          marginBottom: 10,
          color: '#ECC8AF'
        }}
      >
        Read, Translate, Simplify
      </AppText>

      <TextInput
        placeholder="Email Address"
        placeholderTextColor='#7F7F7F'
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginTop: 32,
          marginBottom: 16,
          backgroundColor: '#F8F4F9'
        }}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor='#7F7F7F'
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          backgroundColor: '#F8F4F9'
        }}
      />

      {!checkingFaceId && faceIdReady ? (
        <Pressable
          onPress={handleFaceIdLogin}
          disabled={faceIdLoading}
          style={{
            backgroundColor: "#F8F4F9",
            padding: 12,
            borderRadius: 8,
            marginBottom: 12,
            opacity: faceIdLoading ? 0.7 : 1
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8
            }}
          >
            <Ionicons
              name={"scan-outline"}
              size={22}
              color="#000000"
            />
            <AppText
              style={{
                color: "#000000",
                fontWeight: "700",
                textAlign: "center",
                fontSize: 14
              }}
            >
              {faceIdLoading ? "Checking..." : faceIdLabel}
            </AppText>
          </View>
        </Pressable>
      ) : null}

      <Pressable
        onPress={logIn}
        style={{
          backgroundColor: "#809BCE",
          padding: 12,
          borderRadius: 8
        }}
      >
        <AppText
          style={{
            color: "white",
            fontWeight: "700",
            textAlign: "center",
            fontSize: 14
          }}
        >
          Log In
        </AppText>
      </Pressable>

      <Pressable
        onPress={() => setForgotPasswordVisible(true)}
        style={{
          marginTop: 12
        }}
      >
        <AppText
          style={{
            color: "white",
            fontWeight: "600",
            textAlign: "right",
            fontSize: 14
          }}
        >
          Forgot Password?
        </AppText>
      </Pressable>

      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <AppText style={styles.separatorText}>or</AppText>
        <View style={styles.separatorLine} />
      </View>      

      <Pressable
        onPress={continueWithGoogle}
        style={{
          backgroundColor: '#F8F4F9',
          padding: 8,
          borderRadius: 8,
          marginBottom: 12
        }}
      >
        <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
          <Image
            source={require('../assets/images/google-logo.png')}
            style={{
              width: 27,
              height: 27,
              marginRight: 8
            }}
          />
          <AppText
            style={{
              color: "#000000",
              fontWeight: "600",
              textAlign: "center",
              fontSize: 14
            }}
          >
            Continue with Google
          </AppText>
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/sign-up")}
        style={{
          backgroundColor: "#809BCE",
          padding: 12,
          borderRadius: 8
        }}
      >
        <AppText
          style={{
            color: "white",
            fontWeight: "700",
            textAlign: "center",
            fontSize: 14
          }}
        >
          Sign Up with Email
        </AppText>
      </Pressable>

      <AppText
        style={{
          color: '#F8F4F9',
          fontSize: 12,
          textAlign: 'center',
          marginTop: 24
        }}
      >
        By logging in, you agree to our <AppText style={{color: '#7F7F7F'}}>Terms of Service</AppText> and <AppText style={{color: '#7F7F7F'}}>Privacy Policy</AppText>
      </AppText>

      {forgotPasswordVisible ? (
        <Modal
          visible={forgotPasswordVisible}
          transparent
          animationType='fade'
          onRequestClose={() => setForgotPasswordVisible(false)}
        >
          <Pressable
            onPress={() => setForgotPasswordVisible(false)}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24
            }}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 24
              }}
            >
              <AppText style={{fontSize: 18, fontWeight: '700', marginBottom: 12}}>
                Forgot Password
              </AppText>

              <TextInput
                placeholder="Enter your email address"
                placeholderTextColor='#7F7F7F'
                autoCapitalize="none"
                keyboardType="email-address"
                value={forgotPasswordEmail}
                onChangeText={setForgotPasswordEmail}
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  backgroundColor: '#F8F4F9'
                }}
              />

              <Pressable
                onPress={() => {
                  Alert.alert("Password Reset", "If an account with that email exists, a password reset link has been sent.");
                }}
                style={{
                  backgroundColor: "#809BCE",
                  padding: 12,
                  borderRadius: 8
                }}
              >
                <AppText
                  style={{
                    color: "white",
                    fontWeight: "700",
                    textAlign: "center",
                    fontSize: 14
                  }}
                >
                  Send Reset Link
                </AppText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}