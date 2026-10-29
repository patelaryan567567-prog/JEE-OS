import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Reminder } from '../../types';
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  Trash2,
  Sparkles,
  Volume2,
  Brain,
  Droplets,
  AlertTriangle,
  BookOpen,
  Lightbulb,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { soundEffects } from '../../utils/soundEffects';
import {
  getSavedAISuggestions,
  removeAISuggestion,
  clearAllAISuggestions,
  saveAISuggestion,
  AISuggestion,
} from '../../utils/aiSuggestionsStorage';

export const RemindersView: React.FC = () => {
  const { state, addReminder, toggleReminder, deleteReminder, setActiveView, sendChatMessage } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [type, setType] = useState<Reminder['type']>('revision');
  const [targetDate, setTargetDate] = useState(todayStr);
  const [targetTime, setTargetTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  // Load and listen for AI suggestion updates
  useEffect(() => {
    setAiSuggestions(getSavedAISuggestions());

    const handleUpdate = () => {
      setAiSuggestions(getSavedAISuggestions());
    };

    window.addEventListener('studyos_ai_suggestions_updated', handleUpdate);
    return () => {
      window.removeEventListener('studyos_ai_suggestions_updated', handleUpdate);
    };
  }, []);

  const handleApplyAISuggestion = (sug: AISuggestion) => {
    soundEffects.playPop();
    if (sug.actionView) {
      setActiveView(sug.actionView);
    } else if (sug.actionPrompt) {
      setActiveView('ai-chat');
      sendChatMessage(sug.actionPrompt);
    }
  };

  const handleGenerateFreshSuggestion = () => {
    soundEffects.playSparkle();
    const backlogTasks = state.tasks.filter((t) => t.category === 'backlog');
    const fresh: Omit<AISuggestion, 'createdAt'> = backlogTasks.length > 0
      ? {
          id: `manual-sug-${Date.now()}`,
          title: `⚠️ Tackle Backlog: ${backlogTasks[0].title.slice(0, 32)}`,
          message: `You have ${backlogTasks.length} pending backlog items. Clear this single topic in a 30-min focused sprint today to prevent compounding!`,
          type: 'backlog',
          actionText: 'Open Backlogs',
          actionView: 'backlog',
        }
      : {
          id: `manual-sug-${Date.now()}`,
          title: '⚡ 2-Minute Rule for Breaking Inertia',
          message: 'Never force 3 hours upfront. Just sit down, write 2 formulas, or solve 1 question. Once cognitive friction drops, focus flow takes over.',
          type: 'tip',
          actionText: 'Start 25m Timer',
          actionView: 'timer',
        };

    saveAISuggestion(fresh);
  };

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        new Notification('StudyOS Alerts Active', {
          body: 'You will receive study prompts, lecture reminders, and formula revision alerts.',
        });
        soundEffects.playXpGain();
      }
    }
  };

  const handleSendTestAlert = () => {
    soundEffects.playTimerComplete();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('StudyOS Reminder', {
        body: 'Time to solve 20 HC Verma questions!',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    await addReminder({
      title: title.trim(),
      type,
      targetDate,
      targetTime,
      subjectId: subjectId || undefined,
      notes: notes.trim() || undefined,
    });

    setTitle('');
    setNotes('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            Reminders & Study Alarms
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Keep track of live coaching lectures, test series timing, and scheduled formula revisions.
          </p>
        </div>

        {/* Browser Notification Permission Banner */}
        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' ? (
            <button
              onClick={handleRequestNotificationPermission}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Enable Browser Alerts
            </button>
          ) : (
            <button
              onClick={handleSendTestAlert}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              Test Alert Audio
            </button>
          )}
        </div>
      </div>

      {/* Add Reminder Card */}
      <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
          <Plus className="w-4 h-4 text-amber-400" />
          Schedule New Reminder
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Reminder Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Live Physics Wallah Class, Test Paper 04"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Category
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
              >
                <option value="lecture">Live Lecture</option>
                <option value="revision">Formula Revision</option>
                <option value="practice">Question Practice</option>
                <option value="task">General Task</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                Target Date
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                Time
              </label>
              <input
                type="time"
                required
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Subject
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
              >
                <option value="">No Subject</option>
                {state.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reminder notes or zoom / meet link..."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/80"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors"
            >
              Add Reminder
            </button>
          </div>
        </form>
      </div>

      {/* Reminders List */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
          Scheduled Reminders ({state.reminders.length})
        </h3>

        {state.reminders.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-neutral-900/40 border border-neutral-800 text-neutral-400 text-xs">
            No reminders scheduled yet. Add your first study alert above.
          </div>
        ) : (
          state.reminders.map((rem) => {
            const subject = state.subjects.find((s) => s.id === rem.subjectId);

            return (
              <div
                key={rem.id}
                className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                  rem.completed
                    ? 'bg-neutral-950/40 border-neutral-800/60 opacity-60'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => toggleReminder(rem.id)}
                    className={`p-1 rounded transition-colors ${
                      rem.completed
                        ? 'text-emerald-400 bg-emerald-950/40'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                    aria-label={rem.completed ? 'Mark uncompleted' : 'Mark completed'}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold truncate ${
                        rem.completed ? 'line-through text-neutral-500' : 'text-neutral-100'
                      }`}
                    >
                      {rem.title}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                      <span className="capitalize text-neutral-300">{rem.type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{rem.targetDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-amber-400">{rem.targetTime}</span>
                      {subject && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span style={{ color: subject.color }}>{subject.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => deleteReminder(rem.id)}
                  className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors"
                  title="Delete reminder"
                  aria-label="Delete reminder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* AI Suggestions Section (Saved AI Nudges, Advice & Strategy Alerts) */}
      <div className="space-y-3 pt-4 border-t border-neutral-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-bold text-neutral-100 flex items-center gap-2">
                AI Suggestions & Strategy Nudges
                <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300">
                  {aiSuggestions.length}
                </span>
              </h3>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Smart study suggestions, hydration resets, and backlog alerts generated by SAARTHI AI every 30-45 minutes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateFreshSuggestion}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 border border-purple-800/60 text-purple-200 text-xs font-semibold transition-colors shadow-xs"
              title="Generate a fresh proactive study tip from SAARTHI AI"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-300" />
              <span>Get AI Suggestion</span>
            </button>

            {aiSuggestions.length > 0 && (
              <button
                onClick={() => {
                  soundEffects.playDeleteSoft();
                  clearAllAISuggestions();
                }}
                className="text-xs text-neutral-500 hover:text-rose-400 px-2 py-1 transition-colors"
                title="Clear all saved AI suggestions"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {aiSuggestions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-neutral-900/40 border border-neutral-800 text-neutral-400 text-xs space-y-2">
            <p>No AI suggestions logged yet.</p>
            <p className="text-[11px] text-neutral-500">
              As you study, SAARTHI will send smart reminders and revision suggestions every 30-45 minutes and save them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiSuggestions.map((sug) => {
              const iconMap = {
                water: <Droplets className="w-4 h-4 text-cyan-400" />,
                backlog: <AlertTriangle className="w-4 h-4 text-rose-400" />,
                task: <Clock className="w-4 h-4 text-amber-400" />,
                lecture: <BookOpen className="w-4 h-4 text-indigo-400" />,
                balance: <Brain className="w-4 h-4 text-purple-400" />,
                tip: <Lightbulb className="w-4 h-4 text-emerald-400" />,
              };

              const borderMap = {
                water: 'border-cyan-800/40 bg-cyan-950/20',
                backlog: 'border-rose-800/40 bg-rose-950/20',
                task: 'border-amber-800/40 bg-amber-950/20',
                lecture: 'border-indigo-800/40 bg-indigo-950/20',
                balance: 'border-purple-800/40 bg-purple-950/20',
                tip: 'border-emerald-800/40 bg-emerald-950/20',
              };

              return (
                <div
                  key={sug.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                    borderMap[sug.type] || 'border-neutral-800 bg-neutral-900/60'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-black/40 border border-white/5">
                          {iconMap[sug.type] || <Sparkles className="w-4 h-4 text-purple-400" />}
                        </div>
                        <h4 className="text-xs font-bold text-neutral-100 tracking-tight">
                          {sug.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => {
                          soundEffects.playDeleteSoft();
                          removeAISuggestion(sug.id);
                        }}
                        className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                        title="Dismiss suggestion"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed pl-0.5">
                      {sug.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {new Date(sug.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {sug.actionText && (
                      <button
                        onClick={() => handleApplyAISuggestion(sug)}
                        className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/90 hover:bg-purple-500 text-white font-medium text-xs rounded-xl transition-all shadow-xs"
                      >
                        <span>{sug.actionText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
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
