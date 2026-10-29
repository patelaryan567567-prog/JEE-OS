import {
  Subject,
  Chapter,
  Lecture,
  Task,
  StudySession,
  ModulePractice,
  Reminder,
  UserStats,
  AppState,
} from '../types';
import {
  INITIAL_SUBJECTS,
  INITIAL_CHAPTERS,
  INITIAL_LECTURES,
  INITIAL_TASKS,
  INITIAL_MODULE_PRACTICE,
  INITIAL_USER_STATS,
} from './initialData';

const DB_NAME = 'StudyOS_DB_v2';
const DB_VERSION = 2;
const LOCAL_STORAGE_KEY = 'studyos_db_fallback_data_v2';

// Helper to check IndexedDB availability
function isIndexedDBAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBAvailable()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('subjects')) {
        db.createObjectStore('subjects', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chapters')) {
        const store = db.createObjectStore('chapters', { keyPath: 'id' });
        store.createIndex('subjectId', 'subjectId', { unique: false });
      }
      if (!db.objectStoreNames.contains('lectures')) {
        const store = db.createObjectStore('lectures', { keyPath: 'id' });
        store.createIndex('chapterId', 'chapterId', { unique: false });
      }
      if (!db.objectStoreNames.contains('tasks')) {
        const store = db.createObjectStore('tasks', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('modulePractices')) {
        const store = db.createObjectStore('modulePractices', { keyPath: 'id' });
        store.createIndex('chapterId', 'chapterId', { unique: false });
      }
      if (!db.objectStoreNames.contains('reminders')) {
        db.createObjectStore('reminders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('userStats')) {
        db.createObjectStore('userStats', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('chatHistory')) {
        db.createObjectStore('chatHistory', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Fallback localStorage implementation
function getLocalStorageData(): AppState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed reading from localStorage', err);
  }
  const defaultChatId = 'conv-1';
  return {
    subjects: INITIAL_SUBJECTS,
    chapters: INITIAL_CHAPTERS,
    lectures: INITIAL_LECTURES,
    tasks: INITIAL_TASKS,
    sessions: [],
    modulePractices: INITIAL_MODULE_PRACTICE,
    reminders: [],
    userStats: INITIAL_USER_STATS,
    chatHistory: [],
    chatConversations: [
      {
        id: defaultChatId,
        title: 'StudyOS Brain Session',
        createdAt: new Date().toISOString(),
        messages: [],
      },
    ],
    activeChatId: defaultChatId,
  };
}

function saveLocalStorageData(state: AppState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed saving to localStorage', err);
  }
}

export async function loadInitialAppData(): Promise<AppState> {
  try {
    const db = await openDB();

    const getAll = <T>(storeName: string): Promise<T[]> => {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    };

    const subjects = await getAll<Subject>('subjects');

    // If completely empty, seed with authentic initial JEE dataset
    if (subjects.length === 0) {
      const tx = db.transaction(
        ['subjects', 'chapters', 'lectures', 'tasks', 'modulePractices', 'userStats'],
        'readwrite'
      );

      INITIAL_SUBJECTS.forEach((s) => tx.objectStore('subjects').put(s));
      INITIAL_CHAPTERS.forEach((c) => tx.objectStore('chapters').put(c));
      INITIAL_LECTURES.forEach((l) => tx.objectStore('lectures').put(l));
      INITIAL_TASKS.forEach((t) => tx.objectStore('tasks').put(t));
      INITIAL_MODULE_PRACTICE.forEach((m) => tx.objectStore('modulePractices').put(m));
      tx.objectStore('userStats').put({ id: 'stats', ...INITIAL_USER_STATS });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      const defaultChatId = 'conv-1';
      const seededState: AppState = {
        subjects: INITIAL_SUBJECTS,
        chapters: INITIAL_CHAPTERS,
        lectures: INITIAL_LECTURES,
        tasks: INITIAL_TASKS,
        sessions: [],
        modulePractices: INITIAL_MODULE_PRACTICE,
        reminders: [],
        userStats: INITIAL_USER_STATS,
        chatHistory: [],
        chatConversations: [
          {
            id: defaultChatId,
            title: 'StudyOS Brain Session',
            createdAt: new Date().toISOString(),
            messages: [],
          },
        ],
        activeChatId: defaultChatId,
      };
      saveLocalStorageData(seededState);
      return seededState;
    }

    const [chapters, lectures, tasks, sessions, modulePractices, reminders, statsArr, chatHistory] = await Promise.all([
      getAll<Chapter>('chapters'),
      getAll<Lecture>('lectures'),
      getAll<Task>('tasks'),
      getAll<StudySession>('sessions'),
      getAll<ModulePractice>('modulePractices'),
      getAll<Reminder>('reminders'),
      getAll<any>('userStats'),
      db.objectStoreNames.contains('chatHistory') ? getAll<any>('chatHistory') : Promise.resolve([]),
    ]);

    const userStats: UserStats = statsArr.length > 0
      ? {
          totalXp: statsArr[0].totalXp ?? INITIAL_USER_STATS.totalXp,
          level: statsArr[0].level ?? INITIAL_USER_STATS.level,
          currentStreak: statsArr[0].currentStreak ?? INITIAL_USER_STATS.currentStreak,
          longestStreak: statsArr[0].longestStreak ?? INITIAL_USER_STATS.longestStreak,
          lastActiveDate: statsArr[0].lastActiveDate ?? INITIAL_USER_STATS.lastActiveDate,
          totalStudySeconds: statsArr[0].totalStudySeconds ?? INITIAL_USER_STATS.totalStudySeconds,
          totalQuestionsAttempted: statsArr[0].totalQuestionsAttempted ?? INITIAL_USER_STATS.totalQuestionsAttempted,
          totalQuestionsCorrect: statsArr[0].totalQuestionsCorrect ?? INITIAL_USER_STATS.totalQuestionsCorrect,
          unlockedBadgeIds: statsArr[0].unlockedBadgeIds ?? INITIAL_USER_STATS.unlockedBadgeIds,
          examTarget: statsArr[0].examTarget ?? INITIAL_USER_STATS.examTarget,
        }
      : INITIAL_USER_STATS;

    const localFallback = getLocalStorageData();
    const chatConvs = localFallback.chatConversations && localFallback.chatConversations.length > 0
      ? localFallback.chatConversations
      : [
          {
            id: 'conv-1',
            title: 'StudyOS Brain Session',
            createdAt: new Date().toISOString(),
            messages: chatHistory || [],
          },
        ];
    const activeId = localFallback.activeChatId && chatConvs.some(c => c.id === localFallback.activeChatId)
      ? localFallback.activeChatId
      : chatConvs[0].id;
    const activeConv = chatConvs.find(c => c.id === activeId) || chatConvs[0];

    const loadedState: AppState = {
      subjects,
      chapters,
      lectures,
      tasks,
      sessions,
      modulePractices,
      reminders,
      userStats,
      chatHistory: activeConv.messages,
      chatConversations: chatConvs,
      activeChatId: activeId,
    };

    saveLocalStorageData(loadedState);
    return loadedState;
  } catch (error) {
    console.warn('Falling back to localStorage due to IndexedDB issue:', error);
    return getLocalStorageData();
  }
}

// Single item save helper
export async function dbSaveItem<T extends { id: string }>(
  storeName: string,
  item: T,
  fullStateBackup: AppState
): Promise<void> {
  saveLocalStorageData(fullStateBackup);
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(item);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`IndexedDB save error for ${storeName}:`, err);
  }
}

// Single item delete helper
export async function dbDeleteItem(
  storeName: string,
  id: string,
  fullStateBackup: AppState
): Promise<void> {
  saveLocalStorageData(fullStateBackup);
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn(`IndexedDB delete error for ${storeName}:`, err);
  }
}

// Save stats helper
export async function dbSaveUserStats(stats: UserStats, fullStateBackup: AppState): Promise<void> {
  saveLocalStorageData(fullStateBackup);
  try {
    const db = await openDB();
    const tx = db.transaction('userStats', 'readwrite');
    tx.objectStore('userStats').put({ id: 'stats', ...stats });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save userStats error:', err);
  }
}

// Complete database reset
export async function resetDatabase(): Promise<AppState> {
  const defaultChatId = 'conv-1';
  const freshState: AppState = {
    subjects: INITIAL_SUBJECTS,
    chapters: INITIAL_CHAPTERS,
    lectures: INITIAL_LECTURES,
    tasks: INITIAL_TASKS,
    sessions: [],
    modulePractices: INITIAL_MODULE_PRACTICE,
    reminders: [],
    userStats: INITIAL_USER_STATS,
    chatHistory: [],
    chatConversations: [
      {
        id: defaultChatId,
        title: 'StudyOS Brain Session',
        createdAt: new Date().toISOString(),
        messages: [],
      },
    ],
    activeChatId: defaultChatId,
  };

  saveLocalStorageData(freshState);

  try {
    const db = await openDB();
    const storesToClear = [
      'subjects',
      'chapters',
      'lectures',
      'tasks',
      'sessions',
      'modulePractices',
      'reminders',
      'userStats',
    ];
    if (db.objectStoreNames.contains('chatHistory')) {
      storesToClear.push('chatHistory');
    }
    const tx = db.transaction(storesToClear, 'readwrite');
    storesToClear.forEach((s) => tx.objectStore(s).clear());

    INITIAL_SUBJECTS.forEach((s) => tx.objectStore('subjects').put(s));
    INITIAL_CHAPTERS.forEach((c) => tx.objectStore('chapters').put(c));
    INITIAL_LECTURES.forEach((l) => tx.objectStore('lectures').put(l));
    INITIAL_TASKS.forEach((t) => tx.objectStore('tasks').put(t));
    INITIAL_MODULE_PRACTICE.forEach((m) => tx.objectStore('modulePractices').put(m));
    tx.objectStore('userStats').put({ id: 'stats', ...INITIAL_USER_STATS });

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB reset error:', err);
  }

  return freshState;
}

// Import entire backup
export async function importData(state: AppState): Promise<AppState> {
  saveLocalStorageData(state);
  try {
    const db = await openDB();
    const storesToClear = [
      'subjects',
      'chapters',
      'lectures',
      'tasks',
      'sessions',
      'modulePractices',
      'reminders',
      'userStats',
    ];
    if (db.objectStoreNames.contains('chatHistory')) {
      storesToClear.push('chatHistory');
    }
    const tx = db.transaction(storesToClear, 'readwrite');
    storesToClear.forEach((s) => tx.objectStore(s).clear());

    state.subjects.forEach((s) => tx.objectStore('subjects').put(s));
    state.chapters.forEach((c) => tx.objectStore('chapters').put(c));
    state.lectures.forEach((l) => tx.objectStore('lectures').put(l));
    state.tasks.forEach((t) => tx.objectStore('tasks').put(t));
    state.sessions.forEach((s) => tx.objectStore('sessions').put(s));
    state.modulePractices.forEach((m) => tx.objectStore('modulePractices').put(m));
    state.reminders.forEach((r) => tx.objectStore('reminders').put(r));
    tx.objectStore('userStats').put({ id: 'stats', ...state.userStats });
    if (db.objectStoreNames.contains('chatHistory') && Array.isArray(state.chatHistory)) {
      state.chatHistory.forEach((msg) => tx.objectStore('chatHistory').put(msg));
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB import error:', err);
  }
  return state;
}
