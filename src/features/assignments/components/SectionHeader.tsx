import { Pressable, Text, View } from 'react-native';

import { colors } from '../../../theme/colors';
import { styles } from './SectionHeader.styles';

/**
 * Badge color for how much is due: light green for a light load, yellow
 * for a busier one, and a deeper yellow when it piles up. No red, so a busy
 * week doesn't look alarming.
 */
export function getWorkloadBadgeColor(count: number): string {
  if (count <= 2) return colors.mistGreen;
  if (count <= 5) return colors.paleSun;
  return colors.butterYellow;
}

/**
 * A section title with its count and an optional link, e.g. "Upcoming 3
 * View all".
 * Used by the Study page sections and List's Past section.
 */
export function SectionHeader({
  title,
  count,
  colorByWorkload = false,
  linkText,
  linkLabel,
  linkExpanded,
  onLinkPress,
}: {
  title: string;
  count: number;
  /** Color the count by how much is due, e.g. on Due Today and Upcoming. */
  colorByWorkload?: boolean;
  linkText?: string;
  /** What VoiceOver reads for the link, when the text alone isn't clear. */
  linkLabel?: string;
  /** For links that open and close a section. */
  linkExpanded?: boolean;
  onLinkPress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>

        <View
          style={[
            styles.countBadge,
            colorByWorkload && {
              backgroundColor: getWorkloadBadgeColor(count),
            },
          ]}
        >
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>

      {linkText && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={linkLabel}
          accessibilityState={
            linkExpanded === undefined ? undefined : { expanded: linkExpanded }
          }
          hitSlop={12}
          onPress={onLinkPress}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.link}>{linkText}</Text>
        </Pressable>
      )}
    </View>
  );
}
