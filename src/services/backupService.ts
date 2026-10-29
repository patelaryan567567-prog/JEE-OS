import { AppState, StudyOSBackup } from '../types';

export const CURRENT_BACKUP_VERSION = 1;

export function generateBackupData(state: AppState): StudyOSBackup {
  const now = new Date();
  const summary = {
    tasksCount: state.tasks.length,
    lecturesCount: state.lectures.length,
    chaptersCount: state.chapters.length,
    sessionsCount: state.sessions.length,
    practicesCount: state.modulePractices.length,
    remindersCount: state.reminders.length,
    totalXp: state.userStats.totalXp,
  };

  // Explicitly sanitize: DO NOT include any API key!
  const backup: StudyOSBackup = {
    app: 'StudyOS',
    backupVersion: CURRENT_BACKUP_VERSION,
    createdAt: now.toISOString(),
    summary,
    data: {
      subjects: state.subjects,
      chapters: state.chapters,
      lectures: state.lectures,
      tasks: state.tasks,
      sessions: state.sessions,
      modulePractices: state.modulePractices,
      reminders: state.reminders,
      userStats: state.userStats,
      chatHistory: state.chatHistory || [],
    },
  };

  return backup;
}

export function downloadBackupFile(backup: StudyOSBackup): void {
  const jsonStr = JSON.stringify(backup, null, 2);
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');

  const filename = `StudyOS_Backup_${year}-${month}-${day}_${hours}-${mins}.studyos`;

  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  backup?: StudyOSBackup;
  version?: number;
}

export function validateAndParseBackup(rawContent: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(rawContent);

    // Legacy un-versioned object detection & automatic migration
    if (!parsed.app && parsed.subjects && parsed.chapters && parsed.tasks) {
      const migrated: StudyOSBackup = {
        app: 'StudyOS',
        backupVersion: 1,
        createdAt: new Date().toISOString(),
        summary: {
          tasksCount: parsed.tasks?.length || 0,
          lecturesCount: parsed.lectures?.length || 0,
          chaptersCount: parsed.chapters?.length || 0,
          sessionsCount: parsed.sessions?.length || 0,
          practicesCount: parsed.modulePractices?.length || 0,
          remindersCount: parsed.reminders?.length || 0,
          totalXp: parsed.userStats?.totalXp || 0,
        },
        data: {
          subjects: parsed.subjects || [],
          chapters: parsed.chapters || [],
          lectures: parsed.lectures || [],
          tasks: parsed.tasks || [],
          sessions: parsed.sessions || [],
          modulePractices: parsed.modulePractices || [],
          reminders: parsed.reminders || [],
          userStats: parsed.userStats || {
            totalXp: 0,
            level: 1,
            currentStreak: 0,
            longestStreak: 0,
            lastActiveDate: '',
            totalStudySeconds: 0,
            totalQuestionsAttempted: 0,
            totalQuestionsCorrect: 0,
            unlockedBadgeIds: [],
          },
          chatHistory: parsed.chatHistory || [],
        },
      };
      return { valid: true, backup: migrated, version: 1 };
    }

    if (parsed.app !== 'StudyOS') {
      return {
        valid: false,
        error: 'Invalid file signature: Not a valid StudyOS backup file.',
      };
    }

    if (!parsed.data || typeof parsed.data !== 'object') {
      return {
        valid: false,
        error: 'Corrupted backup file: Missing internal database payload.',
      };
    }

    if (!Array.isArray(parsed.data.subjects) || !Array.isArray(parsed.data.chapters)) {
      return {
        valid: false,
        error: 'Corrupted backup file: Invalid subjects or chapters catalog.',
      };
    }

    // Ensure version migrations if older version exists
    let backupVersion = parsed.backupVersion || 1;

    return {
      valid: true,
      backup: parsed as StudyOSBackup,
      version: backupVersion,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `JSON parsing error: ${err.message || 'File is corrupted or not valid JSON.'}`,
    };
  }
}

export function mergeBackupWithState(currentState: AppState, backupData: StudyOSBackup['data']): AppState {
  // Merge tasks (deduplicate by id)
  const taskMap = new Map(currentState.tasks.map((t) => [t.id, t]));
  backupData.tasks.forEach((t) => taskMap.set(t.id, t));

  // Merge chapters (deduplicate by id)
  const chapterMap = new Map(currentState.chapters.map((c) => [c.id, c]));
  backupData.chapters.forEach((c) => chapterMap.set(c.id, c));

  // Merge lectures
  const lectureMap = new Map(currentState.lectures.map((l) => [l.id, l]));
  backupData.lectures.forEach((l) => lectureMap.set(l.id, l));

  // Merge sessions
  const sessionMap = new Map(currentState.sessions.map((s) => [s.id, s]));
  backupData.sessions.forEach((s) => sessionMap.set(s.id, s));

  // Merge practices
  const practiceMap = new Map(currentState.modulePractices.map((p) => [p.id, p]));
  backupData.modulePractices.forEach((p) => practiceMap.set(p.id, p));

  // Merge reminders
  const reminderMap = new Map(currentState.reminders.map((r) => [r.id, r]));
  backupData.reminders.forEach((r) => reminderMap.set(r.id, r));

  // Merge userStats: take highest XP, longest streak
  const mergedStats = {
    ...currentState.userStats,
    totalXp: Math.max(currentState.userStats.totalXp, backupData.userStats.totalXp),
    level: Math.max(currentState.userStats.level, backupData.userStats.level),
    currentStreak: Math.max(currentState.userStats.currentStreak, backupData.userStats.currentStreak),
    longestStreak: Math.max(currentState.userStats.longestStreak, backupData.userStats.longestStreak),
    totalStudySeconds: currentState.userStats.totalStudySeconds + backupData.userStats.totalStudySeconds,
    totalQuestionsAttempted:
      currentState.userStats.totalQuestionsAttempted + backupData.userStats.totalQuestionsAttempted,
    totalQuestionsCorrect:
      currentState.userStats.totalQuestionsCorrect + backupData.userStats.totalQuestionsCorrect,
    unlockedBadgeIds: Array.from(
      new Set([...currentState.userStats.unlockedBadgeIds, ...backupData.userStats.unlockedBadgeIds])
    ),
  };

  // Merge chat history
  const chatMap = new Map((currentState.chatHistory || []).map((m) => [m.id, m]));
  (backupData.chatHistory || []).forEach((m) => chatMap.set(m.id, m));

  const defaultChatId = currentState.activeChatId || 'conv-1';
  const chatConvs = currentState.chatConversations && currentState.chatConversations.length > 0
    ? currentState.chatConversations
    : [
        {
          id: defaultChatId,
          title: 'StudyOS Brain Session',
          createdAt: new Date().toISOString(),
          messages: Array.from(chatMap.values()),
        },
      ];

  return {
    subjects: currentState.subjects.length > 0 ? currentState.subjects : backupData.subjects,
    chapters: Array.from(chapterMap.values()),
    lectures: Array.from(lectureMap.values()),
    tasks: Array.from(taskMap.values()),
    sessions: Array.from(sessionMap.values()),
    modulePractices: Array.from(practiceMap.values()),
    reminders: Array.from(reminderMap.values()),
    userStats: mergedStats,
    chatHistory: Array.from(chatMap.values()),
    chatConversations: chatConvs,
    activeChatId: defaultChatId,
  };
}
