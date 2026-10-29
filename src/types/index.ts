export type SubjectName = 'Physics' | 'Chemistry' | 'Mathematics';

export interface Subject {
  id: string;
  name: SubjectName;
  color: string;
  accentColor: string;
  description: string;
}

export type ClassYear = 11 | 12;

export type RevisionStatus = 'Not Started' | 'In Progress' | 'Formulas Revised' | 'Mastered';

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  classYear: ClassYear;
  weightage: 'High' | 'Medium' | 'Low';
  revisionStatus: RevisionStatus;
  lastRevisedAt?: string;
  notes?: string;
}

export type LectureStatus = 'not_started' | 'in_progress' | 'completed';

export interface Lecture {
  id: string;
  chapterId: string;
  subjectId: string;
  title: string;
  durationMinutes: number;
  status: LectureStatus;
  notes?: string;
  facultyOrPlatform?: string;
  scheduledDate?: string;
  completedAt?: string;
}

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low';
export type TaskCategory = 'today' | 'upcoming' | 'completed' | 'backlog';

export interface Task {
  id: string;
  title: string;
  description?: string;
  subjectId?: string;
  chapterId?: string;
  priority: TaskPriority;
  category: TaskCategory;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string;
  estimatedMinutes?: number;
  completedAt?: string;
  isBacklog?: boolean;
  createdAt: string;
}

export type TimerMode = 'pomodoro' | 'stopwatch' | 'countdown';

export interface StudySession {
  id: string;
  subjectId?: string;
  chapterId?: string;
  mode: TimerMode;
  durationSeconds: number;
  xpEarned: number;
  notes?: string;
  completedAt: string; // ISO String
}

export interface ChapterExercise {
  id: string;
  name: string; // e.g. "Exercise 1: Single Option Correct", "Exercise 2: Multi-Correct", "Exercise 3: Numerical Value", "JEE Mains PYQs"
  totalQuestions: number;
  attemptedQuestions: number;
  startedQuestions?: number; // started / in-progress count
  correctQuestions?: number;
  notes?: string;
}

export interface ModulePractice {
  id: string;
  chapterId: string;
  subjectId: string;
  sourceName: string; // e.g., 'HC Verma', 'Allen Module', 'PyQ 2020-2024', 'MS Chouhan'
  totalQuestions: number;
  attemptedQuestions: number;
  correctQuestions: number;
  markedDifficult: string[]; // array of question IDs/Numbers e.g. ["Q14", "Q32", "Ex 2 #18"]
  notes?: string;
  lastPracticedAt?: string;
  exercises?: ChapterExercise[];
}

export interface Reminder {
  id: string;
  title: string;
  type: 'lecture' | 'task' | 'revision' | 'practice';
  targetDate: string; // YYYY-MM-DD
  targetTime: string; // HH:MM
  subjectId?: string;
  completed: boolean;
  notes?: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'study' | 'questions' | 'backlog' | 'subject';
  icon: string;
  unlockedAt?: string;
  requirement: string;
}

export interface ExamTargetConfig {
  examName: string; // e.g. "JEE Mains 2026", "JEE Advanced 2026", "NEET 2026"
  sessionName: string; // e.g. "Session 1", "Session 2", "April Attempt"
  examDate: string; // YYYY-MM-DD e.g. "2026-01-24"
  targetSyllabusPercent: number; // e.g. 100, 85, 90, 75
  syllabusScope?: 'full' | 'class11' | 'class12' | 'custom';
  targetChaptersCount?: number;
}

export interface UserStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  totalStudySeconds: number;
  totalQuestionsAttempted: number;
  totalQuestionsCorrect: number;
  unlockedBadgeIds: string[];
  examTarget?: ExamTargetConfig;
  studentClassScope?: '11' | '12' | 'combined';
}

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // base64 string or data URL
  sizeBytes?: number;
  previewUrl?: string;
  type: 'image' | 'pdf' | 'whiteboard' | 'document' | 'code';
  textContent?: string;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  actionsExecuted?: Array<{
    action: string;
    details: string;
    success: boolean;
  }>;
}

export interface AIChatConversation {
  id: string;
  title: string;
  createdAt: string;
  messages: AIChatMessage[];
}

export interface AISettings {
  provider: 'gemini';
  model: string;
  persona?: 'strategist' | 'coach' | 'tutor';
  apiKey?: string;
}

export interface StudyOSBackup {
  app: 'StudyOS';
  backupVersion: number;
  createdAt: string;
  summary: {
    tasksCount: number;
    lecturesCount: number;
    chaptersCount: number;
    sessionsCount: number;
    practicesCount: number;
    remindersCount: number;
    totalXp: number;
  };
  data: {
    subjects: Subject[];
    chapters: Chapter[];
    lectures: Lecture[];
    tasks: Task[];
    sessions: StudySession[];
    modulePractices: ModulePractice[];
    reminders: Reminder[];
    userStats: UserStats;
    chatHistory?: AIChatMessage[];
    chatConversations?: AIChatConversation[];
  };
}

export interface DestructiveActionConfirmation {
  id: string;
  title: string;
  description: string;
  actionName: string;
  itemCount: number;
  execute: () => Promise<void>;
}

export interface AppState {
  subjects: Subject[];
  chapters: Chapter[];
  lectures: Lecture[];
  tasks: Task[];
  sessions: StudySession[];
  modulePractices: ModulePractice[];
  reminders: Reminder[];
  userStats: UserStats;
  chatHistory: AIChatMessage[];
  chatConversations: AIChatConversation[];
  activeChatId: string;
}

