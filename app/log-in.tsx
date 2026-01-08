import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { styles } from "@/constants/styles";
import { Pressable, Text, TextInput, View, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import storage from './storage';

WebBrowser.maybeCompleteAuthSession()

const api_url = process.env.EXPO_PUBLIC_API_URL;

console.log("API URL:", api_url);

export default function LogInScreen() {
  
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
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

      await storage.setItem("access_token", json.access_token);
      await storage.setItem("token_type", json.token_type ?? "bearer");

      router.replace("/onboarding");
    }
    catch (e: any) {
      Alert.alert(`Login failed: ${e.message}`);
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

      // persist token and type for future calls
      await storage.setItem("access_token", access_token);
      await storage.setItem("token_type", token_type);

      // navigate to main app
      router.replace('/(tabs)');
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
      <Text
        style={{
          fontSize: 34.56,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 10,
          color: '#ECC8AF',
        }}
      >
        SayItSimply
      </Text>

      <DisplayLogoWithStyle />

      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          fontStyle: 'italic',
          textAlign: "center",
          marginBottom: 10,
          color: '#ECC8AF',
        }}
      >
        Read, Translate, Simplify
      </Text>

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

      <Pressable
        onPress={logIn}
        style={{
          backgroundColor: "#809BCE",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "700",
            textAlign: "center",
            fontSize: 14
          }}
        >
          Log In
        </Text>
      </Pressable>

      <Pressable
        onPress={() => Alert.alert("Password reset functionality is not yet implemented.")}
        style={{
          marginTop: 12
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "600",
            textAlign: "right",
            fontSize: 14
          }}
        >
          Forgot Password?
        </Text>
      </Pressable>

      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>or</Text>
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
          <Text
            style={{
              color: "#000000",
              fontWeight: "600",
              textAlign: "center",
              fontSize: 14
            }}
          >
            Continue with Google
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => router.replace("/sign-up")}
        style={{
          backgroundColor: "#809BCE",
          padding: 12,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "700",
            textAlign: "center",
            fontSize: 14
          }}
        >
          Sign Up with Email
        </Text>
      </Pressable>

      <Text
        style={{
          color: '#F8F4F9',
          fontSize: 12,
          textAlign: 'center',
          marginTop: 24
        }}
      >
        By logging in, you agree to our <Text style={{color: '#7F7F7F'}}>Terms of Service</Text> and <Text style={{color: '#7F7F7F'}}>Privacy Policy</Text>
      </Text>
    </View>
  );
}