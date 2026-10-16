import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isValid, parseISO } from 'date-fns';
import Svg, { Path } from 'react-native-svg';

import type { CalendarEvent } from '../../../models/CalendarEvent';
import { colors, statusColors } from '../../../theme/colors';
import { textStyles } from '../../../theme/typography';

export type CalendarConflictChoice = 'rise' | 'calendar';

// The sync code supplies two versions of the same event.
export type CalendarConflict = {
  id: string;
  provider: 'apple' | 'google';
  calendarName: string;
  riseVersion: CalendarEvent;
  calendarVersion: CalendarEvent;
};

type CalendarConflictModalProps = {
  conflict: CalendarConflict;
  onClose: () => void;
  onResolve: (
    conflict: CalendarConflict,
    choice: CalendarConflictChoice,
  ) => Promise<void>;
  previewOnly?: boolean;
};

// Show dates and times in the phone's time zone.
function displayDate(value: string, pattern: string) {
  const date = parseISO(value);
  return isValid(date) ? format(date, pattern) : 'Unavailable';
}

function eventDate(event: CalendarEvent) {
  const start = displayDate(event.startAt, 'EEE, MMM d, yyyy');
  const end = displayDate(event.endAt, 'EEE, MMM d, yyyy');

  return start === end ? start : `${start} – ${end}`;
}

function eventTime(event: CalendarEvent) {
  return `${displayDate(event.startAt, 'h:mm a')} – ${displayDate(
    event.endAt,
    'h:mm a',
  )}`;
}

// Compare actual times, even if their written time zones differ.
function sameMoment(first: string, second: string) {
  const firstDate = parseISO(first);
  const secondDate = parseISO(second);

  if (!isValid(firstDate) || !isValid(secondDate)) {
    return first === second;
  }

  return firstDate.getTime() === secondDate.getTime();
}

function cleanText(value?: string) {
  return value?.trim() || '';
}

// Small SVG icons stay consistent across phones.
function ArrowIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d="M14 6l-6 6 6 6"
        fill="none"
        stroke={colors.deepOlive}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={46} height={46} viewBox="0 0 48 48">
      <Path
        d="M11 25l9 9 18-20"
        fill="none"
        stroke={colors.deepOlive}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Yellow and a spoken label both identify changed information.
function DetailRow({
  label,
  value,
  different = false,
}: {
  label: string;
  value: string;
  different?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text
          accessibilityLabel={`${value}${different ? ', different between versions' : ''}`}
          style={[
            styles.detailValue,
            different && styles.highlight,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function EventDetails({
  event,
  other,
}: {
  event: CalendarEvent;
  other?: CalendarEvent;
}) {
  const differentDate =
    other !== undefined && eventDate(event) !== eventDate(other);

  const differentTime =
    other !== undefined &&
    (!sameMoment(event.startAt, other.startAt) ||
      !sameMoment(event.endAt, other.endAt));

  return (
    <View style={styles.details}>
      <DetailRow
        label="Date"
        value={eventDate(event)}
        different={differentDate}
      />
      <DetailRow
        label="Time"
        value={eventTime(event)}
        different={differentTime}
      />
      <DetailRow
        label="Location"
        value={cleanText(event.location) || 'No location added'}
        different={
          other !== undefined &&
          cleanText(event.location) !== cleanText(other.location)
        }
      />
      <DetailRow
        label="Description"
        value={cleanText(event.description) || 'No description added'}
        different={
          other !== undefined &&
          cleanText(event.description) !== cleanText(other.description)
        }
      />
    </View>
  );
}

function VersionCard({
  label,
  buttonLabel,
  event,
  other,
  calendarVersion,
  disabled,
  saving,
  onChoose,
}: {
  label: string;
  buttonLabel: string;
  event: CalendarEvent;
  other: CalendarEvent;
  calendarVersion?: boolean;
  disabled: boolean;
  saving: boolean;
  onChoose: () => void;
}) {
  const titleDifferent = event.title !== other.title;

  return (
    <View style={styles.versionCard}>
      <View
        style={[
          styles.cardHeader,
          calendarVersion && styles.calendarCardHeader,
        ]}
      >
        <Text accessibilityRole="header" style={styles.cardHeaderText}>
          {label}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.eventTitleRow}>
          <Text style={styles.eventTitle}>{event.title}</Text>

          {titleDifferent && (
            <View style={styles.differenceBadge}>
              <Text style={styles.differenceText}>Different</Text>
            </View>
          )}
        </View>

        <EventDetails event={event} other={other} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={buttonLabel}
          accessibilityState={{ disabled, busy: saving }}
          onPress={onChoose}
          disabled={disabled}
          style={({ pressed }) => [
            styles.choiceButton,
            pressed && styles.pressed,
            disabled && styles.disabled,
          ]}
        >
          {saving ? (
            <View style={styles.buttonContents}>
              <ActivityIndicator color={colors.deepOlive} size="small" />
              <Text style={styles.buttonText}>Saving…</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// Reset the popup's state when a different conflict opens.
export function CalendarConflictModal(
  props: CalendarConflictModalProps,
) {
  return <ConflictContent key={props.conflict.id} {...props} />;
}

function ConflictContent({
  conflict,
  onClose,
  onResolve,
  previewOnly = false,
}: CalendarConflictModalProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const savingRef = useRef(false);

  const [pendingChoice, setPendingChoice] =
    useState<CalendarConflictChoice | null>(null);
  const [failedChoice, setFailedChoice] =
    useState<CalendarConflictChoice | null>(null);
  const [savedChoice, setSavedChoice] =
    useState<CalendarConflictChoice | null>(null);

  const providerName =
    conflict.provider === 'apple' ? 'Apple Calendar' : 'Google Calendar';
  const shortProvider = conflict.provider === 'apple' ? 'Apple' : 'Google';

  const isSaving = pendingChoice !== null;
  const resolved = savedChoice !== null;
  const selectedEvent =
    savedChoice === 'calendar'
      ? conflict.calendarVersion
      : conflict.riseVersion;

  // Going back without choosing does not save anything.
  function closeIfAllowed() {
    if (!savingRef.current) onClose();
  }

  async function saveChoice(choice: CalendarConflictChoice) {
    if (savingRef.current || resolved) return;

    savingRef.current = true;
    setPendingChoice(choice);
    setFailedChoice(null);

    try {
      // Success appears only after the parent's save function finishes.
      await onResolve(conflict, choice);
      setSavedChoice(choice);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    } catch {
      setFailedChoice(choice);
    } finally {
      savingRef.current = false;
      setPendingChoice(null);
    }
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={closeIfAllowed}
    >
      <View
        style={[
          styles.page,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              resolved ? 'Return to calendar' : 'Close without choosing'
            }
            disabled={isSaving}
            onPress={closeIfAllowed}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            <View style={styles.backCircle}>
              <ArrowIcon />
            </View>
            <Text style={styles.backText}>Calendar</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            resolved && styles.successContent,
          ]}
        >
          {resolved ? (
            <>
              <View style={styles.successHeading}>
                <View style={styles.checkCircle}>
                  <CheckIcon />
                </View>

                <Text
                  accessibilityRole="header"
                  accessibilityLiveRegion="polite"
                  style={styles.successTitle}
                >
                  {previewOnly ? 'Preview complete' : 'Changes saved'}
                </Text>

                <Text style={styles.successDescription}>
                  You kept the{' '}
                  {savedChoice === 'rise' ? 'RISE' : providerName} version.
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.eventTitle}>{selectedEvent.title}</Text>
                <EventDetails event={selectedEvent} />
              </View>

              <Text style={styles.successNote}>
                {previewOnly
                  ? 'Sample data only. No real calendar was changed.'
                  : `Updated in RISE and ${providerName}.`}
              </Text>

              <View style={styles.successSpacer} />

              <Pressable
                accessibilityRole="button"
                onPress={closeIfAllowed}
                style={({ pressed }) => [
                  styles.doneButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.buttonText}>Done</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.heading}>
                Choose which version to keep
              </Text>

              <Text style={styles.introduction}>
                This event was changed in two places. Review both versions
                before saving.
              </Text>

              <Text style={styles.calendarName}>
                {providerName} · {conflict.calendarName}
              </Text>

              <View style={styles.legend}>
                <View style={styles.legendDot} />
                <Text style={styles.legendText}>
                  Highlighted details are different
                </Text>
              </View>

              {previewOnly && (
                <Text style={styles.previewNote}>
                  Preview only · No real calendar changes
                </Text>
              )}

              <VersionCard
                label="RISE version"
                buttonLabel="Keep RISE version"
                event={conflict.riseVersion}
                other={conflict.calendarVersion}
                disabled={isSaving}
                saving={pendingChoice === 'rise'}
                onChoose={() => void saveChoice('rise')}
              />

              <VersionCard
                label={`${providerName} version`}
                buttonLabel={`Keep ${shortProvider} version`}
                event={conflict.calendarVersion}
                other={conflict.riseVersion}
                calendarVersion
                disabled={isSaving}
                saving={pendingChoice === 'calendar'}
                onChoose={() => void saveChoice('calendar')}
              />

              {failedChoice !== null && (
                <View style={styles.errorCard}>
                  <View style={styles.errorCopy}>
                    <Text
                      accessibilityRole="alert"
                      style={styles.errorTitle}
                    >
                      Couldn’t sync your choice
                    </Text>
                    <Text style={styles.errorDescription}>
                      We couldn’t confirm the update. Try again.
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Retry the selected version"
                    disabled={isSaving}
                    onPress={() => void saveChoice(failedChoice)}
                    style={({ pressed }) => [
                      styles.retryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </Pressable>
                </View>
              )}

              {isSaving && (
                <Text
                  accessibilityLiveRegion="polite"
                  style={styles.savingText}
                >
                  {previewOnly
                    ? 'Simulating your choice…'
                    : 'Saving and syncing your choice…'}
                </Text>
              )}

              <Text style={styles.footerNote}>
                Times shown in your device’s time zone.
              </Text>
              <Text style={styles.footerNote}>
                Going back without choosing leaves both versions unchanged.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.warmCream,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.softSage,
  },
  backText: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  heading: {
    ...textStyles.screenHeading,
    fontSize: 22,
    lineHeight: 28,
    color: colors.deepOlive,
  },
  introduction: {
    ...textStyles.body,
    lineHeight: 21,
    color: colors.deepOlive,
    marginTop: 8,
  },
  calendarName: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    lineHeight: 18,
    marginTop: 14,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 16,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.paleSun,
  },
  legendText: {
    ...textStyles.caption,
    flex: 1,
    color: colors.mutedGrayGreen,
  },
  previewNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    marginBottom: 12,
  },
  versionCard: {
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: colors.mistGreen,
  },
  calendarCardHeader: {
    backgroundColor: colors.softSage,
  },
  cardHeaderText: {
    ...textStyles.link,
    color: colors.deepOlive,
  },
  cardBody: {
    padding: 12,
  },
  eventTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  eventTitle: {
    ...textStyles.sectionTitle,
    fontSize: 17,
    lineHeight: 23,
    color: colors.deepOlive,
    flexShrink: 1,
  },
  differenceBadge: {
    backgroundColor: colors.paleSun,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  differenceText: {
    ...textStyles.caption,
    color: colors.deepOlive,
  },
  details: {
    gap: 7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  detailLabel: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    width: 76,
    paddingTop: 3,
    lineHeight: 18,
  },
  detailValueContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  detailValue: {
    ...textStyles.caption,
    fontSize: 13,
    lineHeight: 19,
    color: colors.deepOlive,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  highlight: {
    backgroundColor: colors.paleSun,
  },
  choiceButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: colors.mistGreen,
    marginTop: 12,
  },
  buttonText: {
    ...textStyles.link,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  buttonContents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: statusColors.urgentRed,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorCopy: {
    flex: 1,
    minWidth: 150,
  },
  errorTitle: {
    ...textStyles.link,
    color: statusColors.urgentRed,
  },
  errorDescription: {
    ...textStyles.caption,
    color: colors.deepOlive,
    lineHeight: 18,
    marginTop: 4,
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: statusColors.urgentRed,
  },
  retryText: {
    ...textStyles.link,
    color: statusColors.urgentRed,
  },
  savingText: {
    ...textStyles.caption,
    textAlign: 'center',
    color: colors.deepOlive,
    marginBottom: 10,
  },
  footerNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 5,
  },
  successContent: {
    flexGrow: 1,
    paddingTop: 40,
  },
  successHeading: {
    alignItems: 'center',
    marginBottom: 28,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.mistGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    ...textStyles.screenHeading,
    color: colors.deepOlive,
    textAlign: 'center',
  },
  successDescription: {
    ...textStyles.body,
    color: colors.deepOlive,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },
  summaryCard: {
    padding: 18,
    gap: 16,
    backgroundColor: colors.softWhite,
    borderWidth: 1,
    borderColor: colors.mistGreen,
    borderRadius: 14,
  },
  successNote: {
    ...textStyles.caption,
    color: colors.mutedGrayGreen,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 18,
  },
  successSpacer: {
    flexGrow: 1,
    minHeight: 32,
  },
  doneButton: {
    minHeight: 48,
    padding: 12,
    backgroundColor: colors.softSage,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});