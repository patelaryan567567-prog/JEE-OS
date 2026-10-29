export interface AISuggestion {
  id: string;
  title: string;
  message: string;
  type: 'water' | 'backlog' | 'task' | 'lecture' | 'balance' | 'tip';
  actionText?: string;
  actionView?: string;
  actionPrompt?: string;
  xpBonus?: number;
  createdAt: string;
}

const STORAGE_KEY = 'studyos_ai_suggestions';

// Initial default suggestions for students when app is fresh
const DEFAULT_SUGGESTIONS: AISuggestion[] = [
  {
    id: 'init-suggestion-1',
    title: '⚡ Rule of Backlog Slaying',
    message: 'Never watch full 2-hour video lectures for old backlogs. Read one-page revision sheets first, then jump directly into 10 past JEE questions!',
    type: 'tip',
    actionText: 'Open Backlogs',
    actionView: 'backlog',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'init-suggestion-2',
    title: '🧠 Active Recall vs Passive Reading',
    message: 'Re-reading notes gives a false illusion of knowledge. Close your notebook and write formulas from memory on rough paper to build deep synaptic recall.',
    type: 'tip',
    actionText: 'Ask AI Coach',
    actionPrompt: 'Give me 3 active recall questions for high weightage JEE topics today',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export const getSavedAISuggestions = (): AISuggestion[] => {
  if (typeof window === 'undefined') return DEFAULT_SUGGESTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SUGGESTIONS));
      return DEFAULT_SUGGESTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SUGGESTIONS;
  } catch {
    return DEFAULT_SUGGESTIONS;
  }
};

export const saveAISuggestion = (
  suggestion: Omit<AISuggestion, 'createdAt'> & { createdAt?: string }
): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedAISuggestions();
    // Filter out if same id or same title within recent
    const filtered = existing.filter((s) => s.id !== suggestion.id && s.title !== suggestion.title);
    const item: AISuggestion = {
      ...suggestion,
      createdAt: suggestion.createdAt || new Date().toISOString(),
    };
    const updated = [item, ...filtered].slice(0, 25);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studyos_ai_suggestions_updated'));
  } catch {
    // Ignore storage errors
  }
};

export const removeAISuggestion = (id: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const existing = getSavedAISuggestions();
    const updated = existing.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('studyos_ai_suggestions_updated'));
  } catch {
    // Ignore storage errors
  }
};

export const clearAllAISuggestions = (): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    window.dispatchEvent(new CustomEvent('studyos_ai_suggestions_updated'));
  } catch {
    // Ignore storage errors
  }
};
