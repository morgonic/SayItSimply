import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { Pressable, Text, TextInput, View } from "react-native";

export default function LogInScreen() {
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
          marginBottom: 24,
          backgroundColor: '#F8F4F9'
        }}
      />

      <Pressable
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
    </View>
  );
}