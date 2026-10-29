import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { RevisionStatus, Chapter } from '../../types';
import {
  Atom,
  FlaskConical,
  Pi,
  Layers,
  CheckCircle2,
  Clock,
  BookOpen,
  PlaySquare,
  Plus,
  TrendingUp,
  FileText,
  Sparkles,
} from 'lucide-react';

export const SubjectsView: React.FC = () => {
  const {
    state,
    selectedSubjectId,
    setSelectedSubjectId,
    updateChapter,
    setActiveView,
    addChapter,
  } = useApp();

  const [activeTabId, setActiveTabId] = useState<string>(
    selectedSubjectId || state.subjects[0]?.id || 'subj-phy'
  );
  const studentScope = state.userStats.studentClassScope || 'combined';
  const [classFilter, setClassFilter] = useState<'all' | '11' | '12'>(
    studentScope === '11' ? '11' : studentScope === '12' ? '12' : 'all'
  );
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [newChapterClass, setNewChapterClass] = useState<11 | 12>(11);
  const [newChapterWeightage, setNewChapterWeightage] = useState<'High' | 'Medium' | 'Low'>('High');

  const currentSubject = state.subjects.find((s) => s.id === activeTabId) || state.subjects[0];

  // Chapters for this subject
  const subjectChapters = state.chapters.filter((c) => {
    if (c.subjectId !== activeTabId) return false;
    if (classFilter !== 'all' && c.classYear !== Number(classFilter)) return false;
    return true;
  });

  // Calculate subject-level analytics
  const subjectSessions = state.sessions.filter((s) => s.subjectId === activeTabId);
  const totalStudyMinutes = Math.round(
    subjectSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
  );

  const subjectLectures = state.lectures.filter((l) => l.subjectId === activeTabId);
  const completedLectures = subjectLectures.filter((l) => l.status === 'completed').length;

  const subjectPractices = state.modulePractices.filter((p) => p.subjectId === activeTabId);
  const totalAttempted = subjectPractices.reduce((acc, p) => acc + p.attemptedQuestions, 0);
  const totalCorrect = subjectPractices.reduce((acc, p) => acc + p.correctQuestions, 0);
  const subjectAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const masteredChapters = subjectChapters.filter((c) => c.revisionStatus === 'Mastered').length;
  const coveragePercent =
    subjectChapters.length > 0
      ? Math.round(
          (subjectChapters.filter((c) => c.revisionStatus !== 'Not Started').length /
            subjectChapters.length) *
            100
        )
      : 0;

  const handleRevisionStatusChange = async (chapter: Chapter, newStatus: RevisionStatus) => {
    await updateChapter({
      ...chapter,
      revisionStatus: newStatus,
      lastRevisedAt: new Date().toISOString().split('T')[0],
    });
  };

  const handleAddChapterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim()) return;

    await addChapter({
      subjectId: activeTabId,
      name: newChapterName.trim(),
      classYear: newChapterClass,
      weightage: newChapterWeightage,
      revisionStatus: 'Not Started',
    });

    setNewChapterName('');
    setIsAddChapterOpen(false);
  };

  const getSubjectIcon = (name: string) => {
    if (name === 'Physics') return Atom;
    if (name === 'Chemistry') return FlaskConical;
    return Pi;
  };

  const CurrentIcon = getSubjectIcon(currentSubject?.name || 'Physics');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Subject Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl overflow-x-auto">
        {state.subjects.map((sub) => {
          const SubIcon = getSubjectIcon(sub.name);
          const isActive = activeTabId === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => {
                setActiveTabId(sub.id);
                setSelectedSubjectId(sub.id);
              }}
              className={`flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-neutral-800 text-neutral-100 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <SubIcon
                className="w-4 h-4"
                style={{ color: isActive ? sub.color : '#a3a3a3' }}
              />
              <span>{sub.name}</span>
            </button>
          );
        })}
      </div>

      {/* Subject Hero Header & KPI Banner */}
      <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CurrentIcon className="w-5 h-5" style={{ color: currentSubject?.color }} />
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
                {currentSubject?.name} Command & Syllabus
              </h1>
            </div>
            <p className="text-xs text-neutral-400 max-w-xl">
              {currentSubject?.description}
            </p>
          </div>

          <button
            onClick={() => setIsAddChapterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Chapter
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-neutral-800">
          <div className="space-y-0.5">
            <div className="text-[11px] text-neutral-400">Syllabus Covered</div>
            <div className="text-lg font-bold font-mono text-neutral-100">
              {coveragePercent}%
            </div>
            <div className="text-[10px] text-neutral-500">
              {masteredChapters} chapters mastered
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] text-neutral-400">Total Study Time</div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {Math.floor(totalStudyMinutes / 60)}h {totalStudyMinutes % 60}m
            </div>
            <div className="text-[10px] text-neutral-500">Focused deep work</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] text-neutral-400">Lectures Finished</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {completedLectures} <span className="text-neutral-500 text-xs">/ {subjectLectures.length}</span>
            </div>
            <div className="text-[10px] text-neutral-500">Theory & Derivations</div>
          </div>

          <div className="space-y-0.5">
            <div className="text-[11px] text-neutral-400">Practice Accuracy</div>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {subjectAccuracy}%
            </div>
            <div className="text-[10px] text-neutral-500">
              {totalCorrect}/{totalAttempted} questions
            </div>
          </div>
        </div>
      </div>

      {/* Class 11 vs 12 Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs">
          <button
            onClick={() => setClassFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              classFilter === 'all'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Chapters ({subjectChapters.length})
          </button>
          <button
            onClick={() => setClassFilter('11')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              classFilter === '11'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Class 11th Syllabus
          </button>
          <button
            onClick={() => setClassFilter('12')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              classFilter === '12'
                ? 'bg-neutral-800 text-neutral-100'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Class 12th Syllabus
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
          {subjectChapters.length} Chapters in Catalog
        </span>
      </div>

      {/* Chapters Table / List */}
      <div className="space-y-2.5">
        {subjectChapters.map((chapter) => {
          const chPractices = state.modulePractices.filter((p) => p.chapterId === chapter.id);
          const chLectures = state.lectures.filter((l) => l.chapterId === chapter.id);
          const chAttempted = chPractices.reduce((acc, p) => acc + p.attemptedQuestions, 0);
          const chCorrect = chPractices.reduce((acc, p) => acc + p.correctQuestions, 0);
          const chAccuracy = chAttempted > 0 ? Math.round((chCorrect / chAttempted) * 100) : 0;

          return (
            <div
              key={chapter.id}
              className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left Column: Title & metadata */}
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-neutral-100">
                    {chapter.name}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400 px-1.5 py-0.2 rounded bg-neutral-950 border border-neutral-800">
                    Class {chapter.classYear}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold ${
                      chapter.weightage === 'High'
                        ? 'text-red-400 border-red-800/40 bg-red-950/20'
                        : chapter.weightage === 'Medium'
                        ? 'text-amber-400 border-amber-800/40 bg-amber-950/20'
                        : 'text-neutral-400 border-neutral-800 bg-neutral-950'
                    }`}
                  >
                    {chapter.weightage} Weightage
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-neutral-400 flex-wrap pt-0.5">
                  <span className="flex items-center gap-1">
                    <PlaySquare className="w-3.5 h-3.5 text-emerald-400" />
                    {chLectures.length} Lectures ({chLectures.filter((l) => l.status === 'completed').length} done)
                  </span>
                  <span aria-hidden="true" className="text-neutral-600">·</span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                    {chAttempted} Questions ({chAccuracy}% accuracy)
                  </span>
                  {chapter.lastRevisedAt && (
                    <>
                      <span aria-hidden="true" className="text-neutral-600">·</span>
                      <span className="text-neutral-500">
                        Revised: {chapter.lastRevisedAt}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Revision Status Selector */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-neutral-500">
                    Revision Stage
                  </div>
                  <select
                    value={chapter.revisionStatus}
                    onChange={(e) =>
                      handleRevisionStatusChange(chapter, e.target.value as RevisionStatus)
                    }
                    className={`mt-1 text-xs font-semibold rounded-lg px-2.5 py-1.5 border focus:outline-none ${
                      chapter.revisionStatus === 'Mastered'
                        ? 'bg-purple-950/40 border-purple-800 text-purple-300'
                        : chapter.revisionStatus === 'Formulas Revised'
                        ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                        : chapter.revisionStatus === 'In Progress'
                        ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Formulas Revised">Formulas Revised</option>
                    <option value="Mastered">Mastered</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Chapter Dialog */}
      {isAddChapterOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-100">
              Add New Chapter to {currentSubject?.name}
            </h3>
            <form onSubmit={handleAddChapterSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Chapter Name *</label>
                <input
                  type="text"
                  required
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder="e.g. Wave Optics, Coordination Chem"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Class</label>
                  <select
                    value={newChapterClass}
                    onChange={(e) => setNewChapterClass(Number(e.target.value) as 11 | 12)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200"
                  >
                    <option value={11}>Class 11</option>
                    <option value={12}>Class 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-neutral-400 mb-1">JEE Weightage</label>
                  <select
                    value={newChapterWeightage}
                    onChange={(e) => setNewChapterWeightage(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-neutral-200"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddChapterOpen(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 text-neutral-950 font-semibold text-xs rounded-lg"
                >
                  Create Chapter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
