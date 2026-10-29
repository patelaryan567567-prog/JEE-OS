import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  TrendingUp,
  PlaySquare,
  CheckSquare,
  BookOpen,
  Filter,
  Sparkles,
} from 'lucide-react';

export const BacklogView: React.FC = () => {
  const {
    state,
    moveTaskCategory,
    setLectureStatus,
    awardXp,
  } = useApp();

  const [filterType, setFilterType] = useState<'all' | 'tasks' | 'lectures' | 'practice'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Collect all backlog items across tasks, lectures, and practice
  // 1. Tasks in 'backlog' or overdue
  const todayStr = new Date().toISOString().split('T')[0];
  const backlogTasks = state.tasks.filter(
    (t) => t.category === 'backlog' || (t.dueDate < todayStr && t.category !== 'completed')
  );
  
  // 2. Lectures not completed (not started or in progress)
  const pendingLectures = state.lectures.filter((l) => l.status !== 'completed');

  // 3. Question practice backlogs (only incomplete module practices explicitly added by user)
  const lowPracticeChapters = state.chapters.filter((ch) => {
    const practice = state.modulePractices.find((p) => p.chapterId === ch.id);
    return practice && practice.attemptedQuestions < practice.totalQuestions;
  });

  const totalBacklogCount = backlogTasks.length + pendingLectures.length + lowPracticeChapters.length;
  const clearedBacklogTasksCount = state.tasks.filter((t) => t.isBacklog && t.category === 'completed').length;

  const totalEvaluated = totalBacklogCount + clearedBacklogTasksCount;
  const burnDownProgress = totalEvaluated > 0 ? Math.round((clearedBacklogTasksCount / totalEvaluated) * 100) : 0;

  const handleResolveTask = async (taskId: string) => {
    await moveTaskCategory(taskId, 'completed');
    awardXp(30, 'Backlog task resolved & completed');
  };

  const handleScheduleTaskToday = async (taskId: string) => {
    await moveTaskCategory(taskId, 'today');
  };

  const handleStartLecture = async (lectureId: string) => {
    await setLectureStatus(lectureId, 'in_progress');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            Backlog Recovery System
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Systematic backlog management for JEE. Unfinished work is safely preserved and prioritized.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800/40 text-rose-300 font-semibold">
            {totalBacklogCount} Pending Items
          </span>
        </div>
      </div>

      {/* Burn-Down Indicator Card */}
      <div className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Backlog Burn-Down Tracker
            </h3>
            <p className="text-xs text-neutral-400">
              Recovering unfinished study debt one item at a time.
            </p>
          </div>
          <span className="text-base font-bold font-mono text-emerald-400">
            {clearedBacklogTasksCount} Cleared
          </span>
        </div>

        <div className="w-full h-2.5 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
            style={{ width: `${burnDownProgress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-neutral-400 pt-1">
          <span>{clearedBacklogTasksCount} items cleared successfully</span>
          <span>{totalBacklogCount} items pending clearance</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs overflow-x-auto">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-neutral-800 text-neutral-100 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          All Backlog ({totalBacklogCount})
        </button>
        <button
          onClick={() => setFilterType('tasks')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filterType === 'tasks'
              ? 'bg-neutral-800 text-neutral-100 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Overdue Tasks ({backlogTasks.length})
        </button>
        <button
          onClick={() => setFilterType('lectures')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filterType === 'lectures'
              ? 'bg-neutral-800 text-neutral-100 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Pending Lectures ({pendingLectures.length})
        </button>
        <button
          onClick={() => setFilterType('practice')}
          className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
            filterType === 'practice'
              ? 'bg-neutral-800 text-neutral-100 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Under-Practiced Chapters ({lowPracticeChapters.length})
        </button>
      </div>

      {/* Backlog Item Lists */}
      <div className="space-y-3">
        {/* 1. Backlog Tasks */}
        {(filterType === 'all' || filterType === 'tasks') && backlogTasks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
              Overdue Tasks & Assignments ({backlogTasks.length})
            </h3>
            {backlogTasks.map((task) => {
              const subject = state.subjects.find((s) => s.id === task.subjectId);
              const chapter = state.chapters.find((c) => c.id === task.chapterId);

              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckSquare className="w-4 h-4 text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-200 truncate">
                        {task.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                        {subject && <span style={{ color: subject.color }}>{subject.name}</span>}
                        {chapter && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{chapter.name}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-rose-400">{task.priority} priority</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleScheduleTaskToday(task.id)}
                      className="px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/40 border border-amber-800/40 rounded-lg hover:bg-amber-900/40 transition-colors"
                      title="Move to Today's Tasks"
                    >
                      Schedule Today
                    </button>
                    <button
                      onClick={() => handleResolveTask(task.id)}
                      className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      title="Mark Resolved"
                      aria-label="Mark Resolved"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Unfinished Lectures */}
        {(filterType === 'all' || filterType === 'lectures') && pendingLectures.length > 0 && (
          <div className="space-y-2 pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
              Unwatched / Not Started Lectures ({pendingLectures.length})
            </h3>
            {pendingLectures.map((lec) => {
              const subject = state.subjects.find((s) => s.id === lec.subjectId);
              const chapter = state.chapters.find((c) => c.id === lec.chapterId);

              return (
                <div
                  key={lec.id}
                  className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PlaySquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-200 truncate">
                        {lec.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                        {subject && <span style={{ color: subject.color }}>{subject.name}</span>}
                        {chapter && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{chapter.name}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{lec.durationMinutes}m</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleStartLecture(lec.id)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded-lg hover:bg-emerald-900/40 transition-colors"
                    >
                      Start Watching
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Under-Practiced Chapters */}
        {(filterType === 'all' || filterType === 'practice') && lowPracticeChapters.length > 0 && (
          <div className="space-y-2 pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-1">
              Chapters Needing Module Question Practice ({lowPracticeChapters.length})
            </h3>
            {lowPracticeChapters.slice(0, 6).map((ch) => {
              const subject = state.subjects.find((s) => s.id === ch.subjectId);
              const practice = state.modulePractices.find((p) => p.chapterId === ch.id);
              const attempted = practice?.attemptedQuestions || 0;

              return (
                <div
                  key={ch.id}
                  className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <BookOpen className="w-4 h-4 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-neutral-200 truncate">
                        {ch.name} (Class {ch.classYear})
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-neutral-400">
                        {subject && <span style={{ color: subject.color }}>{subject.name}</span>}
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-cyan-400">
                          {attempted} / 100 questions solved
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="text-neutral-500">{ch.weightage} weightage</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-amber-400 bg-amber-950/30 border border-amber-800/30 px-2 py-0.5 rounded">
                    Needs Practice
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {totalBacklogCount === 0 && (
          <div className="p-12 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-400 space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-neutral-200">Zero Backlog Clean Slate!</p>
              <p className="text-xs text-neutral-500 mt-1">
                You have completely conquered all pending lectures, tasks, and practice modules.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
