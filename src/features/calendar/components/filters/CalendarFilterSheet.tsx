import { useEffect, useState, type FC, type ReactNode } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import type { SvgProps } from 'react-native-svg';

import AssignmentIcon from '../../../../../assets/icons/calendar/event-types/assignment.svg';
import PersonalIcon from '../../../../../assets/icons/calendar/event-types/personal.svg';
import StudyIcon from '../../../../../assets/icons/calendar/event-types/study.svg';
import WellnessIcon from '../../../../../assets/icons/calendar/event-types/wellness.svg';
import CloseIcon from '../../../../../assets/icons/calendar/close.svg';
import type { CalendarSource } from '../../../../models/CalendarEvent';
import type { CalendarFilters, EventTypeFilter } from '../../utils/calendarFilters';
import { EVENT_SOURCE_LABELS } from '../../utils/eventLabels';
import { DatePickerPanel } from '../addEvent/DatePickerPanel';
import { SourceLogo } from '../SourceLogo';
import { styles } from './CalendarFilterSheet.styles';
import { FilterToggle } from './FilterToggle';

// Order, names, and icon sizes from the Figma "Calendar settings" rows, then
// "No type" for events without one (most imported events).
const TYPE_ROWS: { type: EventTypeFilter; label: string; Icon?: FC<SvgProps>; iconSize?: number }[] = [
  { type: 'class', label: 'Classes' },
  { type: 'assignment', label: 'Assignments', Icon: AssignmentIcon, iconSize: 28 },
  { type: 'study', label: 'Study sessions', Icon: StudyIcon, iconSize: 28 },
  { type: 'personal', label: 'Personal', Icon: PersonalIcon, iconSize: 28 },
  { type: 'wellness', label: 'Wellness', Icon: WellnessIcon, iconSize: 30 },
  { type: 'none', label: 'No type' },
];

const SOURCES: CalendarSource[] = ['rise', 'google', 'apple', 'canvas'];

type DateEnd = 'from' | 'to';

/** Adds the item if it's missing, or removes it if it's there. */
function toggled<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

interface CalendarFilterSheetProps {
  visible: boolean;
  /** What's shown on the calendar now; the sheet starts from these. */
  filters: CalendarFilters;
  /** Called by Done with the new choices. */
  onApply: (filters: CalendarFilters) => void;
  /** The ✕: closes without changing anything. */
  onClose: () => void;
}

/**
 * "Show on calendar" (Figma "Calendar settings", #79), opened from the •••
 * button. Choices only take effect on Done, so ✕ backs out of them.
 */
export function CalendarFilterSheet({ visible, filters, onApply, onClose }: CalendarFilterSheetProps) {
  const [draft, setDraft] = useState(filters);
  const [openDate, setOpenDate] = useState<DateEnd | null>(null);

  // Start fresh from the calendar's filters each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setOpenDate(null);
    }
  }, [visible, filters]);

  const pickDate = (end: DateEnd, picked: Date) => {
    const day = startOfDay(picked);

    setDraft((current) => {
      // Keep the range in order by moving the other end along when needed.
      if (end === 'from') {
        const toDate = current.toDate && isBefore(current.toDate, day) ? day : current.toDate;
        return { ...current, fromDate: day, toDate };
      }
      const fromDate = current.fromDate && isAfter(current.fromDate, day) ? day : current.fromDate;
      return { ...current, fromDate, toDate: day };
    });
    setOpenDate(null);
  };

  const clearDate = (end: DateEnd) => {
    setDraft((current) => ({ ...current, [end === 'from' ? 'fromDate' : 'toDate']: null }));
    setOpenDate(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} onPress={onClose}>
            <CloseIcon width={16.5} height={16.5} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.heading}>
            Show on calendar
          </Text>

          <Rows>
            {TYPE_ROWS.map(({ type, label, Icon, iconSize }) => (
              <ToggleRow
                key={type}
                label={label}
                on={!draft.hiddenTypes.includes(type)}
                onPress={() => setDraft((current) => ({ ...current, hiddenTypes: toggled(current.hiddenTypes, type) }))}
                icon={
                  type === 'class' ? (
                    <Image
                      source={require('../../../../../assets/icons/calendar/event-types/class.png')}
                      style={styles.classIcon}
                      resizeMode="contain"
                      accessibilityIgnoresInvertColors
                    />
                  ) : Icon ? (
                    <Icon width={iconSize} height={iconSize} />
                  ) : (
                    <View style={styles.noTypeIcon} />
                  )
                }
              />
            ))}
          </Rows>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionHeading}>
              Sources
            </Text>
            <Rows>
              {SOURCES.map((source) => (
                <ToggleRow
                  key={source}
                  label={EVENT_SOURCE_LABELS[source]}
                  on={!draft.hiddenSources.includes(source)}
                  onPress={() =>
                    setDraft((current) => ({ ...current, hiddenSources: toggled(current.hiddenSources, source) }))
                  }
                  icon={<SourceLogo source={source} size={24} />}
                />
              ))}
            </Rows>
          </View>

          <View style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionHeading}>
              Dates
            </Text>
            <Rows>
              {(['from', 'to'] as const).map((end) => {
                const date = end === 'from' ? draft.fromDate : draft.toDate;
                const label = end === 'from' ? 'From' : 'To';

                return (
                  <View key={end}>
                    <View style={styles.row}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${label}, ${date ? format(date, 'EEEE, MMMM d, yyyy') : 'Any date'}`}
                        accessibilityState={{ expanded: openDate === end }}
                        onPress={() => setOpenDate((open) => (open === end ? null : end))}
                        style={({ pressed }) => [styles.row, { flex: 1 }, pressed && styles.rowPressed]}
                      >
                        <Text style={styles.label}>{label}</Text>
                        <Text style={[styles.dateValue, !date && styles.dateValueEmpty]}>
                          {date ? format(date, 'MMM d, yyyy') : 'Any'}
                        </Text>
                      </Pressable>
                      {date && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Clear ${label} date`}
                          hitSlop={12}
                          onPress={() => clearDate(end)}
                        >
                          <Text style={styles.clearDate}>Clear</Text>
                        </Pressable>
                      )}
                    </View>
                    {openDate === end && (
                      <View style={styles.datePicker}>
                        <DatePickerPanel selectedDate={date} onSelect={(picked) => pickDate(end, picked)} />
                      </View>
                    )}
                  </View>
                );
              })}
            </Rows>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => onApply(draft)}
            style={({ pressed }) => [styles.doneButton, pressed && styles.rowPressed]}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

/** Puts a divider between each row, as in Figma. */
function Rows({ children }: { children: ReactNode[] }) {
  return (
    <View>
      {children.map((child, index) => (
        <View key={index}>
          {index > 0 && <View style={styles.divider} />}
          {child}
        </View>
      ))}
    </View>
  );
}

function ToggleRow({ label, on, icon, onPress }: { label: string; on: boolean; icon: ReactNode; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.label}>{label}</Text>
      <FilterToggle on={on} />
    </Pressable>
  );
}
