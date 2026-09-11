import { Stack } from 'expo-router';

/**
 * The signed-in area. Tabs are the root; posting and trip detail push over them
 * so the tab bar stays put and back always means back.
 */
export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="post"
        options={{ presentation: 'modal', title: 'New post' }}
      />
      <Stack.Screen name="trip/[id]" options={{ title: 'Trip' }} />
    </Stack>
  );
}
