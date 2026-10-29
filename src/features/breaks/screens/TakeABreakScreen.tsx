import {
  useMemo,
  useState,
} from 'react';

import {
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
  BreakTypeSelector,
} from '../components/BreakTypeSelector';

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

        {/*
         * Issue #12 ends with selecting and visually
         * highlighting the active break.
         *
         * Issue #18 will render the selected break's
         * image, information card, and Start Session
         * slider below this selector.
         */}
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
      lineHeight: 20,
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

  });
