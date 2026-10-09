/*
import { TabPlaceholderScreen } from '../../../components/TabPlaceholderScreen';

// Main page of the List tab (assignments). Placeholder until the real screen is built.
export function AssignmentsScreen() {
  return <TabPlaceholderScreen title="List" showSettingsButton />;
}
*/
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Assignment = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  progress: number;
  courseColor: string;
};

const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Milestone #4',
    description: 'Wireframes, IA, and interactive prototype',
    dueDate: 'Fri, Nov 13',
    progress: 25,
    courseColor: '#D8B83F',
  },
  {
    id: '2',
    title: 'Osmosis Lab Report',
    description: 'Write up results and conclusion',
    dueDate: 'Fri, Nov 13',
    progress: 0,
    courseColor: '#78927B',
  },
  {
    id: '3',
    title: 'Problem Set #5',
    description: 'Complete problems 1-10',
    dueDate: 'Fri, Nov 13',
    progress: 0,
    courseColor: '#39598A',
  },
  {
    id: '4',
    title: 'History Essay',
    description: 'Write 3-4 pages on topic of choice',
    dueDate: 'Sun, Nov 15',
    progress: 0,
    courseColor: '#B96D5F',
  },
  {
    id: '5',
    title: 'Agile Kickoff',
    description: 'Planning and coordinating',
    dueDate: 'Sun, Nov 22',
    progress: 0,
    courseColor: '#D8B83F',
  },
  {
    id: '6',
    title: 'Homeostasis Questions',
    description: 'Finish ~30 questions from McGraw',
    dueDate: 'Tue, Nov 17',
    progress: 0,
    courseColor: '#78927B',
  },
  {
    id: '7',
    title: 'Seminar Readings',
    description: 'Read three articles to prepare for discussion',
    dueDate: 'Thur, Nov 19',
    progress: 0,
    courseColor: '#B96D5F',
  },
];

export function AssignmentsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>List</Text>
        <Text style={styles.subtitle}>Look at an overview of the future</Text>
      </View>

      <View style={styles.list}>
        {mockAssignments.map((assignment) => (
          <View key={assignment.id} style={styles.card}>
            <View
              style={[
                styles.courseDot,
                { backgroundColor: assignment.courseColor },
              ]}
            />

            <View style={styles.cardContent}>
              <Text style={styles.assignmentTitle}>{assignment.title}</Text>
              <Text style={styles.description}>{assignment.description}</Text>

              <View style={styles.dueRow}>
                <Text style={styles.calendarIcon}>▣</Text>
                <Text style={styles.dueDate}>Due {assignment.dueDate}</Text>
              </View>

              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${assignment.progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{assignment.progress}%</Text>
              </View>
            </View>

            <View style={styles.startButton}>
              <Text style={styles.startButtonText}>▶</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 36,
    backgroundColor: '#FAF8F1',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#35433A',
  },
  subtitle: {
    fontSize: 13,
    color: '#758078',
    marginTop: 2,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE9D9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  courseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#35433A',
    marginRight: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  cardContent: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#35433A',
  },
  description: {
    fontSize: 12,
    color: '#758078',
    marginTop: 2,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  calendarIcon: {
    fontSize: 12,
    color: '#B96D5F',
    marginRight: 4,
  },
  dueDate: {
    fontSize: 12,
    color: '#B96D5F',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: '#E9E9E9',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A8BEA3',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 10,
    color: '#758078',
    width: 28,
  },
  startButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DDE9D9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  startButtonText: {
    color: '#35433A',
    fontSize: 13,
    marginLeft: 2,
  },
});