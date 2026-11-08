import type { FC } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import CalendarIcon from '../../../../assets/icons/calendar/details/calendar.svg';
import AssignmentIcon from '../../../../assets/icons/calendar/event-types/assignment.svg';
import ClassIcon from '../../../../assets/icons/calendar/event-types/class.svg';
import PersonalIcon from '../../../../assets/icons/calendar/event-types/personal.svg';
import StudyIcon from '../../../../assets/icons/calendar/event-types/study.svg';
import WellnessIcon from '../../../../assets/icons/calendar/event-types/wellness.svg';
import type { CalendarEventType } from '../../../models/CalendarEvent';
import { eventTypeCircleColors } from '../calendarColors';

const TYPE_ICONS: Record<CalendarEventType, FC<SvgProps>> = {
  class: ClassIcon,
  assignment: AssignmentIcon,
  study: StudyIcon,
  personal: PersonalIcon,
  wellness: WellnessIcon,
};

interface EventTypeCircleProps {
  type?: CalendarEventType;
  size: number;
  iconSize: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * The colored circle with the event type's icon, or a calendar for events
 * without a type: at the top of Event Details, and on each search result.
 */
export function EventTypeCircle({ type, size, iconSize, style, testID }: EventTypeCircleProps) {
  const Icon = type ? TYPE_ICONS[type] : CalendarIcon;

  return (
    <View
      testID={testID}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: eventTypeCircleColors[type ?? 'none'],
        },
        style,
      ]}
    >
      <Icon width={iconSize} height={iconSize} />
    </View>
  );
}
