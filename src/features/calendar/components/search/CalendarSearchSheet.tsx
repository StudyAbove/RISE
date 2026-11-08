import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { format, parseISO } from 'date-fns';

import ClearIcon from '../../../../../assets/icons/calendar/clear.svg';
import CloseIcon from '../../../../../assets/icons/calendar/close.svg';
import SearchIcon from '../../../../../assets/icons/calendar/search.svg';
import type { CalendarEvent, CalendarEventType } from '../../../../models/CalendarEvent';
import { searchCalendarEvents } from '../../../../repositories/calendarEventsRepository';
import { colors } from '../../../../theme/colors';
import { isAllDayEvent } from '../../utils/allDayEvents';
import { normalizeSearchTerm } from '../../utils/calendarSearch';
import { EventTypeCircle } from '../EventTypeCircle';
import { RESULT_CIRCLE_SIZE, RESULT_ICON_SIZE, styles } from './CalendarSearchSheet.styles';

// Searches once typing pauses, not on every key.
const SEARCH_DELAY_MS = 300;

type TypeChip = 'all' | CalendarEventType;

// Order from the Figma "Search" frame, then the other two types.
const TYPE_CHIPS: { chip: TypeChip; label: string }[] = [
  { chip: 'all', label: 'All' },
  { chip: 'personal', label: 'Personal' },
  { chip: 'assignment', label: 'Assignments' },
  { chip: 'class', label: 'Classes' },
  { chip: 'study', label: 'Study sessions' },
  { chip: 'wellness', label: 'Wellness' },
];

type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

/** "Mon, Nov 14 9:30 AM", with the year when it isn't this year (AC5). */
export function formatSearchResultTime(event: CalendarEvent, now = new Date()): string {
  const start = parseISO(event.startAt);
  const date = format(start, start.getFullYear() === now.getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');

  return isAllDayEvent(event) ? `${date} · All day` : `${date} ${format(start, 'h:mm a')}`;
}

interface CalendarSearchSheetProps {
  visible: boolean;
  onClose: () => void;
  /** A result was tapped (AC6). */
  onSelectEvent: (event: CalendarEvent) => void;
  /** iOS only: called once the sheet has finished sliding away. */
  onDismiss?: () => void;
}

/**
 * Calendar search (Figma "Search", #78), opened from the header's search
 * button. Searches every event, whatever "Show on calendar" hides; the type
 * chips narrow the results.
 */
export function CalendarSearchSheet({ visible, onClose, onSelectEvent, onDismiss }: CalendarSearchSheetProps) {
  const [term, setTerm] = useState('');
  const [chip, setChip] = useState<TypeChip>('all');
  const [results, setResults] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');

  // Each time search opens, it starts empty.
  useEffect(() => {
    if (visible) {
      setTerm('');
      setChip('all');
      setResults([]);
      setStatus('idle');
    }
  }, [visible]);

  const search = normalizeSearchTerm(term);

  useEffect(() => {
    if (!search) {
      setResults([]);
      setStatus('idle');
      return;
    }

    // Ignores a slow answer that arrives after the student kept typing.
    let isCurrent = true;
    setStatus('loading');

    const timer = setTimeout(() => {
      searchCalendarEvents(search)
        .then((found) => {
          if (isCurrent) {
            setResults(found);
            setStatus('ready');
          }
        })
        .catch((error: Error) => {
          if (isCurrent) {
            console.log('Could not search calendar events:', error.message);
            setStatus('error');
          }
        });
    }, SEARCH_DELAY_MS);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [search]);

  const shown = chip === 'all' ? results : results.filter((event) => event.eventType === chip);

  return (
    <Modal
      testID="calendar-search-sheet"
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.sheet}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} onPress={onClose}>
            <CloseIcon width={16.5} height={16.5} />
          </Pressable>
        </View>

        <View style={styles.searchBar}>
          <SearchIcon width={20.5} height={20.5} />
          <TextInput
            accessibilityLabel="Search calendar"
            placeholder="Search events"
            placeholderTextColor={colors.mutedGrayGreen}
            value={term}
            onChangeText={setTerm}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {term.length > 0 && (
            // AC7: clearing goes back to an empty search.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={12}
              onPress={() => setTerm('')}
              style={styles.clearButton}
            >
              <ClearIcon width={11} height={11} />
            </Pressable>
          )}
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {TYPE_CHIPS.map(({ chip: value, label }) => {
              const isSelected = chip === value;

              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setChip(value)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.results}>
          {status === 'loading' && <ActivityIndicator style={styles.loading} color={colors.eucalyptus} />}

          {status === 'error' && (
            <Text accessibilityRole="alert" style={styles.message}>
              Couldn&apos;t search your calendar. Check your connection and try again.
            </Text>
          )}

          {status === 'ready' && shown.length === 0 && (
            // AC8
            <Text accessibilityRole="alert" style={styles.message}>
              No events match &ldquo;{search}&rdquo;
            </Text>
          )}

          {status === 'ready' &&
            shown.map((event) => {
              const time = formatSearchResultTime(event);

              return (
                <View key={event.id}>
                  <View style={styles.divider} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={[event.title, time, event.location].filter(Boolean).join(', ')}
                    onPress={() => onSelectEvent(event)}
                    style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
                  >
                    <EventTypeCircle type={event.eventType} size={RESULT_CIRCLE_SIZE} iconSize={RESULT_ICON_SIZE} />
                    <View style={styles.resultText}>
                      <Text numberOfLines={2} style={styles.resultTitle}>
                        {event.title}
                      </Text>
                      <Text style={styles.resultDetail}>{time}</Text>
                      {event.location ? <Text style={styles.resultDetail}>{event.location}</Text> : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}

          {status === 'ready' && shown.length > 0 && <View style={styles.divider} />}
        </ScrollView>
      </View>
    </Modal>
  );
}
