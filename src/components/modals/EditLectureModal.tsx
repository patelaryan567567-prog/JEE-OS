import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Lecture, LectureStatus } from '../../types';
import { X, Pencil, PlaySquare, Clock, GraduationCap, Calendar, Trash2 } from 'lucide-react';

interface EditLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  lecture: Lecture | null;
}

export const EditLectureModal: React.FC<EditLectureModalProps> = ({
  isOpen,
  onClose,
  lecture,
}) => {
  const { state, updateLecture, deleteLecture } = useApp();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(75);
  const [status, setStatus] = useState<LectureStatus>('not_started');
  const [facultyOrPlatform, setFacultyOrPlatform] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (lecture) {
      setTitle(lecture.title);
      setSubjectId(lecture.subjectId);
      setChapterId(lecture.chapterId);
      setDurationMinutes(lecture.durationMinutes || 60);
      setStatus(lecture.status);
      setFacultyOrPlatform(lecture.facultyOrPlatform || '');
      setScheduledDate(lecture.scheduledDate || new Date().toISOString().split('T')[0]);
      setNotes(lecture.notes || '');
    }
  }, [lecture]);

  if (!isOpen || !lecture) return null;

  const filteredChapters = state.chapters.filter((c) => c.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId || !chapterId) return;

    setIsSubmitting(true);
    const updated: Lecture = {
      ...lecture,
      title: title.trim(),
      subjectId,
      chapterId,
      durationMinutes: Number(durationMinutes) || 60,
      status,
      facultyOrPlatform: facultyOrPlatform.trim() || undefined,
      scheduledDate,
      notes: notes.trim() || undefined,
      completedAt: status === 'completed' ? (lecture.completedAt || new Date().toISOString()) : undefined,
    };

    await updateLecture(updated);
    setIsSubmitting(false);
    onClose();
  };

  const handleDelete = async () => {
    await deleteLecture(lecture.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-100">Edit Lecture</h3>
              <p className="text-xs text-neutral-400">Update syllabus lecture details, status, or notes</p>
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
              Lecture Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Lecture 04: Newton's Laws & Free Body Diagrams"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
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
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Progress Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LectureStatus)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2 py-2 text-xs text-neutral-100 capitalize focus:outline-none focus:border-emerald-500"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Duration (Mins)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-200 mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Faculty / Platform (Optional)
            </label>
            <input
              type="text"
              value={facultyOrPlatform}
              onChange={(e) => setFacultyOrPlatform(e.target.value)}
              placeholder="e.g. Physics Wallah, Mohit Tyagi Sir, Allen Classroom"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-200 mb-1">
              Notes & Key Topics
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key concepts taught, homework assignment, timestamp bookmarks..."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Lecture
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
                className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg shadow-md transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
