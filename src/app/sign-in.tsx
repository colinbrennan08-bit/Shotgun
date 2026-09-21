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
  const { sendSignInLink, isLocalOnly } = useSession();

  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Live feedback while typing: name the campus before they commit, rather
  // than failing after the tap.
  const detected = useMemo(() => {
    if (!email.includes('@')) return null;
    const check = checkEmail(email);
    return check.ok ? check.school : null;
  }, [email]);

  async function handleSend() {
    setBusy(true);
    setError(null);
    const result = await sendSignInLink(email);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    // With no backend this already signed them in and the route guard takes
    // over. Only the real flow waits on an email.
    if (!isLocalOnly) setStep('sent');
  }

  function handleStartOver() {
    setStep('email');
    setError(null);
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <ThemedText style={styles.wordmark}>Shotgun</ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          Find a ride home with people from your school.
        </ThemedText>
      </View>

      {step === 'email' ? (
        <View style={styles.form}>
          <Field
            label="School email"
            placeholder="you@calpoly.edu"
            value={email}
            onChangeText={(next) => {
              setEmail(next);
              if (error) setError(null);
            }}
            onSubmitEditing={handleSend}
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
            label={isLocalOnly ? 'Continue' : 'Email me a sign-in link'}
            onPress={handleSend}
            loading={busy}
            disabled={email.trim().length === 0}
          />
        </View>
      ) : (
        <View style={styles.form}>
          <ThemedText style={styles.sentTitle}>Check your email</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            We sent a sign-in link to {email}. Open it and you are in. The link expires
            shortly, and it signs in whichever device you open it on, so use the one you want
            to browse rides on.
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Nothing after a minute or two? Check spam.
          </ThemedText>

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {error}
            </ThemedText>
          ) : null}

          <Button label="Send it again" onPress={handleSend} loading={busy} />
          <Button label="Use a different email" variant="secondary" onPress={handleStartOver} />
        </View>
      )}

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

        {isLocalOnly ? (
          <View style={[styles.devNote, { borderColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.danger, fontWeight: '700' }}>
              Demo mode
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              No backend is connected, so nothing here is shared. Any address on a supported
              domain signs straight in with no email sent, the trips are samples, and anything
              you post stays in this browser.
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
  sentTitle: {
    fontSize: 22,
    fontWeight: '700',
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
