import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

type Props = {
  description: string | null;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

/**
 * Keep the original instructions available without generating a summary.
 * Longer descriptions start at three lines and can expand in place.
 */
export function AssignmentDescription({
  description,
  expanded,
  onExpandedChange,
}: Props) {
  const [hasMoreLines, setHasMoreLines] = useState(false);
  const descriptionText = description?.trim() || 'No description provided';

  return (
    <View style={styles.container}>
      <View>
        {/* Measure the full text at the same width as the visible text.
            This copy is invisible and hidden from screen readers. */}
        <Text
          style={[styles.description, styles.measurement]}
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          onTextLayout={({ nativeEvent }) => {
            setHasMoreLines(nativeEvent.lines.length > 3);
          }}
        >
          {descriptionText}
        </Text>

        {/* Show the full Canvas description without inventing a summary. */}
        <Text
          style={styles.description}
          numberOfLines={expanded ? undefined : 3}
          ellipsizeMode="tail"
        >
          {descriptionText}
        </Text>
      </View>

      {hasMoreLines && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? 'Show less assignment description'
              : 'Read full assignment description'
          }
          accessibilityState={{ expanded }}
          onPress={() => onExpandedChange(!expanded)}
          style={({ pressed }) => [
            styles.toggleButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.toggleText}>
            {expanded ? 'Show less' : 'Read more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  description: {
    ...textStyles.caption,
    fontSize: 13,
    lineHeight: 20,
    color: colors.mutedGrayGreen,
  },
  measurement: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },
  toggleButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  toggleText: {
    ...textStyles.link,
    color: colors.eucalyptus,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.7,
  },
});