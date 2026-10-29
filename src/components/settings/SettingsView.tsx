import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Brain,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Server,
  Layers,
  ShieldCheck,
  Zap,
  Activity,
  Bot,
  Terminal,
  Target,
  Pencil,
  Calendar,
  Cpu,
  Sliders,
  GraduationCap,
} from 'lucide-react';
import {
  generateBackupData,
  downloadBackupFile,
  validateAndParseBackup,
  BackupValidationResult,
} from '../../services/backupService';
import { ExamTargetModal } from '../modals/ExamTargetModal';

const MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Recommended',
    desc: 'High-speed reasoning, deep JEE problem structuring, and multi-turn actions.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra Fast',
    desc: 'Lightweight and lowest latency for instant task creation and updates.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Latest)',
    tag: 'Stable Alias',
    desc: 'Continuously updated alias tracking current stable Flash release.',
  },
];

const PERSONAS = [
  {
    id: 'strategist' as const,
    name: 'Tactical JEE Strategist',
    desc: '1:1:1 PCM balance, focuses on high-weightage chapters and active backlogs.',
  },
  {
    id: 'coach' as const,
    name: 'Strict Discipline Coach',
    desc: 'Uncompromising drive toward daily 6-hour goals and zero backlogs.',
  },
  {
    id: 'tutor' as const,
    name: 'Patient Concept Tutor',
    desc: 'Step-by-step guidance on complex physics & math derivations.',
  },
];

export const SettingsView: React.FC = () => {
  const {
    state,
    resetDataToDefault,
    restoreBackup,
    requestDestructiveConfirmation,
    aiSettings,
    updateAISettings,
    updateStudentClassScope,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ai' | 'data'>('ai');
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);

  // AI Diagnostic status
  const [diagnosticStatus, setDiagnosticStatus] = useState<{
    loading: boolean;
    result?: { success: boolean; message: string; details?: string };
  }>({ loading: false });

  // Data Management state
  const [importText, setImportText] = useState('');
  const [validationResult, setValidationResult] = useState<BackupValidationResult | null>(null);

  // Exam target calculation
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
      return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const daysLeft = calculateDaysLeft(examTarget.examDate);
  const totalChapters = state.chapters.length;
  const startedChapters = state.chapters.filter((c) => c.revisionStatus !== 'Not Started').length;
  const actualCoveredPercent = totalChapters > 0 ? Math.round((startedChapters / totalChapters) * 100) : 0;

  // Backup summary
  const backupSummary = {
    tasksCount: state.tasks.length,
    lecturesCount: state.lectures.length,
    chaptersCount: state.chapters.length,
    sessionsCount: state.sessions.length,
    practicesCount: state.modulePractices.length,
    remindersCount: state.reminders.length,
    totalXp: state.userStats.totalXp,
  };

  const handleTestHealth = async () => {
    setDiagnosticStatus({ loading: true });
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setDiagnosticStatus({
          loading: false,
          result: {
            success: true,
            message: 'StudyOS AI Brain Engine is fully operational.',
            details: `Model: ${data.model || aiSettings.model} • Server Proxy Active • Direct App Control Ready`,
          },
        });
      } else {
        setDiagnosticStatus({
          loading: false,
          result: {
            success: false,
            message: `Server returned HTTP ${res.status}`,
            details: 'Could not reach backend health check endpoint.',
          },
        });
      }
    } catch (err: any) {
      setDiagnosticStatus({
        loading: false,
        result: {
          success: false,
          message: 'Unable to connect to StudyOS backend server.',
          details: err.message || 'Network error',
        },
      });
    }
  };

  // Export handler
  const handleExportBackup = () => {
    const backup = generateBackupData(state);
    downloadBackupFile(backup);
  };

  // File Upload Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      const val = validateAndParseBackup(content);
      setValidationResult(val);
    };
    reader.readAsText(file);
  };

  const handleValidateManualText = () => {
    if (!importText.trim()) return;
    const val = validateAndParseBackup(importText);
    setValidationResult(val);
  };

  const handleExecuteRestore = (mode: 'replace' | 'merge') => {
    if (!validationResult || !validationResult.backup) return;

    if (mode === 'replace') {
      requestDestructiveConfirmation({
        id: 'replace-db',
        title: 'Replace Entire StudyOS Database?',
        description: `Importing this backup will replace all ${state.tasks.length} tasks and ${state.chapters.length} chapters currently in StudyOS with the backup data (${validationResult.backup.data.tasks.length} tasks). This action cannot be undone.`,
        actionName: 'Replace All Data',
        itemCount: state.tasks.length + state.chapters.length,
        execute: async () => {
          await restoreBackup(validationResult.backup!, 'replace');
          setValidationResult(null);
          setImportText('');
        },
      });
    } else {
      restoreBackup(validationResult.backup, 'merge');
      setValidationResult(null);
      setImportText('');
    }
  };

  const handleResetToDefault = () => {
    requestDestructiveConfirmation({
      id: 'reset-defaults',
      title: 'Reset StudyOS to Default Syllabus?',
      description:
        'This will reset all your tasks, logs, and custom progress back to the default clean JEE syllabus (Class 11 & 12).',
      actionName: 'Reset to Defaults',
      itemCount: state.tasks.length + state.chapters.length,
      execute: async () => {
        await resetDataToDefault();
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2">
            Workspace Settings & Data
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure AI Brain API settings, customize your exam target countdown, and manage backups.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            AI & API Settings
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'bg-neutral-800 text-neutral-100 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            Exam Target & Data
          </button>
        </div>
      </div>

      {/* TAB 1: AI & API SETTINGS */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Status & Engine Overview Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  StudyOS AI Brain Engine & API Proxy
                </h3>
                <p className="text-xs text-neutral-400 mt-1 max-w-xl leading-relaxed">
                  StudyOS is powered by Google Gemini through a high-performance server proxy endpoint (<code className="text-neutral-300 font-mono">/api/chat</code>). The model has full, real-time context of your local tasks, lectures, backlogs, and exam goals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-xs text-emerald-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Server Proxy Connected
                </div>
              </div>
            </div>

            {/* Architecture Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">Active Model</span>
                <div className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  {aiSettings.model || 'gemini-3.8-flash'}
                </div>
                <p className="text-[11px] text-neutral-400">High-speed reasoning & function calling</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">API Architecture</span>
                <div className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  Local Proxy (/api/chat)
                </div>
                <p className="text-[11px] text-neutral-400">Environment-managed credentials</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold block">Safety Guardrails</span>
                <div className="text-sm font-bold text-neutral-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Confirmation Safeguard
                </div>
                <p className="text-[11px] text-neutral-400">Destructive actions require confirmation</p>
              </div>
            </div>

            {/* Diagnostics & Connection Test */}
            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-neutral-800">
              <div className="text-xs text-neutral-400">
                Verify server proxy routes and Gemini engine communication.
              </div>
              <button
                onClick={handleTestHealth}
                disabled={diagnosticStatus.loading}
                className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 font-semibold text-xs rounded-lg transition-colors flex items-center gap-2"
              >
                <Activity className="w-3.5 h-3.5 text-purple-400" />
                {diagnosticStatus.loading ? 'Checking Engine...' : 'Run Diagnostics'}
              </button>
            </div>

            {diagnosticStatus.result && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  diagnosticStatus.result.success
                    ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                    : 'bg-rose-950/30 border-rose-800/40 text-rose-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {diagnosticStatus.result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{diagnosticStatus.result.message}</span>
                </div>
                {diagnosticStatus.result.details && (
                  <p className="text-[11px] opacity-80 pl-6 font-mono">
                    {diagnosticStatus.result.details}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Model Selection Preferences Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              Gemini Model Configuration
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODELS.map((m) => {
                const isSelected = (aiSettings.model || 'gemini-3.8-flash') === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => updateAISettings({ model: m.id })}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/30 border-purple-500/80 text-neutral-100 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-neutral-100">{m.name}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-neutral-800 text-neutral-400'
                        }`}
                      >
                        {m.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Persona Style Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              AI Mentorship Persona
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PERSONAS.map((p) => {
                const isSelected = (aiSettings.persona || 'strategist') === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => updateAISettings({ persona: p.id })}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-950/30 border-amber-500/80 text-neutral-100 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="font-semibold text-neutral-200 block mb-1">{p.name}</span>
                    <p className="text-[11px] text-neutral-400 leading-relaxed">{p.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXAM TARGET & DATA MANAGEMENT */}
      {activeTab === 'data' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Target Exam & Countdown Customization Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  Target Exam & Countdown Settings
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Customize the exam countdown shown in your sidebar, set target dates, and establish syllabus coverage milestones.
                </p>
              </div>

              <button
                onClick={() => setIsExamModalOpen(true)}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Pencil className="w-3.5 h-3.5" />
                Customize Target Syllabus & Exam
              </button>
            </div>

            {/* Current Target Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-500 font-semibold">Target Exam</span>
                <div className="text-sm font-bold text-neutral-100 truncate">
                  {examTarget.examName}
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">{examTarget.sessionName}</span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-500 font-semibold">Exam Date</span>
                <div className="text-sm font-bold text-neutral-100 font-mono">
                  {examTarget.examDate}
                </div>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">{daysLeft} Days Left</span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-500 font-semibold">Current Coverage</span>
                <div className="text-sm font-bold text-neutral-100 font-mono">
                  {actualCoveredPercent}%
                </div>
                <span className="text-[10px] text-neutral-400">{startedChapters} / {totalChapters} chapters</span>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                <span className="text-[11px] text-neutral-500 font-semibold">Target Goal</span>
                <div className="text-sm font-bold text-amber-400 font-mono">
                  {examTarget.targetSyllabusPercent}%
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">Syllabus Goal</span>
              </div>
            </div>
          </div>

          {/* Student Class & Syllabus Scope Selection Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Student Class & Syllabus Scope Selection
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Select whether you are studying Class 11th, Class 12th, or Combined (Both). This dynamically scopes chapters across Physics, Chemistry, and Mathematics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: '11' as const, title: 'Class 11th JEE', desc: 'Physics, Chemistry & Math Class 11 Chapters', icon: GraduationCap },
                { id: '12' as const, title: 'Class 12th JEE', desc: 'Physics, Chemistry & Math Class 12 Chapters', icon: Sparkles },
                { id: 'combined' as const, title: 'Combined (11th & 12th)', desc: 'Full 2-Year JEE Syllabus (All Chapters)', icon: Target },
              ].map((scope) => {
                const currentScope = state.userStats.studentClassScope || 'combined';
                const isSelected = currentScope === scope.id;
                const Icon = scope.icon;
                return (
                  <button
                    key={scope.id}
                    onClick={() => updateStudentClassScope(scope.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-neutral-800/90 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                        {isSelected && (
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-950/60 text-amber-300 border border-amber-800/40 rounded-full font-semibold">
                            Active Scope
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-neutral-100">{scope.title}</div>
                      <p className="text-[11px] text-neutral-400">{scope.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Data Summary Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Export StudyOS Backup (.studyos)
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Generate a complete, versioned snapshot of your StudyOS database.
                </p>
              </div>

              <button
                onClick={handleExportBackup}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export Backup File
              </button>
            </div>

            {/* Current Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-500">Tasks</span>
                <div className="text-lg font-bold font-mono text-neutral-200">
                  {backupSummary.tasksCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-500">Lectures</span>
                <div className="text-lg font-bold font-mono text-neutral-200">
                  {backupSummary.lecturesCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-500">Chapters</span>
                <div className="text-lg font-bold font-mono text-neutral-200">
                  {backupSummary.chaptersCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
                <span className="text-[11px] text-neutral-500">Study Sessions</span>
                <div className="text-lg font-bold font-mono text-neutral-200">
                  {backupSummary.sessionsCount}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 border-t border-neutral-800/80 pt-2">
              Note: All user subjects, chapters, questions, target exams, XP, and streak logs are preserved in backups.
            </p>
          </div>

          {/* Import Backup Card */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                Import / Restore Backup
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Restore a backup file from another device or prior session.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-lg border border-neutral-700/80 transition-colors flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Select .studyos or .json file
                  <input
                    type="file"
                    accept=".studyos,.json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-neutral-500">or paste JSON below</span>
              </div>

              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setValidationResult(null);
                }}
                placeholder="Paste StudyOS backup JSON content here..."
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-neutral-300 focus:outline-none focus:border-emerald-500/80"
              />

              {!validationResult && importText.trim() && (
                <button
                  onClick={handleValidateManualText}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium rounded-lg"
                >
                  Verify Backup
                </button>
              )}

              {/* Validation Feedback & Action Choices */}
              {validationResult && (
                <div
                  className={`p-4 rounded-xl border space-y-3 ${
                    validationResult.valid
                      ? 'bg-emerald-950/20 border-emerald-800/60'
                      : 'bg-rose-950/20 border-rose-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {validationResult.valid ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-300">
                          Valid StudyOS Backup (Version {validationResult.version})
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span className="text-rose-300">{validationResult.error}</span>
                      </>
                    )}
                  </div>

                  {validationResult.valid && validationResult.backup && (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono text-neutral-300 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
                        <div>Tasks: {validationResult.backup.data.tasks.length}</div>
                        <div>Chapters: {validationResult.backup.data.chapters.length}</div>
                        <div>Lectures: {validationResult.backup.data.lectures.length}</div>
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          onClick={() => handleExecuteRestore('merge')}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Merge with Existing Data
                        </button>
                        <button
                          onClick={() => handleExecuteRestore('replace')}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                        >
                          Replace Existing Data
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Reset Workspace to Default JEE Syllabus */}
          <div className="p-6 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  Reset to Default JEE Syllabus
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Re-initializes all Physics, Chemistry, and Math chapters to their default pristine syllabus state.
                </p>
              </div>

              <button
                onClick={handleResetToDefault}
                className="px-3.5 py-2 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Target Exam Configuration Modal */}
      <ExamTargetModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
      />
    </div>
  );
};
