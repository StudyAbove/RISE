import { Image, Text, View } from 'react-native';
import { format } from 'date-fns';

import type { Badge } from '../utils/badges';
import { styles } from './StreakBadges.styles';

const SUN_IMAGE = require('../../../../assets/images/streak/sun.png');

interface StreakBadgesProps {
  badges: Badge[];
}

/**
 * Badges on the Streak page (#9): sun medallions for 5, 10 and 25 assignments
 * turned in on time. Earned ones show the date; locked ones show progress.
 */
export function StreakBadges({ badges }: StreakBadgesProps) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.title}>
        Badges
      </Text>

      <View style={styles.row}>
        {badges.map(({ milestone, earnedAt, progress }) => {
          const earned = earnedAt !== null;
          const status = earned
            ? `earned ${format(earnedAt, 'MMMM d')}`
            : `locked, ${progress} of ${milestone}`;

          return (
            <View
              key={milestone}
              accessible
              accessibilityLabel={`${milestone} on-time assignments badge, ${status}`}
              style={styles.badge}
            >
              <View style={[styles.medallion, earned ? styles.earned : styles.locked]}>
                <Image
                  source={SUN_IMAGE}
                  style={[styles.sun, !earned && styles.lockedSun]}
                  accessibilityIgnoresInvertColors
                />
                <Text style={[styles.milestone, !earned && styles.lockedText]}>{milestone}</Text>
              </View>

              <Text style={styles.label}>{milestone} on time</Text>
              <Text style={[styles.detail, earned && styles.earnedDetail]}>
                {earned ? `Earned ${format(earnedAt, 'MMM d')}` : `${progress} / ${milestone}`}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
