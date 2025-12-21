import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { View, StyleSheet } from 'react-native';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';

type Props = {
  focused: boolean;
  color: string;
  icon:
    | { lib: "FontAwesome"; name: React.ComponentProps<typeof FontAwesome>["name"] }
    | { lib: "Entypo"; name: React.ComponentProps<typeof Entypo>["name"] };
};

export function TabIcon({ focused, color, icon}: Props) {
  return (
    <View style={styles.container}>
      {icon.lib === "FontAwesome" ? (
        <FontAwesome name={icon.name} size={26} color={color} />
      ) : (
        <Entypo name={icon.name} size={26} color={color} />
      )}

      {focused && (
        <View style={styles.bookmark}>
          <FontAwesome name="bookmark" size={10} color={"#8c311cff"} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmark: {
    position: "absolute",
    right: -2,
    top: -2,
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={{ lib: "Entypo", name: "home" }}
              />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={{ lib: "Entypo", name: "documents" }}
              />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={{ lib: "FontAwesome", name: "camera" }}
              />
          ),
        }}
      />
      <Tabs.Screen
        name="todo-list"
        options={{
          title: "To-Do List",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={{ lib: "FontAwesome", name: "list" }}
              />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              focused={focused}
              color={color}
              icon={{ lib: "Entypo", name: "user" }}
              />
          ),
        }}
      />
    </Tabs>
  );
}
