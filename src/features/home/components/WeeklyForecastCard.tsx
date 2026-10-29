import { ActivityIndicator, Text, View } from 'react-native';

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

export type WeeklyForecastStatus = 'loading' | 'ready' | 'error';

interface WeeklyForecastCardProps {
  status: WeeklyForecastStatus;
  forecast: WeeklyForecast | null;
  now: Date;
}

function ForecastRow({ item, now }: { item: ForecastItem; now: Date }) {
  const name = item.courseLabel ? `${item.courseLabel} - ${item.title}` : item.title;
  const due = formatForecastDue(item.dueAt, now);
  const time = formatEstimate(item.minutes);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${name}, due ${due}, about ${time}`}
    >
      <View style={[styles.dot, { backgroundColor: item.courseColor }]} />
      <Text style={styles.rowTitle} numberOfLines={1}>
        {name}
      </Text>
      <Text style={styles.rowDetail}>
        {due} • {time}
      </Text>
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
