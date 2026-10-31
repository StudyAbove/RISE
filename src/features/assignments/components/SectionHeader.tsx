import { Pressable, Text, View } from 'react-native';

import { styles } from './SectionHeader.styles';

/**
 * A section title with its count and a link, e.g. "Due Today 3 View all".
 * Used by the Study page sections and List's Past section.
 */
export function SectionHeader({
  title,
  count,
  linkText,
  linkLabel,
  linkExpanded,
  onLinkPress,
}: {
  title: string;
  count: number;
  linkText: string;
  /** What VoiceOver reads for the link, when the text alone isn't clear. */
  linkLabel?: string;
  /** For links that open and close a section. */
  linkExpanded?: boolean;
  onLinkPress: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>

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
    </View>
  );
}
