import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ModulePractice, ChapterExercise } from '../../types';
import { X, Layers, Plus, CheckCircle2, Trash2, BookOpen } from 'lucide-react';

interface ChapterExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  practice: ModulePractice | null;
  exerciseToEdit?: ChapterExercise | null;
  onSave: (updatedPractice: ModulePractice) => Promise<void>;
}

const EXERCISE_NAME_PRESETS = [
  'Exercise 1: Single Option Correct',
  'Exercise 2: Multiple Correct Questions',
  'Exercise 3: Comprehension & Matrix',
  'Exercise 4: Numerical & Integer Type',
  'JEE Mains Previous Years (2019-2024)',
  'JEE Advanced Archives',
  'HCV Objective 1 & 2',
  'NCERT Exemplar Problems',
];

export const ChapterExerciseModal: React.FC<ChapterExerciseModalProps> = ({
  isOpen,
  onClose,
  practice,
  exerciseToEdit,
  onSave,
}) => {
  const { state } = useApp();

  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [name, setName] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [attemptedQuestions, setAttemptedQuestions] = useState(0);
  const [startedQuestions, setStartedQuestions] = useState(0);
  const [correctQuestions, setCorrectQuestions] = useState(0);
  const [notes, setNotes] = useState('');
  const [syncTotals, setSyncTotals] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (practice) {
      setSubjectId(practice.subjectId);
      setChapterId(practice.chapterId);
    } else if (state.subjects.length > 0) {
      const defaultSub = state.subjects[0].id;
      setSubjectId(defaultSub);
      const chs = state.chapters.filter((c) => c.subjectId === defaultSub);
      if (chs.length > 0) setChapterId(chs[0].id);
    }

    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setTotalQuestions(exerciseToEdit.totalQuestions || 30);
      setAttemptedQuestions(exerciseToEdit.attemptedQuestions || 0);
      setStartedQuestions(exerciseToEdit.startedQuestions ?? exerciseToEdit.attemptedQuestions ?? 0);
      setCorrectQuestions(exerciseToEdit.correctQuestions || 0);
      setNotes(exerciseToEdit.notes || '');
    } else {
      const existingExercisesCount = practice?.exercises?.length || 0;
      setName(`Exercise ${existingExercisesCount + 1}: Practice Set`);
      setTotalQuestions(30);
      setAttemptedQuestions(0);
      setStartedQuestions(0);
      setCorrectQuestions(0);
      setNotes('');
    }
  }, [exerciseToEdit, practice, isOpen, state.subjects, state.chapters]);

  if (!isOpen) return null;

  const filteredChapters = state.chapters.filter((c) => c.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || totalQuestions <= 0 || !chapterId) return;

    setIsSubmitting(true);

    const exerciseData: ChapterExercise = {
      id: exerciseToEdit?.id || `ex-${Date.now()}`,
      name: name.trim(),
      totalQuestions: Math.max(1, Number(totalQuestions)),
      attemptedQuestions: Math.min(Number(totalQuestions), Math.max(0, Number(attemptedQuestions))),
      startedQuestions: Math.max(0, Number(startedQuestions)),
      correctQuestions: Math.min(Number(attemptedQuestions), Math.max(0, Number(correctQuestions))),
      notes: notes.trim() || undefined,
    };

    // Find or construct practice record
    let targetPractice: ModulePractice;
    if (practice) {
      targetPractice = practice;
    } else {
      const existing = state.modulePractices.find((p) => p.chapterId === chapterId);
      if (existing) {
        targetPractice = existing;
      } else {
        const ch = state.chapters.find((c) => c.id === chapterId);
        targetPractice = {
          id: `mod-${Date.now()}`,
          chapterId,
          subjectId: subjectId || state.subjects[0]?.id || '',
          sourceName: `${ch?.name || 'Chapter'} Practice & Exercises`,
          totalQuestions: exerciseData.totalQuestions,
          attemptedQuestions: exerciseData.attemptedQuestions,
          correctQuestions: exerciseData.correctQuestions || 0,
          markedDifficult: [],
          exercises: [],
          lastPracticedAt: new Date().toISOString().split('T')[0],
        };
      }
    }

    const currentExercises = targetPractice.exercises || [];
    let updatedExercises: ChapterExercise[];

    if (exerciseToEdit) {
      updatedExercises = currentExercises.map((ex) =>
        ex.id === exerciseToEdit.id ? exerciseData : ex
      );
    } else {
      updatedExercises = [...currentExercises, exerciseData];
    }

    let updatedPractice: ModulePractice = {
      ...targetPractice,
      exercises: updatedExercises,
    };

    if (syncTotals) {
      const sumTotal = updatedExercises.reduce((acc, ex) => acc + ex.totalQuestions, 0);
      const sumAttempted = updatedExercises.reduce((acc, ex) => acc + ex.attemptedQuestions, 0);
      const sumCorrect = updatedExercises.reduce((acc, ex) => acc + (ex.correctQuestions || 0), 0);
      updatedPractice.totalQuestions = sumTotal > 0 ? sumTotal : updatedPractice.totalQuestions;
      updatedPractice.attemptedQuestions = sumAttempted;
      updatedPractice.correctQuestions = sumCorrect;
    }

    await onSave(updatedPractice);
    setIsSubmitting(false);
    onClose();
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToEdit || !practice) return;
    setIsSubmitting(true);
    const updatedExercises = (practice.exercises || []).filter((ex) => ex.id !== exerciseToEdit.id);
    let updatedPractice: ModulePractice = {
      ...practice,
      exercises: updatedExercises,
    };
    if (syncTotals && updatedExercises.length > 0) {
      const sumTotal = updatedExercises.reduce((acc, ex) => acc + ex.totalQuestions, 0);
      const sumAttempted = updatedExercises.reduce((acc, ex) => acc + ex.attemptedQuestions, 0);
      const sumCorrect = updatedExercises.reduce((acc, ex) => acc + (ex.correctQuestions || 0), 0);
      updatedPractice.totalQuestions = sumTotal;
      updatedPractice.attemptedQuestions = sumAttempted;
      updatedPractice.correctQuestions = sumCorrect;
    }
    await onSave(updatedPractice);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">
                {exerciseToEdit ? 'Edit Exercise' : 'Add Chapter Exercise'}
              </h3>
              <p className="text-xs text-neutral-400">
                Track exercise-wise total, attempted, and started questions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!practice && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Subject *
                </label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => {
                    setSubjectId(e.target.value);
                    const chs = state.chapters.filter((c) => c.subjectId === e.target.value);
                    if (chs.length > 0) setChapterId(chs[0].id);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
                >
                  {state.subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-200 mb-1">
                  Chapter *
                </label>
                <select
                  required
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-cyan-500"
                >
                  {filteredChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name} (Cl {ch.classYear})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Exercise Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exercise 1: Single Option Correct"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />

            {/* Quick Name Presets */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <span className="text-[10px] text-neutral-500 font-semibold">Presets:</span>
              {EXERCISE_NAME_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setName(preset)}
                  className="px-2 py-0.5 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[10px] text-neutral-300 transition-colors"
                >
                  {preset.split(':')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* QUESTIONS STATS GRID */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <span className="text-xs font-bold text-neutral-200 block">
              Exercise Question Breakdown
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Total Qs *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="500"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Attempted Qs
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalQuestions}
                  value={attemptedQuestions}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAttemptedQuestions(val);
                    if (startedQuestions < val) setStartedQuestions(val);
                  }}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Started Qs
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalQuestions}
                  value={startedQuestions}
                  onChange={(e) => setStartedQuestions(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-cyan-500"
                  title="Questions opened, read or in progress"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Correct Qs
                </label>
                <input
                  type="number"
                  min="0"
                  max={attemptedQuestions}
                  value={correctQuestions}
                  onChange={(e) => setCorrectQuestions(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
              <span>
                Exercise Progress:{' '}
                <strong className="text-cyan-400 font-mono">
                  {totalQuestions > 0 ? Math.round((attemptedQuestions / totalQuestions) * 100) : 0}%
                </strong>
              </span>
              <span>
                Accuracy:{' '}
                <strong className="text-emerald-400 font-mono">
                  {attemptedQuestions > 0 ? Math.round((correctQuestions / attemptedQuestions) * 100) : 0}%
                </strong>
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Exercise Notes / Weak Question Ranges
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Q15-25 are tricky, review formula sheet first..."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Sync totals checkbox */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
            <input
              type="checkbox"
              id="sync-totals-checkbox"
              checked={syncTotals}
              onChange={(e) => setSyncTotals(e.target.checked)}
              className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
            />
            <label htmlFor="sync-totals-checkbox" className="text-neutral-300 cursor-pointer">
              Auto-sync chapter total questions & attempted count with sum of exercises
            </label>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            {exerciseToEdit && practice ? (
              <button
                type="button"
                onClick={handleDeleteExercise}
                className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Exercise
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-neutral-100 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg shadow-md transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {exerciseToEdit ? 'Save Exercise' : 'Add Exercise'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
