import {
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  format,
  isSameMonth,
  isToday,
} from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { getMonthGridDays } from '../utils/calendarDates';
import { getDaySegments } from '../utils/calendarEvents';
import { EventChip } from './EventChip';
import { styles } from './MonthGrid.styles';

const WEEKDAY_LETTERS = [
  'S',
  'M',
  'T',
  'W',
  'T',
  'F',
  'S',
];

const DAYS_PER_WEEK = 7;

// Two mini chips and a "+N more" line are all that fit under the date.
const MAX_CHIPS_PER_DAY = 2;

interface MonthGridProps {
  /** Any day in the month to show. */
  month: Date;

  /** Events for the visible weeks; each is listed on the day(s) it falls on. */
  events: CalendarEvent[];

  /** IDs of events that currently have unresolved calendar conflicts. */
  conflictEventIds?: ReadonlySet<string>;

  /** Called when a date's conflict marker is selected. */
  onConflictPress?: (
    events: CalendarEvent[],
  ) => void;

  /** Called when the student selects an event. */
  onEventPress?: (
    event: CalendarEvent,
  ) => void;

  /** Called with a day's date when its "+N more" is tapped, to open that day. */
  onShowDay?: (
    day: Date,
  ) => void;
}

/**
 * Monthly calendar: weekday letters over a grid of dates, with today circled
 * and up to two events under each date ("+N more" when there are others).
 */
export function MonthGrid({
  month,
  events,
  conflictEventIds,
  onConflictPress,
  onEventPress,
  onShowDay,
}: MonthGridProps) {
  const days =
    getMonthGridDays(month);

  const weeks =
    Array.from(
      {
        length:
          days.length /
          DAYS_PER_WEEK,
      },
      (_, week) =>
        days.slice(
          week *
            DAYS_PER_WEEK,
          (week + 1) *
            DAYS_PER_WEEK,
        ),
    );

  return (
    <View>
      {/* Each date already has its full weekday in its VoiceOver label, so the
          ambiguous single letters (T, S) are hidden from VoiceOver. */}
      <View
        style={styles.weekdayRow}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {WEEKDAY_LETTERS.map(
          (letter, index) => (
            <Text
              key={index}
              style={
                styles.weekdayLetter
              }
            >
              {letter}
            </Text>
          ),
        )}
      </View>

      {weeks.map((week) => (
        <View
          key={
            week[0].toISOString()
          }
          style={styles.weekRow}
        >
          {week.map(
            (day, index) => {
              const isLastColumn =
                index ===
                DAYS_PER_WEEK -
                  1;

              // Days from the neighboring months keep their cell
              // so the grid lines stay aligned.
              if (
                !isSameMonth(
                  day,
                  month,
                )
              ) {
                return (
                  <View
                    key={
                      day.toISOString()
                    }
                    style={[
                      styles.dayCell,
                      isLastColumn &&
                        styles.lastColumn,
                    ]}
                  />
                );
              }

              const today =
                isToday(day);

              const dayEvents =
                getDaySegments(
                  events,
                  day,
                ).map(
                  (segment) =>
                    segment.event,
                );

              const conflictedDayEvents =
                dayEvents.filter(
                  (event) =>
                    conflictEventIds?.has(
                      event.id,
                    ) ?? false,
                );

              const conflictCount =
                conflictedDayEvents.length;

              const hiddenCount =
                dayEvents.length -
                MAX_CHIPS_PER_DAY;

              const dateLabel =
                `${today ? 'Today, ' : ''}${format(
                  day,
                  'EEEE, MMMM d',
                )}`;

              const eventLabel =
                dayEvents.length ===
                0
                  ? dateLabel
                  : `${dateLabel}, ${dayEvents.length} ${
                      dayEvents.length ===
                      1
                        ? 'event'
                        : 'events'
                    }`;

              const label =
                conflictCount > 0
                  ? `${eventLabel}, ${conflictCount} calendar ${
                      conflictCount === 1
                        ? 'conflict'
                        : 'conflicts'
                    }`
                  : eventLabel;

              return (
                <View
                  key={
                    day.toISOString()
                  }
                  accessibilityLabel={
                    label
                  }
                  style={[
                    styles.dayCell,
                    isLastColumn &&
                      styles.lastColumn,
                  ]}
                >
                  <View
                    style={
                      styles.dayNumberArea
                    }
                  >
                    <View
                      style={[
                        styles.dayNumberBox,
                        today &&
                          styles.todayCircle,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          today &&
                            styles.todayNumber,
                        ]}
                      >
                        {format(
                          day,
                          'd',
                        )}
                      </Text>
                    </View>

                    {conflictCount >
                      0 && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${conflictCount} calendar ${
                          conflictCount ===
                          1
                            ? 'conflict'
                            : 'conflicts'
                        } on ${format(
                          day,
                          'MMMM d',
                        )}`}
                        hitSlop={8}
                        onPress={() =>
                          onConflictPress?.(
                            conflictedDayEvents,
                          )
                        }
                        style={
                          styles.conflictMarker
                        }
                      >
                        <Text
                          style={
                            styles.conflictMarkerText
                          }
                        >
                          !
                        </Text>
                      </Pressable>
                    )}
                  </View>

                  <View
                    style={
                      styles.eventList
                    }
                  >
                    {dayEvents
                      .slice(
                        0,
                        MAX_CHIPS_PER_DAY,
                      )
                      .map(
                        (event) => (
                          <EventChip
                            key={
                              event.id
                            }
                            event={
                              event
                            }
                            size="mini"
                            onPress={
                              onEventPress
                            }
                          />
                        ),
                      )}

                    {hiddenCount >
                      0 && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${hiddenCount} more ${
                          hiddenCount ===
                          1
                            ? 'event'
                            : 'events'
                        } on ${dateLabel}`}
                        accessibilityHint="Opens this day"
                        hitSlop={4}
                        onPress={() =>
                          onShowDay?.(
                            day,
                          )
                        }
                      >
                        <Text
                          style={
                            styles.moreEvents
                          }
                        >
                          +
                          {
                            hiddenCount
                          }{' '}
                          more
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            },
          )}
        </View>
      ))}
    </View>
  );
}