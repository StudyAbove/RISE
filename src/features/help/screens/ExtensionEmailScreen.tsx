import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';

import { fetchCanvasCourses, type CanvasCourse } from '../../../repositories/canvasRepository';
import {
  ExtensionEmailError,
  fetchOpenAssignmentsForCourse,
  requestExtensionEmail,
  type ExtensionEmail,
  type OpenAssignment,
} from '../../../repositories/extensionEmailRepository';
import { colors } from '../../../theme/colors';
import { HelpToolLayout } from '../components/HelpToolLayout';
import { SelectField } from '../components/SelectField';
import { fieldStyles } from '../components/SelectField.styles';
import {
  EMAIL_PREVIEW_TEMPLATE,
  formatEmailForCopy,
  getMissingFieldsMessage,
} from '../utils/extensionEmail';
import { styles } from './ExtensionEmailScreen.styles';

// The Assignment dropdown's last option, for work that isn't in the list.
const TYPE_MY_OWN = 'type-my-own';

// How long "Copied!" shows on the button.
const COPIED_MS = 2000;

type OpenList = 'class' | 'assignment' | null;
type LoadStatus = 'loading' | 'ready' | 'error';

function courseLabel(course: CanvasCourse) {
  return course.code ?? course.name;
}

/** "Milestone 4 report · Fri, Nov 13", so similar names are easy to tell apart. */
function assignmentLabel(assignment: OpenAssignment) {
  return assignment.dueAt ? `${assignment.title} · ${format(assignment.dueAt, 'EEE, MMM d')}` : assignment.title;
}

/**
 * "Ask for an extension", opened from the help menu (#70). The student picks
 * a class and assignment, and Claude writes a short, polite email to the
 * professor that they can copy and send (#72).
 */
export function ExtensionEmailScreen() {
  const [courses, setCourses] = useState<CanvasCourse[]>([]);
  const [coursesStatus, setCoursesStatus] = useState<LoadStatus>('loading');
  const [courseId, setCourseId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<OpenAssignment[]>([]);
  // A saved assignment's ID, TYPE_MY_OWN, or null before choosing.
  const [assignmentChoice, setAssignmentChoice] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [reason, setReason] = useState('');
  const [openList, setOpenList] = useState<OpenList>(null);

  const [email, setEmail] = useState<ExtensionEmail | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The student's synced classes, for the Class dropdown.
  useEffect(() => {
    let active = true;

    fetchCanvasCourses()
      .then((loaded) => {
        if (!active) return;
        setCourses(loaded.filter((course) => course.syncEnabled));
        setCoursesStatus('ready');
      })
      .catch(() => {
        if (active) setCoursesStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  // The chosen class's unfinished assignments. If they can't load, the
  // student can still type the assignment.
  useEffect(() => {
    let active = true;
    setAssignments([]);

    if (!courseId) return;

    fetchOpenAssignmentsForCourse(courseId)
      .then((loaded) => {
        if (active) setAssignments(loaded);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const course = courses.find((option) => option.id === courseId) ?? null;
  const savedAssignment = assignments.find((assignment) => assignment.id === assignmentChoice) ?? null;
  const assignmentTitle = savedAssignment?.title ?? (assignmentChoice === TYPE_MY_OWN ? customTitle : '');

  const classOptions = useMemo(
    () => courses.map((option) => ({ value: option.id, label: courseLabel(option) })),
    [courses],
  );
  const assignmentOptions = useMemo(
    () => [
      ...assignments.map((assignment) => ({ value: assignment.id, label: assignmentLabel(assignment) })),
      { value: TYPE_MY_OWN, label: 'Type my own' },
    ],
    [assignments],
  );

  const toggleList = (list: Exclude<OpenList, null>) =>
    setOpenList((current) => (current === list ? null : list));

  const chooseClass = (id: string) => {
    setCourseId(id);
    setAssignmentChoice(null);
    setOpenList(null);
    setMessage(null);
  };

  const chooseAssignment = (choice: string) => {
    setAssignmentChoice(choice);
    setOpenList(null);
    setMessage(null);
  };

  async function generateEmail() {
    if (generating) return;

    // Ask for anything missing before calling Claude (AC 3).
    const missing = getMissingFieldsMessage(course !== null, assignmentTitle);

    if (missing || !course) {
      setMessage(missing);
      return;
    }

    setGenerating(true);
    setMessage(null);
    setOpenList(null);

    try {
      setEmail(
        await requestExtensionEmail({
          courseId: course.id,
          className: courseLabel(course),
          assignmentTitle: assignmentTitle.trim(),
          dueAt: savedAssignment?.dueAt ?? null,
          reason: reason.trim() || null,
        }),
      );
    } catch (error) {
      setMessage(
        error instanceof ExtensionEmailError && error.code === 'ai_unavailable'
          ? 'Writing emails isn’t available right now. Please try again later.'
          : 'Couldn’t write the email. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyEmail() {
    if (!email) return;

    await Clipboard.setStringAsync(formatEmailForCopy(email));

    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  return (
    <HelpToolLayout
      title="Ask for an extension"
      subtitle="Pick your class and fill in the blanks. We’ll write the rest."
    >
      <View style={styles.form}>
        <SelectField
          label="Class"
          placeholder={coursesStatus === 'loading' ? 'Loading your classes…' : 'Select a class'}
          options={classOptions}
          selectedValue={courseId}
          open={openList === 'class'}
          onToggle={() => toggleList('class')}
          onSelect={chooseClass}
          disabled={coursesStatus !== 'ready' || courses.length === 0}
        />
        {coursesStatus === 'error' && (
          <Text accessibilityRole="alert" style={styles.fieldNote}>
            Couldn’t load your classes. Go back and try again.
          </Text>
        )}
        {coursesStatus === 'ready' && courses.length === 0 && (
          <Text style={styles.fieldNote}>Sync your Canvas classes to choose one here.</Text>
        )}

        <SelectField
          label="Assignment"
          placeholder={course ? 'Select an assignment' : 'Choose a class first'}
          options={assignmentOptions}
          selectedValue={assignmentChoice}
          open={openList === 'assignment'}
          onToggle={() => toggleList('assignment')}
          onSelect={chooseAssignment}
          disabled={!course}
        />
        {assignmentChoice === TYPE_MY_OWN && (
          <TextInput
            accessibilityLabel="Assignment name"
            value={customTitle}
            onChangeText={(text) => {
              setCustomTitle(text);
              setMessage(null);
            }}
            placeholder="e.g. Milestone 4 report"
            placeholderTextColor={colors.mutedGrayGreen}
            maxLength={300}
            autoFocus
            style={[fieldStyles.box, fieldStyles.value, styles.textInput]}
          />
        )}

        <View>
          <Text style={fieldStyles.label}>Reason (optional)</Text>
          <TextInput
            accessibilityLabel="Reason (optional)"
            value={reason}
            onChangeText={setReason}
            placeholder="Tap to add a reason (optional)"
            placeholderTextColor={colors.mutedGrayGreen}
            maxLength={500}
            multiline
            style={[fieldStyles.box, fieldStyles.value, styles.textInput, styles.reasonInput]}
          />
        </View>
      </View>

      <Text accessibilityRole="header" style={styles.previewTitle}>
        Preview
      </Text>
      <View style={styles.previewCard} accessibilityLiveRegion="polite">
        {generating ? (
          <View style={styles.generating}>
            <ActivityIndicator color={colors.deepOlive} />
            <Text style={styles.previewText}>Writing your email…</Text>
          </View>
        ) : email ? (
          <>
            <Text style={styles.subject}>Subject: {email.subject}</Text>
            <Text style={styles.previewText}>{email.body}</Text>
          </>
        ) : (
          <Text style={[styles.previewText, styles.templateText]}>{EMAIL_PREVIEW_TEMPLATE}</Text>
        )}
      </View>

      {message && (
        <Text accessibilityRole="alert" style={styles.message}>
          {message}
        </Text>
      )}

      {email ? (
        <>
          <Pressable
            accessibilityRole="button"
            onPress={() => void copyEmail()}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.primaryButtonText}>{copied ? 'Copied!' : 'Copy email'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: generating }}
            disabled={generating}
            onPress={() => void generateEmail()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryButtonText}>Write it again</Text>
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: generating, busy: generating }}
          disabled={generating}
          onPress={() => void generateEmail()}
          style={({ pressed }) => [styles.primaryButton, generating && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.primaryButtonText}>{generating ? 'Writing…' : 'Generate email'}</Text>
        </Pressable>
      )}
    </HelpToolLayout>
  );
}
