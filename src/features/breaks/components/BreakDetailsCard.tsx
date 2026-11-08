import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  colors,
} from '../../../theme/colors';

import {
  fonts,
} from '../../../theme/typography';

import {
  BREAK_CONTENT_WIDTH,
} from '../constants';

import type {
  BreakType,
} from '../types';

type BreakDetailsCardProps = {
  breakType: BreakType;
};

export function BreakDetailsCard({
  breakType,
}: BreakDetailsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {breakType.title}
      </Text>

      <View style={styles.details}>
        <Text
          accessibilityLabel={
            `Best for: ${breakType.bestFor}`
          }
          style={styles.body}
        >
          <Text style={styles.label}>
            Best for:{' '}
          </Text>

          {breakType.bestFor}
        </Text>

        <Text
          accessibilityLabel={
            `Time: ${breakType.durationLabel}`
          }
          style={styles.body}
        >
          <Text style={styles.label}>
            Time:{' '}
          </Text>

          {breakType.durationLabel}
        </Text>

        <Text
          accessibilityLabel={
            `Benefit: ${breakType.benefit}`
          }
          style={styles.body}
        >
          <Text style={styles.label}>
            Benefit:{' '}
          </Text>

          {breakType.benefit}
        </Text>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    card: {
      width:
        BREAK_CONTENT_WIDTH,
      minHeight: 179,
      backgroundColor:
        colors.softWhite,
      borderWidth: 2,
      borderColor:
        colors.mistGreen,
      borderRadius: 20,
      paddingHorizontal: 28,
      paddingTop: 15,
      paddingBottom: 10,
    },

    title: {
      fontFamily:
        fonts.heading.bold,
      fontSize: 16,
      lineHeight: 22,
      color:
        colors.deepOlive,
      marginBottom: 5,
    },

    details: {
      gap: 4,
    },

    body: {
      fontFamily:
        fonts.body.regular,
      fontSize: 10,
      lineHeight: 15,
      letterSpacing: 0.5,
      color:
        colors.deepOlive,
    },

    label: {
      fontFamily:
        fonts.body.bold,
    },
  });
