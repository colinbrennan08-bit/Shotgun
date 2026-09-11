import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { schoolName } from '@/lib/schools';
import { useSession } from '@/lib/session';
import { useTrips } from '@/lib/trips';
import { CONTACT_METHODS, type ContactMethod } from '@/lib/types';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, signOut, updateProfile } = useSession();
  const { myTrips, joinCount } = useTrips();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [contactMethod, setContactMethod] = useState<ContactMethod>(
    profile?.contactMethod ?? 'instagram'
  );
  const [contactHandle, setContactHandle] = useState(profile?.contactHandle ?? '');
  const [saved, setSaved] = useState(false);

  if (!profile) return null;

  const method = CONTACT_METHODS.find((m) => m.value === contactMethod);
  const dirty =
    displayName !== profile.displayName ||
    contactMethod !== profile.contactMethod ||
    contactHandle !== profile.contactHandle;

  async function handleSave() {
    await updateProfile({
      displayName: displayName.trim() || 'Student',
      contactMethod,
      contactHandle: contactHandle.trim(),
    });
    setSaved(true);
  }

  return (
    <Screen contentStyle={{ paddingBottom: BottomTabInset + Spacing.five }}>
      <ThemedText style={styles.title}>Profile</ThemedText>

      <View style={[styles.identity, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="smallBold">{profile.email}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {schoolName(profile.schoolId)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {myTrips.length} {myTrips.length === 1 ? 'post' : 'posts'} · {joinCount} joined
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        Your school comes from your email address and cannot be changed here. That is what keeps
        the board to people you actually go to school with.
      </ThemedText>

      <Field
        label="Display name"
        value={displayName}
        onChangeText={(next) => {
          setDisplayName(next);
          setSaved(false);
        }}
        placeholder="Your name"
        autoCapitalize="words"
        hint="Shown on everything you post."
      />

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          How people reach you
        </ThemedText>
        <Segmented
          options={CONTACT_METHODS.map(({ value, label }) => ({ value, label }))}
          value={contactMethod}
          onChange={(next) => {
            setContactMethod(next);
            setSaved(false);
          }}
        />
      </View>

      <Field
        label={method?.label ?? 'Contact'}
        value={contactHandle}
        onChangeText={(next) => {
          setContactHandle(next);
          setSaved(false);
        }}
        placeholder={method?.hint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={contactMethod === 'phone' ? 'phone-pad' : 'default'}
        hint="Only shown to someone at your school who asks to join one of your trips."
        error={
          contactHandle.trim().length === 0
            ? 'Without this, nobody can reach you about your posts.'
            : undefined
        }
      />

      <Button label={saved && !dirty ? 'Saved' : 'Save'} onPress={handleSave} disabled={!dirty} />

      <View style={styles.footer}>
        <Button label="How Shotgun works" variant="secondary" onPress={() => router.push('/terms')} />
        <Button label="Sign out" variant="danger" onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  identity: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  section: {
    gap: Spacing.two,
  },
  footer: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
});
