import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import storage from '../../storage';
import React, { useEffect, useState } from "react";
import { Stack } from 'expo-router';

// base api url from .env
const api_url = process.env.EXPO_PUBLIC_API_URL;

// toggle button component for settings
function ToggleButton({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: boolean; 
  onChange: (value: boolean) => void | Promise<void>; 
  disabled: boolean; 
}) {
  return (
    // pressable switch control
    <Pressable
      accessibilityRole='switch'
      accessibilityState={{ checked: value, disabled }}
      onPress={() => !disabled && onChange(!value)}
      style={[styles.toggle, value ? {backgroundColor: "#9DB17C"} : {backgroundColor: "#E65F5C"}]}
      hitSlop={8}
    >
      {/* movable knob */}
      <View
        style={[
          styles.toggleKnob,
          value ? [styles.toggleKnobOn, {backgroundColor: "#9DB17C"}] 
          : [styles.toggleKnobOff, {backgroundColor: "#E65F5C"}]
        ]}
      >
        {/* inner colored dot */}
        <View
          style={[
            styles.toggleDot,
            { backgroundColor: value ? "#9DB17C" : "#E65F5C"}
          ]}
        />
      </View>
    </Pressable>
  )
}

// load access token from storage
async function getAccessToken(): Promise<string | null> {
  const token = await storage.getItem("access_token");
  return token ?? null;
}

// settings screen
export default function SettingsScreen() {

  // loading state for initial settings
  const [loading, setLoading] = useState(true);
  // saving state for updating settings
  const [saving, setSaving] = useState(false);
  // challenge mode toggle state
  const [challengeMode, setChallengeMode] = useState(false);
  
  // fetch current user settings
  useEffect(() => {
    (async () => {
      try {
        // check for valid api url
        if (!api_url) {
          throw new Error("EXPO_PUBLIC_API_URL is not set.");
        }
        // get access token
        const token = await getAccessToken();
        if (!token) {
          throw new Error("You are not logged in.");
        }
        // get current user settings using token
        const response = await fetch(`${api_url}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        // error if bad response
        if (!response.ok) {
          throw new Error("Failed to load settings.");
        }
        // parse response json
        const user = await response.json();
        // set toggle value from parsed json response
        setChallengeMode(Boolean(user.challenge_mode));
      } catch (e: any) {
        // show error to user
        Alert.alert("Error:", e?.message ?? "Unknown error");
      }
      finally {
        // stop loading
        setLoading(false);
      }
    })();
  }, []); // run once on mount

  // persist challenge mode settings on backend
  const updateChallengeMode = async (next: boolean) => {
    // keep previous value in case of failure
    const prev = challengeMode;
    // update
    setChallengeMode(next);
    setSaving(true);

    try {
      // check for valid api url
      if (!api_url) {
        throw new Error("EXPO_PUBLIC_API_URL is not set.");
      }
      // get access token to check auth
      const token = await getAccessToken();
      if (!token) {
        throw new Error("You are not logged in.");
      }
      // patch user settings
      const response = await fetch(`${api_url}/users/me`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // send new bool value for challenge mode
        body: JSON.stringify({challenge_mode: next})
      });
      // error if failure
      if (!response.ok) {
        throw new Error("Failed to save.");
      }
    }
    catch (e: any) {
      // show error message
      Alert.alert("Error", e?.message ?? "Unknown error");
      // revert to previous saved value
      setChallengeMode(prev);
    }
    finally {
      // enable toggle, not saving
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: "Settings",
          headerShown: true,
          headerTitleAlign: 'center',
          headerBackVisible: true,
          headerBackButtonDisplayMode: 'generic'
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.list}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Challenge Mode</Text>
            {loading ? (
              <ActivityIndicator />
            ) : (
              <ToggleButton
                value={challengeMode}
                onChange={updateChallengeMode}
                disabled={saving}
              />
            )}
          </View>

          <Text style={styles.hint}>
            When enabled, text will be simplified less than your current simplification level.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  list: {
    width: '100%',
    maxWidth: 420
  },
  row: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rowLabel: {
    fontSize: 18,
    color: '#000000'
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    color: "#604D53"
  },

  toggle: {
    width: 54,
    height: 28,
    borderWidth: 4,
    borderColor: '#000000',
    borderRadius: 21,
    backgroundColor: "#E8E1EF",
    padding: 14
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: '#F8F4F9',
    borderWidth: 4,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 4
  },
  toggleKnobOn: { 
    right: 4 
  },
  toggleKnobOff: { 
    left: 4 
  },
  toggleDot: {
    width: 12,
    height: 12,
    borderRadius: 99
  }
});