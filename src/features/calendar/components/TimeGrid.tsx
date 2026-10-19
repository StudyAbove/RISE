import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  format,
  isToday,
} from 'date-fns';

import ChevronIcon from '../../../../assets/icons/calendar/chevron-left.svg';
import type { CalendarEvent } from '../../../models/CalendarEvent';
import {
  isAllDayEvent,
  layoutAllDayBars,
} from '../utils/allDayEvents';
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

// Space between stacked all-day bars.
const ALL_DAY_LANE_GAP = 2;

// Like Google Calendar, a day shows this many all-day events until the strip
// is expanded; the rest are counted in a "+N more" line.
const ALL_DAY_COLLAPSED_LANES = 2;

// Height of the "+N more" line.
const ALL_DAY_MORE_HEIGHT = 14;

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

  // All-day events go in the strip under the day headers, not the hourly grid.
  const timedEvents =
    events.filter(
      (event) =>
        !isAllDayEvent(
          event,
        ),
    );

  const allDayBars =
    layoutAllDayBars(
      events,
      days,
    );

  const allDayLaneCount =
    allDayBars.reduce(
      (count, bar) =>
        Math.max(
          count,
          bar.lane + 1,
        ),
      0,
    );

  const [
    isAllDayExpanded,
    setIsAllDayExpanded,
  ] =
    useState(false);

  const canCollapseAllDay =
    allDayLaneCount >
    ALL_DAY_COLLAPSED_LANES;

  const isAllDayCollapsed =
    canCollapseAllDay &&
    !isAllDayExpanded;

  const shownAllDayLanes =
    isAllDayCollapsed
      ? ALL_DAY_COLLAPSED_LANES
      : allDayLaneCount;

  // How many of each day's all-day events are hidden while collapsed.
  const hiddenAllDayCounts =
    days.map(
      (_, dayIndex) =>
        isAllDayCollapsed
          ? allDayBars.filter(
              (bar) =>
                bar.lane >=
                  ALL_DAY_COLLAPSED_LANES &&
                bar.startIndex <=
                  dayIndex &&
                dayIndex <
                  bar.startIndex +
                    bar.span,
            ).length
          : 0,
    );

  const allDayLaneHeight =
    chipMinHeight +
    ALL_DAY_LANE_GAP;

  const renderMoreButton = (
    hiddenCount: number,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Show ${hiddenCount} more all-day ${
        hiddenCount === 1
          ? 'event'
          : 'events'
      }`}
      hitSlop={6}
      onPress={() =>
        setIsAllDayExpanded(
          true,
        )
      }
      style={
        styles.allDayMore
      }
    >
      <Text
        numberOfLines={
          1
        }
        style={
          styles.allDayMoreText
        }
      >
        +{hiddenCount} more
      </Text>
    </Pressable>
  );

  const renderAllDayChip = (
    event: CalendarEvent,
  ) => (
    <EventChip
      event={
        event
      }
      size={
        chipSize
      }
      style={
        styles.eventChip
      }
      onPress={
        onEventPress
      }
    />
  );

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
          <>
            {renderDayHeader(
              days[0],
              hourGutterWidth,
            )}

            {/* In Day, all-day events sit beside the date, as in Google Calendar. */}
            {allDayBars.length >
              0 && (
              <View
                style={
                  styles.dayAllDayList
                }
              >
                {allDayBars
                  .filter(
                    ({
                      lane,
                    }) =>
                      lane <
                      shownAllDayLanes,
                  )
                  .map(
                    ({
                      event,
                    }) => (
                      <View
                        key={
                          event.id
                        }
                        style={{
                          height:
                            chipMinHeight,
                        }}
                      >
                        {renderAllDayChip(
                          event,
                        )}
                      </View>
                    ),
                  )}

                {isAllDayCollapsed &&
                  renderMoreButton(
                    hiddenAllDayCounts[0],
                  )}

                {canCollapseAllDay &&
                  isAllDayExpanded && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Show fewer all-day events"
                      hitSlop={6}
                      onPress={() =>
                        setIsAllDayExpanded(
                          false,
                        )
                      }
                      style={
                        styles.allDayMore
                      }
                    >
                      <Text
                        style={
                          styles.allDayMoreText
                        }
                      >
                        Show less
                      </Text>
                    </Pressable>
                  )}
              </View>
            )}
          </>
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

      {/* Week and 2 Day: each all-day event is one bar across its days. */}
      {view !==
        'day' &&
        allDayLaneCount >
          0 && (
          <View
            style={
              styles.allDayRow
            }
          >
            {/* Like Google Calendar, a chevron in the gutter expands or collapses the strip. */}
            <View
              style={[
                styles.allDayGutter,
                {
                  width:
                    hourGutterWidth,
                },
              ]}
            >
              {canCollapseAllDay && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isAllDayExpanded
                      ? 'Show fewer all-day events'
                      : 'Show all all-day events'
                  }
                  hitSlop={10}
                  onPress={() =>
                    setIsAllDayExpanded(
                      (expanded) =>
                        !expanded,
                    )
                  }
                  style={
                    isAllDayExpanded
                      ? styles.chevronUp
                      : styles.chevronDown
                  }
                >
                  <ChevronIcon
                    width={7}
                    height={10}
                  />
                </Pressable>
              )}
            </View>

            <View
              style={[
                styles.allDayArea,
                {
                  height:
                    shownAllDayLanes *
                      allDayLaneHeight +
                    (isAllDayCollapsed
                      ? ALL_DAY_MORE_HEIGHT
                      : 0),
                },
              ]}
            >
              {allDayBars
                .filter(
                  ({
                    lane,
                  }) =>
                    lane <
                    shownAllDayLanes,
                )
                .map(
                  ({
                    event,
                    startIndex,
                    span,
                    lane,
                  }) => (
                    <View
                      key={
                        event.id
                      }
                      style={[
                        styles.allDayBar,
                        {
                          top:
                            lane *
                            allDayLaneHeight,
                          height:
                            chipMinHeight,
                          left: `${
                            (startIndex /
                              days.length) *
                            100
                          }%`,
                          width: `${
                            (span /
                              days.length) *
                            100
                          }%`,
                        },
                      ]}
                    >
                      {renderAllDayChip(
                        event,
                      )}
                    </View>
                  ),
                )}

              {hiddenAllDayCounts.map(
                (
                  hiddenCount,
                  dayIndex,
                ) =>
                  hiddenCount >
                    0 && (
                    <View
                      key={`more-${dayIndex}`}
                      style={[
                        styles.allDayBar,
                        {
                          top:
                            shownAllDayLanes *
                            allDayLaneHeight,
                          height:
                            ALL_DAY_MORE_HEIGHT,
                          left: `${
                            (dayIndex /
                              days.length) *
                            100
                          }%`,
                          width: `${
                            100 /
                            days.length
                          }%`,
                        },
                      ]}
                    >
                      {renderMoreButton(
                        hiddenCount,
                      )}
                    </View>
                  ),
              )}
            </View>
          </View>
        )}

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
                      timedEvents,
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