import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddIcon from '../../../../assets/icons/calendar/add.svg';
import ChevronLeftIcon from '../../../../assets/icons/calendar/chevron-left.svg';
import MoreIcon from '../../../../assets/icons/calendar/more.svg';
import SearchIcon from '../../../../assets/icons/calendar/search.svg';
import { styles } from './CalendarHeader.styles';
import { LabelGlow } from './LabelGlow';

// Figma tucks the action icons 9pt up into the bottom of the status bar area.
const ACTION_ROW_STATUS_BAR_OVERLAP = 9;

// Extends the 24pt icons' tap area to 44pt (Apple's minimum).
const HIT_SLOP = 10;

interface CalendarHeaderProps {
  /** Shown between the arrows, e.g. "November 2026". */
  title: string;
  /** VoiceOver labels for the arrows, e.g. "Previous month". */
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  /** Opens the Add Event form. */
  onAddEvent: () => void;
}

/** Top of the Calendar page: sun-and-hills banner, action icons, and the period label with ‹ › arrows. */
export function CalendarHeader({
  title,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onAddEvent,
}: CalendarHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top - ACTION_ROW_STATUS_BAR_OVERLAP, 0) },
      ]}
    >
      <Image
        source={require('../../../../assets/rise-header.png')}
        style={styles.hero}
        resizeMode="stretch"
        accessibilityIgnoresInvertColors
      />

      {/* The ••• menu and search are built in later stories, so they're disabled
          for now (VoiceOver reads them as "dimmed"). */}
      <View style={styles.actionRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" hitSlop={HIT_SLOP} disabled>
          <View style={styles.iconBox}>
            <MoreIcon width={23} height={5} />
          </View>
        </Pressable>
        <View style={styles.trailingActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add event" hitSlop={HIT_SLOP} onPress={onAddEvent}>
            <AddIcon width={24} height={24} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Search" hitSlop={HIT_SLOP} disabled>
            <View style={styles.iconBox}>
              <SearchIcon width={20.5} height={20.5} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.periodRow}>
        {/* Soft cream glow that keeps the label readable over the banner. */}
        <View pointerEvents="none" style={styles.labelBackdrop}>
          <LabelGlow width={252} height={82} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previousLabel}
          hitSlop={HIT_SLOP}
          onPress={onPrevious}
          style={styles.arrowButton}
        >
          <ChevronLeftIcon width={9.9} height={13.9} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.periodLabel}>
          {title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          hitSlop={HIT_SLOP}
          onPress={onNext}
          style={styles.arrowButton}
        >
          {/* Figma draws the right arrow as the left one flipped. */}
          <View style={styles.flipped}>
            <ChevronLeftIcon width={9.9} height={13.9} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}
