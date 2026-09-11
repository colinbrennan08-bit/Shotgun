import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

/**
 * Native tab bar for iOS and Android, where it already sits at the bottom.
 * The web build uses `app-tabs.web.tsx` instead, because NativeTabs renders a
 * fixed bar across the top there.
 */
export default function AppTabs() {
  return (
    <NativeTabs
      tintColor={Colors.light.tint}
      labelStyle={{ selected: { color: Colors.light.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Rides</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} md="directions_car" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'bookmark', selected: 'bookmark.fill' }}
          md="bookmark"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
