import React from 'react';
import { useApp } from '../../context/AppContext';
import { ALL_BADGES } from '../../db/initialData';
import {
  BarChart3,
  TrendingUp,
  Clock,
  BookOpen,
  Award,
  Zap,
  Flame,
  CheckCircle2,
  Atom,
  FlaskConical,
  Pi,
  Sparkles,
} from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  const { state } = useApp();

  // Aggregate study sessions
  const totalStudyMinutes = Math.round(
    state.sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
  );

  // Last 7 days daily study time computation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });

    const daySeconds = state.sessions
      .filter((s) => s.completedAt.split('T')[0] === dateStr)
      .reduce((acc, s) => acc + s.durationSeconds, 0);

    return {
      dateStr,
      dayLabel,
      minutes: Math.round(daySeconds / 60),
    };
  });

  const maxDailyMinutes = Math.max(120, ...last7Days.map((d) => d.minutes));

  // Subject distribution
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

  const phyMins = Math.round(subjectStudyMap['subj-phy'] / 60);
  const chemMins = Math.round(subjectStudyMap['subj-chem'] / 60);
  const mathMins = Math.round(subjectStudyMap['subj-math'] / 60);

  const phyPct = Math.round((subjectStudyMap['subj-phy'] / totalSubjectSeconds) * 100);
  const chemPct = Math.round((subjectStudyMap['subj-chem'] / totalSubjectSeconds) * 100);
  const mathPct = Math.round((subjectStudyMap['subj-math'] / totalSubjectSeconds) * 100);

  // Question practice metrics
  const totalAttempted = state.modulePractices.reduce((acc, p) => acc + p.attemptedQuestions, 0);
  const totalCorrect = state.modulePractices.reduce((acc, p) => acc + p.correctQuestions, 0);
  const overallAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  // Chapter coverage by subject
  const getSubjectCoverage = (subjId: string) => {
    const chs = state.chapters.filter((c) => c.subjectId === subjId);
    if (chs.length === 0) return 0;
    const covered = chs.filter((c) => c.revisionStatus !== 'Not Started').length;
    return Math.round((covered / chs.length) * 100);
  };

  const unlockedBadgeSet = new Set(state.userStats.unlockedBadgeIds);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Performance Analytics & Mastery
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Data-backed examination readiness, focus distribution & accuracy diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-neutral-200">Level {state.userStats.level}</span>
            <span className="text-neutral-500">({state.userStats.totalXp} XP)</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs font-mono text-orange-400">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span className="font-semibold">{state.userStats.currentStreak} Day Streak</span>
          </div>
        </div>
      </div>

      {/* 7-Day Study Time Chart (Clean SVG Histogram) */}
      <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Past 7 Days Study Volume
            </h3>
            <p className="text-xs text-neutral-400">
              Daily minutes invested in lectures, modules and focus sessions
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-200">
            {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m Logged
          </span>
        </div>

        {/* SVG/CSS Bar Chart */}
        <div className="h-44 pt-6 flex items-end justify-between gap-2 sm:gap-4 px-2">
          {last7Days.map((day) => {
            const heightPercent = Math.min(100, Math.max(10, Math.round((day.minutes / maxDailyMinutes) * 100)));
            return (
              <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <span className="text-[10px] font-mono tabular-nums text-neutral-400 group-hover:text-amber-300 transition-colors">
                  {day.minutes > 0 ? `${day.minutes}m` : '-'}
                </span>
                <div className="w-full max-w-[42px] bg-neutral-950 rounded-t-lg overflow-hidden h-32 flex items-end border border-neutral-800">
                  <div
                    className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-md transition-all duration-500 group-hover:from-amber-500 group-hover:to-amber-300"
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-medium text-neutral-400 group-hover:text-neutral-200">
                  {day.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Subject Balance & Chapter Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tri-Subject Study Ratio */}
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100">Subject Time Distribution</h3>
            <span className="text-xs text-neutral-500 font-mono">1:1:1 Recommended</span>
          </div>

          <div className="space-y-3.5">
            {/* Physics */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-cyan-400 font-medium">
                  <Atom className="w-3.5 h-3.5" /> Physics
                </span>
                <span className="font-mono text-neutral-300">
                  {phyMins}m ({phyPct || 33}%)
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${phyPct || 33}%` }}
                />
              </div>
            </div>

            {/* Chemistry */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <FlaskConical className="w-3.5 h-3.5" /> Chemistry
                </span>
                <span className="font-mono text-neutral-300">
                  {chemMins}m ({chemPct || 33}%)
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${chemPct || 33}%` }}
                />
              </div>
            </div>

            {/* Mathematics */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <Pi className="w-3.5 h-3.5" /> Mathematics
                </span>
                <span className="font-mono text-neutral-300">
                  {mathMins}m ({mathPct || 34}%)
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${mathPct || 34}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Syllabus Completion Breakdown */}
        <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100">Syllabus Revision Coverage</h3>
            <span className="text-xs text-neutral-500 font-mono">Class 11 & 12</span>
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-cyan-400 font-medium">Physics Syllabus</span>
                <span className="font-mono text-neutral-300">{getSubjectCoverage('subj-phy')}% Covered</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                  style={{ width: `${getSubjectCoverage('subj-phy')}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-400 font-medium">Chemistry Syllabus</span>
                <span className="font-mono text-neutral-300">{getSubjectCoverage('subj-chem')}% Covered</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${getSubjectCoverage('subj-chem')}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-amber-400 font-medium">Mathematics Syllabus</span>
                <span className="font-mono text-neutral-300">{getSubjectCoverage('subj-math')}% Covered</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${getSubjectCoverage('subj-math')}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gamification Achievements / Badges Grid */}
      <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              Achievements & Badges
            </h3>
            <p className="text-xs text-neutral-400">
              Milestones unlocked through continuous study streaks, question accuracy & backlog clears.
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-purple-400">
            {unlockedBadgeSet.size} / {ALL_BADGES.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ALL_BADGES.map((badge) => {
            const isUnlocked = unlockedBadgeSet.has(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isUnlocked
                    ? 'bg-purple-950/20 border-purple-800/60 shadow-xs'
                    : 'bg-neutral-950/40 border-neutral-800/60 opacity-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isUnlocked
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      isUnlocked
                        ? 'text-purple-300 border-purple-800/40 bg-purple-950/40'
                        : 'text-neutral-500 border-neutral-800 bg-neutral-900'
                    }`}
                  >
                    {isUnlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>

                <div className="text-xs font-bold text-neutral-100">{badge.title}</div>
                <div className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                  {badge.description}
                </div>
                <div className="text-[10px] text-neutral-500 mt-2 font-mono border-t border-neutral-800/60 pt-1">
                  Req: {badge.requirement}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
