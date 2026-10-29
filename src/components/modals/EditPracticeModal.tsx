import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ModulePractice } from '../../types';
import { X, Pencil, BookOpen, CheckCircle2, Trash2, HelpCircle, Layers } from 'lucide-react';

interface EditPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  practice: ModulePractice | null;
}

export const EditPracticeModal: React.FC<EditPracticeModalProps> = ({
  isOpen,
  onClose,
  practice,
}) => {
  const { state, saveModulePractice, deleteModulePractice } = useApp();

  const [sourceName, setSourceName] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [attemptedQuestions, setAttemptedQuestions] = useState(0);
  const [correctQuestions, setCorrectQuestions] = useState(0);
  const [notes, setNotes] = useState('');
  const [difficultTagsInput, setDifficultTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (practice) {
      setSourceName(practice.sourceName);
      setSubjectId(practice.subjectId);
      setChapterId(practice.chapterId);
      setTotalQuestions(practice.totalQuestions || 100);
      setAttemptedQuestions(practice.attemptedQuestions || 0);
      setCorrectQuestions(practice.correctQuestions || 0);
      setNotes(practice.notes || '');
      setDifficultTagsInput((practice.markedDifficult || []).join(', '));
    }
  }, [practice]);

  if (!isOpen || !practice) return null;

  const filteredChapters = state.chapters.filter((c) => c.subjectId === subjectId);
  const accuracy =
    attemptedQuestions > 0
      ? Math.round((correctQuestions / attemptedQuestions) * 100)
      : 0;

  const exercisesSumTotal = (practice.exercises || []).reduce((acc, ex) => acc + (ex.totalQuestions || 0), 0);
  const exercisesSumAttempted = (practice.exercises || []).reduce((acc, ex) => acc + (ex.attemptedQuestions || 0), 0);
  const exercisesSumCorrect = (practice.exercises || []).reduce((acc, ex) => acc + (ex.correctQuestions || 0), 0);

  const handleSyncWithExercises = () => {
    if (exercisesSumTotal > 0) {
      setTotalQuestions(exercisesSumTotal);
      setAttemptedQuestions(exercisesSumAttempted);
      if (exercisesSumCorrect > 0) setCorrectQuestions(exercisesSumCorrect);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceName.trim() || !chapterId || totalQuestions <= 0) return;

    setIsSubmitting(true);
    const parsedDifficult = difficultTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const updated: ModulePractice = {
      ...practice,
      sourceName: sourceName.trim(),
      subjectId,
      chapterId,
      totalQuestions: Math.max(1, Number(totalQuestions)),
      attemptedQuestions: Math.min(Number(totalQuestions), Math.max(0, Number(attemptedQuestions))),
      correctQuestions: Math.min(Number(attemptedQuestions), Math.max(0, Number(correctQuestions))),
      markedDifficult: parsedDifficult,
      notes: notes.trim() || undefined,
      lastPracticedAt: new Date().toISOString().split('T')[0],
    };

    await saveModulePractice(updated);
    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteModulePractice(practice.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Edit Practice Module</h3>
              <p className="text-xs text-neutral-400">Customize total questions, attempted count, and accuracy</p>
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
          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Source / Module Material *
            </label>
            <input
              type="text"
              required
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g. HC Verma Vol 1, Allen Leader Module, Cengage Physics"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

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
                  setChapterId('');
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
                <option value="">Select Chapter...</option>
                {filteredChapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name} (Class {ch.classYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* EDITABLE QUESTIONS SECTION */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                Questions Count & Attempt Stats
              </span>
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                {accuracy}% Accuracy
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Total Questions *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="1000"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-neutral-100 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-neutral-500">Editable total</span>
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
                  onChange={(e) => setAttemptedQuestions(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-neutral-500">Solved so far</span>
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
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-neutral-500">Correct answers</span>
              </div>
            </div>

            {/* Sync with Exercises button if exercises exist */}
            {exercisesSumTotal > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px] text-neutral-400">
                <span>Exercises Sum: {exercisesSumAttempted} / {exercisesSumTotal} qs</span>
                <button
                  type="button"
                  onClick={handleSyncWithExercises}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline"
                >
                  Sync Totals from Exercises
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Marked Difficult / Starred Questions (comma separated)
            </label>
            <input
              type="text"
              value={difficultTagsInput}
              onChange={(e) => setDifficultTagsInput(e.target.value)}
              placeholder="e.g. Q14, Q28, Ex 2 #19, HCV #42"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-amber-300 placeholder-neutral-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Notes & Mistakes / Formula Weaknesses
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write formulas forgotten, recurring silly mistakes, or concepts to revise..."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Record
            </button>

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
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
