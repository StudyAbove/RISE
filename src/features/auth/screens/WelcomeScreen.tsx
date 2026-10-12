import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../../../theme/colors';
import { fonts } from '../../../theme/typography';

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingBottom: Math.max(insets.bottom, 18),
        },
      ]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.heroSection}>
        <Image
          source={require('../../../../assets/images/auth/rise-welcome-hero.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>
          A healthier and{'\n'}
          brighter study{'\n'}
          experience.
        </Text>

        <View style={styles.buttonSection}>
          <Pressable
            style={({ pressed }) => [
              styles.createAccountButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              navigation.navigate('CreateAccount');
            }}
            accessibilityRole="button"
            accessibilityLabel="Create Account"
          >
            <View style={styles.createAccountButtonContent}>
              <Text style={styles.createAccountButtonText}>
                Create Account
              </Text>
              
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              navigation.navigate('Login');
            }}
            accessibilityRole="button"
            accessibilityLabel="Log In"
          >
            <Text style={styles.loginButtonText}>
              Log In
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },

  scrollContent: {
    flexGrow: 1,
    backgroundColor: colors.warmCream,
  },

  heroSection: {
    width: '100%',
    height: 550,
    backgroundColor: colors.warmCream,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  content: {
    flex: 1,
    paddingHorizontal: 28,
    marginTop: -70,
    justifyContent: 'flex-start',
  },

  title: {
    fontFamily: fonts.heading.bold,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
    color: colors.deepOlive,
  },

  buttonSection: {
    marginTop: 26,
    gap: 12,
  },

  createAccountButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.eucalyptus,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  createAccountButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  createAccountButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.softWhite,
  },

  arrow: {
    position: 'absolute',
    right: 4,
    fontFamily: fonts.heading.bold,
    fontSize: 24,
    lineHeight: 26,
    color: colors.softWhite,
  },

  loginButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.eucalyptus,
    backgroundColor: colors.warmCream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  loginButtonText: {
    fontFamily: fonts.body.semiBold,
    fontSize: 16,
    color: colors.deepOlive,
  },

  buttonPressed: {
    opacity: 0.82,
  },
});