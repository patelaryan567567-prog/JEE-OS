import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Target,
  Calendar,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { ExamTargetConfig } from '../../types';

interface ExamTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EXAM_PRESETS: Array<{
  name: string;
  examName: string;
  sessionName: string;
  examDate: string;
  targetPercent: number;
  scope: 'full' | 'class11' | 'class12';
}> = [
  {
    name: 'JEE Main 2026 (Jan Session 1)',
    examName: 'JEE Mains 2026 Target',
    sessionName: 'Session 1',
    examDate: '2026-01-24',
    targetPercent: 100,
    scope: 'full',
  },
  {
    name: 'JEE Main 2026 (Apr Session 2)',
    examName: 'JEE Mains 2026 Target',
    sessionName: 'Session 2',
    examDate: '2026-04-06',
    targetPercent: 100,
    scope: 'full',
  },
  {
    name: 'JEE Advanced 2026',
    examName: 'JEE Advanced 2026 Target',
    sessionName: 'Final Exam',
    examDate: '2026-05-24',
    targetPercent: 95,
    scope: 'full',
  },
  {
    name: 'Class 11 Target (JEE 2027)',
    examName: 'JEE Mains 2027 Target',
    sessionName: 'Class 11 Target',
    examDate: '2027-01-24',
    targetPercent: 100,
    scope: 'class11',
  },
];

const SYLLABUS_PRESETS = [
  {
    label: '100% Full Syllabus',
    desc: 'All 45 Chapters (Class 11 & 12)',
    percent: 100,
    scope: 'full' as const,
  },
  {
    label: '85% High-Yield Core',
    desc: 'Top 38 Highest Weightage Chapters',
    percent: 85,
    scope: 'custom' as const,
  },
  {
    label: '75% Scoring Benchmark',
    desc: 'Top 34 Chapters for 99+ Percentile',
    percent: 75,
    scope: 'custom' as const,
  },
  {
    label: 'Class 11 Only',
    desc: '24 Chapters across Physics, Chem, Math',
    percent: 53,
    scope: 'class11' as const,
  },
  {
    label: 'Class 12 Only',
    desc: '21 Chapters across Physics, Chem, Math',
    percent: 47,
    scope: 'class12' as const,
  },
];

export const ExamTargetModal: React.FC<ExamTargetModalProps> = ({ isOpen, onClose }) => {
  const { state, updateExamTarget } = useApp();

  const current = state.userStats.examTarget || {
    examName: 'JEE Mains 2026 Target',
    sessionName: 'Session 1',
    examDate: '2026-01-24',
    targetSyllabusPercent: 100,
  };

  const [examName, setExamName] = useState(current.examName);
  const [sessionName, setSessionName] = useState(current.sessionName);
  const [examDate, setExamDate] = useState(current.examDate);
  const [targetSyllabusPercent, setTargetSyllabusPercent] = useState(current.targetSyllabusPercent || 100);
  const [syllabusScope, setSyllabusScope] = useState<'full' | 'class11' | 'class12' | 'custom'>(
    current.syllabusScope || 'full'
  );

  // Sync state when modal opens with fresh data
  useEffect(() => {
    if (isOpen) {
      const active = state.userStats.examTarget || {
        examName: 'JEE Mains 2026 Target',
        sessionName: 'Session 1',
        examDate: '2026-01-24',
        targetSyllabusPercent: 100,
      };
      setExamName(active.examName);
      setSessionName(active.sessionName);
      setExamDate(active.examDate);
      setTargetSyllabusPercent(active.targetSyllabusPercent || 100);
      setSyllabusScope(active.syllabusScope || 'full');
    }
  }, [isOpen, state.userStats.examTarget]);

  if (!isOpen) return null;

  // Calculate live days remaining
  const calculateDaysLeft = (targetDateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(targetDateStr);
      target.setHours(0, 0, 0, 0);
      const diffTime = target.getTime() - today.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const daysLeft = calculateDaysLeft(examDate);

  // Real actual chapters syllabus statistics
  const totalChapters = state.chapters.length || 45;
  const startedChapters = state.chapters.filter((c) => c.revisionStatus !== 'Not Started').length;
  const actualCoveredPercent = totalChapters > 0 ? Math.round((startedChapters / totalChapters) * 100) : 0;

  // Target chapter count calculated from percentage
  const targetChapterCount = Math.round((targetSyllabusPercent / 100) * totalChapters);
  const chaptersRemainingToTarget = Math.max(0, targetChapterCount - startedChapters);

  const handleApplyExamPreset = (preset: typeof EXAM_PRESETS[0]) => {
    setExamName(preset.examName);
    setSessionName(preset.sessionName);
    setExamDate(preset.examDate);
    setTargetSyllabusPercent(preset.targetPercent);
    setSyllabusScope(preset.scope);
  };

  const handleApplySyllabusPreset = (preset: typeof SYLLABUS_PRESETS[0]) => {
    setTargetSyllabusPercent(preset.percent);
    setSyllabusScope(preset.scope);
  };

  const handleChapterCountChange = (count: number) => {
    const clampedCount = Math.max(1, Math.min(totalChapters, count));
    const newPercent = Math.round((clampedCount / totalChapters) * 100);
    setTargetSyllabusPercent(newPercent);
    setSyllabusScope('custom');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateExamTarget({
      examName: examName.trim() || 'JEE Mains Target',
      sessionName: sessionName.trim() || 'Session 1',
      examDate,
      targetSyllabusPercent: Math.max(10, Math.min(100, Number(targetSyllabusPercent) || 100)),
      syllabusScope,
      targetChaptersCount: targetChapterCount,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/40 flex items-center justify-center text-amber-400 shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-100">
                  Target Exam & Syllabus Settings
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800/40 text-amber-300">
                  Customizable
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Change your countdown date, exam target name, and custom syllabus goals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/90 space-y-3 shadow-inner">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Live Countdown & Syllabus Target
            </span>
            <span className="font-mono text-amber-400 font-bold bg-amber-950/60 border border-amber-900/40 px-2 py-0.5 rounded text-xs">
              {daysLeft} Days Remaining
            </span>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-bold text-neutral-100 font-sans">
                {examName || 'Target Exam'}
              </div>
              <div className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                <span className="text-amber-400 font-medium">{sessionName || 'Session 1'}</span>
                <span>•</span>
                <span>Target Date: {examDate}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono text-neutral-400">Target Goal: </span>
              <span className="text-xs font-bold text-neutral-100 font-mono">
                {targetSyllabusPercent}% ({targetChapterCount}/{totalChapters} ch)
              </span>
            </div>
          </div>

          {/* Progress comparison */}
          <div className="space-y-1.5 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>
                Covered: <strong className="text-amber-400 font-mono">{actualCoveredPercent}%</strong>{' '}
                ({startedChapters}/{totalChapters} chapters)
              </span>
              <span>
                {chaptersRemainingToTarget > 0 ? (
                  <span className="text-neutral-400">
                    <strong className="text-orange-400 font-mono">{chaptersRemainingToTarget}</strong> ch to reach goal
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Target Achieved!
                  </span>
                )}
              </span>
            </div>

            {/* Stacked visually clear bar */}
            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-800 relative">
              {/* Target threshold indicator */}
              <div
                className="absolute top-0 bottom-0 border-r-2 border-dashed border-white/80 z-10"
                style={{ left: `${Math.min(100, targetSyllabusPercent)}%` }}
                title={`Target Goal: ${targetSyllabusPercent}%`}
              />
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, actualCoveredPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 1: TARGET SYLLABUS GOAL */}
        <div className="space-y-3 p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Target Syllabus Goal ({targetSyllabusPercent}%)
            </label>
            <span className="text-[11px] text-neutral-400 font-mono">
              = <strong className="text-amber-400">{targetChapterCount}</strong> of {totalChapters} Chapters
            </span>
          </div>

          {/* Quick Syllabus Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SYLLABUS_PRESETS.map((p, idx) => {
              const isSelected = targetSyllabusPercent === p.percent;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplySyllabusPreset(p)}
                  className={`p-2.5 text-left rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500/80 text-amber-200 shadow-xs'
                      : 'bg-neutral-900/80 hover:bg-neutral-800/80 border-neutral-800 text-neutral-300'
                  }`}
                >
                  <div className="font-semibold flex items-center justify-between mb-0.5">
                    <span>{p.label}</span>
                    <span className="font-mono text-[10px] text-amber-400 font-bold">{p.percent}%</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 line-clamp-1">{p.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Slider & Custom Input Row */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/70">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="20"
                max="100"
                step="1"
                value={targetSyllabusPercent}
                onChange={(e) => {
                  setTargetSyllabusPercent(Number(e.target.value));
                  setSyllabusScope('custom');
                }}
                className="flex-1 accent-amber-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="20"
                  max="100"
                  value={targetSyllabusPercent}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val)) {
                      setTargetSyllabusPercent(Math.max(10, Math.min(100, val)));
                      setSyllabusScope('custom');
                    }
                  }}
                  className="w-16 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-center font-bold text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-neutral-400 font-mono">%</span>
              </div>
            </div>

            {/* Target Chapters Direct Input Helper */}
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <span>Or set target chapter count directly:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleChapterCountChange(targetChapterCount - 1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold"
                >
                  -
                </button>
                <span className="font-mono font-bold text-neutral-200 px-1.5">
                  {targetChapterCount} ch
                </span>
                <button
                  type="button"
                  onClick={() => handleChapterCountChange(targetChapterCount + 1)}
                  className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: EXAM PRESETS & DETAILS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              Exam Dates & Attempt
            </span>
            <span className="text-[11px] text-neutral-400">Select preset or type custom</span>
          </div>

          {/* Quick Exam Presets */}
          <div className="grid grid-cols-2 gap-2">
            {EXAM_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyExamPreset(p)}
                className="p-2 text-left text-xs rounded-lg bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800 hover:border-amber-500/40 text-neutral-300 transition-colors flex items-center justify-between"
              >
                <span className="truncate font-medium">{p.name}</span>
                <span className="text-[10px] font-mono text-neutral-500 shrink-0 ml-1">
                  {calculateDaysLeft(p.examDate)}d
                </span>
              </button>
            ))}
          </div>

          {/* Custom Edit Inputs Form */}
          <form onSubmit={handleSave} className="space-y-3.5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Target Exam Name
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  placeholder="e.g. JEE Mains 2026 Target"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Attempt / Session Label
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g. Session 1 or April Attempt"
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Target Exam Date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Explanation Note */}
            <div className="p-3 rounded-lg bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>
                <strong>How Syllabus is Tracked:</strong> StudyOS tracks all {totalChapters} chapters across Physics, Chemistry, and Mathematics. Any chapter where lectures are attended, question practice logged, or revision started is counted toward your coverage.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-neutral-100 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-amber-500 hover:bg-amber-400 rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Save Target & Syllabus
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
