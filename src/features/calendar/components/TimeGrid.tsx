import {
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  format,
  isToday,
} from 'date-fns';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import {
  getDaySegments,
  layoutDaySegments,
} from '../utils/calendarEvents';
import { EventChip } from './EventChip';
import {
  EVENT_CHIP_MIN_HEIGHT,
  EVENT_TITLE_LINE_HEIGHT,
} from './EventChip.styles';
import {
  GRID_SIZES,
  styles,
  type TimeGridView,
} from './TimeGrid.styles';

const HOURS_IN_DAY = 24;

// Figma's hourly frames open with 7 AM near the top; earlier hours are a scroll away.
const INITIAL_VISIBLE_HOUR =
  7;

// "12 AM", "1 AM", … "11 PM". The date is a placeholder; only the hour is shown.
const HOUR_LABELS =
  Array.from(
    {
      length:
        HOURS_IN_DAY,
    },
    (_, hour) =>
      format(
        new Date(
          2000,
          0,
          1,
          hour,
        ),
        'h a',
      ),
  );

// How far right each overlapping event in Week starts, as a share of the column.
const WEEK_CASCADE_STEP_PERCENT =
  35;

// Keeps the last cascaded event at least this wide when many overlap.
const WEEK_CASCADE_MAX_OFFSET_PERCENT =
  70;

/**
 * Where an event sits across its day column. 2 Day and Day have room to split
 * the width between overlapping events. Week columns are about 49pt wide, too
 * narrow to split, so overlapping events cascade instead.
 */
function getHorizontalPlacement(
  view: TimeGridView,
  column: number,
  columnCount: number,
) {
  if (view !== 'week') {
    const width =
      100 / columnCount;

    return {
      left:
        `${column * width}%`,
      width: `${width}%`,
    } as const;
  }

  const step =
    columnCount > 1
      ? Math.min(
          WEEK_CASCADE_STEP_PERCENT,
          WEEK_CASCADE_MAX_OFFSET_PERCENT /
            (columnCount -
              1),
        )
      : 0;

  return {
    left:
      `${column * step}%`,
    width:
      `${100 - column * step}%`,
  } as const;
}

interface TimeGridProps {
  /** The day columns to show, left to right. */
  days: Date[];

  /** Which hourly view this is. */
  view: TimeGridView;

  /** Events for the visible days. */
  events: CalendarEvent[];

  /** Called when the student selects an event. */
  onEventPress?: (
    event: CalendarEvent,
  ) => void;
}

/**
 * Hourly calendar shared by the Week, 2 Day, and Day views.
 */
export function TimeGrid({
  days,
  view,
  events,
  onEventPress,
}: TimeGridProps) {
  const {
    hourRowHeight,
    hourGutterWidth,
  } = GRID_SIZES[view];

  const isFocusView =
    view !== 'week';

  const chipSize =
    isFocusView
      ? 'regular'
      : 'compact';

  const chipMinHeight =
    EVENT_CHIP_MIN_HEIGHT[
      chipSize
    ];

  const minutesToPoints = (
    minutes: number,
  ) =>
    (minutes / 60) *
    hourRowHeight;

  const renderDayHeader = (
    day: Date,
    width?: number,
  ) => {
    const today =
      isToday(day);

    const label =
      format(
        day,
        'EEEE, MMMM d',
      );

    return (
      <View
        key={
          day.toISOString()
        }
        accessible
        accessibilityRole="header"
        accessibilityLabel={
          today
            ? `Today, ${label}`
            : label
        }
        style={[
          styles.dayHeader,
          width !==
            undefined && {
            flex: 0,
            width,
          },
        ]}
      >
        <Text
          style={[
            styles.dayName,
            isFocusView &&
              styles.focusDayName,
          ]}
        >
          {format(
            day,
            'EEE',
          ).toUpperCase()}
        </Text>

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
              isFocusView &&
                styles.focusDayNumber,
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
      </View>
    );
  };

  return (
    <View
      style={
        styles.container
      }
    >
      <View
        style={
          styles.dayHeaderRow
        }
      >
        {view ===
        'day' ? (
          renderDayHeader(
            days[0],
            hourGutterWidth,
          )
        ) : (
          <>
            <View
              style={{
                width:
                  hourGutterWidth,
              }}
            />

            {days.map(
              (day) =>
                renderDayHeader(
                  day,
                ),
            )}
          </>
        )}
      </View>

      <ScrollView
        style={
          styles.scrollView
        }
        contentContainerStyle={
          styles.scrollContent
        }
        contentOffset={{
          x: 0,
          y:
            INITIAL_VISIBLE_HOUR *
            hourRowHeight,
        }}
      >
        <View
          style={
            styles.gridRow
          }
        >
          <View
            style={{
              width:
                hourGutterWidth,
            }}
          >
            {HOUR_LABELS.map(
              (
                label,
                hour,
              ) => (
                <Text
                  key={
                    label
                  }
                  style={[
                    styles.hourLabel,
                    {
                      top:
                        hour *
                        hourRowHeight,
                    },
                  ]}
                >
                  {label}
                </Text>
              ),
            )}
          </View>

          {days.map(
            (day) => (
              <View
                key={
                  day.toISOString()
                }
                style={
                  styles.dayColumn
                }
              >
                {HOUR_LABELS.map(
                  (label) => (
                    <View
                      key={
                        label
                      }
                      style={[
                        styles.hourCell,
                        {
                          height:
                            hourRowHeight,
                        },
                      ]}
                    />
                  ),
                )}

                <View
                  style={
                    styles.eventLayer
                  }
                  pointerEvents="box-none"
                >
                  {layoutDaySegments(
                    getDaySegments(
                      events,
                      day,
                    ),
                    (chipMinHeight /
                      hourRowHeight) *
                      60,
                  ).map(
                    ({
                      event,
                      startMinute,
                      endMinute,
                      column,
                      columnCount,
                    }) => {
                      const height =
                        Math.max(
                          minutesToPoints(
                            endMinute -
                              startMinute,
                          ),
                          chipMinHeight,
                        );

                      const isCascaded =
                        view ===
                          'week' &&
                        column >
                          0;

                      return (
                        <View
                          key={
                            event.id
                          }
                          style={[
                            styles.eventSlot,
                            isCascaded &&
                              styles.cascadedEventSlot,
                            {
                              top:
                                minutesToPoints(
                                  startMinute,
                                ),
                              height,
                            },
                            getHorizontalPlacement(
                              view,
                              column,
                              columnCount,
                            ),
                          ]}
                        >
                          <EventChip
                            event={
                              event
                            }
                            size={
                              chipSize
                            }
                            maxTitleLines={
                              isFocusView
                                ? Math.max(
                                    1,
                                    Math.floor(
                                      (height -
                                        chipMinHeight) /
                                        EVENT_TITLE_LINE_HEIGHT,
                                    ) +
                                      1,
                                  )
                                : 1
                            }
                            style={
                              styles.eventChip
                            }
                            onPress={
                              onEventPress
                            }
                          />
                        </View>
                      );
                    },
                  )}
                </View>
              </View>
            ),
          )}
        </View>
      </ScrollView>
    </View>
  );
}