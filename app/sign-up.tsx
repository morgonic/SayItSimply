import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { styles } from "@/constants/styles";
import { useRouter } from "expo-router";
import { Pressable, Text, TextInput, View, Image, Alert } from "react-native";
import { useState } from "react";
import storage from "./storage";

const api_url = 'http://127.0.0.1:8000';

export default function SignUpScreen() {

  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  async function createAccount() {
    if (doPasswordsMatch() === true) {  
      try {
        const response = await fetch(`${api_url}/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email: email.trim(), password: password})
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        };

        const body = new URLSearchParams({ username: email.trim(), password: password});

        const loginResponse = await fetch(`${api_url}/auth/jwt/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });

        if (!loginResponse.ok) { 
          throw new Error(`HTTP ${loginResponse.status}`)
        };

        const json = await loginResponse.json();

        await storage.setItem("access_token", json.access_token);

        router.replace('/(tabs)');

        console.log(`Account created for ${email}`);
      }
      catch (e: any) {
        Alert.alert(`Failed to create account: ${e.message}`);
      }
    }
    else {
      Alert.alert("Passwords do not match. Please try again.");
    }
  }

  function doPasswordsMatch() {
    return password === confirmPassword;
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
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 10,
          color: '#ECC8AF',
        }}
      >
        Create an account
      </Text>

      <Text
        style={{
          fontSize: 14,
          fontWeight: "500",
          textAlign: "center",
          marginBottom: 10,
          color: '#ECC8AF',
        }}
      >
        Enter your email and password to sign up
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
          marginTop: 24,
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

      <TextInput
        placeholder="Confirm Password"
        placeholderTextColor='#7F7F7F'
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          backgroundColor: '#F8F4F9'
        }}
      />

      <Pressable
        onPress={createAccount}
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
          Sign Up
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.replace('/log-in')}
        style={{
          marginTop: 12
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "600",
            textAlign: "center",
            fontSize: 14
          }}
        >
          Already have an account? Log In
        </Text>
      </Pressable>

      <View style={styles.separatorContainer}>
        <View style={styles.separatorLine} />
        <Text style={styles.separatorText}>or</Text>
        <View style={styles.separatorLine} />
      </View>

      <Pressable
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

      <Text
        style={{
          color: '#F8F4F9',
          fontSize: 12,
          textAlign: 'center',
          marginTop: 24
        }}
      >
        By creating an account, you agree to our <Text style={{color: '#7F7F7F'}}>Terms of Service</Text> and <Text style={{color: '#7F7F7F'}}>Privacy Policy</Text>
      </Text>
    </View>
  );
}