import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Brain, Activity, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, Sliders, Server, Cpu } from 'lucide-react';
import { AISettings } from '../../types';

interface APISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODELS = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Recommended',
    desc: 'High-speed reasoning, multi-turn tool execution, and JEE problem structuring.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra Fast',
    desc: 'Lowest latency for instant natural-language task creation and rescheduling.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Latest)',
    tag: 'Stable Alias',
    desc: 'Automatically tracks the latest general-availability Flash release.',
  },
];

const PERSONAS: Array<{ id: AISettings['persona']; name: string; desc: string }> = [
  {
    id: 'strategist',
    name: 'Tactical JEE Strategist',
    desc: 'Maintains 1:1:1 PCM balance, focuses on high-weightage exam topics, and targets backlogs.',
  },
  {
    id: 'coach',
    name: 'Strict Discipline Coach',
    desc: 'Uncompromising focus on completing daily 6-hour targets and clearing zero backlogs.',
  },
  {
    id: 'tutor',
    name: 'Patient Concept Tutor',
    desc: 'Provides step-by-step conceptual guidance, formula tips, and motivating advice.',
  },
];

export const APISettingsModal: React.FC<APISettingsModalProps> = ({ isOpen, onClose }) => {
  const { aiSettings, updateAISettings } = useApp();

  const [selectedModel, setSelectedModel] = useState(aiSettings.model || 'gemini-3.8-flash');
  const [selectedPersona, setSelectedPersona] = useState<AISettings['persona']>(
    aiSettings.persona || 'strategist'
  );
  const [apiKey, setApiKey] = useState(aiSettings.apiKey || '');

  const [diagnosticStatus, setDiagnosticStatus] = useState<{
    loading: boolean;
    result?: { success: boolean; message: string; latencyMs?: number };
  }>({ loading: false });

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setDiagnosticStatus({ loading: true });
    const startTime = performance.now();
    try {
      const res = await fetch('/api/health');
      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (res.ok) {
        const data = await res.json();
        setDiagnosticStatus({
          loading: false,
          result: {
            success: true,
            message: `API proxy online (${latencyMs}ms). Active engine: ${data.model || selectedModel}`,
            latencyMs,
          },
        });
      } else {
        setDiagnosticStatus({
          loading: false,
          result: {
            success: false,
            message: `Server returned HTTP ${res.status}`,
          },
        });
      }
    } catch (err: any) {
      setDiagnosticStatus({
        loading: false,
        result: {
          success: false,
          message: err.message || 'Unable to reach StudyOS API backend',
        },
      });
    }
  };

  const handleSave = () => {
    updateAISettings({
      model: selectedModel,
      persona: selectedPersona,
      apiKey: apiKey.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-neutral-100">
                  StudyOS AI & API Settings
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-300">
                  Live
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Configure your Gemini API key, model engine preferences, and response persona.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gemini API Key Management Card */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-neutral-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Gemini API Key (Add / Change)
            </label>
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-medium"
            >
              Get Key from Google AI Studio →
            </a>
          </div>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy... (Enter your custom Gemini API key)"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500 placeholder-neutral-600"
          />

          <p className="text-[11px] text-neutral-400 leading-relaxed">
            You can add, edit, or change your Gemini API key at any time. Need a key? Visit{' '}
            <a
              href="https://aistudio.google.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 underline font-mono"
            >
              https://aistudio.google.com/api-keys
            </a>
            .
          </p>
        </div>

        {/* API Health & Backend Status Card */}
        <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-300 font-semibold">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Backend API Status</span>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={diagnosticStatus.loading}
              className="px-2.5 py-1 text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-200 rounded-md transition-colors flex items-center gap-1.5"
            >
              <Activity className="w-3 h-3 text-purple-400" />
              {diagnosticStatus.loading ? 'Pinging API...' : 'Test Connection'}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
            <span>Route: <strong className="text-neutral-300">/api/chat</strong></span>
            <span className="text-emerald-400">Secure Proxy Active</span>
          </div>

          {diagnosticStatus.result && (
            <div
              className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                diagnosticStatus.result.success
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/40 text-rose-300'
              }`}
            >
              {diagnosticStatus.result.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{diagnosticStatus.result.message}</span>
            </div>
          )}
        </div>

        {/* Model Engine Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            AI Model Engine
          </label>
          <div className="space-y-2">
            {MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
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

        {/* Persona Selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            AI Mentorship Persona
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PERSONAS.map((p) => {
              const isSelected = selectedPersona === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPersona(p.id)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-950/30 border-amber-500/80 text-neutral-100'
                      : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="font-semibold text-neutral-200 block mb-1">{p.name}</span>
                  <p className="text-[10px] text-neutral-400 line-clamp-3">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security & Token Guarantee */}
        <div className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-neutral-300">Secure API Key Management:</span>{' '}
            Your Gemini API key is securely stored in your local storage and used directly for AI interactions and tool calls.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-neutral-100 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-md transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
