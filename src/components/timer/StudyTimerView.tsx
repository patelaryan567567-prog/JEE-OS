import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { TimerMode } from '../../types';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings2,
  Volume2,
  BookOpen,
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';

export const StudyTimerView: React.FC = () => {
  const { state, logStudySession, selectedSubjectId } = useApp();

  // Mode selection
  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [pomodoroPhase, setPomodoroPhase] = useState<'work' | 'shortBreak' | 'longBreak'>('work');

  // Custom durations in minutes
  const [workDuration, setWorkDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [countdownMinutes, setCountdownMinutes] = useState(45);

  // Assignment
  const [subjectId, setSubjectId] = useState(selectedSubjectId || state.subjects[0]?.id || '');
  const [chapterId, setChapterId] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');

  // Timer states
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync initial countdowns when mode changes
  useEffect(() => {
    setIsRunning(false);
    if (mode === 'pomodoro') {
      const mins =
        pomodoroPhase === 'work'
          ? workDuration
          : pomodoroPhase === 'shortBreak'
          ? shortBreakDuration
          : longBreakDuration;
      setSecondsRemaining(mins * 60);
    } else if (mode === 'countdown') {
      setSecondsRemaining(countdownMinutes * 60);
    } else if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  }, [mode, pomodoroPhase, workDuration, shortBreakDuration, longBreakDuration, countdownMinutes]);

  // Main interval loop
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        if (mode === 'stopwatch') {
          setStopwatchSeconds((prev) => prev + 1);
        } else {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              handleTimerCompleted();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, pomodoroPhase]);

  const handleStart = () => {
    soundEffects.playTimerStart();
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    if (mode === 'pomodoro') {
      const mins =
        pomodoroPhase === 'work'
          ? workDuration
          : pomodoroPhase === 'shortBreak'
          ? shortBreakDuration
          : longBreakDuration;
      setSecondsRemaining(mins * 60);
    } else if (mode === 'countdown') {
      setSecondsRemaining(countdownMinutes * 60);
    } else if (mode === 'stopwatch') {
      setStopwatchSeconds(0);
    }
  };

  const handleTimerCompleted = async () => {
    setIsRunning(false);
    soundEffects.playTimerComplete();

    // If completed a work pomodoro or countdown session, log it
    if (mode === 'pomodoro' && pomodoroPhase === 'work') {
      await logStudySession({
        subjectId: subjectId || undefined,
        chapterId: chapterId || undefined,
        mode: 'pomodoro',
        durationSeconds: workDuration * 60,
        notes: sessionNotes.trim() || 'Completed Pomodoro session',
      });
      // Switch to short break
      setPomodoroPhase('shortBreak');
    } else if (mode === 'countdown') {
      await logStudySession({
        subjectId: subjectId || undefined,
        chapterId: chapterId || undefined,
        mode: 'countdown',
        durationSeconds: countdownMinutes * 60,
        notes: sessionNotes.trim() || 'Completed countdown focus session',
      });
    }
  };

  // Manual save for stopwatch
  const handleSaveStopwatchSession = async () => {
    if (stopwatchSeconds < 60) {
      alert('Session must be at least 1 minute to record.');
      return;
    }
    await logStudySession({
      subjectId: subjectId || undefined,
      chapterId: chapterId || undefined,
      mode: 'stopwatch',
      durationSeconds: stopwatchSeconds,
      notes: sessionNotes.trim() || 'Stopwatch focus study',
    });
    setStopwatchSeconds(0);
    setIsRunning(false);
    setSessionNotes('');
  };

  // Formatting helpers
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatStopwatch = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage calculation
  const totalDurationSeconds =
    mode === 'pomodoro'
      ? (pomodoroPhase === 'work' ? workDuration : pomodoroPhase === 'shortBreak' ? shortBreakDuration : longBreakDuration) * 60
      : countdownMinutes * 60;
  
  const progressRatio =
    mode === 'stopwatch'
      ? 1
      : 1 - secondsRemaining / Math.max(1, totalDurationSeconds);

  const filteredChapters = subjectId
    ? state.chapters.filter((c) => c.subjectId === subjectId)
    : state.chapters;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Focus & Study Timer
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Build unshakeable deep work habits for JEE Physics, Chemistry & Math.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          <button
            onClick={() => setMode('pomodoro')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'pomodoro'
                ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Pomodoro
          </button>
          <button
            onClick={() => setMode('stopwatch')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'stopwatch'
                ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Stopwatch
          </button>
          <button
            onClick={() => setMode('countdown')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              mode === 'countdown'
                ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Countdown
          </button>
        </div>
      </div>

      {/* Main Focus Dial & Controls */}
      <div className="p-6 sm:p-8 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 flex flex-col items-center justify-center relative shadow-xl space-y-6">
        {/* Pomodoro Sub-Phases */}
        {mode === 'pomodoro' && (
          <div className="flex items-center gap-2 p-1 bg-neutral-950 border border-neutral-800/80 rounded-lg text-xs">
            <button
              onClick={() => {
                setPomodoroPhase('work');
                setSecondsRemaining(workDuration * 60);
                setIsRunning(false);
              }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                pomodoroPhase === 'work'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Study Focus ({workDuration}m)
            </button>
            <button
              onClick={() => {
                setPomodoroPhase('shortBreak');
                setSecondsRemaining(shortBreakDuration * 60);
                setIsRunning(false);
              }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                pomodoroPhase === 'shortBreak'
                  ? 'bg-emerald-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Short Break ({shortBreakDuration}m)
            </button>
            <button
              onClick={() => {
                setPomodoroPhase('longBreak');
                setSecondsRemaining(longBreakDuration * 60);
                setIsRunning(false);
              }}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                pomodoroPhase === 'longBreak'
                  ? 'bg-blue-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Long Break ({longBreakDuration}m)
            </button>
          </div>
        )}

        {/* Circular Display / Big Monospace Display */}
        <div className="relative flex flex-col items-center justify-center my-4">
          <div className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tight tabular-nums text-neutral-100 select-none">
            {mode === 'stopwatch' ? formatStopwatch(stopwatchSeconds) : formatTime(secondsRemaining)}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs font-mono text-neutral-400">
            {isRunning ? (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Session Active
              </span>
            ) : (
              <span>Paused / Ready</span>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {mode === 'pomodoro'
                ? pomodoroPhase === 'work'
                  ? 'Deep Study Sprint'
                  : 'Recovery Break'
                : mode === 'stopwatch'
                ? 'Open Elapsed Timer'
                : `${countdownMinutes}m Target Sprint`}
            </span>
          </div>

          {/* Progress linear hairline */}
          {mode !== 'stopwatch' && (
            <div className="w-64 sm:w-80 h-1.5 bg-neutral-950 border border-neutral-800 rounded-full mt-5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  pomodoroPhase === 'work' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.round(progressRatio * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleReset}
            className="p-3 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
            title="Reset Timer"
            aria-label="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          {isRunning ? (
            <button
              onClick={handlePause}
              className="px-8 py-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold text-sm flex items-center gap-2 shadow-lg transition-colors"
            >
              <Pause className="w-5 h-5" />
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center gap-2 shadow-lg transition-colors"
            >
              <Play className="w-5 h-5 fill-neutral-950" />
              Start Focus
            </button>
          )}

          {mode === 'stopwatch' && stopwatchSeconds > 0 && !isRunning && (
            <button
              onClick={handleSaveStopwatchSession}
              className="p-3 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60 transition-colors"
              title="Save Session to Log"
              aria-label="Save Session to Log"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
            title="Timer Settings"
            aria-label="Timer Settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>
        </div>

        {/* Customizable Settings drawer */}
        {showSettings && (
          <div className="w-full max-w-md p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4 animate-in fade-in">
            <h4 className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
              <span>Timer Configurations</span>
              <span className="text-[11px] text-neutral-500">Minutes</span>
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Study Focus</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Short Break</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Countdown</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={countdownMinutes}
                  onChange={(e) => setCountdownMinutes(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Assign Session Details */}
        <div className="w-full max-w-xl pt-4 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Associate Subject
            </label>
            <select
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setChapterId('');
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
            >
              <option value="">General Study / No Subject</option>
              {state.subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">
              Associate Chapter
            </label>
            <select
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              disabled={!subjectId}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80 disabled:opacity-40"
            >
              <option value="">Select Chapter (Optional)</option>
              {filteredChapters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name} (Cl {ch.classYear})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <input
              type="text"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Session notes (e.g., Solving HCV 1-20, Deriving Work-Energy Theorem)..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/80"
            />
          </div>
        </div>
      </div>

      {/* Recent Logged Study Sessions */}
      <div className="p-6 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Completed Sessions Log ({state.sessions.length})
          </span>
          <span className="text-xs text-neutral-400 font-mono">
            {Math.round(state.sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60)} mins total
          </span>
        </h3>

        {state.sessions.length === 0 ? (
          <div className="p-6 text-center text-xs text-neutral-400 rounded-lg border border-neutral-800 bg-neutral-950/40">
            No study sessions completed yet today. Start your first session above!
          </div>
        ) : (
          <div className="space-y-2">
            {state.sessions.slice(0, 6).map((sess) => {
              const subject = state.subjects.find((s) => s.id === sess.subjectId);
              const chapter = state.chapters.find((c) => c.id === sess.chapterId);
              const mins = Math.round(sess.durationSeconds / 60);

              return (
                <div
                  key={sess.id}
                  className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="font-medium text-xs px-2 py-0.5 rounded border text-[11px]"
                      style={{
                        color: subject?.color || '#a3a3a3',
                        borderColor: subject ? `${subject.color}40` : '#404040',
                        backgroundColor: subject ? `${subject.color}15` : '#171717',
                      }}
                    >
                      {subject?.name || 'General'}
                    </span>
                    <div>
                      <div className="font-semibold text-neutral-200">
                        {chapter?.name || sess.notes || 'Focus Study'}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {new Date(sess.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {sess.notes && chapter && ` · ${sess.notes}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono tabular-nums text-neutral-300 font-bold">
                      {mins}m
                    </span>
                    <span className="font-mono text-purple-400 font-semibold text-[11px] bg-purple-950/40 border border-purple-800/40 px-1.5 py-0.5 rounded">
                      +{sess.xpEarned} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
