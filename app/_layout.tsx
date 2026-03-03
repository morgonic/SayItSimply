import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { TextSizeProvider } from '@/app/context/TextSizeContext';
//import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppThemeProvider, useTheme } from '@/app/context/ThemeContext';

export const unstable_settings = {
  initialRouteName: 'index',
};

//export default function RootLayout() {
  //const colorScheme = useColorScheme();
function RootNav() {
  const { darkMode } = useTheme();

  useEffect(() => {
    const url = Linking.createURL("oauth");
    console.log("MOBILE_REDIRECT_URL:", url);
    console.log("EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL);
  }, []);

  //<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}> original callout
  return (
      <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="log-in" options={{ headerShown: false }} />
          <Stack.Screen name="sign-up" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style={darkMode ? "light" : "dark"}/>
      </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <TextSizeProvider>
      <AppThemeProvider>
        <RootNav/>
      </AppThemeProvider>
    </TextSizeProvider>
  );
}
