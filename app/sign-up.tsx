import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { styles } from "@/constants/styles";
import { useRouter } from "expo-router";
import { Pressable, Text, TextInput, View, Image } from "react-native";

export default function SignUpScreen() {

  const router = useRouter();


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
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          backgroundColor: '#F8F4F9'
        }}
      />

      <Pressable
        onPress={() => router.replace('/log-in')}
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