import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { Pressable, Text, TextInput, View } from "react-native";

export default function LogInScreen() {
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: 28,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        Sign In
      </Text>

      <DisplayLogoWithStyle />

      <TextInput
        placeholder="Email Address"
        placeholderTextColor='#7F7F7F'
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
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
          marginBottom: 24,
          backgroundColor: '#F8F4F9'
        }}
      />

      <Pressable
        style={{
          backgroundColor: "#809BCE",
          padding: 14,
          borderRadius: 8,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "600",
            textAlign: "center",
          }}
        >
          Log In
        </Text>
      </Pressable>
    </View>
  );
}