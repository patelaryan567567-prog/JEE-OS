import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Brain,
  Timer,
  CheckSquare,
  PlaySquare,
  BookOpen,
  Layers,
  AlertCircle,
  BarChart3,
  Bell,
  Settings,
  Atom,
  FlaskConical,
  Pi,
  Pencil,
  Target,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ExamTargetModal } from '../modals/ExamTargetModal';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const {
    activeView,
    setActiveView,
    setSelectedSubjectId,
    state,
    generatingChatIds,
  } = useApp();

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);

  const handleNav = (view: string, subjectId?: string) => {
    setActiveView(view);
    if (subjectId !== undefined) {
      setSelectedSubjectId(subjectId);
    }
    if (onClose) onClose();
  };

  // Compute pending backlog count
  const pendingBacklogsCount = state.tasks.filter((t) => t.category === 'backlog').length +
    state.lectures.filter((l) => l.status === 'not_started').length;

  const todayTasksPending = state.tasks.filter((t) => t.category === 'today').length;

  const isAiThinking = (generatingChatIds || []).length > 0;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'ai-chat',
      label: 'StudyOS Brain',
      icon: Brain,
      badge: isAiThinking ? 'Thinking...' : 'AI',
      badgeColor: isAiThinking
        ? 'text-amber-300 bg-amber-950/80 border-amber-500/60 animate-pulse'
        : 'text-purple-300 bg-purple-950/60 border-purple-800/40',
      iconColor: isAiThinking ? 'text-amber-400 animate-pulse' : 'text-purple-400',
    },
    { id: 'timer', label: 'Study Timer', icon: Timer },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      badge: todayTasksPending > 0 ? `${todayTasksPending}` : undefined,
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/40',
    },
    { id: 'lectures', label: 'Lectures', icon: PlaySquare },
    { id: 'practice', label: 'Question Practice', icon: BookOpen },
    {
      id: 'backlog',
      label: 'Backlogs',
      icon: AlertCircle,
      badge: pendingBacklogsCount > 0 ? `${pendingBacklogsCount}` : undefined,
      badgeColor: 'text-rose-400 bg-rose-950/60 border-rose-800/40',
    },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'reminders', label: 'Reminders', icon: Bell },
    {
      id: 'settings',
      label: 'AI & API Settings',
      icon: Settings,
      badge: 'API',
      badgeColor: 'text-purple-300 bg-purple-950/60 border-purple-800/40',
    },
  ];

  const subjects = [
    { id: 'subj-phy', name: 'Physics', icon: Atom, color: 'text-cyan-400', border: 'border-cyan-500/30' },
    { id: 'subj-chem', name: 'Chemistry', icon: FlaskConical, color: 'text-emerald-400', border: 'border-emerald-500/30' },
    { id: 'subj-math', name: 'Mathematics', icon: Pi, color: 'text-amber-400', border: 'border-amber-500/30' },
  ];

  // Exam target values & dynamic countdown
  const examTarget = state.userStats.examTarget || {
    examName: 'JEE Mains 2026 Target',
    sessionName: 'Session 1',
    examDate: '2026-01-24',
    targetSyllabusPercent: 100,
  };

  const calculateDaysLeft = (dateStr: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(dateStr);
      target.setHours(0, 0, 0, 0);
      const diff = target.getTime() - today.getTime();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const daysLeft = calculateDaysLeft(examTarget.examDate);
  const totalChapters = state.chapters.length;
  const coveredChapters = state.chapters.filter((c) => c.revisionStatus !== 'Not Started').length;
  const actualCoveredPercent = totalChapters > 0 ? Math.round((coveredChapters / totalChapters) * 100) : 0;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 h-screen bg-neutral-950 border-r border-neutral-800/80 flex flex-col z-40 transition-all duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-16' : 'md:w-64 w-64'}`}
      >
        {/* Workspace Brand Lockup */}
        <div 
          style={{ paddingLeft: '2px', paddingTop: '1px', paddingBottom: '1px', paddingRight: '0px', marginLeft: '1px', marginRight: '0px', marginTop: '0px', marginBottom: '0px' }}
          className="h-14 px-3.5 flex items-center justify-between border-b border-neutral-800/80 shrink-0"
        >
          <div 
            style={{ paddingLeft: '0px', paddingRight: '0px', paddingBottom: '0px' }}
            className="flex items-center gap-2.5 overflow-hidden"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-950/50 shrink-0">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <div className="text-sm font-bold tracking-tight text-neutral-100 flex items-center gap-1.5">
                  StudyOS
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-neutral-800 text-neutral-400 rounded">
                    JEE
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 truncate">Focus Desk</div>
              </div>
            )}
          </div>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors hidden md:flex shrink-0"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Main Navigation Scroll Area */}
        <div className={`flex-1 overflow-y-auto min-h-0 py-4 space-y-6 ${isCollapsed ? 'px-2' : 'px-3'}`}>
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Core
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : (item as any).iconColor || 'text-neutral-400'}`} />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Subjects Section */}
          {!isCollapsed && (
            <div className="space-y-1">
              <div className="px-3 pb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <span>Subjects</span>
                <button
                  onClick={() => handleNav('subjects', undefined)}
                  className="hover:text-neutral-300 normal-case font-normal text-[11px]"
                >
                  All
                </button>
              </div>
              {subjects.map((sub) => {
                const Icon = sub.icon;
                const isActive = activeView === 'subjects' && state.subjects.find((s) => s.id === sub.id);
                return (
                  <button
                    key={sub.id}
                    onClick={() => handleNav('subjects', sub.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-neutral-800/90 text-neutral-100'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${sub.color}`} />
                      <span>{sub.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      {state.chapters.filter((c) => c.subjectId === sub.id).length} ch
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info: Customizable target exam countdown */}
        {!isCollapsed && (
          <div className="p-3 border-t border-neutral-800/80 bg-neutral-950 shrink-0">
            <div
              onClick={() => setIsExamModalOpen(true)}
              className="p-2.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800/90 hover:border-amber-500/50 cursor-pointer transition-all group shadow-sm"
              title="Click to customize target exam, countdown date & syllabus goal"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Exam Countdown</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-amber-400 font-bold bg-amber-950/60 border border-amber-900/40 px-1.5 py-0.2 rounded text-[10px]">
                    {daysLeft}d left
                  </span>
                  <Pencil className="w-3 h-3 text-neutral-500 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>

              <div className="mt-1 flex items-baseline justify-between text-[11px]">
                <span className="text-neutral-300 font-medium truncate max-w-[130px]" title={examTarget.examName}>
                  {examTarget.examName}
                </span>
                <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                  {examTarget.sessionName}
                </span>
              </div>

              {/* Syllabus progress bar & percentage */}
              <div className="mt-2 space-y-1 border-t border-neutral-800 pt-1.5">
                <div className="flex items-center justify-between text-[10px] text-neutral-400">
                  <span>Syllabus Covered</span>
                  <span className="font-mono tabular-nums text-neutral-200 font-semibold">
                    {actualCoveredPercent}% <span className="text-amber-400 font-medium">/ {examTarget.targetSyllabusPercent}% target</span>
                  </span>
                </div>
                <div className="w-full h-1 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, actualCoveredPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      </aside>

      {/* Target Exam Configuration Modal */}
      <ExamTargetModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
      />
    </>
  );
};
