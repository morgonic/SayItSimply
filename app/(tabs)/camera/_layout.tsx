import { Stack } from "expo-router";

export default function CameraLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reader" />
    </Stack>
  );
}