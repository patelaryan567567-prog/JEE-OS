import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LectureStatus, ClassYear } from '../../types';
import {
  PlaySquare,
  Plus,
  Clock,
  GraduationCap,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  Pencil,
} from 'lucide-react';
import { AddLectureModal } from '../modals/AddLectureModal';
import { EditLectureModal } from '../modals/EditLectureModal';
import { Lecture } from '../../types';

export const LectureTrackerView: React.FC = () => {
  const { state, setLectureStatus, deleteLecture } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedClassYear, setSelectedClassYear] = useState<'all' | '11' | '12'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LectureStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);

  // Filter lectures
  const filteredLectures = state.lectures.filter((lec) => {
    if (selectedSubjectId !== 'all' && lec.subjectId !== selectedSubjectId) return false;

    const chapter = state.chapters.find((c) => c.id === lec.chapterId);
    if (selectedClassYear !== 'all' && chapter && chapter.classYear !== Number(selectedClassYear)) {
      return false;
    }

    if (statusFilter !== 'all' && lec.status !== statusFilter) return false;

    if (
      searchQuery.trim() &&
      !lec.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !lec.facultyOrPlatform?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !chapter?.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // Calculate chapter completion map
  const chapterCompletionMap = state.chapters.reduce((acc, ch) => {
    const chLectures = state.lectures.filter((l) => l.chapterId === ch.id);
    const completed = chLectures.filter((l) => l.status === 'completed').length;
    acc[ch.id] = {
      total: chLectures.length,
      completed,
      pct: chLectures.length > 0 ? Math.round((completed / chLectures.length) * 100) : 0,
    };
    return acc;
  }, {} as Record<string, { total: number; completed: number; pct: number }>);

  // Overall statistics
  const totalDurationMinutes = state.lectures.reduce((acc, l) => acc + l.durationMinutes, 0);
  const completedDurationMinutes = state.lectures
    .filter((l) => l.status === 'completed')
    .reduce((acc, l) => acc + l.durationMinutes, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <PlaySquare className="w-5 h-5 text-emerald-400" />
            Lecture Syllabus Tracker
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Track video lectures across coaching batches, Allen, PW, Mohit Tyagi & YouTube.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Lecture
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Total Lectures</div>
          <div className="text-lg font-bold font-mono text-neutral-100">
            {state.lectures.length}
          </div>
          <div className="text-[11px] text-neutral-500">
            {Math.round(totalDurationMinutes / 60)} hours total syllabus
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Completed</div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            {state.lectures.filter((l) => l.status === 'completed').length}
          </div>
          <div className="text-[11px] text-neutral-500">
            {Math.round(completedDurationMinutes / 60)} hours watched
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">In Progress</div>
          <div className="text-lg font-bold font-mono text-amber-400">
            {state.lectures.filter((l) => l.status === 'in_progress').length}
          </div>
          <div className="text-[11px] text-neutral-500">Active chapters</div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1">
          <div className="text-xs text-neutral-400">Remaining / Not Started</div>
          <div className="text-lg font-bold font-mono text-neutral-400">
            {state.lectures.filter((l) => l.status === 'not_started').length}
          </div>
          <div className="text-[11px] text-neutral-500">Pending backlog</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Subject Select */}
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

          {/* Class 11 / 12 Filter */}
          <select
            value={selectedClassYear}
            onChange={(e) => setSelectedClassYear(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">Class 11 & 12</option>
            <option value="11">Class 11th Syllabus</option>
            <option value="12">Class 12th Syllabus</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lectures or teacher..."
            className="w-full sm:w-56 bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none placeholder-neutral-500"
          />
        </div>
      </div>

      {/* Lectures List */}
      <div className="space-y-3">
        {filteredLectures.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-400 space-y-3">
            <PlaySquare className="w-8 h-8 text-neutral-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-neutral-300">No lectures match current filters</p>
              <p className="text-xs text-neutral-500 mt-1">
                Add lectures using the button above to start syllabus tracking.
              </p>
            </div>
          </div>
        ) : (
          filteredLectures.map((lec) => {
            const subject = state.subjects.find((s) => s.id === lec.subjectId);
            const chapter = state.chapters.find((c) => c.id === lec.chapterId);
            const chStats = chapter ? chapterCompletionMap[chapter.id] : null;

            return (
              <div
                key={lec.id}
                className="p-4 rounded-xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 transition-colors space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-semibold"
                        style={{ color: subject?.color || '#06b6d4' }}
                      >
                        {subject?.name}
                      </span>
                      {chapter && (
                        <>
                          <span aria-hidden="true" className="text-neutral-600">·</span>
                          <span className="text-xs text-neutral-300 font-medium">
                            {chapter.name} (Cl {chapter.classYear})
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-neutral-100">
                      {lec.title}
                    </h3>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1.5 self-start sm:self-auto">
                    <button
                      onClick={() => setLectureStatus(lec.id, 'not_started')}
                      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                        lec.status === 'not_started'
                          ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Not Started
                    </button>
                    <button
                      onClick={() => setLectureStatus(lec.id, 'in_progress')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                        lec.status === 'in_progress'
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      onClick={() => setLectureStatus(lec.id, 'completed')}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                        lec.status === 'completed'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Completed
                    </button>
                  </div>
                </div>

                {/* Notes & Faculty */}
                {lec.notes && (
                  <p className="text-xs text-neutral-400 bg-neutral-950/50 p-2 rounded-lg border border-neutral-800/60">
                    {lec.notes}
                  </p>
                )}

                {/* Bottom Row info & delete */}
                <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-2 border-t border-neutral-800/80">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-neutral-500" />
                      {lec.durationMinutes}m
                    </span>
                    {lec.facultyOrPlatform && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-neutral-500" />
                        {lec.facultyOrPlatform}
                      </span>
                    )}
                    {chStats && (
                      <span className="text-neutral-500">
                        Chapter Lectures: {chStats.completed}/{chStats.total} done ({chStats.pct}%)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setEditingLecture(lec)}
                      className="text-neutral-400 hover:text-emerald-400 p-1 transition-colors flex items-center gap-1 text-xs"
                      title="Edit lecture"
                      aria-label="Edit lecture"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => deleteLecture(lec.id)}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                      title="Delete lecture"
                      aria-label="Delete lecture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddLectureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultSubjectId={selectedSubjectId !== 'all' ? selectedSubjectId : undefined}
      />

      <EditLectureModal
        isOpen={Boolean(editingLecture)}
        onClose={() => setEditingLecture(null)}
        lecture={editingLecture}
      />
    </div>
  );
};
