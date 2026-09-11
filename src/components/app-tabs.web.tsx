import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { BottomTabInset, Colors } from '@/constants/theme';

/**
 * Web tab bar.
 *
 * NativeTabs on web renders a `position: fixed` bar across the top of the page,
 * which is not where a phone app puts its tabs. The JS tab navigator gives us the
 * same three tabs pinned to the bottom, matching iOS and Android.
 */
const TABS = [
  { name: 'index', title: 'Rides', icon: 'car' },
  { name: 'trips', title: 'Trips', icon: 'bookmark' },
  { name: 'profile', title: 'Profile', icon: 'person' },
] as const;

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.textSecondary,
        tabBarStyle: {
          height: BottomTabInset,
          backgroundColor: Colors.light.background,
          borderTopColor: Colors.light.border,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}>
      {TABS.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons name={focused ? icon : `${icon}-outline`} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
