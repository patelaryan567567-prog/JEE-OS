import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Clock,
  CheckCircle2,
  ListTodo,
  Zap,
  Flame,
  PlaySquare,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Plus,
  Timer,
  AlertCircle,
  Brain,
  Sparkles,
  Atom,
  FlaskConical,
  Pi,
  Target,
  Pencil,
  Sliders,
  Calendar,
} from 'lucide-react';
import { AddTaskModal } from '../modals/AddTaskModal';
import { AddPracticeModal } from '../modals/AddPracticeModal';
import { ExamTargetModal } from '../modals/ExamTargetModal';
import { APISettingsModal } from '../modals/APISettingsModal';

export const DashboardView: React.FC = () => {
  const { state, setActiveView, toggleTaskCompletion, setLectureStatus } = useApp();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPracticeModalOpen, setIsPracticeModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Dynamic Exam target & syllabus calculations
  const examTarget = state.userStats.examTarget || {
    examName: 'JEE Mains 2026 Target',
    sessionName: 'Session 1',
    examDate: '2026-01-24',
    targetSyllabusPercent: 100,
  };

  const calculateDaysLeft = (dateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const daysLeft = calculateDaysLeft(examTarget.examDate);
  const totalChapters = state.chapters.length || 45;
  const startedChapters = state.chapters.filter((c) => c.revisionStatus !== 'Not Started').length;
  const actualCoveredPercent = totalChapters > 0 ? Math.round((startedChapters / totalChapters) * 100) : 0;
  const targetChapterCount = Math.round(((examTarget.targetSyllabusPercent || 100) / 100) * totalChapters);
  const targetSyllabusPercent = examTarget.targetSyllabusPercent || 100;

  // Calculate metrics
  const todaySessions = state.sessions.filter(
    (s) => s.completedAt.split('T')[0] === todayStr
  );
  const todayStudySeconds = todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const todayStudyMinutes = Math.round(todayStudySeconds / 60);
  const todayStudyHoursFormatted = `${Math.floor(todayStudyMinutes / 60)}h ${todayStudyMinutes % 60}m`;

  const todayTasks = state.tasks.filter((t) => t.category === 'today');
  const completedTodayTasks = todayTasks.filter((t) => t.completedAt?.split('T')[0] === todayStr);
  const pendingTodayTasks = todayTasks.filter((t) => t.category === 'today' && !t.completedAt);

  // Daily target is 6 hours (360 mins) for JEE aspirants
  const dailyTargetMinutes = 360;
  const dailyProgressPercent = Math.min(100, Math.round((todayStudyMinutes / dailyTargetMinutes) * 100));

  // Today's lectures
  const todayLectures = state.lectures.filter(
    (l) => l.scheduledDate === todayStr || l.status === 'in_progress'
  );

  // Question practice totals
  const totalQuestionsAttempted = state.modulePractices.reduce(
    (acc, m) => acc + m.attemptedQuestions,
    0
  );
  const totalQuestionsCorrect = state.modulePractices.reduce(
    (acc, m) => acc + m.correctQuestions,
    0
  );
  const overallAccuracy =
    totalQuestionsAttempted > 0
      ? Math.round((totalQuestionsCorrect / totalQuestionsAttempted) * 100)
      : 0;

  // Subject Study Distribution
  const subjectStudyMap: Record<string, number> = {
    'subj-phy': 0,
    'subj-chem': 0,
    'subj-math': 0,
  };
  state.sessions.forEach((s) => {
    if (s.subjectId && subjectStudyMap[s.subjectId] !== undefined) {
      subjectStudyMap[s.subjectId] += s.durationSeconds;
    }
  });
  const totalSubjectSeconds = Math.max(
    1,
    subjectStudyMap['subj-phy'] + subjectStudyMap['subj-chem'] + subjectStudyMap['subj-math']
  );

  const phyPct = Math.round((subjectStudyMap['subj-phy'] / totalSubjectSeconds) * 100);
  const chemPct = Math.round((subjectStudyMap['subj-chem'] / totalSubjectSeconds) * 100);
  const mathPct = Math.round((subjectStudyMap['subj-math'] / totalSubjectSeconds) * 100);

  // Backlogs count
  const pendingBacklogs = state.tasks.filter((t) => t.category === 'backlog').length +
    state.lectures.filter((l) => l.status === 'not_started').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Welcome Kicker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-800/80">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span style={{ fontSize: '11px', lineHeight: '11px' }}>JEE Exam Preparation Desk</span>
            <span aria-hidden="true">·</span>
            <span>Class 11–12 Integrated</span>
            <span aria-hidden="true">·</span>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          </div>
          <h1 style={{ fontFamily: 'JetBrains Mono' }} className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 mt-1">
            Student Command Center
          </h1>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveView('ai-chat')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-all"
          >
            <Brain className="w-4 h-4" />
            Ask StudyOS Brain
          </button>
          <button
            onClick={() => setIsApiSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-purple-300 font-medium text-xs rounded-lg transition-colors"
            title="Configure Gemini model, persona, and API server proxy"
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            API Settings
          </button>
          <button
            onClick={() => setActiveView('timer')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Timer className="w-4 h-4" />
            Start Focus Session
          </button>
          <button
            onClick={() => setIsTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 font-medium text-xs rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            New Task
          </button>
          <button
            onClick={() => setIsPracticeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 text-neutral-200 font-medium text-xs rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            Log Practice
          </button>
        </div>
      </div>

      {/* Target Exam Countdown & Syllabus Goal Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900/95 to-amber-950/20 border border-neutral-800 hover:border-amber-500/40 transition-all shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Exam Info & Live Days Remaining */}
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold bg-amber-950/70 border border-amber-900/50 px-2 py-0.5 rounded">
                  Target Exam Countdown
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {daysLeft} Days Left
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-neutral-100 mt-1 flex items-center gap-2">
                <span>{examTarget.examName}</span>
                <span className="text-xs font-normal text-neutral-400">({examTarget.sessionName})</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Target Date: <strong className="text-neutral-300">{examTarget.examDate}</strong></span>
              </p>
            </div>
          </div>

          {/* Right: Target Syllabus Progress & Customization Button */}
          <div className="flex-1 max-w-xl flex flex-col sm:flex-row sm:items-center gap-4 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span
                  className="text-neutral-300 font-medium flex items-center gap-1.5 pl-[23px] pt-[1px] pr-[15px]"
                  style={{
                    paddingLeft: '23px',
                    paddingTop: '1px',
                    paddingRight: '15px',
                  }}
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                  Syllabus Coverage:{' '}
                  <strong
                    className="text-amber-400 font-mono inline-block font-['JetBrains_Mono'] leading-[15px] text-left pt-[9px] pl-[17px] pb-[5px] -ml-[46px] mt-[2px] text-[14px] pr-[18px]"
                    style={{
                      fontFamily: 'JetBrains Mono',
                      lineHeight: '15px',
                      textAlign: 'left',
                      paddingLeft: '36px',
                      paddingTop: '8px',
                      paddingBottom: '6px',
                      paddingRight: '39px',
                      marginLeft: '-38px',
                      marginTop: '9px',
                      marginBottom: '-3px',
                      marginRight: '1px',
                      fontSize: '14px',
                    }}
                  >
                    {actualCoveredPercent}%
                  </strong>
                </span>
                <span
                  className="text-[12px] font-bold font-mono text-neutral-400"
                  style={{
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  Target Goal: <strong className="text-neutral-200">{targetSyllabusPercent}%</strong> ({targetChapterCount}/{totalChapters} ch)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-800 relative">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, actualCoveredPercent)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-neutral-400">
                <span>{startedChapters} of {totalChapters} PCM chapters started/completed</span>
                <span className="text-neutral-400 italic">Not hard-coded • Fully editable</span>
              </div>
            </div>

            {/* Change button */}
            <button
              onClick={() => setIsExamModalOpen(true)}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
              title="Change target syllabus percentage, exam dates, or attempt session"
            >
              <Pencil className="w-3.5 h-3.5" />
              Customize Target Syllabus
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant Quick Intelligence Banner */}
      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-semibold text-neutral-200">
              StudyOS Brain Ready
            </span>
            <p className="text-[11px] text-neutral-400">
              Ask "What should I study today?" to generate a custom plan tailored to your {pendingBacklogs} pending backlog items.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveView('ai-chat')}
          className="self-start sm:self-auto px-3 py-1 text-xs font-semibold text-purple-300 hover:text-white bg-purple-900/50 hover:bg-purple-800/60 border border-purple-700/50 rounded-lg transition-colors flex items-center gap-1"
        >
          Consult AI Brain <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Today's Study Time */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Today's Study</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-neutral-100">
            {todayStudyHoursFormatted}
          </div>
          <div className="text-[11px] text-neutral-400">
            Target: 6h / day
          </div>
        </div>

        {/* Tasks Completed vs Pending */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Tasks Today</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-neutral-100">
            {completedTodayTasks.length} <span className="text-neutral-500 text-sm font-normal">/ {todayTasks.length}</span>
          </div>
          <div className="text-[11px] text-neutral-400">
            {pendingTodayTasks.length} pending
          </div>
        </div>

        {/* Study Streak */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Current Streak</span>
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-orange-400">
            {state.userStats.currentStreak} Days
          </div>
          <div className="text-[11px] text-neutral-400">
            Record: {state.userStats.longestStreak} days
          </div>
        </div>

        {/* Total XP & Level */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>XP Earned</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-purple-300">
            {state.userStats.totalXp} XP
          </div>
          <div className="text-[11px] text-neutral-400">
            Rank: Level {state.userStats.level}
          </div>
        </div>

        {/* Accuracy Rate */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Question Accuracy</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-cyan-300">
            {overallAccuracy}%
          </div>
          <div className="text-[11px] text-neutral-400">
            {totalQuestionsCorrect}/{totalQuestionsAttempted} correct
          </div>
        </div>

        {/* Backlogs */}
        <div className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-1">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Pending Backlog</span>
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-rose-400">
            {pendingBacklogs}
          </div>
          <div className="text-[11px] text-neutral-400">
            <button
              onClick={() => setActiveView('backlog')}
              className="text-rose-300 hover:underline"
            >
              Clear Backlog →
            </button>
          </div>
        </div>
      </div>

      {/* Daily Progress & Subject Balance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Study Goal Ring & Bar */}
        <div className="p-5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200">Daily Study Target</h3>
            <span className="font-mono text-xs font-semibold text-amber-400">{dailyProgressPercent}%</span>
          </div>

          <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${dailyProgressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
            <span>Done: {todayStudyHoursFormatted}</span>
            <span>Target: 6 Hours (JEE Daily)</span>
          </div>
        </div>

        {/* Subject Study Ratio Bar */}
        <div className="p-5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200">Study Distribution Balance</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400" /> Physics ({phyPct || 33}%)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Chemistry ({chemPct || 33}%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Math ({mathPct || 34}%)
              </span>
            </div>
          </div>

          <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden flex border border-neutral-800">
            <div style={{ width: `${phyPct || 33}%` }} className="bg-cyan-500 h-full transition-all duration-300" />
            <div style={{ width: `${chemPct || 33}%` }} className="bg-emerald-500 h-full transition-all duration-300" />
            <div style={{ width: `${mathPct || 34}%` }} className="bg-amber-500 h-full transition-all duration-300" />
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
            <span>Maintain 1:1:1 tri-subject balance for maximum JEE percentile</span>
            <button
              onClick={() => setActiveView('analytics')}
              className="text-amber-400 hover:underline flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Today's Tasks & Today's Lectures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Tasks Column */}
        <div className="p-5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-neutral-100">Today's Priority Tasks</h3>
            </div>
            <button
              onClick={() => setActiveView('tasks')}
              className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              View All ({state.tasks.length})
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 space-y-2">
              <p className="text-xs">No tasks queued for today yet.</p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="text-xs text-amber-400 hover:underline"
              >
                + Add your first study task
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayTasks.slice(0, 5).map((task) => {
                const isCompleted = task.category === 'completed';
                const subject = state.subjects.find((s) => s.id === task.subjectId);
                const chapter = state.chapters.find((c) => c.id === task.chapterId);

                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-start gap-3"
                  >
                    <button
                      onClick={() => toggleTaskCompletion(task.id)}
                      className={`mt-0.5 p-1 rounded transition-colors ${
                        isCompleted
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                      aria-label={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'fill-emerald-500/20' : ''}`} />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-xs font-medium truncate ${
                          isCompleted ? 'line-through text-neutral-500' : 'text-neutral-200'
                        }`}
                      >
                        {task.title}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                        {subject && (
                          <span style={{ color: subject.color }}>{subject.name}</span>
                        )}
                        {chapter && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{chapter.name}</span>
                          </>
                        )}
                        {task.estimatedMinutes && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{task.estimatedMinutes}m</span>
                          </>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium ${
                        task.priority === 'urgent'
                          ? 'text-red-400 border-red-800/40 bg-red-950/30'
                          : task.priority === 'high'
                          ? 'text-amber-400 border-amber-800/40 bg-amber-950/30'
                          : 'text-neutral-400 border-neutral-800 bg-neutral-900'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Today's Lectures Column */}
        <div className="p-5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlaySquare className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-neutral-100">Lectures in Progress & Today</h3>
            </div>
            <button
              onClick={() => setActiveView('lectures')}
              className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
            >
              View Syllabus ({state.lectures.length})
            </button>
          </div>

          {todayLectures.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 space-y-2">
              <p className="text-xs">No active lectures scheduled today.</p>
              <button
                onClick={() => setActiveView('lectures')}
                className="text-xs text-emerald-400 hover:underline"
              >
                Browse lecture syllabus →
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todayLectures.slice(0, 5).map((lec) => {
                const subject = state.subjects.find((s) => s.id === lec.subjectId);
                const chapter = state.chapters.find((c) => c.id === lec.chapterId);
                const isCompleted = lec.status === 'completed';

                return (
                  <div
                    key={lec.id}
                    className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors flex items-start gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-neutral-200 truncate">
                        {lec.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                        {subject && (
                          <span style={{ color: subject.color }}>{subject.name}</span>
                        )}
                        {chapter && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{chapter.name}</span>
                          </>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{lec.durationMinutes}m</span>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setLectureStatus(
                          lec.id,
                          isCompleted ? 'in_progress' : 'completed'
                        )
                      }
                      className={`text-[11px] px-2 py-1 rounded font-medium border transition-colors ${
                        isCompleted
                          ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                          : lec.status === 'in_progress'
                          ? 'bg-amber-950/40 border-amber-800/40 text-amber-300'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isCompleted ? 'Completed' : lec.status === 'in_progress' ? 'In Progress' : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Module Question Practice Snapshot */}
      <div className="p-5 rounded-xl bg-neutral-900/90 border border-neutral-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-neutral-100">Recent Module & Question Practice</h3>
          </div>
          <button
            onClick={() => setActiveView('practice')}
            className="text-xs text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1"
          >
            All Modules <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {state.modulePractices.slice(0, 3).map((mod) => {
            const subject = state.subjects.find((s) => s.id === mod.subjectId);
            const chapter = state.chapters.find((c) => c.id === mod.chapterId);
            const accuracy =
              mod.attemptedQuestions > 0
                ? Math.round((mod.correctQuestions / mod.attemptedQuestions) * 100)
                : 0;
            const completionPct = Math.min(
              100,
              Math.round((mod.attemptedQuestions / mod.totalQuestions) * 100)
            );

            return (
              <div
                key={mod.id}
                className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: subject?.color || '#06b6d4' }}
                  >
                    {subject?.name}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">
                    {mod.sourceName}
                  </span>
                </div>

                <div className="text-xs font-semibold text-neutral-200 truncate">
                  {chapter?.name || 'General Practice'}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                    <span>{mod.attemptedQuestions} / {mod.totalQuestions} qs</span>
                    <span className="text-cyan-400 font-semibold">{completionPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>

                {/* Accuracy & Difficult count */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80">
                  <span>Accuracy: <strong className="text-neutral-200 font-mono">{accuracy}%</strong></span>
                  {mod.markedDifficult.length > 0 && (
                    <span className="text-amber-400 font-mono">
                      {mod.markedDifficult.length} starred
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultCategory="today"
      />
      <AddPracticeModal
        isOpen={isPracticeModalOpen}
        onClose={() => setIsPracticeModalOpen(false)}
      />
      <ExamTargetModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
      />
      <APISettingsModal
        isOpen={isApiSettingsOpen}
        onClose={() => setIsApiSettingsOpen(false)}
      />
    </div>
  );
};
