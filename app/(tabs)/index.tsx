import DisplayLogoWithStyle from "@/components/ui/DisplayLogoWithStyle";
import { styles } from "@/constants/styles";
import { Pressable, Text, TextInput, View, Image } from "react-native";
import { router } from "expo-router";

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
          textAlign: 'center',
          marginBottom: 10,
          color: '#ECC8AF'
        }}
      >
        SayItSimply
      </Text>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          textAlign: 'center',
          marginBottom: 10,
          color: '#ECC8AF'
        }}
      >
        Dashboard
      </Text>

      <Pressable
        onPress={() => router.push('/log-in')}
        style={{
          backgroundColor: '#809BCE',
          padding: 12,
          borderRadius: 8,
          marginTop: 16,
          marginBottom: 16,
          alignItems: 'center'
        }}
      >
        <Text style={{
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '600'
        }}
      >
        Go to Log In
      </Text>
      </Pressable>
    </View>
  );
}