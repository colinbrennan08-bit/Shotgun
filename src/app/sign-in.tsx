import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { checkEmail } from '@/lib/schools';
import { useSession } from '@/lib/session';

export default function SignInScreen() {
  const theme = useTheme();
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Live feedback while typing: tell them which campus the address resolved to
  // before they commit, rather than failing after the tap.
  const detected = useMemo(() => {
    if (!email.includes('@')) return null;
    const check = checkEmail(email);
    return check.ok ? check.school : null;
  }, [email]);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    const result = await signIn(email);
    if (!result.ok) setError(result.message);
    setBusy(false);
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <ThemedText style={styles.wordmark}>Shotgun</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Find a ride home with people from your school.
        </ThemedText>
      </View>

      <View style={styles.form}>
        <Field
          label="School email"
          placeholder="you@calpoly.edu"
          value={email}
          onChangeText={(next) => {
            setEmail(next);
            if (error) setError(null);
          }}
          onSubmitEditing={handleSignIn}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          returnKeyType="go"
          error={error ?? undefined}
          hint={
            detected
              ? `Signing in to ${detected.shortName}`
              : 'Your school is set from your email address.'
          }
        />

        <Button
          label="Continue"
          onPress={handleSignIn}
          loading={busy}
          disabled={email.trim().length === 0}
        />
      </View>

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          Shotgun is students only. Everyone you see here signed in with a verified school
          address, and you will only ever see trips posted by people at your own school.
        </ThemedText>

        <Link href="/terms" asChild>
          <ThemedText type="small" style={{ color: theme.tint, fontWeight: '600' }}>
            How Shotgun works and what it is not
          </ThemedText>
        </Link>

        {__DEV__ ? (
          <View style={[styles.devNote, { borderColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.danger, fontWeight: '700' }}>
              Dev build
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Sign-in is stubbed. Any address on a supported domain signs you straight in with no
              email sent. Real verification lands with the backend.
            </ThemedText>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'center',
    gap: Spacing.five,
  },
  hero: {
    gap: Spacing.two,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 50,
    letterSpacing: -1,
  },
  form: {
    gap: Spacing.three,
  },
  footer: {
    gap: Spacing.three,
  },
  devNote: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
});
