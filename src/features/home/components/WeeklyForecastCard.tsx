import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import CalendarIcon from '../../../../assets/icons/home/forecast-calendar.svg';
import HelpIcon from '../../../../assets/icons/home/help-circle.svg';
import { colors } from '../../../theme/colors';
import { formatEstimate } from '../../assignments/utils/assignmentEstimate';
import {
  formatForecastDue,
  type ForecastItem,
  type WeeklyForecast,
} from '../utils/weeklyForecast';
import { styles } from './WeeklyForecastCard.styles';

interface WeeklyForecastCardProps {
  status: 'loading' | 'ready' | 'error';
  forecast: WeeklyForecast | null;
  now: Date;
}

function ForecastRow({ item, now }: { item: ForecastItem; now: Date }) {
  const navigation = useNavigation();
  const name = item.courseLabel ? `${item.courseLabel} - ${item.title}` : item.title;
  const due = formatForecastDue(item.dueAt, now);
  const time = formatEstimate(item.minutes);

  const openAssignment = () =>
    navigation.navigate('AssignmentDetails', { assignmentId: item.assignmentId });

  // The class (dot and code) opens that class's week; the rest of the row
  // opens the assignment (#61).
  const { courseId, courseLabel } = item;
  const canOpenClass = courseId !== null && courseLabel !== null;

  return (
    <View style={styles.row}>
      {courseId !== null && courseLabel !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${courseLabel} this week`}
          accessibilityHint="Shows this class’s assignments due in the next 7 days"
          hitSlop={{ top: 6, bottom: 6 }}
          onPress={() => navigation.navigate('ClassWeek', { courseId, courseLabel })}
          style={({ pressed }) => [styles.classLink, pressed && styles.pressed]}
        >
          <View style={[styles.dot, { backgroundColor: item.courseColor }]} />
          <Text style={styles.classLabel}>{courseLabel}</Text>
        </Pressable>
      ) : (
        <View style={[styles.dot, { backgroundColor: item.courseColor }]} />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name}, due ${due}, about ${time}`}
        accessibilityHint="Opens assignment details"
        hitSlop={{ top: 6, bottom: 6 }}
        onPress={openAssignment}
        style={({ pressed }) => [styles.assignmentLink, pressed && styles.pressed]}
      >
        <Text style={styles.rowTitle} numberOfLines={1}>
          {canOpenClass ? `- ${item.title}` : name}
        </Text>
        <Text style={styles.rowDetail}>
          {due} • {time}
        </Text>
      </Pressable>
    </View>
  );
}

/** The "Weekly forecast" card at the top of Home (#57). */
export function WeeklyForecastCard({ status, forecast, now }: WeeklyForecastCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <CalendarIcon />
        </View>

        <View style={styles.headerText}>
          {status === 'loading' && (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.deepOlive} />
              <Text style={styles.summary} accessibilityLiveRegion="polite">
                Looking at your week…
              </Text>
            </View>
          )}

          {status === 'error' && (
            <>
              <Text style={styles.title} accessibilityRole="header">
                Weekly forecast
              </Text>
              <Text style={styles.summary}>
                RISE couldn’t load your week. Check your connection and try again.
              </Text>
            </>
          )}

          {status === 'ready' && forecast && (
            <>
              <Text style={styles.title} accessibilityRole="header">
                {forecast.title}
              </Text>
              <Text style={styles.summary}>{forecast.summary}</Text>
            </>
          )}
        </View>
      </View>

      {status === 'ready' && forecast && forecast.recommended.length > 0 && (
        <>
          <Text style={styles.listTitle}>Recommended to get ahead</Text>
          {forecast.recommended.map((item) => (
            <ForecastRow key={item.id} item={item} now={now} />
          ))}
        </>
      )}

      {/* Shown for now; the Help story will make it do something. */}
      <View style={styles.helpButton}>
        <HelpIcon />
        <Text style={styles.helpLabel}>Help</Text>
      </View>
    </View>
  );
}
