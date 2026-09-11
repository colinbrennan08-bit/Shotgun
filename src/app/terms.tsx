import { Stack, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';

/**
 * Plain-language terms. Deliberately short: the whole legal posture is that
 * Shotgun is a noticeboard, takes no money, and arranges nothing.
 *
 * TODO(pre-launch): have someone who is not a first-year read this before the
 * app goes near the App Store.
 */
const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: 'Shotgun is a noticeboard',
    body: 'Students post trips they are already taking and trips they need. Shotgun shows you those posts and hands you a way to contact the person. It does not arrange, book, schedule, or supervise any ride. Whatever you agree to, you agree to directly with the other student.',
  },
  {
    heading: 'Shotgun never handles money',
    body: 'Posts can list a suggested share of gas. That number is a suggestion between two students splitting the cost of a drive someone was making anyway. Shotgun does not collect it, hold it, process it, or take a cut, and nobody is charging anyone a fare.',
  },
  {
    heading: 'Check who you are riding with',
    body: 'Everyone here signed in with a verified school email, and you only see people from your own school. That is a real filter and it is not a background check. Tell someone where you are going, meet somewhere public, and get out of any situation that feels wrong.',
  },
  {
    heading: 'If you are the one driving',
    body: 'You are responsible for your own licence, registration, and insurance. Personal auto policies commonly exclude carrying passengers for payment, which is another reason a post lists a gas split and not a fare. If you are unsure how your policy treats carpooling, ask your insurer before you post.',
  },
  {
    heading: 'Ground rules',
    body: 'Use your real name. Do not post on behalf of anyone who is not a student. Do not use Shotgun to run a paid driving service, to sell anything, or to harass anyone. Accounts that do lose access.',
  },
];

export default function TermsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'How Shotgun works' }} />
      <Screen>
        <ThemedText style={styles.title}>How Shotgun works</ThemedText>

        {SECTIONS.map((section) => (
          <View key={section.heading} style={styles.section}>
            <ThemedText style={styles.heading}>{section.heading}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {section.body}
            </ThemedText>
          </View>
        ))}

        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
  },
  section: {
    gap: Spacing.two,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
  },
});
