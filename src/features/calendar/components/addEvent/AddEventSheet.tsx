import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { format } from 'date-fns';

import CloseIcon from '../../../../../assets/icons/calendar/close.svg';
import { colors } from '../../../../theme/colors';
import {
  createCalendarEventWithSync,
  type CalendarEventSyncResult,
} from '../../services/calendarEventSyncService';
import {
  buildNewCalendarEvent,
  EMPTY_ADD_EVENT_FORM,
  formatTimeOption,
  getEndMinuteAfterStartChange,
  getEndTimeOptions,
  START_TIME_OPTIONS,
  validateAddEventForm,
  type AddEventFormValues,
} from '../../utils/addEventForm';
import { styles } from './AddEventSheet.styles';
import { DatePickerPanel } from './DatePickerPanel';
import { DropdownField } from './DropdownField';
import { EventTypePicker } from './EventTypePicker';
import { FormField } from './FormField';
import { formStyles } from './formStyles';
import { FormTextInput } from './FormTextInput';
import { FloatingDropdown, type DropdownAnchor } from './FloatingDropdown';
import { OptionList } from './OptionList';
import { OPTION_LIST_MAX_HEIGHT, OPTION_ROW_HEIGHT } from './OptionList.styles';
import { REMINDER_CHOICES, ReminderField } from './ReminderField';

type DropdownName = 'date' | 'start' | 'end' | 'reminder';
type OpenField = DropdownName | null;

// About how tall each dropdown's choices get, to decide whether they fit below
// their box or should open above it instead (e.g. Reminder, near the bottom).
const PANEL_HEIGHTS: Record<DropdownName, number> = {
  date: 270,
  start: OPTION_LIST_MAX_HEIGHT + 4,
  end: OPTION_LIST_MAX_HEIGHT + 4,
  reminder: REMINDER_CHOICES.length * OPTION_ROW_HEIGHT + 16,
};
// Space between a box and its floating choices, as in Figma.
const PANEL_GAP = 8;

const START_OPTIONS = START_TIME_OPTIONS.map((minute) => ({ value: minute, label: formatTimeOption(minute) }));

interface AddEventSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Called with the saved event and how adding it to connected Google or Apple
   * calendars went; the calendar then closes the sheet, refreshes, and says
   * if a calendar didn't get it.
   */
  onSaved: (result: CalendarEventSyncResult) => void;
}

/**
 * The "Add to Calendar" form (Figma "Add Event"), shown as an iOS sheet.
 * Title, date, and start time are required (AC4); everything else is optional.
 */
export function AddEventSheet({ visible, onClose, onSaved }: AddEventSheetProps) {
  const [values, setValues] = useState<AddEventFormValues>(EMPTY_ADD_EVENT_FORM);
  const [openField, setOpenField] = useState<OpenField>(null);
  // Errors only appear after the first try to save, then update as fields are filled.
  const [showErrors, setShowErrors] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'failed'>('idle');
  const [anchor, setAnchor] = useState<DropdownAnchor | null>(null);

  // Used to find each dropdown's box on screen, so its choices float right under it.
  const sheetRef = useRef<View>(null);
  const dropdownRefs = {
    date: useRef<View>(null),
    start: useRef<View>(null),
    end: useRef<View>(null),
    reminder: useRef<View>(null),
  };

  // Every time the sheet opens, it starts empty.
  useEffect(() => {
    if (visible) {
      setValues(EMPTY_ADD_EVENT_FORM);
      setOpenField(null);
      setShowErrors(false);
      setSaveStatus('idle');
    }
  }, [visible]);

  const errors = showErrors ? validateAddEventForm(values) : {};
  const isSaving = saveStatus === 'saving';

  const update = (changes: Partial<AddEventFormValues>) => setValues((current) => ({ ...current, ...changes }));
  // Opening one dropdown closes any other; tapping an open one closes it.
  const toggle = (field: DropdownName) => {
    Keyboard.dismiss();
    if (openField === field) {
      setOpenField(null);
      return;
    }

    setAnchor(null);
    setOpenField(field);
    // Measure the box and the sheet in screen coordinates, then place the
    // choices below the box, or above it when there isn't room below.
    dropdownRefs[field].current?.measureInWindow((x, y, width, height) => {
      sheetRef.current?.measureInWindow((sheetX, sheetY, _sheetWidth, sheetHeight) => {
        const boxTop = y - sheetY;
        const below = boxTop + height + PANEL_GAP;
        const fitsBelow = below + PANEL_HEIGHTS[field] <= sheetHeight - PANEL_GAP;
        setAnchor(
          fitsBelow
            ? { left: x - sheetX, width, top: below }
            : { left: x - sheetX, width, bottom: sheetHeight - boxTop + PANEL_GAP }
        );
      });
    });
  };
  const closeDropdown = () => setOpenField(null);

  const chooseStart = (startMinute: number) => {
    setValues((current) => ({
      ...current,
      startMinute,
      endMinute: getEndMinuteAfterStartChange(startMinute, current.endMinute),
    }));
    setOpenField(null);
  };

  // Each time list is labeled like "9:30 AM"; End's choices depend on the start (if any).
  const endOptions = getEndTimeOptions(values.startMinute).map((minute) => ({
    value: minute,
    label: formatTimeOption(minute),
  }));
  const currentHour = new Date().getHours() * 60;

  const handleAdd = async () => {
    Keyboard.dismiss();
    setShowErrors(true);
    setOpenField(null);
    if (Object.keys(validateAddEventForm(values)).length > 0) {
      return;
    }

    setSaveStatus('saving');
    try {
      // Saves in RISE, then adds the event to any connected Google or Apple
      // calendar. Only a failed RISE save lands in the catch below.
      const result = await createCalendarEventWithSync(buildNewCalendarEvent(values));
      setSaveStatus('idle');
      onSaved(result);
    } catch (error) {
      console.log('Could not add event:', (error as Error).message);
      // The form keeps everything the student entered so they can try again.
      setSaveStatus('failed');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View ref={sheetRef} style={styles.sheet}>
        <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" hitSlop={14} onPress={onClose}>
              <CloseIcon width={16.5} height={16.5} />
            </Pressable>
          </View>

          {/* "handled" lets buttons and dropdowns work on the first tap while typing;
              the Pressable below closes the keyboard when empty space is tapped. */}
          <ScrollView
            testID="add-event-form"
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.fields}>
              <Text accessibilityRole="header" style={styles.heading}>
                Add to Calendar
              </Text>

              <FormField label="Title" error={errors.title}>
                <FormTextInput
                  label="Title"
                  placeholder="Add a title"
                  value={values.title}
                  onChangeText={(title) => update({ title })}
                  hasError={Boolean(errors.title)}
                />
              </FormField>

              <FormField label="Date" error={errors.date}>
                <DropdownField
                  label="Date"
                  placeholder="Select a date"
                  valueText={values.date ? format(values.date, 'EEEE, MMMM d, yyyy') : undefined}
                  open={openField === 'date'}
                  onToggle={() => toggle('date')}
                  hasError={Boolean(errors.date)}
                  triggerRef={dropdownRefs.date}
                />
              </FormField>

              <FormField label="Time" error={errors.startTime}>
                <View style={styles.timeRow}>
                  <View style={styles.timeColumn}>
                    <DropdownField
                      label="Start time"
                      placeholder="Start"
                      valueText={values.startMinute !== null ? formatTimeOption(values.startMinute) : undefined}
                      open={openField === 'start'}
                      onToggle={() => toggle('start')}
                      hasError={Boolean(errors.startTime)}
                      triggerRef={dropdownRefs.start}
                    />
                  </View>
                  <View style={styles.timeColumn}>
                    <DropdownField
                      label="End time"
                      placeholder="End"
                      valueText={values.endMinute !== null ? formatTimeOption(values.endMinute) : undefined}
                      open={openField === 'end'}
                      onToggle={() => toggle('end')}
                      triggerRef={dropdownRefs.end}
                    />
                  </View>
                </View>
              </FormField>

              <FormField label="Type">
                <EventTypePicker selectedType={values.eventType} onChange={(eventType) => update({ eventType })} />
              </FormField>

              <FormField label="Location">
                <FormTextInput
                  label="Location"
                  placeholder="Add a location"
                  value={values.location}
                  onChangeText={(location) => update({ location })}
                />
              </FormField>

              <ReminderField
                reminderMinutes={values.reminderMinutes}
                open={openField === 'reminder'}
                onToggle={() => toggle('reminder')}
                triggerRef={dropdownRefs.reminder}
              />

              {saveStatus === 'failed' && (
                <Text style={[formStyles.errorText, styles.saveError]} accessibilityLiveRegion="polite">
                  Couldn't add the event. Check your connection and try again.
                </Text>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add Event"
                accessibilityState={{ disabled: isSaving, busy: isSaving }}
                disabled={isSaving}
                onPress={handleAdd}
                style={[styles.addButton, isSaving && styles.addButtonSaving]}
              >
                {isSaving ? (
                  <View style={styles.savingRow}>
                    <ActivityIndicator size="small" color={colors.softWhite} />
                    <Text style={styles.addButtonText}>Adding…</Text>
                  </View>
                ) : (
                  <Text style={styles.addButtonText}>Add Event</Text>
                )}
              </Pressable>
            </Pressable>
          </ScrollView>

        </KeyboardAvoidingView>

        {/* The open dropdown's choices, floating over the form (outside its scrolling). */}
        {openField === 'date' && (
          <FloatingDropdown label="Date" anchor={anchor} onClose={closeDropdown}>
            <DatePickerPanel
              selectedDate={values.date}
              onSelect={(date) => {
                update({ date });
                closeDropdown();
              }}
            />
          </FloatingDropdown>
        )}
        {openField === 'start' && (
          <FloatingDropdown label="Start time" anchor={anchor} onClose={closeDropdown}>
            <OptionList
              options={START_OPTIONS}
              selectedValue={values.startMinute}
              onSelect={chooseStart}
              // Opens at the current hour when no time is chosen yet.
              initialValue={currentHour}
              showSelectedTag={false}
            />
          </FloatingDropdown>
        )}
        {openField === 'end' && (
          <FloatingDropdown label="End time" anchor={anchor} onClose={closeDropdown}>
            <OptionList
              options={endOptions}
              selectedValue={values.endMinute}
              onSelect={(endMinute) => {
                update({ endMinute });
                closeDropdown();
              }}
              initialValue={values.startMinute !== null ? values.startMinute + 60 : currentHour + 60}
              showSelectedTag={false}
            />
          </FloatingDropdown>
        )}
        {openField === 'reminder' && (
          <FloatingDropdown label="Reminder" anchor={anchor} onClose={closeDropdown}>
            <OptionList
              options={REMINDER_CHOICES}
              selectedValue={values.reminderMinutes}
              onSelect={(reminderMinutes) => {
                update({ reminderMinutes });
                closeDropdown();
              }}
            />
          </FloatingDropdown>
        )}
      </View>
    </Modal>
  );
}
