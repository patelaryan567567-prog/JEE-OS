import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Flame,
  Zap,
  Timer,
  Bell,
  Sparkles,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Menu,
  X,
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { state, setActiveView, activeView, exportBackupJSON, importBackupJSON, resetDataToDefault } = useApp();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [backupJsonInput, setBackupJsonInput] = useState('');

  const { userStats } = state;
  const nextLevelXp = Math.pow(userStats.level, 2) * 80;
  const currentLevelBaseXp = Math.pow(userStats.level - 1, 2) * 80;
  const levelProgress = Math.min(
    100,
    Math.max(0, Math.round(((userStats.totalXp - currentLevelBaseXp) / Math.max(1, nextLevelXp - currentLevelBaseXp)) * 100))
  );

  const activeRemindersCount = state.reminders.filter((r) => !r.completed).length;

  const handleExport = () => {
    const json = exportBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyOS-Backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async () => {
    if (!backupJsonInput.trim()) return;
    const ok = await importBackupJSON(backupJsonInput);
    if (ok) {
      setShowSettingsModal(false);
      setBackupJsonInput('');
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'timer':
        return 'Focus & Study Timer';
      case 'tasks':
        return 'Study Tasks & Queue';
      case 'lectures':
        return 'Lecture Syllabus Tracker';
      case 'practice':
        return 'Module & Question Practice';
      case 'subjects':
        return 'Subjects Deep Dive';
      case 'backlog':
        return 'Backlog Recovery System';
      case 'analytics':
        return 'Performance Analytics';
      case 'reminders':
        return 'Reminders & Schedule';
      case 'ai-chat':
        return 'StudyOS Brain (AI Agent)';
      case 'settings':
        return 'Workspace Settings & Data';
      default:
        return 'StudyOS';
    }
  };

  return (
    <>
      <header className="h-14 border-b border-neutral-800 bg-neutral-950 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        {/* Zone 1: Mobile toggle & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-1.5 text-neutral-400 hover:text-neutral-100 rounded-md hover:bg-neutral-800/60"
            aria-label="Toggle navigation menu"
          >
            {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-baseline gap-2">
            <span 
              style={{
                fontFamily: 'Times New Roman',
                fontSize: '20px',
                lineHeight: '36px',
                paddingLeft: '-5px',
                paddingRight: '2px',
                paddingTop: '3px',
                paddingBottom: '1px',
                marginLeft: '-20px',
                marginRight: '-3px',
                marginTop: '0px',
                marginBottom: '8px'
              }}
              className="text-lg font-bold tracking-tight text-neutral-100 font-sans"
            >
              StudyOS
            </span>
            <span 
              style={{
                paddingLeft: '0px',
                paddingTop: '2px',
                paddingBottom: '1px',
                marginLeft: '-1px',
                marginRight: '5px',
                marginTop: '0px',
                marginBottom: '-2px'
              }}
              className="hidden sm:inline-block text-xs font-mono text-neutral-400"
            >
              JEE Workspace
            </span>
          </div>
        </div>

        {/* Zone 2: Context Title & Breadcrumb */}
        <div className="hidden md:flex items-center gap-2 text-xs text-neutral-400 font-medium">
          <span 
            style={{
              paddingBottom: '0px',
              marginLeft: '2px',
              marginRight: '-7px',
              fontSize: '0px'
            }}
            className="text-neutral-500"
          >
            Workspace
          </span>
          <span 
            style={{ fontSize: '0px', lineHeight: '0px' }}
            className="text-neutral-600"
          >
            /
          </span>
          <span 
            style={{
              fontSize: '14px',
              fontWeight: 'bold',
              textDecorationLine: 'none',
              fontFamily: 'Georgia'
            }}
            className="text-neutral-200"
          >
            {getViewTitle()}
          </span>
        </div>

        {/* Zone 3: Gamification Indicators & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Streak indicator */}
          <div
            title={`${userStats.currentStreak}-day consecutive study streak`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs font-medium text-amber-400"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span className="font-mono tabular-nums font-semibold">{userStats.currentStreak}d</span>
          </div>

          {/* XP & Level Indicator */}
          <div
            title={`Level ${userStats.level} (${userStats.totalXp} XP)`}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-xs"
          >
            <div className="flex items-center gap-1 text-purple-400 font-medium">
              <Zap className="w-3.5 h-3.5" />
              <span>Lvl {userStats.level}</span>
            </div>
            <div className="w-14 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-neutral-400 text-[11px]">
              {userStats.totalXp} XP
            </span>
          </div>

          {/* Quick AI Brain Button */}
          {activeView !== 'ai-chat' && (
            <button
              onClick={() => setActiveView('ai-chat')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-purple-300 bg-purple-950/60 border border-purple-800/60 rounded-md hover:bg-purple-900/60 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          )}

          {/* Quick Focus Button */}
          {activeView !== 'timer' && (
            <button
              onClick={() => setActiveView('timer')}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-800/60 rounded-md hover:bg-emerald-900/60 transition-colors"
            >
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Focus</span>
            </button>
          )}

          {/* Reminders trigger */}
          <button
            onClick={() => setActiveView('reminders')}
            className="relative p-1.5 text-neutral-400 hover:text-neutral-100 rounded-md hover:bg-neutral-800/60 transition-colors"
            title="Reminders"
            aria-label="View reminders"
          >
            <Bell className="w-4 h-4" />
            {activeRemindersCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* Settings / Data button */}
          <button
            onClick={() => setActiveView('settings')}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 rounded-md hover:bg-neutral-800/60 transition-colors"
            title="Workspace Settings & Data"
            aria-label="Workspace Settings & Data"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Database / Backup Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-semibold text-neutral-100">Workspace Data & Backup</h3>
                <p className="text-xs text-neutral-400">IndexedDB local database with JSON sync</p>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-neutral-400 hover:text-neutral-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  Export Data (JSON)
                </button>
                <button
                  onClick={resetDataToDefault}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 text-xs font-medium text-red-300 transition-colors"
                  title="Resets database to default JEE syllabus"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Defaults
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-neutral-800">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  Restore / Import Backup JSON
                </label>
                <textarea
                  value={backupJsonInput}
                  onChange={(e) => setBackupJsonInput(e.target.value)}
                  placeholder="Paste your exported StudyOS JSON here to restore..."
                  rows={4}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-300 focus:outline-none focus:border-amber-500/80"
                />
                <button
                  onClick={handleImportSubmit}
                  disabled={!backupJsonInput.trim()}
                  className="w-full py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
                >
                  Confirm Restore Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
