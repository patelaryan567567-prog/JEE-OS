import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Droplets,
  AlertTriangle,
  Clock,
  Lightbulb,
  X,
  ArrowRight,
  Brain,
  Sparkles,
  BookOpen,
  Volume2,
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';
import { saveAISuggestion } from '../../utils/aiSuggestionsStorage';

interface NudgeItem {
  id: string;
  type: 'water' | 'backlog' | 'task' | 'lecture' | 'balance' | 'tip';
  title: string;
  message: string;
  actionText: string;
  actionView?: string;
  actionPrompt?: string;
  xpBonus?: number;
}

export const AISmartNudgeBanner: React.FC = () => {
  const { state, setActiveView, sendChatMessage, awardXp } = useApp();
  const [activeNudge, setActiveNudge] = useState<NudgeItem | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeMinutes, setActiveMinutes] = useState(0);

  // Track if user is actually active in the app
  const lastInteractionRef = useRef<number>(Date.now());
  const isUserActiveRef = useRef<boolean>(true);

  // User activity listeners
  useEffect(() => {
    const handleActivity = () => {
      lastInteractionRef.current = Date.now();
      isUserActiveRef.current = true;
    };

    window.addEventListener('pointerdown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    // Active minutes accumulator (only increments when user interacted in last 3 mins)
    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastInteractionRef.current < 3 * 60 * 1000) {
        setActiveMinutes((prev) => prev + 1);
      } else {
        isUserActiveRef.current = false;
      }
    }, 60000);

    return () => {
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      clearInterval(timer);
    };
  }, []);

  // Periodic Intelligent Nudge Dispatcher
  const evaluateNudges = useCallback(
    (forceRandomTip = false) => {
      // Only evaluate if user is active in the app
      if (!isUserActiveRef.current && !forceRandomTip) return;

      const backlogTasks = state.tasks.filter((t) => t.category === 'backlog');
      const unstartedLectures = state.lectures.filter((l) => l.status === 'not_started');
      const totalBacklogs = backlogTasks.length + unstartedLectures.length;
      const pendingTodayTasks = state.tasks.filter((t) => t.category === 'today' && !t.completedAt);
      const inProgressLectures = state.lectures.filter((l) => l.status === 'in_progress');

      // Helper to dispatch and save suggestion
      const dispatchNudge = (nudge: NudgeItem) => {
        soundEffects.playNudgeAlert();
        setActiveNudge(nudge);
        saveAISuggestion({
          id: nudge.id,
          title: nudge.title,
          message: nudge.message,
          type: nudge.type,
          actionText: nudge.actionText,
          actionView: nudge.actionView,
          actionPrompt: nudge.actionPrompt,
          xpBonus: nudge.xpBonus,
        });
      };

      // 1. Water & Hydration Alert (every 35-40 active minutes)
      if (activeMinutes > 0 && activeMinutes % 35 === 0 && !activeNudge) {
        dispatchNudge({
          id: `water-${activeMinutes}`,
          type: 'water',
          title: '💧 Hydration & Posture Reset',
          message:
            `You have been studying actively in StudyOS for ${activeMinutes} minutes. Drink a glass of water, roll your shoulders back, and rest your eyes (20-20-20 rule)!`,
          actionText: 'Drank Water (+15 XP)',
          xpBonus: 15,
          actionView: 'timer',
        });
        return;
      }

      // 2. High Priority Backlog Prompt
      if (totalBacklogs > 0 && (forceRandomTip || Math.random() > 0.45) && !activeNudge) {
        const topItem = backlogTasks[0]?.title || unstartedLectures[0]?.title || 'Key JEE Topic';
        dispatchNudge({
          id: `backlog-${Date.now()}`,
          type: 'backlog',
          title: `⚠️ Tackle Backlog: ${topItem.slice(0, 30)}...`,
          message:
            `You have ${totalBacklogs} pending backlog items. Don't let them compound before mock tests! Clear this single item in a 30-min focused sprint today.`,
          actionText: 'Open Backlogs',
          actionView: 'backlog',
        });
        return;
      }

      // 3. Pending Today Tasks Nudge
      if (pendingTodayTasks.length > 0 && (forceRandomTip || Math.random() > 0.5) && !activeNudge) {
        const urgent = pendingTodayTasks[0];
        dispatchNudge({
          id: `task-${urgent.id}`,
          type: 'task',
          title: `🎯 Today's Task: ${urgent.title.slice(0, 32)}`,
          message:
            `You have ${pendingTodayTasks.length} pending tasks scheduled for today. Complete this high-yield task now to maintain daily streak momentum!`,
          actionText: 'View Tasks',
          actionView: 'tasks',
        });
        return;
      }

      // 4. Pending Lectures in Progress
      if (inProgressLectures.length > 0 && (forceRandomTip || Math.random() > 0.5) && !activeNudge) {
        const lec = inProgressLectures[0];
        dispatchNudge({
          id: `lec-${lec.id}`,
          type: 'lecture',
          title: `🎬 Resume Lecture: ${lec.title.slice(0, 30)}...`,
          message:
            `Lecture is currently in progress. Finish watching with active margin notes at 1.25x speed (+50 XP upon completion).`,
          actionText: 'Lecture Tracker',
          actionView: 'lectures',
        });
        return;
      }

      // 5. Subject Balance (Physics, Chemistry, Maths 1:1:1 Rule)
      if ((forceRandomTip || Math.random() > 0.5) && !activeNudge) {
        const subjects = state.subjects || [];
        const randomSubj = subjects[Math.floor(Math.random() * subjects.length)];
        if (randomSubj) {
          dispatchNudge({
            id: `balance-${randomSubj.id}`,
            type: 'balance',
            title: `📚 Subject Check: ${randomSubj.name}`,
            message:
              `JEE Advanced rank depends on balanced score across all 3 subjects. Have you solved practice problems for ${randomSubj.name} today?`,
            actionText: `Practice ${randomSubj.name}`,
            actionView: 'practice',
          });
          return;
        }
      }

      // 6. Pro Study Strategies: "How to Start" & "How to Complete"
      if (!activeNudge) {
        const proTips: NudgeItem[] = [
          {
            id: 'tip-inertia',
            type: 'tip',
            title: '🚀 How to Start: The 2-Minute Rule',
            message:
              'Feeling lazy to study? Do not commit to 3 hours. Just sit down, open your notes, and write down 2 formulas or solve 1 question. Once mental inertia breaks, flow takes over!',
            actionText: 'Start 25m Timer',
            actionView: 'timer',
          },
          {
            id: 'tip-backlog-strategy',
            type: 'tip',
            title: '⚡ How to Clear Backlogs Fast',
            message:
              'Rule of Backlog Slaying: Never watch full 2-hour video lectures for old backlogs. Read one-page revision sheets first, then jump directly into 10 past JEE questions!',
            actionText: 'Open Backlogs',
            actionView: 'backlog',
          },
          {
            id: 'tip-active-recall',
            type: 'tip',
            title: '🧠 Active Recall vs Passive Reading',
            message:
              'Re-reading notes gives a false illusion of knowledge. Close your notebook and derivation sheet, and write formulas from memory on rough paper to build deep synaptic recall.',
            actionText: 'Ask AI Coach',
            actionPrompt: 'Give me 3 active recall questions for high weightage JEE topics today',
          },
          {
            id: 'tip-error-diary',
            type: 'tip',
            title: '📖 Maintain Your JEE Error Logbook',
            message:
              'Every question you get wrong in Question Practice is worth +4 marks in the actual exam if you log the conceptual mistake and re-solve it within 48 hours.',
            actionText: 'Question Practice',
            actionView: 'practice',
          },
        ];
        const selected = proTips[Math.floor(Math.random() * proTips.length)];
        dispatchNudge(selected);
      }
    },
    [activeMinutes, activeNudge, state.tasks, state.lectures, state.subjects]
  );

  // Trigger evaluation every 30-45 minutes (user requested 30-45 min intervals)
  useEffect(() => {
    if (isDismissed) return;

    // Initial check only after 30 minutes of app usage
    const initialTimer = setTimeout(() => {
      if (isUserActiveRef.current && !activeNudge) {
        evaluateNudges();
      }
    }, 30 * 60 * 1000);

    // 35-minute recurring interval
    const interval = setInterval(() => {
      if (!isDismissed && !activeNudge) {
        evaluateNudges();
      }
    }, 35 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [evaluateNudges, isDismissed, activeNudge]);

  const handleAction = () => {
    if (!activeNudge) return;

    // Award XP bonus if available (e.g. hydration alert)
    if (activeNudge.xpBonus) {
      awardXp(activeNudge.xpBonus, 'Stayed hydrated during long study');
      soundEffects.playXpGain();
    }

    if (activeNudge.actionView) {
      setActiveView(activeNudge.actionView);
    } else if (activeNudge.actionPrompt) {
      setActiveView('ai-chat');
      sendChatMessage(activeNudge.actionPrompt);
    }
    setActiveNudge(null);
  };

  const handleDismiss = () => {
    setActiveNudge(null);
    setIsDismissed(true);
    // Re-enable notifications only after 35 minutes (30-45 min interval requested)
    setTimeout(() => setIsDismissed(false), 35 * 60 * 1000);
  };

  const iconMap = {
    water: <Droplets className="w-4 h-4 text-cyan-400" />,
    backlog: <AlertTriangle className="w-4 h-4 text-rose-400" />,
    task: <Clock className="w-4 h-4 text-amber-400" />,
    lecture: <BookOpen className="w-4 h-4 text-indigo-400" />,
    balance: <Brain className="w-4 h-4 text-purple-400" />,
    tip: <Lightbulb className="w-4 h-4 text-emerald-400" />,
  };

  const borderMap = {
    water: 'border-cyan-500/60 bg-gradient-to-r from-cyan-950/95 via-slate-900 to-slate-900 text-cyan-200',
    backlog: 'border-rose-500/60 bg-gradient-to-r from-rose-950/95 via-neutral-900 to-neutral-900 text-rose-200',
    task: 'border-amber-500/60 bg-gradient-to-r from-amber-950/95 via-neutral-900 to-neutral-900 text-amber-200',
    lecture: 'border-indigo-500/60 bg-gradient-to-r from-indigo-950/95 via-neutral-900 to-neutral-900 text-indigo-200',
    balance: 'border-purple-500/60 bg-gradient-to-r from-purple-950/95 via-neutral-900 to-neutral-900 text-purple-200',
    tip: 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/95 via-neutral-900 to-neutral-900 text-emerald-200',
  };

  return (
    <>
      {/* Floating Proactive Nudge Banner Card */}
      {activeNudge && (
        <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:max-w-md w-full px-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div
            className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-md space-y-2.5 ${
              borderMap[activeNudge.type]
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-black/40 border border-white/10 shadow-inner">
                  {iconMap[activeNudge.type]}
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-100 block leading-tight">
                    {activeNudge.title}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    AI StudyOS Proactive Reminder
                  </span>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-black/30 transition-colors"
                title="Dismiss reminder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed pl-1">
              {activeNudge.message}
            </p>

            <div className="flex items-center justify-between pt-1 border-t border-white/10">
              <span className="text-[10px] font-mono text-neutral-400">
                Active time: {activeMinutes}m
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDismiss}
                  className="px-2.5 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleAction}
                  className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>{activeNudge.actionText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating 'AI Coach Suggestion' Trigger Pill (Always accessible when banner closed) */}
      {!activeNudge && (
        <button
          onClick={() => evaluateNudges(true)}
          className="fixed bottom-4 right-4 z-30 flex items-center gap-2 px-3 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 border border-purple-800/50 hover:border-purple-500 rounded-full text-xs font-semibold text-purple-200 shadow-xl backdrop-blur-md transition-all group"
          title="Get instant AI Study Coach advice, hydration check or backlog suggestion"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-[11px]">AI Study Nudge</span>
        </button>
      )}
    </>
  );
};
