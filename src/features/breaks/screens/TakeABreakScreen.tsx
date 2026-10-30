import {
  useMemo,
  useState,
} from 'react';

import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  BackButton,
} from '../../../components/BackButton';

import {
  colors,
} from '../../../theme/colors';

import {
  textStyles,
} from '../../../theme/typography';

import {
  BreakDetailsCard,
} from '../components/BreakDetailsCard';

import {
  BREAK_CONTENT_WIDTH,
} from '../constants';

import {
  BreakTypeSelector,
} from '../components/BreakTypeSelector';

import {
  StartSessionSlider,
} from '../components/StartSessionSlider';

import {
  getRecommendedBreaks,
} from '../utils/breakRecommendations';

import type {
  BreakType,
} from '../types';

export function TakeABreakScreen() {
  const breakOptions =
    useMemo(
      () =>
        getRecommendedBreaks(3),
      [],
    );

  const [
    selectedBreak,
    setSelectedBreak,
  ] = useState<BreakType>(
    breakOptions[0],
  );

  return (
    <SafeAreaView
      style={styles.screen}
    >
      <View
        style={styles.header}
      >
        <BackButton />

        <Text
          accessibilityRole="header"
          style={styles.title}
        >
          Take a Break
        </Text>

        <View
          style={
            styles.headerSpacer
          }
        />
      </View>

      <View
        style={
          styles.content
        }
      >
        <BreakTypeSelector
          options={breakOptions}
          selectedId={
            selectedBreak.id
          }
          onSelect={
            setSelectedBreak
          }
        />

        {selectedBreak.image && (
          <Image
            source={
              selectedBreak.image
            }
            accessibilityLabel={
              `${selectedBreak.label} break illustration`
            }
            resizeMode="cover"
            style={styles.breakImage}
          />
        )}

        <BreakDetailsCard
          breakType={
            selectedBreak
          }
        />

        <View
          style={
            styles.sliderContainer
          }
        >
          <StartSessionSlider />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor:
        colors.warmCream,
    },

    header: {
      height: 59,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    title: {
      ...textStyles.screenHeading,
      color:
        colors.deepOlive,
      textAlign: 'center',
      fontSize: 20,
      lineHeight: 24,
      letterSpacing: 0.1,
    },

    headerSpacer: {
      width: 40,
      height: 40,
    },

    content: {
      alignItems: 'center',
      paddingTop: 0,
    },

    breakImage: {
      width:
        BREAK_CONTENT_WIDTH,
      height:
        BREAK_CONTENT_WIDTH,
      marginTop: 14,
      marginBottom: 14,
      borderRadius: 20,
    },

    sliderContainer: {
      marginTop: 14,
      alignItems: 'center',
    },

  });
