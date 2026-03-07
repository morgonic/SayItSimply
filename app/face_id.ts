import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const FACE_ID_TOKEN_KEY = "face_id_login_token";
const FACE_ID_DEVICE_KEY = "face_id_device_id";
const FACE_ID_EMAIL_KEY = "face_id_email";

function createId() {
    return `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(FACE_ID_DEVICE_KEY);
  if (existing) return existing;

  const created = createId();
  await SecureStore.setItemAsync(FACE_ID_DEVICE_KEY, created, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return created;
}

export async function getFaceIdCapability() {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  const hasFace = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

  return {
    hasHardware,
    isEnrolled,
    hasFace,
    supportedTypes,
    supportedForApp: hasHardware
  };
}

export async function promptFaceIdAuth(promptMessage: string) {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    fallbackLabel: "Use Passcode",
    disableDeviceFallback: false,
  });
}

export async function saveFaceIdCredentials(params: {
  faceIdToken: string;
  email?: string | null;
}) {
  const deviceId = await getDeviceId();

  if (typeof params.faceIdToken !== "string" || !params.faceIdToken.trim()) {
    throw new Error("Face ID token is missing or invalid.");
  }

  if (typeof deviceId !== "string" || !deviceId.trim()) {
    throw new Error("Device ID is missing or invalid.");
  }

  await SecureStore.setItemAsync(FACE_ID_TOKEN_KEY, String(params.faceIdToken), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  await SecureStore.setItemAsync(FACE_ID_DEVICE_KEY, String(deviceId), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  if (params.email) {
    await SecureStore.setItemAsync(FACE_ID_EMAIL_KEY, String(params.email), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}

export async function getSavedFaceIdCredentials() {
  const [faceIdToken, deviceId, email] = await Promise.all([
    SecureStore.getItemAsync(FACE_ID_TOKEN_KEY),
    SecureStore.getItemAsync(FACE_ID_DEVICE_KEY),
    SecureStore.getItemAsync(FACE_ID_EMAIL_KEY)
  ]);

  return {
    faceIdToken,
    deviceId,
    email,
  };
}

export async function clearFaceIdCredentials() {
  await Promise.all([
    SecureStore.deleteItemAsync(FACE_ID_TOKEN_KEY),
    SecureStore.deleteItemAsync(FACE_ID_DEVICE_KEY),
    SecureStore.deleteItemAsync(FACE_ID_EMAIL_KEY),
  ]);
}