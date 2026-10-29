import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  AppState,
  Subject,
  Chapter,
  Lecture,
  Task,
  StudySession,
  ModulePractice,
  Reminder,
  UserStats,
  LectureStatus,
  TaskCategory,
  AIChatMessage,
  AIChatConversation,
  DestructiveActionConfirmation,
  StudyOSBackup,
  ExamTargetConfig,
  AISettings,
  ChatAttachment,
} from '../types';
import {
  loadInitialAppData,
  dbSaveItem,
  dbDeleteItem,
  dbSaveUserStats,
  resetDatabase,
  importData,
} from '../db/indexedDB';
import { ALL_BADGES, DEFAULT_EXAM_TARGET } from '../db/initialData';
import { soundEffects } from '../utils/soundEffects';
import { mergeBackupWithState } from '../services/backupService';
import { sendChatMessageToAI, AppActionHandlers } from '../services/aiService';

interface Toast {
  id: string;
  message: string;
  subtext?: string;
  type: 'info' | 'success' | 'xp' | 'badge';
}

interface AppContextType {
  state: AppState;
  loading: boolean;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedChapterId: string | null;
  setSelectedChapterId: (id: string | null) => void;

  // Gamification & XP
  awardXp: (amount: number, reason: string) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  moveTaskCategory: (id: string, category: TaskCategory) => Promise<void>;

  // Lecture actions
  addLecture: (lecture: Omit<Lecture, 'id'>) => Promise<void>;
  updateLecture: (lecture: Lecture) => Promise<void>;
  deleteLecture: (id: string) => Promise<void>;
  setLectureStatus: (id: string, status: LectureStatus) => Promise<void>;

  // Chapter actions
  addChapter: (chapter: Omit<Chapter, 'id'>) => Promise<void>;
  updateChapter: (chapter: Chapter) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;

  // Module Practice actions
  saveModulePractice: (practice: ModulePractice) => Promise<void>;
  deleteModulePractice: (id: string) => Promise<void>;
  recordPracticeSession: (
    chapterId: string,
    subjectId: string,
    attemptedCount: number,
    correctCount: number,
    sourceName: string,
    difficultQuestions?: string[],
    customTotalQuestions?: number
  ) => Promise<void>;

  // Study Sessions
  logStudySession: (session: Omit<StudySession, 'id' | 'completedAt' | 'xpEarned'>) => Promise<void>;

  // Reminders
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completed'>) => Promise<void>;
  toggleReminder: (id: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // AI Chat History & Conversations
  chatConversations: AIChatConversation[];
  activeChatId: string;
  generatingChatIds: string[];
  setActiveChatId: (id: string) => void;
  createNewChat: (title?: string) => Promise<string>;
  deleteChatConversation: (id: string) => Promise<void>;
  renameChatConversation: (id: string, newTitle: string) => Promise<void>;
  addChatMessage: (msg: Omit<AIChatMessage, 'id' | 'timestamp'>, targetChatId?: string) => Promise<void>;
  clearChatHistory: (targetChatId?: string) => Promise<void>;
  sendChatMessage: (textToSend: string, targetChatId?: string, attachments?: ChatAttachment[]) => Promise<void>;
  stopChatGeneration: (targetChatId?: string) => void;

  // Safety & Confirmation
  pendingConfirmation: DestructiveActionConfirmation | null;
  requestDestructiveConfirmation: (conf: DestructiveActionConfirmation) => void;
  resolvePendingConfirmation: (confirmed: boolean) => Promise<void>;

  // System actions & Backup
  resetDataToDefault: () => Promise<void>;
  exportBackupJSON: () => string;
  importBackupJSON: (jsonStr: string) => Promise<boolean>;
  restoreBackup: (backup: StudyOSBackup, mode: 'replace' | 'merge') => Promise<void>;

  // Exam Target & AI settings
  updateExamTarget: (target: Partial<ExamTargetConfig>) => Promise<void>;
  updateStudentClassScope: (scope: '11' | '12' | 'combined') => Promise<void>;
  aiSettings: AISettings;
  updateAISettings: (settings: Partial<AISettings>) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({
    subjects: [],
    chapters: [],
    lectures: [],
    tasks: [],
    sessions: [],
    modulePractices: [],
    reminders: [],
    userStats: {
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
    chatHistory: [],
    chatConversations: [
      {
        id: 'conv-1',
        title: 'StudyOS Brain Session',
        createdAt: new Date().toISOString(),
        messages: [],
      },
    ],
    activeChatId: 'conv-1',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<DestructiveActionConfirmation | null>(null);
  const [generatingChatIds, setGeneratingChatIds] = useState<string[]>([]);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const stateRef = useRef<AppState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load persistent DB on mount
  useEffect(() => {
    let isMounted = true;
    loadInitialAppData().then((data) => {
      if (isMounted) {
        const convs = data.chatConversations && data.chatConversations.length > 0
          ? data.chatConversations
          : [
              {
                id: 'conv-1',
                title: 'StudyOS Brain Session',
                createdAt: new Date().toISOString(),
                messages: data.chatHistory || [],
              },
            ];
        const activeId = data.activeChatId && convs.some((c) => c.id === data.activeChatId)
          ? data.activeChatId
          : convs[0].id;
        const activeConv = convs.find((c) => c.id === activeId) || convs[0];

        setState({
          ...data,
          chatConversations: convs,
          activeChatId: activeId,
          chatHistory: activeConv.messages,
        });
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check badges unlock conditions
  const checkBadgeUnlocks = useCallback(
    (stats: UserStats, sessionsCount: number, chaptersList: Chapter[], totalClearedBacklog: number) => {
      const unlockedIds = new Set(stats.unlockedBadgeIds);
      const newUnlocked: string[] = [];

      ALL_BADGES.forEach((badge) => {
        if (unlockedIds.has(badge.id)) return;

        let shouldUnlock = false;
        if (badge.id === 'badge-1' && (sessionsCount > 0 || stats.totalStudySeconds > 0)) {
          shouldUnlock = true;
        } else if (badge.id === 'badge-2' && stats.totalStudySeconds >= 3600) {
          shouldUnlock = true;
        } else if (badge.id === 'badge-3' && stats.totalQuestionsAttempted >= 100) {
          shouldUnlock = true;
        } else if (badge.id === 'badge-4' && stats.currentStreak >= 3) {
          shouldUnlock = true;
        } else if (badge.id === 'badge-5' && stats.currentStreak >= 7) {
          shouldUnlock = true;
        } else if (badge.id === 'badge-6' && totalClearedBacklog >= 5) {
          shouldUnlock = true;
        } else if (
          badge.id === 'badge-7' &&
          stats.totalQuestionsAttempted >= 150 &&
          stats.totalQuestionsCorrect / Math.max(1, stats.totalQuestionsAttempted) >= 0.8
        ) {
          shouldUnlock = true;
        }

        if (shouldUnlock) {
          unlockedIds.add(badge.id);
          newUnlocked.push(badge.id);
          addToast({
            type: 'badge',
            message: `Badge Unlocked: ${badge.title}!`,
            subtext: badge.description,
          });
          soundEffects.playBadgeUnlock();
        }
      });

      return Array.from(unlockedIds);
    },
    [addToast]
  );

  // Award XP with sound, toast, streak, and level calculation
  const awardXp = useCallback(
    (amount: number, reason: string) => {
      setState((prev) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const newTotalXp = prev.userStats.totalXp + amount;
        const newLevel = Math.floor(Math.sqrt(newTotalXp / 80)) + 1;

        let streak = prev.userStats.currentStreak;
        if (!prev.userStats.lastActiveDate) {
          streak = 1;
        } else if (prev.userStats.lastActiveDate !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          if (prev.userStats.lastActiveDate === yesterdayStr) {
            streak += 1;
          } else {
            streak = 1;
          }
        }

        const longest = Math.max(prev.userStats.longestStreak, streak);

        const updatedStats: UserStats = {
          ...prev.userStats,
          totalXp: newTotalXp,
          level: newLevel,
          currentStreak: streak,
          longestStreak: longest,
          lastActiveDate: todayStr,
        };

        const updatedBadgeIds = checkBadgeUnlocks(
          updatedStats,
          prev.sessions.length,
          prev.chapters,
          prev.tasks.filter((t) => t.category === 'completed' && t.isBacklog).length
        );
        updatedStats.unlockedBadgeIds = updatedBadgeIds;

        const nextState = { ...prev, userStats: updatedStats };
        dbSaveUserStats(updatedStats, nextState);
        return nextState;
      });

      soundEffects.playXpGain();
      addToast({
        type: 'xp',
        message: `+${amount} XP`,
        subtext: reason,
      });
    },
    [addToast, checkBadgeUnlocks]
  );

  // Task Handlers
  const addTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const next = { ...prev, tasks: [newTask, ...prev.tasks] };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('tasks', newTask, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Task created',
      subtext: newTask.title,
    });
  };

  const updateTask = async (task: Task) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextTasks = prev.tasks.map((t) => (t.id === task.id ? task : t));
      const next = { ...prev, tasks: nextTasks };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('tasks', task, nextStateToSave);
    }
  };

  const deleteTask = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextTasks = prev.tasks.filter((t) => t.id !== id);
      const next = { ...prev, tasks: nextTasks };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbDeleteItem('tasks', id, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Task removed',
    });
  };

  const toggleTaskCompletion = async (id: string) => {
    let taskTitle = '';
    let isNowCompleted = false;
    let nextStateToSave: AppState | null = null;
    let updatedTaskObj: Task | null = null;

    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === id);
      if (!task) return prev;

      taskTitle = task.title;
      isNowCompleted = task.category !== 'completed';
      const updatedTask: Task = {
        ...task,
        category: isNowCompleted ? 'completed' : 'today',
        completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      };
      updatedTaskObj = updatedTask;

      const nextTasks = prev.tasks.map((t) => (t.id === id ? updatedTask : t));
      const next = { ...prev, tasks: nextTasks };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });

    if (nextStateToSave && updatedTaskObj) {
      await dbSaveItem('tasks', updatedTaskObj, nextStateToSave);
    }

    if (isNowCompleted) {
      awardXp(35, `Completed: ${taskTitle}`);
    }
  };

  const moveTaskCategory = async (id: string, category: TaskCategory) => {
    let taskTitle = '';
    let nextStateToSave: AppState | null = null;
    let updatedTaskObj: Task | null = null;

    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === id);
      if (!task) return prev;

      taskTitle = task.title;
      const updatedTask: Task = {
        ...task,
        category,
        isBacklog: category === 'backlog' ? true : task.isBacklog,
        completedAt: category === 'completed' ? new Date().toISOString() : undefined,
      };
      updatedTaskObj = updatedTask;

      const nextTasks = prev.tasks.map((t) => (t.id === id ? updatedTask : t));
      const next = { ...prev, tasks: nextTasks };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });

    if (nextStateToSave && updatedTaskObj) {
      await dbSaveItem('tasks', updatedTaskObj, nextStateToSave);
    }

    if (category === 'completed') {
      awardXp(35, `Completed: ${taskTitle}`);
    }
  };

  // Lecture Handlers
  const addLecture = async (lectureData: Omit<Lecture, 'id'>) => {
    const newLec: Lecture = {
      ...lectureData,
      id: `lec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const next = { ...prev, lectures: [newLec, ...prev.lectures] };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('lectures', newLec, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Lecture added',
      subtext: newLec.title,
    });
  };

  const updateLecture = async (lecture: Lecture) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextLectures = prev.lectures.map((l) => (l.id === lecture.id ? lecture : l));
      const next = { ...prev, lectures: nextLectures };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('lectures', lecture, nextStateToSave);
    }
  };

  const deleteLecture = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextLectures = prev.lectures.filter((l) => l.id !== id);
      const next = { ...prev, lectures: nextLectures };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbDeleteItem('lectures', id, nextStateToSave);
    }
  };

  const setLectureStatus = async (id: string, status: LectureStatus) => {
    let lectureTitle = '';
    let nextStateToSave: AppState | null = null;
    let updatedLecObj: Lecture | null = null;

    setState((prev) => {
      const lecture = prev.lectures.find((l) => l.id === id);
      if (!lecture) return prev;

      lectureTitle = lecture.title;
      const updatedLec: Lecture = {
        ...lecture,
        status,
        completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      };
      updatedLecObj = updatedLec;

      const nextLectures = prev.lectures.map((l) => (l.id === id ? updatedLec : l));
      const next = { ...prev, lectures: nextLectures };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });

    if (nextStateToSave && updatedLecObj) {
      await dbSaveItem('lectures', updatedLecObj, nextStateToSave);
    }

    if (status === 'completed') {
      awardXp(50, `Finished lecture: ${lectureTitle}`);
    }
  };

  // Chapter Handlers
  const addChapter = async (chapterData: Omit<Chapter, 'id'>) => {
    const newChapter: Chapter = {
      ...chapterData,
      id: `ch-custom-${Date.now()}`,
    };
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const next = { ...prev, chapters: [...prev.chapters, newChapter] };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('chapters', newChapter, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Chapter created',
      subtext: newChapter.name,
    });
  };

  const updateChapter = async (chapter: Chapter) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextChapters = prev.chapters.map((c) => (c.id === chapter.id ? chapter : c));
      const next = { ...prev, chapters: nextChapters };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('chapters', chapter, nextStateToSave);
    }
  };

  const deleteChapter = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextChapters = prev.chapters.filter((c) => c.id !== id);
      const next = { ...prev, chapters: nextChapters };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbDeleteItem('chapters', id, nextStateToSave);
    }
  };

  // Module Practice Handlers
  const saveModulePractice = async (practice: ModulePractice) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const exists = prev.modulePractices.some((p) => p.id === practice.id);
      const nextPractices = exists
        ? prev.modulePractices.map((p) => (p.id === practice.id ? practice : p))
        : [...prev.modulePractices, practice];
      const next = { ...prev, modulePractices: nextPractices };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('modulePractices', practice, nextStateToSave);
    }
  };

  const deleteModulePractice = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextPractices = prev.modulePractices.filter((p) => p.id !== id);
      const next = { ...prev, modulePractices: nextPractices };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbDeleteItem('modulePractices', id, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Question practice record deleted',
    });
  };

  const recordPracticeSession = async (
    chapterId: string,
    subjectId: string,
    attemptedCount: number,
    correctCount: number,
    sourceName: string,
    difficultQuestions?: string[],
    customTotalQuestions?: number
  ) => {
    const currentState = stateRef.current;
    const existing = currentState.modulePractices.find((p) => p.chapterId === chapterId);
    let updated: ModulePractice;

    if (existing) {
      const mergedDifficult = Array.from(
        new Set([...existing.markedDifficult, ...(difficultQuestions || [])])
      );
      updated = {
        ...existing,
        totalQuestions: customTotalQuestions ? Math.max(1, customTotalQuestions) : existing.totalQuestions,
        attemptedQuestions: existing.attemptedQuestions + attemptedCount,
        correctQuestions: existing.correctQuestions + correctCount,
        markedDifficult: mergedDifficult,
        lastPracticedAt: new Date().toISOString().split('T')[0],
      };
    } else {
      updated = {
        id: `mod-${Date.now()}`,
        chapterId,
        subjectId,
        sourceName: sourceName || 'JEE Prep Module',
        totalQuestions: customTotalQuestions ? Math.max(1, customTotalQuestions) : 100,
        attemptedQuestions: attemptedCount,
        correctQuestions: correctCount,
        markedDifficult: difficultQuestions || [],
        lastPracticedAt: new Date().toISOString().split('T')[0],
      };
    }

    await saveModulePractice(updated);

    // Update stats
    const xpGained = attemptedCount * 2 + correctCount * 3;
    setState((prev) => {
      const updatedStats: UserStats = {
        ...prev.userStats,
        totalQuestionsAttempted: prev.userStats.totalQuestionsAttempted + attemptedCount,
        totalQuestionsCorrect: prev.userStats.totalQuestionsCorrect + correctCount,
      };
      const nextState = { ...prev, userStats: updatedStats };
      stateRef.current = nextState;
      dbSaveUserStats(updatedStats, nextState);
      return nextState;
    });

    awardXp(xpGained, `Practiced ${attemptedCount} questions (${correctCount} correct)`);
  };

  // Study Session Log
  const logStudySession = async (
    sessionData: Omit<StudySession, 'id' | 'completedAt' | 'xpEarned'>
  ) => {
    const durationMinutes = Math.round(sessionData.durationSeconds / 60);
    const xpEarned = Math.max(5, Math.round((sessionData.durationSeconds / 60) * 1.5));

    const newSession: StudySession = {
      ...sessionData,
      id: `sess-${Date.now()}`,
      durationSeconds: sessionData.durationSeconds,
      xpEarned,
      completedAt: new Date().toISOString(),
    };

    let nextStateToSave: AppState | null = null;
    let statsToSave: UserStats | null = null;

    setState((prev) => {
      const nextSessions = [newSession, ...prev.sessions];
      const updatedStats: UserStats = {
        ...prev.userStats,
        totalStudySeconds: prev.userStats.totalStudySeconds + sessionData.durationSeconds,
      };
      statsToSave = updatedStats;
      const next = { ...prev, sessions: nextSessions, userStats: updatedStats };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });

    if (nextStateToSave && statsToSave) {
      await dbSaveItem('sessions', newSession, nextStateToSave);
      await dbSaveUserStats(statsToSave, nextStateToSave);
    }

    awardXp(xpEarned, `Logged ${durationMinutes}m focus session`);
  };

  // Reminders
  const addReminder = async (
    reminderData: Omit<Reminder, 'id' | 'createdAt' | 'completed'>
  ) => {
    const newRem: Reminder = {
      ...reminderData,
      id: `rem-${Date.now()}`,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextReminders = [newRem, ...prev.reminders];
      const next = { ...prev, reminders: nextReminders };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('reminders', newRem, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Reminder scheduled',
      subtext: `${newRem.title} at ${newRem.targetTime}`,
    });
  };

  const toggleReminder = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    let updatedObj: Reminder | null = null;
    setState((prev) => {
      const rem = prev.reminders.find((r) => r.id === id);
      if (!rem) return prev;
      const updated: Reminder = { ...rem, completed: !rem.completed };
      updatedObj = updated;
      const nextReminders = prev.reminders.map((r) => (r.id === id ? updated : r));
      const next = { ...prev, reminders: nextReminders };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave && updatedObj) {
      await dbSaveItem('reminders', updatedObj, nextStateToSave);
    }
  };

  const deleteReminder = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextReminders = prev.reminders.filter((r) => r.id !== id);
      const next = { ...prev, reminders: nextReminders };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbDeleteItem('reminders', id, nextStateToSave);
    }
  };

  // AI Chat History & Conversations
  const setActiveChatId = (id: string) => {
    setState((prev) => {
      const conv = (prev.chatConversations || []).find((c) => c.id === id);
      const next = {
        ...prev,
        activeChatId: id,
        chatHistory: conv ? conv.messages : [],
      };
      stateRef.current = next;
      return next;
    });
  };

  const createNewChat = async (title?: string): Promise<string> => {
    const newId = `conv-${Date.now()}`;
    const newConv: AIChatConversation = {
      id: newId,
      title: title || `Chat Session ${((stateRef.current.chatConversations || []).length + 1)}`,
      createdAt: new Date().toISOString(),
      messages: [],
    };
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextConvs = [newConv, ...(prev.chatConversations || [])];
      const next = {
        ...prev,
        chatConversations: nextConvs,
        activeChatId: newId,
        chatHistory: [],
      };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('chatHistory', { id: newId, title: newConv.title, messages: [] } as any, nextStateToSave);
    }
    return newId;
  };

  const deleteChatConversation = async (id: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextConvs = (prev.chatConversations || []).filter((c) => c.id !== id);
      let nextActiveId = prev.activeChatId;
      let nextHistory = prev.chatHistory;

      if (nextActiveId === id) {
        if (nextConvs.length > 0) {
          nextActiveId = nextConvs[0].id;
          nextHistory = nextConvs[0].messages;
        } else {
          const freshId = `conv-${Date.now()}`;
          const freshConv: AIChatConversation = {
            id: freshId,
            title: 'StudyOS Brain Session',
            createdAt: new Date().toISOString(),
            messages: [],
          };
          nextConvs.push(freshConv);
          nextActiveId = freshId;
          nextHistory = [];
        }
      }

      const next = {
        ...prev,
        chatConversations: nextConvs,
        activeChatId: nextActiveId,
        chatHistory: nextHistory,
      };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });

    if (nextStateToSave) {
      await dbDeleteItem('chatHistory', id, nextStateToSave);
    }
    addToast({
      type: 'info',
      message: 'Chat conversation deleted',
    });
  };

  const renameChatConversation = async (id: string, newTitle: string) => {
    let nextStateToSave: AppState | null = null;
    setState((prev) => {
      const nextConvs = (prev.chatConversations || []).map((c) =>
        c.id === id ? { ...c, title: newTitle.trim() || c.title } : c
      );
      const next = {
        ...prev,
        chatConversations: nextConvs,
      };
      stateRef.current = next;
      nextStateToSave = next;
      return next;
    });
    if (nextStateToSave) {
      await dbSaveItem('chatHistory', { id, title: newTitle } as any, nextStateToSave);
    }
  };

  const addChatMessage = async (
    msgData: Omit<AIChatMessage, 'id' | 'timestamp'>,
    targetChatId?: string
  ) => {
    const newMsg: AIChatMessage = {
      ...msgData,
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };

    let nextStateToSave: AppState | null = null;

    setState((prevState) => {
      const currentConvs =
        prevState.chatConversations && prevState.chatConversations.length > 0
          ? prevState.chatConversations
          : [
              {
                id: prevState.activeChatId || 'conv-1',
                title: 'StudyOS Brain Session',
                createdAt: new Date().toISOString(),
                messages: prevState.chatHistory || [],
              },
            ];

      const activeId = targetChatId || prevState.activeChatId || currentConvs[0].id;

      const nextConvs = currentConvs.map((conv) => {
        if (conv.id === activeId) {
          let title = conv.title;
          if (conv.messages.length === 0 && msgData.role === 'user') {
            title = msgData.content.slice(0, 32) + (msgData.content.length > 32 ? '...' : '');
          }
          return {
            ...conv,
            title,
            messages: [...conv.messages, newMsg],
          };
        }
        return conv;
      });

      if (!nextConvs.some((c) => c.id === activeId)) {
        nextConvs.push({
          id: activeId,
          title: msgData.role === 'user' ? msgData.content.slice(0, 32) : 'StudyOS Brain Session',
          createdAt: new Date().toISOString(),
          messages: [newMsg],
        });
      }

      const nextHistory = nextConvs.find((c) => c.id === prevState.activeChatId)?.messages || [];
      const nextState: AppState = {
        ...prevState,
        chatConversations: nextConvs,
        chatHistory: nextHistory,
      };
      stateRef.current = nextState;
      nextStateToSave = nextState;
      return nextState;
    });

    if (nextStateToSave) {
      await dbSaveItem('chatHistory', newMsg, nextStateToSave);
    }
  };

  const clearChatHistory = async (targetChatId?: string) => {
    const activeId = targetChatId || stateRef.current.activeChatId || 'conv-1';
    let nextStateToSave: AppState | null = null;

    setState((prevState) => {
      const nextConvs = (prevState.chatConversations || []).map((conv) => {
        if (conv.id === activeId) {
          return { ...conv, messages: [] };
        }
        return conv;
      });
      const nextHistory = activeId === prevState.activeChatId ? [] : prevState.chatHistory;
      const nextState: AppState = {
        ...prevState,
        chatConversations: nextConvs,
        chatHistory: nextHistory,
      };
      stateRef.current = nextState;
      nextStateToSave = nextState;
      return nextState;
    });

    if (nextStateToSave) {
      await dbSaveItem('chatHistory', { id: activeId, messages: [] } as any, nextStateToSave);
    }

    addToast({
      type: 'info',
      message: 'Chat conversation cleared',
    });
  };

  const sendChatMessage = async (
    textToSend: string,
    targetChatId?: string,
    attachments?: ChatAttachment[]
  ) => {
    const trimmed = textToSend.trim();
    if (!trimmed && (!attachments || attachments.length === 0)) return;

    const currentState = stateRef.current;
    const currentConvs = currentState.chatConversations || [];
    const activeId = targetChatId || currentState.activeChatId || (currentConvs.length > 0 ? currentConvs[0].id : 'conv-1');

    if (generatingChatIds.includes(activeId)) return;

    const messageContent = trimmed || (attachments && attachments.length > 0 ? 'Please inspect and solve the attached question / diagram / material.' : '');

    // 1. Add user message to targetChatId (guaranteed to be appended to state and saved)
    await addChatMessage({ role: 'user', content: messageContent, attachments }, activeId);

    // 2. Set generating state & AbortController for background processing
    const controller = new AbortController();
    abortControllersRef.current.set(activeId, controller);
    setGeneratingChatIds((prev) => (prev.includes(activeId) ? prev : [...prev, activeId]));

    try {
      // Use latest history from stateRef which now includes the user's message
      const latestState = stateRef.current;
      const conv = (latestState.chatConversations || []).find((c) => c.id === activeId);
      const history = conv ? conv.messages : (latestState.chatHistory || []);

      const handlers: AppActionHandlers = {
        addTask,
        updateTask,
        deleteTask,
        toggleTaskCompletion,
        moveTaskCategory,
        addLecture,
        updateLecture,
        deleteLecture,
        setLectureStatus,
        recordPracticeSession,
        addReminder,
        deleteReminder,
        updateChapter,
        addChapter,
        deleteModulePractice,
        updateExamTarget,
        requestDestructiveConfirmation,
      };

      const result = await sendChatMessageToAI(
        messageContent,
        latestState,
        history,
        handlers,
        {
          model: aiSettings.model,
          persona: aiSettings.persona,
          apiKey: aiSettings.apiKey,
          signal: controller.signal,
          attachments,
        }
      );

      if (controller.signal.aborted || result.aborted) {
        await addChatMessage({
          role: 'assistant',
          content: '⏹️ *Response stopped by user.*',
        }, activeId);
      } else {
        await addChatMessage({
          role: 'assistant',
          content: result.reply,
          actionsExecuted: result.actionsExecuted,
        }, activeId);
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        await addChatMessage({
          role: 'assistant',
          content: '⏹️ *Response stopped by user.*',
        }, activeId);
      } else {
        const msg = err.message || 'Unable to connect to StudyOS AI server';
        await addChatMessage({
          role: 'assistant',
          content: `⚠️ Sorry, I encountered an issue connecting to StudyOS Brain: ${msg}. Please check your connection and try again.`,
        }, activeId);
      }
    } finally {
      abortControllersRef.current.delete(activeId);
      setGeneratingChatIds((prev) => prev.filter((id) => id !== activeId));
    }
  };

  const stopChatGeneration = (targetChatId?: string) => {
    const activeId = targetChatId || state.activeChatId || 'conv-1';
    const controller = abortControllersRef.current.get(activeId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(activeId);
    }
    setGeneratingChatIds((prev) => prev.filter((id) => id !== activeId));
    addToast({
      type: 'info',
      message: 'AI generation stopped',
    });
  };

  // Safety & Confirmation
  const requestDestructiveConfirmation = (conf: DestructiveActionConfirmation) => {
    setPendingConfirmation(conf);
  };

  const resolvePendingConfirmation = async (confirmed: boolean) => {
    if (!pendingConfirmation) return;
    if (confirmed) {
      await pendingConfirmation.execute();
      addToast({
        type: 'info',
        message: `Action confirmed: ${pendingConfirmation.title}`,
      });
    }
    setPendingConfirmation(null);
  };

  // Advanced Restore
  const restoreBackup = async (backup: StudyOSBackup, mode: 'replace' | 'merge') => {
    let targetState: AppState;
    if (mode === 'merge') {
      targetState = mergeBackupWithState(state, backup.data);
    } else {
      const defaultChatId = 'conv-1';
      const convs = backup.data.chatConversations && backup.data.chatConversations.length > 0
        ? backup.data.chatConversations
        : [
            {
              id: defaultChatId,
              title: 'StudyOS Brain Session',
              createdAt: new Date().toISOString(),
              messages: backup.data.chatHistory || [],
            },
          ];
      targetState = {
        subjects: backup.data.subjects,
        chapters: backup.data.chapters,
        lectures: backup.data.lectures,
        tasks: backup.data.tasks,
        sessions: backup.data.sessions,
        modulePractices: backup.data.modulePractices,
        reminders: backup.data.reminders,
        userStats: backup.data.userStats,
        chatHistory: backup.data.chatHistory || [],
        chatConversations: convs,
        activeChatId: convs[0].id,
      };
    }

    const imported = await importData(targetState);
    setState(imported);
    addToast({
      type: 'success',
      message: mode === 'merge' ? 'Backup merged successfully' : 'Backup restored successfully',
      subtext: `${targetState.tasks.length} tasks, ${targetState.chapters.length} chapters loaded`,
    });
  };

  // System Database Management
  const resetDataToDefault = async () => {
    const freshState = await resetDatabase();
    setState(freshState);
    addToast({
      type: 'info',
      message: 'Database reset to default syllabus',
    });
  };

  const exportBackupJSON = (): string => {
    return JSON.stringify(state, null, 2);
  };

  const importBackupJSON = async (jsonStr: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonStr) as AppState;
      if (!parsed.subjects || !parsed.chapters || !parsed.tasks) {
        throw new Error('Invalid StudyOS backup structure');
      }
      const imported = await importData(parsed);
      setState(imported);
      addToast({
        type: 'success',
        message: 'StudyOS backup restored successfully',
      });
      return true;
    } catch (err) {
      console.error(err);
      addToast({
        type: 'info',
        message: 'Failed to import backup: invalid file format',
      });
      return false;
    }
  };

  // Exam Target Customization
  const updateExamTarget = async (target: Partial<ExamTargetConfig>) => {
    const current = state.userStats.examTarget || DEFAULT_EXAM_TARGET;
    const updatedTarget: ExamTargetConfig = {
      ...current,
      ...target,
    };
    const updatedStats: UserStats = {
      ...state.userStats,
      examTarget: updatedTarget,
    };
    const nextState = { ...state, userStats: updatedStats };
    setState(nextState);
    await dbSaveUserStats(updatedStats, nextState);
    addToast({
      type: 'success',
      message: `Exam target updated: ${updatedTarget.examName} (${updatedTarget.sessionName})`,
    });
  };

  const updateStudentClassScope = async (scope: '11' | '12' | 'combined') => {
    const updatedStats: UserStats = {
      ...state.userStats,
      studentClassScope: scope,
    };
    const nextState = { ...state, userStats: updatedStats };
    setState(nextState);
    await dbSaveUserStats(updatedStats, nextState);
    addToast({
      type: 'success',
      message: `Syllabus class scope updated to: ${scope === '11' ? 'Class 11th JEE' : scope === '12' ? 'Class 12th JEE' : 'Combined (Class 11th & 12th)'}`,
    });
  };

  // AI & Model Settings
  const [aiSettings, setAiSettings] = useState<AISettings>(() => {
    try {
      const saved = localStorage.getItem('studyos_ai_pref');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { provider: 'gemini', model: 'gemini-3.8-flash', persona: 'strategist' };
  });

  const updateAISettings = (settings: Partial<AISettings>) => {
    setAiSettings((prev) => {
      const updated = { ...prev, ...settings };
      try {
        localStorage.setItem('studyos_ai_pref', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    addToast({
      type: 'info',
      message: 'AI model & preferences updated',
    });
  };

  const contextValue = useMemo<AppContextType>(
    () => ({
      state,
      loading,
      activeView,
      setActiveView,
      selectedSubjectId,
      setSelectedSubjectId,
      selectedChapterId,
      setSelectedChapterId,
      awardXp,
      toasts,
      removeToast,
      addTask,
      updateTask,
      deleteTask,
      toggleTaskCompletion,
      moveTaskCategory,
      addLecture,
      updateLecture,
      deleteLecture,
      setLectureStatus,
      addChapter,
      updateChapter,
      deleteChapter,
      saveModulePractice,
      deleteModulePractice,
      recordPracticeSession,
      logStudySession,
      addReminder,
      toggleReminder,
      deleteReminder,
      addChatMessage,
      clearChatHistory,
      chatConversations: state.chatConversations || [],
      activeChatId: state.activeChatId || 'conv-1',
      generatingChatIds,
      setActiveChatId,
      createNewChat,
      deleteChatConversation,
      renameChatConversation,
      sendChatMessage,
      stopChatGeneration,
      pendingConfirmation,
      requestDestructiveConfirmation,
      resolvePendingConfirmation,
      resetDataToDefault,
      exportBackupJSON,
      importBackupJSON,
      restoreBackup,
      updateExamTarget,
      updateStudentClassScope,
      aiSettings,
      updateAISettings,
    }),
    [
      state,
      loading,
      activeView,
      selectedSubjectId,
      selectedChapterId,
      toasts,
      awardXp,
      removeToast,
      pendingConfirmation,
      generatingChatIds,
      aiSettings,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
