import { Text, View } from "react-native";

export default function CameraScreen() {
    return (
        <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "600", textAlign: "center" }}>
        Camera
      </Text>
      <Text style={{ marginTop: 8, textAlign: "center" }}>
        This is the camera screen
      </Text>
    </View>
    );
}