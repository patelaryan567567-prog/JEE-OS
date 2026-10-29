import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskCategory, TaskPriority } from '../../types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  AlertCircle,
  Tag,
  ArrowRight,
  Pencil,
} from 'lucide-react';
import { AddTaskModal } from '../modals/AddTaskModal';
import { EditTaskModal } from '../modals/EditTaskModal';

export const TasksView: React.FC = () => {
  const {
    state,
    toggleTaskCompletion,
    deleteTask,
    moveTaskCategory,
    addTask,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TaskCategory>('today');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Quick task add
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    await addTask({
      title: quickTitle.trim(),
      priority: 'high',
      category: activeTab === 'completed' ? 'today' : activeTab,
      dueDate: todayStr,
      estimatedMinutes: 45,
      subjectId: selectedSubjectFilter !== 'all' ? selectedSubjectFilter : undefined,
    });
    setQuickTitle('');
  };

  // Filter tasks based on tab, subject, search
  const filteredTasks = state.tasks.filter((task) => {
    // Tab filter
    if (activeTab === 'completed') {
      if (task.category !== 'completed') return false;
    } else {
      if (task.category !== activeTab) return false;
    }

    // Subject filter
    if (selectedSubjectFilter !== 'all' && task.subjectId !== selectedSubjectFilter) {
      return false;
    }

    // Search query
    if (
      searchQuery.trim() &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const tabCounts = {
    today: state.tasks.filter((t) => t.category === 'today').length,
    upcoming: state.tasks.filter((t) => t.category === 'upcoming').length,
    backlog: state.tasks.filter((t) => t.category === 'backlog').length,
    completed: state.tasks.filter((t) => t.category === 'completed').length,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            Study Tasks & Queues
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Prioritize homework, DPPs, test revisions, and formula memorization.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Detailed Task
        </button>
      </div>

      {/* Quick Add Form Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex items-center gap-2 p-1.5 bg-neutral-900 border border-neutral-800 rounded-xl"
      >
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={`Quick add task to ${activeTab.toUpperCase()}... (press Enter)`}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!quickTitle.trim()}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </form>

      {/* Filter and Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg overflow-x-auto">
          {(['today', 'upcoming', 'backlog', 'completed'] as TaskCategory[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors flex items-center gap-1.5 shrink-0 ${
                activeTab === tab
                  ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <span>{tab}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-neutral-950 text-neutral-400">
                {tabCounts[tab]}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Subject Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Subject Filter */}
          <div className="relative">
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs rounded-lg px-2.5 py-1.5 pr-8 focus:outline-none focus:border-amber-500/80"
            >
              <option value="all">All Subjects</option>
              {state.subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tasks..."
              className="w-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-amber-500/80 placeholder-neutral-500"
            />
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-400 space-y-3">
            <CheckSquare className="w-8 h-8 text-neutral-600 mx-auto" />
            <div>
              <p className="text-sm font-medium text-neutral-300">
                No tasks found in {activeTab}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {searchQuery ? 'Try clearing your search query' : 'Queue up your study milestones above!'}
              </p>
            </div>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isCompleted = task.category === 'completed';
            const subject = state.subjects.find((s) => s.id === task.subjectId);
            const chapter = state.chapters.find((c) => c.id === task.chapterId);

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-xl border transition-all duration-150 flex items-start gap-3.5 ${
                  isCompleted
                    ? 'bg-neutral-950/40 border-neutral-800/60 opacity-70'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Completion Toggle */}
                <button
                  onClick={() => toggleTaskCompletion(task.id)}
                  className={`mt-0.5 p-1 rounded-md transition-colors ${
                    isCompleted
                      ? 'text-emerald-400 bg-emerald-950/40'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                  }`}
                  aria-label={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                >
                  <CheckCircle2
                    className={`w-5 h-5 ${isCompleted ? 'fill-emerald-500/20 text-emerald-400' : ''}`}
                  />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs font-semibold ${
                        isCompleted ? 'line-through text-neutral-500' : 'text-neutral-100'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Priority badge */}
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border uppercase font-semibold ${
                        task.priority === 'urgent'
                          ? 'text-red-400 border-red-800/40 bg-red-950/30'
                          : task.priority === 'high'
                          ? 'text-amber-400 border-amber-800/40 bg-amber-950/30'
                          : task.priority === 'medium'
                          ? 'text-blue-400 border-blue-800/40 bg-blue-950/30'
                          : 'text-neutral-400 border-neutral-800 bg-neutral-950'
                      }`}
                    >
                      {task.priority}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Metadata Row */}
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-neutral-400 flex-wrap">
                    {subject && (
                      <span
                        className="font-medium"
                        style={{ color: subject.color }}
                      >
                        {subject.name}
                      </span>
                    )}

                    {chapter && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-[180px]">{chapter.name}</span>
                      </>
                    )}

                    {task.dueDate && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          {task.dueDate}
                        </span>
                      </>
                    )}

                    {task.estimatedMinutes && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          {task.estimatedMinutes}m
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions: Move Category or Delete */}
                <div className="flex items-center gap-1">
                  {task.category !== 'today' && !isCompleted && (
                    <button
                      onClick={() => moveTaskCategory(task.id, 'today')}
                      className="px-2 py-1 text-[11px] font-medium text-amber-400 hover:bg-neutral-800 rounded transition-colors"
                      title="Move to Today"
                    >
                      → Today
                    </button>
                  )}

                  {task.category !== 'backlog' && !isCompleted && (
                    <button
                      onClick={() => moveTaskCategory(task.id, 'backlog')}
                      className="px-2 py-1 text-[11px] font-medium text-rose-400 hover:bg-neutral-800 rounded transition-colors"
                      title="Send to Backlog"
                    >
                      → Backlog
                    </button>
                  )}

                  <button
                    onClick={() => setEditingTask(task)}
                    className="p-1.5 text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 rounded-md transition-colors flex items-center gap-1 text-xs"
                    title="Edit Task Details"
                    aria-label="Edit Task"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-md transition-colors"
                    title="Delete Task"
                    aria-label="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultCategory={activeTab}
        defaultSubjectId={selectedSubjectFilter !== 'all' ? selectedSubjectFilter : undefined}
      />

      <EditTaskModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask}
      />
    </div>
  );
};
