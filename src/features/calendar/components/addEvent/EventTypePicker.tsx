import type { FC } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import AssignmentIcon from '../../../../../assets/icons/calendar/event-types/assignment.svg';
import AssignmentSelectedIcon from '../../../../../assets/icons/calendar/event-types/assignment-selected.svg';
import PersonalIcon from '../../../../../assets/icons/calendar/event-types/personal.svg';
import PersonalSelectedIcon from '../../../../../assets/icons/calendar/event-types/personal-selected.svg';
import StudyIcon from '../../../../../assets/icons/calendar/event-types/study.svg';
import StudySelectedIcon from '../../../../../assets/icons/calendar/event-types/study-selected.svg';
import WellnessIcon from '../../../../../assets/icons/calendar/event-types/wellness.svg';
import WellnessSelectedIcon from '../../../../../assets/icons/calendar/event-types/wellness-selected.svg';
import type { CalendarEventType } from '../../../../models/CalendarEvent';
import { eventTypeButtonColors } from '../../calendarColors';
import { styles } from './EventTypePicker.styles';

type IconPair = { default: FC<SvgProps>; selected: FC<SvgProps>; size: number };

// Order, labels, and icons from the Figma "Event Type Picker". Class is drawn
// as an image in Figma, so it's handled separately below.
const EVENT_TYPES: { type: CalendarEventType; label: string; icons?: IconPair }[] = [
  { type: 'class', label: 'Class' },
  { type: 'assignment', label: 'Assignment', icons: { default: AssignmentIcon, selected: AssignmentSelectedIcon, size: 24 } },
  { type: 'study', label: 'Study', icons: { default: StudyIcon, selected: StudySelectedIcon, size: 24 } },
  { type: 'personal', label: 'Personal', icons: { default: PersonalIcon, selected: PersonalSelectedIcon, size: 24 } },
  { type: 'wellness', label: 'Wellness', icons: { default: WellnessIcon, selected: WellnessSelectedIcon, size: 28 } },
];

interface EventTypePickerProps {
  selectedType: CalendarEventType | null;
  /** Tapping the chosen type again clears it, since type is optional. */
  onChange: (type: CalendarEventType | null) => void;
  disabled?: boolean;
}

/**
 * The five Type buttons on the Add Event form. Only one can be chosen; it turns
 * green with a white icon and label.
 */
export function EventTypePicker({
  selectedType,
  onChange,
  disabled = false,
}: EventTypePickerProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {EVENT_TYPES.map(({ type, label, icons }) => {
        const isSelected = type === selectedType;
        const buttonColors = eventTypeButtonColors[isSelected ? 'selected' : type];
        const Icon = icons && (isSelected ? icons.selected : icons.default);

        return (
          <Pressable
            key={type}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{
              checked: isSelected,
              disabled,
            }}
            disabled={disabled}
            onPress={() =>
              onChange(
                isSelected
                  ? null
                  : type,
              )
            }
            style={[styles.button, { backgroundColor: buttonColors.background, borderColor: buttonColors.border }]}
          >
            <View style={styles.iconBox}>
              {Icon && icons ? (
                <Icon width={icons.size} height={icons.size} />
              ) : (
                <Image
                  source={require('../../../../../assets/icons/calendar/event-types/class.png')}
                  // The cap is one image; tinting it turns it white when selected, like the other icons.
                  style={[styles.classIcon, isSelected && styles.selectedClassIcon]}
                  accessibilityIgnoresInvertColors
                />
              )}
            </View>
            {/* One line always; if larger text settings make it too wide, iOS shrinks it a little instead of wrapping. */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.label, isSelected && styles.selectedLabel]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
