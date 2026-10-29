import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, BookOpen, CheckCircle, HelpCircle } from 'lucide-react';

interface AddPracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultChapterId?: string;
  defaultSubjectId?: string;
}

export const AddPracticeModal: React.FC<AddPracticeModalProps> = ({
  isOpen,
  onClose,
  defaultChapterId,
  defaultSubjectId,
}) => {
  const { state, recordPracticeSession } = useApp();

  const [subjectId, setSubjectId] = useState(defaultSubjectId || state.subjects[0]?.id || '');
  const [chapterId, setChapterId] = useState(defaultChapterId || '');
  const [sourceName, setSourceName] = useState('HC Verma / Coaching Module');
  const [totalQuestions, setTotalQuestions] = useState(100);
  const [attempted, setAttempted] = useState(25);
  const [correct, setCorrect] = useState(20);
  const [difficultInput, setDifficultInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredChapters = state.chapters.filter((c) => c.subjectId === subjectId);
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !chapterId || attempted <= 0) return;

    setIsSubmitting(true);
    const difficultTags = difficultInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await recordPracticeSession(
      chapterId,
      subjectId,
      Number(attempted),
      Math.min(Number(attempted), Math.max(0, Number(correct))),
      sourceName.trim(),
      difficultTags,
      Number(totalQuestions) || 100
    );

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            Log Question Practice
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Subject *
              </label>
              <select
                required
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setChapterId('');
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500/80"
              >
                {state.subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Chapter *
              </label>
              <select
                required
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-cyan-500/80"
              >
                <option value="">Select Chapter</option>
                {filteredChapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name} (Cl {ch.classYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Source / Book / Test
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g. HC Verma, MS Chouhan, JEE Main PYQs 2024"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/80"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Total Questions *
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-100 focus:outline-none focus:border-cyan-500/80"
              />
              <span className="text-[10px] text-neutral-500">In chapter/book</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Attempted *
              </label>
              <input
                type="number"
                min="1"
                max={totalQuestions}
                value={attempted}
                onChange={(e) => setAttempted(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500/80"
              />
              <span className="text-[10px] text-neutral-500">Solved count</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Correct *
              </label>
              <input
                type="number"
                min="0"
                max={attempted}
                value={correct}
                onChange={(e) => setCorrect(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-cyan-500/80"
              />
              <span className="text-[10px] text-neutral-500">Right answers</span>
            </div>
          </div>

          {/* Real-time accuracy gauge */}
          <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">Calculated Accuracy</span>
            <div className="flex items-center gap-2">
              <span className={`font-mono font-bold ${accuracy >= 80 ? 'text-emerald-400' : accuracy >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                {accuracy}%
              </span>
              <span className="text-[11px] text-neutral-500">
                ({correct}/{attempted})
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              Mark Starred / Difficult Questions
            </label>
            <input
              type="text"
              value={difficultInput}
              onChange={(e) => setDifficultInput(e.target.value)}
              placeholder="Comma-separated: Q14, Q22, Ex 2 #9"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/80"
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              These will be highlighted in your module dashboard for pre-exam revision.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !chapterId || attempted <= 0}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Record Practice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
