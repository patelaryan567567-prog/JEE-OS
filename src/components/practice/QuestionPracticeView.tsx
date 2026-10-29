import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ModulePractice, ChapterExercise } from '../../types';
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle2,
  HelpCircle,
  X,
  Pencil,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { AddPracticeModal } from '../modals/AddPracticeModal';
import { EditPracticeModal } from '../modals/EditPracticeModal';
import { ChapterExerciseModal } from '../modals/ChapterExerciseModal';

export const QuestionPracticeView: React.FC = () => {
  const { state, saveModulePractice, deleteModulePractice } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPractice, setEditingPractice] = useState<ModulePractice | null>(null);

  // Inline editing total questions
  const [inlineEditingTotalId, setInlineEditingTotalId] = useState<string | null>(null);
  const [inlineTotalValue, setInlineTotalValue] = useState<number>(100);

  const handleSaveInlineTotal = async (practice: ModulePractice) => {
    const updated: ModulePractice = {
      ...practice,
      totalQuestions: Math.max(1, Number(inlineTotalValue) || practice.totalQuestions),
    };
    await saveModulePractice(updated);
    setInlineEditingTotalId(null);
  };

  // Exercise modal states
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [exerciseModalPractice, setExerciseModalPractice] = useState<ModulePractice | null>(null);
  const [editingExercise, setEditingExercise] = useState<ChapterExercise | null>(null);

  // Expanded exercises per practice card
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

  const [newTagInput, setNewTagInput] = useState<Record<string, string>>({});

  // Filter practices
  const filteredPractices = state.modulePractices.filter((p) => {
    if (selectedSubjectId !== 'all' && p.subjectId !== selectedSubjectId) return false;

    const chapter = state.chapters.find((c) => c.id === p.chapterId);
    if (
      searchQuery.trim() &&
      !p.sourceName.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !chapter?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Calculate totals
  const totalAttempted = state.modulePractices.reduce((acc, p) => acc + p.attemptedQuestions, 0);
  const totalCorrect = state.modulePractices.reduce((acc, p) => acc + p.correctQuestions, 0);
  const overallAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
  const totalDifficultStarred = state.modulePractices.reduce(
    (acc, p) => acc + p.markedDifficult.length,
    0
  );

  const toggleExercises = (practiceId: string) => {
    setExpandedExercises((prev) => ({
      ...prev,
      [practiceId]: !prev[practiceId],
    }));
  };

  // Remove difficult tag
  const handleRemoveDifficultTag = async (practice: ModulePractice, tagToRemove: string) => {
    const updated: ModulePractice = {
      ...practice,
      markedDifficult: practice.markedDifficult.filter((t) => t !== tagToRemove),
    };
    await saveModulePractice(updated);
  };

  // Add new difficult tag
  const handleAddDifficultTag = async (practice: ModulePractice) => {
    const val = (newTagInput[practice.id] || '').trim();
    if (!val) return;

    if (!practice.markedDifficult.includes(val)) {
      const updated: ModulePractice = {
        ...practice,
        markedDifficult: [...practice.markedDifficult, val],
      };
      await saveModulePractice(updated);
    }
    setNewTagInput((prev) => ({ ...prev, [practice.id]: '' }));
  };

  // Quick increment practice solve count
  const handleQuickAddSolved = async (practice: ModulePractice, increment: number) => {
    const newAttempted = Math.min(practice.totalQuestions, practice.attemptedQuestions + increment);
    const newCorrect = Math.min(newAttempted, practice.correctQuestions + increment);
    const updated: ModulePractice = {
      ...practice,
      attemptedQuestions: newAttempted,
      correctQuestions: newCorrect,
      lastPracticedAt: new Date().toISOString().split('T')[0],
    };
    await saveModulePractice(updated);
  };

  // Quick increment exercise solve count
  const handleQuickAddExerciseSolved = async (
    practice: ModulePractice,
    exerciseId: string,
    increment: number
  ) => {
    const currentExercises = practice.exercises || [];
    const updatedExercises = currentExercises.map((ex) => {
      if (ex.id === exerciseId) {
        const newAttempted = Math.min(ex.totalQuestions, ex.attemptedQuestions + increment);
        const newStarted = Math.max(newAttempted, (ex.startedQuestions || ex.attemptedQuestions) + increment);
        const newCorrect = Math.min(newAttempted, (ex.correctQuestions || 0) + increment);
        return {
          ...ex,
          attemptedQuestions: newAttempted,
          startedQuestions: Math.min(ex.totalQuestions, newStarted),
          correctQuestions: newCorrect,
        };
      }
      return ex;
    });

    // Auto update practice sums
    const sumTotal = updatedExercises.reduce((acc, ex) => acc + ex.totalQuestions, 0);
    const sumAttempted = updatedExercises.reduce((acc, ex) => acc + ex.attemptedQuestions, 0);
    const sumCorrect = updatedExercises.reduce((acc, ex) => acc + (ex.correctQuestions || 0), 0);

    const updatedPractice: ModulePractice = {
      ...practice,
      totalQuestions: sumTotal > 0 ? sumTotal : practice.totalQuestions,
      attemptedQuestions: sumAttempted > 0 ? sumAttempted : practice.attemptedQuestions,
      correctQuestions: sumCorrect > 0 ? sumCorrect : practice.correctQuestions,
      exercises: updatedExercises,
      lastPracticedAt: new Date().toISOString().split('T')[0],
    };

    await saveModulePractice(updatedPractice);
  };

  const handleOpenAddExercise = (practice: ModulePractice) => {
    setExerciseModalPractice(practice);
    setEditingExercise(null);
    setIsExerciseModalOpen(true);
  };

  const handleOpenEditExercise = (practice: ModulePractice, exercise: ChapterExercise) => {
    setExerciseModalPractice(practice);
    setEditingExercise(exercise);
    setIsExerciseModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Module & Question Practice
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Log questions solved in HC Verma, Irodov, Allen, MS Chouhan, N Awasthi & PYQs. All total questions and exercise sets are fully customizable!
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => {
              setExerciseModalPractice(null);
              setEditingExercise(null);
              setIsExerciseModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-cyan-300 font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Layers className="w-4 h-4" />
            + Add Exercise to Chapter
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log Practice Session
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Total Solved</div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {totalAttempted}
          </div>
          <div className="text-[11px] text-neutral-500">Attempted across modules</div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Correct Answers</div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {totalCorrect}
          </div>
          <div className="text-[11px] text-neutral-500">High accuracy score</div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Overall Accuracy</div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {overallAccuracy}%
          </div>
          <div className="text-[11px] text-neutral-500">Benchmark: &gt;75% for JEE Adv</div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Difficult Starred</div>
          <div className="text-lg font-bold font-mono text-purple-400">
            {totalDifficultStarred}
          </div>
          <div className="text-[11px] text-neutral-500">Tagged for mock revision</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Subjects</option>
            {state.subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapter or module source..."
            className="w-full sm:w-60 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Module Practice Cards */}
      <div className="space-y-4">
        {filteredPractices.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-400 space-y-3">
            <BookOpen className="w-8 h-8 text-neutral-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-neutral-300">No practice records found</p>
              <p className="text-xs text-neutral-500 mt-1">
                Log questions or exercises using the "Log Practice Session" button above.
              </p>
            </div>
          </div>
        ) : (
          filteredPractices.map((practice) => {
            const subject = state.subjects.find((s) => s.id === practice.subjectId);
            const chapter = state.chapters.find((c) => c.id === practice.chapterId);
            const remaining = Math.max(0, practice.totalQuestions - practice.attemptedQuestions);
            const accuracy =
              practice.attemptedQuestions > 0
                ? Math.round((practice.correctQuestions / practice.attemptedQuestions) * 100)
                : 0;
            const completionPct = Math.min(
              100,
              Math.round((practice.attemptedQuestions / practice.totalQuestions) * 100)
            );
            const exercisesList = practice.exercises || [];
            const isExercisesExpanded = expandedExercises[practice.id] ?? true;

            return (
              <div
                key={practice.id}
                className="p-5 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-4"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: subject?.color || '#06b6d4' }}
                      >
                        {subject?.name}
                      </span>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-xs text-neutral-400 font-mono">
                        {practice.sourceName}
                      </span>
                      {exercisesList.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-300">
                          {exercisesList.length} Exercises
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-neutral-100 mt-1">
                      {chapter?.name || 'General Chapter Practice'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <div className="text-right mr-1">
                      <div className="text-xs font-mono font-bold text-neutral-200">
                        {accuracy}% Accuracy
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {practice.correctQuestions}/{practice.attemptedQuestions} correct
                      </div>
                    </div>

                    {/* Quick +5 solved button */}
                    <button
                      onClick={() => handleQuickAddSolved(practice, 5)}
                      disabled={practice.attemptedQuestions >= practice.totalQuestions}
                      className="px-2 py-1 text-[11px] font-semibold bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-cyan-300 rounded-md transition-colors"
                      title="Quick solve +5 questions"
                    >
                      +5 Solved
                    </button>

                    {/* Edit Practice Button */}
                    <button
                      onClick={() => setEditingPractice(practice)}
                      className="p-1.5 text-neutral-400 hover:text-cyan-300 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1 text-xs"
                      title="Edit total questions, attempt count, and source"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Delete Practice Button */}
                    <button
                      onClick={() => deleteModulePractice(practice.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-md transition-colors"
                      title="Delete practice record"
                      aria-label="Delete practice record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Numerical stats (Editable Total Display) */}
                <div className="space-y-1.5 bg-neutral-950/50 p-3 rounded-xl border border-neutral-800/70">
                  <div className="flex justify-between text-xs font-mono text-neutral-300">
                    <span className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        Attempted:{' '}
                        <strong className="text-cyan-400 font-bold">{practice.attemptedQuestions}</strong>
                        {' / '}
                        {inlineEditingTotalId === practice.id ? (
                          <span className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              max="1000"
                              value={inlineTotalValue}
                              onChange={(e) => setInlineTotalValue(Number(e.target.value))}
                              className="w-16 bg-neutral-900 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-neutral-100 font-mono font-bold focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveInlineTotal(practice)}
                              className="px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] rounded font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setInlineEditingTotalId(null)}
                              className="px-1 text-neutral-400 hover:text-neutral-200 text-[10px]"
                            >
                              ✕
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setInlineEditingTotalId(practice.id);
                              setInlineTotalValue(practice.totalQuestions);
                            }}
                            className="inline-flex items-center gap-1 group px-1 rounded hover:bg-neutral-800 transition-colors"
                            title="Click to edit total questions inline"
                          >
                            <strong className="text-neutral-100 font-bold group-hover:text-cyan-300 underline decoration-dotted">
                              {practice.totalQuestions}
                            </strong>
                            <span>qs</span>
                            <Pencil className="w-3 h-3 text-neutral-500 group-hover:text-cyan-400" />
                          </button>
                        )}
                      </span>
                      <button
                        onClick={() => setEditingPractice(practice)}
                        className="text-[10px] text-neutral-500 hover:text-cyan-400 underline font-sans ml-1"
                        title="Open full edit modal"
                      >
                        (Edit All)
                      </button>
                    </span>
                    <span className="text-neutral-400">
                      Remaining: <strong className="text-amber-400">{remaining}</strong> qs ({completionPct}%)
                    </span>
                  </div>

                  <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/80">
                    <div
                      className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>

                {/* EXERCISE-WISE SECTION */}
                <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-neutral-200">
                        Exercise-Wise Question Breakdown ({exercisesList.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Add Exercise Button */}
                      <button
                        onClick={() => handleOpenAddExercise(practice)}
                        className="px-2.5 py-1 text-xs font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Exercise
                      </button>

                      {exercisesList.length > 0 && (
                        <button
                          onClick={() => toggleExercises(practice.id)}
                          className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
                          aria-label="Toggle exercises list"
                        >
                          {isExercisesExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Exercises List */}
                  {isExercisesExpanded && (
                    <div className="space-y-2 pt-1">
                      {exercisesList.length === 0 ? (
                        <div className="p-3 text-center rounded-lg border border-dashed border-neutral-800 text-xs text-neutral-500">
                          No exercises added yet for this chapter. Click{' '}
                          <strong className="text-cyan-400 font-semibold cursor-pointer" onClick={() => handleOpenAddExercise(practice)}>
                            + Add Exercise
                          </strong>{' '}
                          to track Level 1, Level 2, PYQs, or numerical questions separately!
                        </div>
                      ) : (
                        exercisesList.map((ex) => {
                          const exAccuracy =
                            ex.attemptedQuestions > 0
                              ? Math.round(((ex.correctQuestions || 0) / ex.attemptedQuestions) * 100)
                              : 0;
                          const exProgressPct = Math.min(
                            100,
                            Math.round((ex.attemptedQuestions / ex.totalQuestions) * 100)
                          );
                          const startedCount = ex.startedQuestions ?? ex.attemptedQuestions;

                          return (
                            <div
                              key={ex.id}
                              className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800/90 hover:border-neutral-700/80 transition-colors space-y-2"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                  <span className="text-xs font-semibold text-neutral-200">
                                    {ex.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 flex-wrap">
                                  <span>
                                    Total: <strong className="text-neutral-200">{ex.totalQuestions}</strong>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Attempted: <strong className="text-cyan-400">{ex.attemptedQuestions}</strong>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Started: <strong className="text-amber-300">{startedCount}</strong>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    Accuracy: <strong className="text-emerald-400">{exAccuracy}%</strong>
                                  </span>

                                  {/* Quick Actions for Exercise */}
                                  <div className="flex items-center gap-1 pl-1">
                                    <button
                                      onClick={() => handleQuickAddExerciseSolved(practice, ex.id, 5)}
                                      disabled={ex.attemptedQuestions >= ex.totalQuestions}
                                      className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-800 hover:bg-neutral-700 text-cyan-300 rounded disabled:opacity-30"
                                      title="Add +5 solved"
                                    >
                                      +5
                                    </button>
                                    <button
                                      onClick={() => handleOpenEditExercise(practice, ex)}
                                      className="p-1 text-neutral-400 hover:text-cyan-300 rounded"
                                      title="Edit exercise questions"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Exercise progress bar */}
                              <div className="w-full h-1.5 bg-neutral-950 rounded-full overflow-hidden flex">
                                <div
                                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${exProgressPct}%` }}
                                />
                              </div>

                              {ex.notes && (
                                <p className="text-[11px] text-neutral-400 italic">
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Starred / Difficult Questions section */}
                <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-400 font-medium flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                      Starred / Difficult Questions for Revision:
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono">
                      {practice.markedDifficult.length} marked
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {practice.markedDifficult.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-amber-300"
                      >
                        <span>{tag}</span>
                        <button
                          onClick={() => handleRemoveDifficultTag(practice, tag)}
                          className="text-neutral-500 hover:text-neutral-200"
                          aria-label={`Remove difficult question tag ${tag}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {/* Add new difficult tag inline */}
                    <div className="inline-flex items-center gap-1">
                      <input
                        type="text"
                        placeholder="+ Tag question (e.g. Q45)"
                        value={newTagInput[practice.id] || ''}
                        onChange={(e) =>
                          setNewTagInput({
                            ...newTagInput,
                            [practice.id]: e.target.value,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddDifficultTag(practice);
                          }
                        }}
                        className="bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[11px] font-mono text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/80 w-32"
                      />
                      <button
                        onClick={() => handleAddDifficultTag(practice)}
                        className="text-[11px] px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded font-medium"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <AddPracticeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        defaultSubjectId={selectedSubjectId !== 'all' ? selectedSubjectId : undefined}
      />

      <EditPracticeModal
        isOpen={Boolean(editingPractice)}
        onClose={() => setEditingPractice(null)}
        practice={editingPractice}
      />

      <ChapterExerciseModal
        isOpen={isExerciseModalOpen}
        onClose={() => {
          setIsExerciseModalOpen(false);
          setExerciseModalPractice(null);
          setEditingExercise(null);
        }}
        practice={exerciseModalPractice}
        exerciseToEdit={editingExercise}
        onSave={async (updatedPractice) => {
          await saveModulePractice(updatedPractice);
          setIsExerciseModalOpen(false);
          setExerciseModalPractice(null);
          setEditingExercise(null);
        }}
      />
    </div>
  );
};
