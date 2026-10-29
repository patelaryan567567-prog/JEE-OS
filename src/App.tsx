/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { StudyTimerView } from './components/timer/StudyTimerView';
import { TasksView } from './components/tasks/TasksView';
import { LectureTrackerView } from './components/lectures/LectureTrackerView';
import { QuestionPracticeView } from './components/practice/QuestionPracticeView';
import { SubjectsView } from './components/subjects/SubjectsView';
import { BacklogView } from './components/backlog/BacklogView';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { RemindersView } from './components/reminders/RemindersView';
import { AIChatView } from './components/chat/AIChatView';
import { SettingsView } from './components/settings/SettingsView';
import { ConfirmationModal } from './components/modals/ConfirmationModal';
import { ToastContainer } from './components/common/ToastContainer';
import { AISmartNudgeBanner } from './components/common/AISmartNudgeBanner';
import { soundEffects } from './utils/soundEffects';

const MainLayout: React.FC = () => {
  const { activeView, loading } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Global satisfying UI micro-interaction click sound across all buttons in the entire app
  React.useEffect(() => {
    let lastClickTime = 0;
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const clickable = target.closest('button, [role="button"], a, input[type="checkbox"], input[type="radio"], select, [tabindex="0"]');
      if (clickable) {
        const now = Date.now();
        // Prevent double triggers if bubbling
        if (now - lastClickTime > 75) {
          lastClickTime = now;
          soundEffects.playSoftClick();
        }
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <div className="text-sm font-medium text-neutral-400 font-mono">
          Initializing StudyOS Database...
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'timer':
        return <StudyTimerView />;
      case 'tasks':
        return <TasksView />;
      case 'lectures':
        return <LectureTrackerView />;
      case 'practice':
        return <QuestionPracticeView />;
      case 'subjects':
        return <SubjectsView />;
      case 'backlog':
        return <BacklogView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'reminders':
        return <RemindersView />;
      case 'ai-chat':
        return <AIChatView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col md:flex-row antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className={`flex-1 min-h-0 ${activeView === 'ai-chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-16'}`}>
          {renderActiveView()}
        </main>
      </div>

      {/* Confirmation Modal for Destructive Actions */}
      <ConfirmationModal />

      {/* AI Smart Proactive Reminders & Nudges */}
      <AISmartNudgeBanner />

      {/* Global Notifications and Badges Toast */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
