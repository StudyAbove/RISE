import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';

import {
  fetchCanvasCourses,
  updateCanvasCourse,
  type CanvasCourse,
} from '../../../repositories/canvasRepository';
import { colors } from '../../../theme/colors';
import { COURSE_COLOR_KEYS, getCourseColor, type CourseColorKey } from '../../../theme/courseColors';
import { styles } from './CourseColorList.styles';

/**
 * "Your classes" in Canvas Settings: each synced class's color and whether it
 * syncs. Tapping a color dot shows the palette.
 */
export function CourseColorList() {
  const [courses, setCourses] = useState<CanvasCourse[] | null>(null);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  useEffect(() => {
    fetchCanvasCourses()
      .then(setCourses)
      .catch((error) => console.log('Could not load Canvas classes:', error));
  }, []);

  if (!courses || courses.length === 0) {
    return null;
  }

  // Saves in the background and shows the change right away; puts it back if saving fails.
  function changeCourse(course: CanvasCourse, changes: { color?: CourseColorKey; syncEnabled?: boolean }) {
    const updated = { ...course, ...changes };
    setCourses((current) => current?.map((item) => (item.id === course.id ? updated : item)) ?? null);

    updateCanvasCourse(course.id, changes).catch((error) => {
      console.log('Could not update the class:', error);
      setCourses((current) => current?.map((item) => (item.id === course.id ? course : item)) ?? null);
    });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Your classes</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {courses.map((course) => {
          const isOpen = openCourseId === course.id;
          const { name: colorName, color } = getCourseColor(course.color);

          return (
            <View key={course.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${colorName}. Change the color for ${course.name}`}
                  accessibilityState={{ expanded: isOpen }}
                  hitSlop={8}
                  onPress={() => setOpenCourseId(isOpen ? null : course.id)}
                  style={[styles.colorDot, { backgroundColor: color }]}
                />

                <Text
                  style={[styles.courseName, !course.syncEnabled && styles.courseNameOff]}
                  numberOfLines={1}
                >
                  {course.code ?? course.name}
                </Text>

                <Switch
                  accessibilityLabel={`Sync ${course.name}`}
                  value={course.syncEnabled}
                  onValueChange={(syncEnabled) => changeCourse(course, { syncEnabled })}
                  trackColor={{ true: colors.eucalyptus, false: colors.mistGreen }}
                  style={styles.switch}
                />
              </View>

              {isOpen ? (
                <View style={styles.palette} accessibilityRole="radiogroup">
                  {COURSE_COLOR_KEYS.map((key) => {
                    const swatch = getCourseColor(key);
                    const isSelected = key === course.color;

                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="radio"
                        accessibilityLabel={swatch.name}
                        accessibilityState={{ checked: isSelected }}
                        onPress={() => changeCourse(course, { color: key })}
                        style={[
                          styles.swatch,
                          { backgroundColor: swatch.color },
                          isSelected && styles.swatchSelected,
                        ]}
                      />
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
