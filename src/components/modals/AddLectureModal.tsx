import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LectureStatus } from '../../types';
import { X, PlaySquare, Clock, GraduationCap } from 'lucide-react';

interface AddLectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectId?: string;
  defaultChapterId?: string;
}

export const AddLectureModal: React.FC<AddLectureModalProps> = ({
  isOpen,
  onClose,
  defaultSubjectId,
  defaultChapterId,
}) => {
  const { state, addLecture } = useApp();
  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(defaultSubjectId || state.subjects[0]?.id || '');
  const [chapterId, setChapterId] = useState(defaultChapterId || '');
  const [durationMinutes, setDurationMinutes] = useState(75);
  const [status, setStatus] = useState<LectureStatus>('not_started');
  const [facultyOrPlatform, setFacultyOrPlatform] = useState('');
  const [scheduledDate, setScheduledDate] = useState(todayStr);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredChapters = state.chapters.filter((c) => c.subjectId === subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subjectId || !chapterId) return;

    setIsSubmitting(true);
    await addLecture({
      title: title.trim(),
      subjectId,
      chapterId,
      durationMinutes: Number(durationMinutes) || 60,
      status,
      facultyOrPlatform: facultyOrPlatform.trim() || undefined,
      scheduledDate,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <h3 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
            <PlaySquare className="w-4 h-4 text-emerald-400" />
            Add Lecture to Track
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Lecture Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lec 04: Moment of Inertia of Disc & Ring"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/80"
            />
          </div>

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
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
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
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-400" />
                Duration (mins)
              </label>
              <input
                type="number"
                min="10"
                max="240"
                step="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LectureStatus)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/80"
              >
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-neutral-400" />
              Teacher / Platform
            </label>
            <input
              type="text"
              value={facultyOrPlatform}
              onChange={(e) => setFacultyOrPlatform(e.target.value)}
              placeholder="e.g., Physics Wallah / Mohit Tyagi / Coaching"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/80"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Key Concepts & Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Important formulas, theorems, timestamps..."
              rows={2}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/80"
            />
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
              disabled={isSubmitting || !title.trim() || !chapterId}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-colors"
            >
              Save Lecture
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
