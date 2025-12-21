import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';

import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const TAB_BG = "#f2a679ff";        // navbar background color
const ICON_INACTIVE = "#000000"; // iconcolor
const ICON_ACTIVE = "#FFFFFF";   // selected icon color
const BOOKMARK = "#8c311cff";   // bookmark color
const BMSIZE = 60;

function TabIcon({
  focused,
  children,
}: {
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.iconSlot} pointerEvents="none">
      {focused && (
        <FontAwesome
          name="bookmark"
          size={BMSIZE}
          color={BOOKMARK}
          style={styles.bookmarkBg}
        />
      )}

      <View style={styles.foreground}>{children}</View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ 
        headerShown: false,
        tabBarButton: HapticTab,

        tabBarStyle: {
          backgroundColor: TAB_BG,
          borderTopWidth: 0,
          height: 90,
          paddingTop: 14,
          overflow: "visible",  
        },

        tabBarInactiveTintColor: ICON_INACTIVE,
        tabBarActiveTintColor: ICON_ACTIVE,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Entypo
                size={28}
                name="home"
                color={focused ? ICON_ACTIVE : ICON_INACTIVE}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="documents"
        options={{
          title: "Documents",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <Entypo
                size={28}
                name="documents"
                color={focused ? ICON_ACTIVE : ICON_INACTIVE}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="camera"
        options={{
          title: "Camera",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <FontAwesome
                size={28}
                name="camera"
                color={focused ? ICON_ACTIVE : ICON_INACTIVE}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="todo-list"
        options={{
          title: "To-Do List",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <FontAwesome
                size={28}
                name="list"
                color={focused ? ICON_ACTIVE : ICON_INACTIVE}
              />
            </TabIcon>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused}>
              <FontAwesome
                size={28}
                name="user"
                color={focused ? ICON_ACTIVE : ICON_INACTIVE}
              />
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconSlot: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },

  bookmarkBg: {
    position: "absolute",
    top: -8,
    transform: [{scaleY: 1.5}],
  },

  foreground: {
    zIndex: 1,
  },
});
