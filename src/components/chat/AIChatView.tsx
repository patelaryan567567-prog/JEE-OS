import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Brain,
  Send,
  Square,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ArrowRight,
  Target,
  Sliders,
  Plus,
  Edit2,
  Check,
  X,
  Flame,
  Zap,
  Copy,
  MessageSquare,
  Loader2,
  Image as ImageIcon,
  FileText,
  Pencil,
  Paperclip,
  Upload,
  Maximize2,
  Eye,
  FileUp,
  Volume2,
  VolumeX,
  Code,
  File,
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import { WhiteboardModal } from './WhiteboardModal';
import { APISettingsModal } from '../modals/APISettingsModal';
import { ExamTargetModal } from '../modals/ExamTargetModal';
import { ChatAttachment } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

const SUGGESTED_PROMPTS = [
  {
    title: 'How do I change my target syllabus and countdown?',
    description: 'Explains how to customize your syllabus percentage, target chapters, and exam dates',
    badge: 'Exam Target',
  },
  {
    title: 'Change my target syllabus to 85%',
    description: 'Directly updates your StudyOS syllabus goal milestone to 85%',
    badge: 'App Action',
  },
  {
    title: 'What should I study today?',
    description: 'Inspects your backlog, today’s queue, and revision needs to create a plan',
    badge: 'Daily Strategy',
  },
  {
    title: 'What is my biggest backlog?',
    description: 'Pinpoints uncompleted lectures, pending tasks, and weak chapters across subjects',
    badge: 'Backlog Audit',
  },
  {
    title: 'How much Physics is left to finish?',
    description: 'Calculates exact syllabus coverage and unstarted chapters from local database',
    badge: 'Syllabus Calc',
  },
  {
    title: 'Add a task to complete 40 Physics module questions from NLM tomorrow',
    description: 'Creates a scheduled practice task linked to Newton’s Laws of Motion',
    badge: 'App Action',
  },
  {
    title: 'Move all unfinished tasks from today to tomorrow',
    description: 'Automatically shifts all overdue today items to upcoming tomorrow queue',
    badge: 'Reschedule',
  },
  {
    title: 'Open API Settings and check model status',
    description: 'Configure Gemini models (Flash 3.8 / 3.1 Lite) and test server proxy health',
    badge: 'API Settings',
  },
];

const QUICK_CHIPS = [
  'Change my target syllabus to 85%',
  'What should I study today?',
  'Target syllabus kaise change kare?',
  'What is my biggest backlog?',
  'How much Physics is left?',
  'Move all unfinished tasks from today to tomorrow',
  'Check my question practice accuracy',
];

export const AIChatView: React.FC = () => {
  const {
    state,
    chatConversations,
    activeChatId,
    generatingChatIds,
    setActiveChatId,
    createNewChat,
    deleteChatConversation,
    renameChatConversation,
    clearChatHistory,
    sendChatMessage,
    stopChatGeneration,
    aiSettings,
    updateAISettings,
  } = useApp();

  const [input, setInput] = useState('');
  const [brainApiKeyInput, setBrainApiKeyInput] = useState(aiSettings.apiKey || '');
  const [showApiKeyTab, setShowApiKeyTab] = useState(!aiSettings.apiKey);
  const [isApiSettingsOpen, setIsApiSettingsOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundEffects.isMuted());

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Active conversation details
  const currentConv = (chatConversations || []).find((c) => c.id === activeChatId) ||
    chatConversations?.[0] || {
      id: 'conv-1',
      title: 'StudyOS Brain Session',
      createdAt: new Date().toISOString(),
      messages: [],
    };

  const currentMessages = currentConv.messages || [];
  const isCurrentChatGenerating = generatingChatIds.includes(currentConv.id);

  // Satisfying sound chime when AI completes generating a solution
  const prevGeneratingRef = useRef(isCurrentChatGenerating);
  useEffect(() => {
    if (prevGeneratingRef.current && !isCurrentChatGenerating) {
      soundEffects.playSparkle();
    }
    prevGeneratingRef.current = isCurrentChatGenerating;
  }, [isCurrentChatGenerating]);

  const toggleSound = () => {
    const nextMuted = soundEffects.toggleMute();
    setIsSoundMuted(nextMuted);
  };

  const toggleChatDrawer = () => {
    if (isChatDrawerOpen) {
      soundEffects.playDrawerClose();
    } else {
      soundEffects.playDrawerOpen();
    }
    setIsChatDrawerOpen((prev) => !prev);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages.length, isCurrentChatGenerating, attachments.length]);

  // Close plus menu when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setIsPlusMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Process uploaded file (supports PDF, DOCX, HTML, CSS, Code, and all document/image formats up to 50MB)
  const processFile = (file: File) => {
    if (!file) return;

    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_SIZE) {
      alert(`File "${file.name}" exceeds the 50MB upload limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a file under 50MB.`);
      return;
    }

    const nameLower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || nameLower.endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif'].some((ext) => nameLower.endsWith(ext));
    const isDocx = nameLower.endsWith('.docx') || nameLower.endsWith('.doc') || file.type.includes('wordprocessingml');
    const isCodeOrText =
      ['.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.txt', '.md', '.cpp', '.c', '.h', '.java', '.csv', '.xml', '.sql'].some((ext) => nameLower.endsWith(ext)) ||
      file.type.startsWith('text/') ||
      file.type === 'application/json';

    let attType: 'image' | 'pdf' | 'document' | 'code' = 'document';
    if (isImage) attType = 'image';
    else if (isPdf) attType = 'pdf';
    else if (isCodeOrText) attType = 'code';
    else if (isDocx) attType = 'document';

    // If it's a code or text file (HTML, CSS, JS, etc.), read text directly as well
    if (isCodeOrText) {
      const textReader = new FileReader();
      textReader.onload = () => {
        const textContent = textReader.result as string;
        const dataReader = new FileReader();
        dataReader.onload = () => {
          const dataResult = dataReader.result as string;
          const newAtt: ChatAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            mimeType: file.type || 'text/plain',
            data: dataResult,
            sizeBytes: file.size,
            type: attType,
            textContent,
          };
          setAttachments((prev) => [...prev, newAtt]);
        };
        dataReader.readAsDataURL(file);
      };
      textReader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newAtt: ChatAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          mimeType: file.type || (isPdf ? 'application/pdf' : isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream'),
          data: result,
          previewUrl: isImage ? result : undefined,
          sizeBytes: file.size,
          type: attType,
        };
        setAttachments((prev) => [...prev, newAtt]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image input change
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
    if (e.target) e.target.value = '';
    setIsPlusMenuOpen(false);
  };

  // Handle PDF input change
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
    if (e.target) e.target.value = '';
    setIsPlusMenuOpen(false);
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };

  // Handle Clipboard Paste (e.g. Snipping Tool screenshot paste)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.items) {
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
          }
        }
      }
    }
  };

  // Remove single attachment
  const removeAttachment = (attId: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
  };

  // Handle send message with optional attachments
  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if ((!textToSend && attachments.length === 0) || isCurrentChatGenerating) return;

    soundEffects.playMessageSend();

    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);

    await sendChatMessage(textToSend, currentConv.id, currentAttachments);
  };

  // Handle Stop response
  const handleStop = () => {
    soundEffects.playPop();
    stopChatGeneration(currentConv.id);
  };

  // Handle Whiteboard Sketch attachment
  const handleWhiteboardAttach = async (
    sketchAttachment: ChatAttachment,
    prefilledPrompt?: string
  ) => {
    if (prefilledPrompt) {
      soundEffects.playMessageSend();
      await sendChatMessage(prefilledPrompt, currentConv.id, [sketchAttachment]);
    } else {
      soundEffects.playPop();
      setAttachments((prev) => [...prev, sketchAttachment]);
    }
  };

  // Start renaming a conversation
  const startEditing = (convId: string, currentTitle: string) => {
    soundEffects.playPop();
    setEditingChatId(convId);
    setEditingTitle(currentTitle);
  };

  // Save renamed conversation
  const saveEditing = async () => {
    if (editingChatId && editingTitle.trim()) {
      soundEffects.playPop();
      await renameChatConversation(editingChatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  // Copy full message content
  const handleCopyMessage = (msgId: string, content: string) => {
    soundEffects.playCopied();
    navigator.clipboard.writeText(content);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative flex-1 flex min-h-0 h-full w-full max-w-6xl mx-auto p-2 sm:p-4 gap-3 overflow-hidden select-text"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-purple-950/80 border-2 border-dashed border-purple-400 rounded-2xl flex flex-col items-center justify-center backdrop-blur-xs pointer-events-none space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-900 border border-purple-600 flex items-center justify-center text-purple-200 shadow-xl animate-bounce">
            <Upload className="w-8 h-8" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-bold text-neutral-100">
              Drop Question Screenshot or PDF Here
            </h3>
            <p className="text-xs text-purple-300">
              StudyOS Brain will read the question and provide a step-by-step JEE solution
            </p>
          </div>
        </div>
      )}

      {/* Hidden File Inputs (Accepts Images, PDFs, DOCX, HTML, CSS, Code, and all document types up to 50MB) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageFileChange}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.html,.htm,.css,.js,.jsx,.ts,.tsx,.py,.json,.txt,.md,.cpp,.c,.h,.java,.csv,.xml,.sql,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*"
        multiple
        className="hidden"
        onChange={handlePdfFileChange}
      />

      {/* Conversations Drawer (Normally CLOSED by default, opens via 'Chats' button) */}
      {isChatDrawerOpen && (
        <aside
          className="w-72 sm:w-80 flex flex-col bg-neutral-900/95 border border-purple-800/50 rounded-2xl p-3 shrink-0 transition-all z-30 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <h2 className="text-xs font-bold text-neutral-100 tracking-wide">
                Conversations ({(chatConversations || []).length})
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  soundEffects.playPop();
                  const newId = await createNewChat();
                  setActiveChatId(newId);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-xs"
                title="Start a new AI chat thread"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
              <button
                onClick={() => {
                  soundEffects.playDrawerClose();
                  setIsChatDrawerOpen(false);
                }}
                className="p-1 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
                title="Close conversations tab"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List of Conversations */}
          <div className="flex-1 overflow-y-auto space-y-1.5 py-2 pr-1 no-scrollbar">
            {(chatConversations || []).map((conv) => {
              const isActive = conv.id === activeChatId;
              const isGenerating = generatingChatIds.includes(conv.id);

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    soundEffects.playSoftClick();
                    setActiveChatId(conv.id);
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-purple-950/70 border-purple-600/70 text-purple-100 shadow-sm'
                      : 'bg-neutral-950/40 border-neutral-800/80 hover:bg-neutral-800/60 hover:border-neutral-700 text-neutral-300'
                  }`}
                >
                  <div className="truncate flex-1 pr-2">
                    {editingChatId === conv.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditing();
                            if (e.key === 'Escape') setEditingChatId(null);
                          }}
                          autoFocus
                          className="w-full bg-neutral-900 border border-purple-500 rounded px-1.5 py-0.5 text-xs text-neutral-100 focus:outline-none"
                        />
                        <button
                          onClick={saveEditing}
                          className="p-1 hover:text-emerald-400 text-neutral-400"
                          title="Save name"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingChatId(null)}
                          className="p-1 hover:text-rose-400 text-neutral-400"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-semibold">{conv.title || 'Chat Session'}</span>
                          {isGenerating && (
                            <span className="shrink-0 flex items-center gap-1 text-[9px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded-full border border-amber-600/50 animate-pulse">
                              <span className="w-1 h-1 rounded-full bg-amber-400" />
                              Thinking...
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          {conv.messages?.length || 0} messages
                        </div>
                      </>
                    )}
                  </div>

                  {editingChatId !== conv.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditing(conv.id, conv.title || 'Chat Session');
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-100 rounded hover:bg-neutral-800 transition-colors"
                        title="Rename chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      {(chatConversations || []).length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChatConversation(conv.id);
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-400 rounded hover:bg-neutral-800 transition-colors"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer info */}
          <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-500 flex items-center justify-between">
            <span>Vision & Whiteboard Active</span>
            <button
              onClick={() => setIsChatDrawerOpen(false)}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Close ✕
            </button>
          </div>
        </aside>
      )}

      {/* Main Chat Conversation View */}
      <div className="flex-1 flex flex-col min-h-0 h-full bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 sm:p-4 space-y-3 overflow-hidden shadow-xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Conversations Tab Toggle Button (Desktop & Mobile) */}
            <button
              onClick={toggleChatDrawer}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                isChatDrawerOpen
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-950/50'
                  : 'bg-neutral-800/90 hover:bg-neutral-750 text-neutral-200 border-neutral-700/80 hover:text-white'
              }`}
              title={isChatDrawerOpen ? 'Close chat sessions tab' : 'Open chat sessions tab'}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-300" />
              <span>{isChatDrawerOpen ? 'Close Chats ✕' : 'Chats'}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-neutral-200">
                {(chatConversations || []).length}
              </span>
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-purple-950/40 shrink-0">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-[16px] font-bold text-neutral-100 tracking-tight truncate">
                  SAARTHI
                </h1>
                {isCurrentChatGenerating ? (
                  <span className="inline-flex items-center gap-1.5 text-[6px] m-0 mb-[1px] pl-[4px] pr-[7px] font-mono py-0.5 rounded-full bg-amber-950/70 border border-amber-600/50 text-amber-300 shrink-0 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    Thinking...
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1.5 text-[6px] m-0 mb-[1px] pl-[4px] pr-[7px] font-mono py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Multimodal Vision Active
                  </span>
                )}
              </div>
              <p className="text-[8px] pl-[2px] pr-[1px] text-neutral-400 truncate">
                SAARTHI AI • Drop question screenshots, coaching PDFs, or sketch FBDs on Whiteboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Satisfying Audio Micro-Interactions Toggle */}
            <button
              onClick={toggleSound}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs transition-all font-medium ${
                isSoundMuted
                  ? 'bg-neutral-900 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                  : 'bg-amber-950/40 border-amber-700/60 text-amber-300 hover:bg-amber-900/50 shadow-xs'
              }`}
              title={isSoundMuted ? 'Turn modern click & chime sounds ON' : 'Mute UI sounds'}
            >
              {isSoundMuted ? (
                <VolumeX className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span className="hidden xl:inline font-mono text-[10.5px]">
                {isSoundMuted ? 'Muted' : 'Sound ON'}
              </span>
            </button>

            {/* Open Whiteboard Button in Header */}
            <button
              onClick={() => {
                soundEffects.playWhiteboardLaunch();
                setIsWhiteboardOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-700/60 text-indigo-200 text-xs rounded-xl transition-colors font-semibold shadow-xs"
              title="Open Live JEE Doubt Whiteboard to draw FBD or graph"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Whiteboard</span>
            </button>

            {/* Target Syllabus Quick Action */}
            <button
              onClick={() => {
                soundEffects.playPop();
                setIsExamModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/60 text-amber-300 text-xs rounded-xl transition-colors font-medium shadow-xs"
              title="Customize target exam countdown date & syllabus goal"
            >
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Target Syllabus</span>
              <span className="sm:hidden font-mono text-[10px]">Target</span>
            </button>

            {/* API Settings Trigger Button */}
            <button
              onClick={() => {
                soundEffects.playPop();
                setIsApiSettingsOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-purple-950/60 hover:bg-purple-900/70 border border-purple-700/60 text-xs text-purple-200 rounded-xl transition-colors font-semibold shadow-xs"
              title="Configure AI model engine, persona, and view API health"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">API Settings</span>
            </button>

            {/* Clear conversation history */}
            {currentMessages.length > 0 && (
              <button
                onClick={() => {
                  soundEffects.playDeleteSoft();
                  clearChatHistory(currentConv.id);
                }}
                className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 rounded-xl transition-colors text-xs flex items-center gap-1"
                title="Clear current conversation messages"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Initial API Key Setup Tab / Banner in StudyOS Brain */}
        {showApiKeyTab && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/90 via-neutral-900 to-neutral-900 border border-purple-500/60 space-y-3 shadow-xl shrink-0 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                  Gemini API Key Setup (StudyOS Brain)
                </h3>
              </div>
              <button
                onClick={() => setShowApiKeyTab(false)}
                className="text-neutral-400 hover:text-neutral-200 text-xs px-2 py-0.5 rounded bg-neutral-800"
              >
                Dismiss ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              Welcome to StudyOS Brain! To power your AI assistant, enter your Gemini API key below. You can get your key instantly from Google AI Studio:{' '}
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline font-mono font-bold hover:text-cyan-300"
              >
                https://aistudio.google.com/api-keys
              </a>
            </p>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={brainApiKeyInput}
                onChange={(e) => setBrainApiKeyInput(e.target.value)}
                placeholder="Paste Gemini API Key here (AIzaSy...)"
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 focus:outline-none focus:border-purple-500 placeholder-neutral-600 shadow-inner"
              />
              <button
                onClick={() => {
                  updateAISettings({ apiKey: brainApiKeyInput.trim() || undefined });
                  setShowApiKeyTab(false);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg shadow transition-colors shrink-0"
              >
                Save & Activate
              </button>
            </div>
          </div>
        )}

        {/* Messages Scroll Area */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
          {currentMessages.length === 0 ? (
            <div className="min-h-full flex flex-col items-center justify-start sm:justify-center text-center p-3 sm:p-6 space-y-6 max-w-3xl mx-auto my-auto">
              <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-xl shadow-purple-950/40 shrink-0">
                <Sparkles className="w-7 h-7 animate-pulse text-purple-400" />
              </div>

              <div className="space-y-1.5 shrink-0">
                <h2 className="text-lg sm:text-xl font-bold text-neutral-100 tracking-tight">
                  SAARTHI - Personal JEE AI Mentor & Visual Problem Solver
                </h2>
                <p className="text-xs text-neutral-300 max-w-xl leading-relaxed">
                  Meet SAARTHI, your dedicated 24/7 JEE mentor. Drop screenshots of questions, coaching module PDFs, or open the Whiteboard to sketch Free-Body Diagrams (FBD) and calculus curves for instant diagnosis.
                </p>
              </div>

              {/* Three Feature Highlights Cards (Cleanly Spaced, Non-overlapping, High Contrast) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playSoftClick();
                    imageInputRef.current?.click();
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-b from-purple-950/40 to-neutral-900/90 border border-purple-750/50 hover:border-purple-400 hover:bg-neutral-850 text-left transition-all group shadow-lg flex flex-col justify-between min-h-[118px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-purple-300 font-bold text-xs">
                      <div className="p-1.5 rounded-lg bg-purple-900/70 border border-purple-600/50">
                        <ImageIcon className="w-4 h-4 text-purple-200" />
                      </div>
                      <span className="text-neutral-100 font-semibold">Question Photos</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-purple-300 transition-colors" />
                  </div>
                  <p className="text-[11.5px] text-neutral-300 font-normal leading-relaxed">
                    Drop or paste screenshots of questions from mock tests or books (HCV, Cengage, PYQs)
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playWhiteboardLaunch();
                    setIsWhiteboardOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-b from-indigo-950/40 to-neutral-900/90 border border-indigo-750/50 hover:border-indigo-400 hover:bg-neutral-850 text-left transition-all group shadow-lg flex flex-col justify-between min-h-[118px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
                      <div className="p-1.5 rounded-lg bg-indigo-900/70 border border-indigo-600/50">
                        <Pencil className="w-4 h-4 text-indigo-200" />
                      </div>
                      <span className="text-neutral-100 font-semibold">Live Whiteboard</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <p className="text-[11.5px] text-neutral-300 font-normal leading-relaxed">
                    Sketch Free-Body Diagrams, forces, circuits & calculus curves with live real-time preview
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEffects.playSoftClick();
                    pdfInputRef.current?.click();
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 to-neutral-900/90 border border-amber-750/50 hover:border-amber-400 hover:bg-neutral-850 text-left transition-all group shadow-lg flex flex-col justify-between min-h-[118px]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <div className="p-1.5 rounded-lg bg-amber-900/70 border border-amber-600/50">
                        <FileText className="w-4 h-4 text-amber-200" />
                      </div>
                      <span className="text-neutral-100 font-semibold">Coaching PDFs</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-300 transition-colors" />
                  </div>
                  <p className="text-[11.5px] text-neutral-300 font-normal leading-relaxed">
                    Upload Allen/Reso/PW module sheets & test papers to solve tough questions
                  </p>
                </button>
              </div>

              {/* Suggested Prompts Cards Grid */}
              <div className="w-full space-y-2 text-left pt-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Suggested Actions & Inquiries:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        soundEffects.playSoftClick();
                        handleSend(item.title);
                      }}
                      className="p-3 rounded-xl bg-neutral-900/80 border border-neutral-800/90 hover:border-purple-500/50 hover:bg-neutral-900 text-left transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 group-hover:text-purple-300 transition-colors">
                            {item.badge}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-600 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <p className="text-xs font-semibold text-neutral-200 line-clamp-2">
                          {item.title}
                        </p>
                      </div>
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            currentMessages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200 group`}
                >
                  {!isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-700 border border-purple-600/40 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                      <Brain className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 ${
                      isUser
                        ? 'bg-gradient-to-br from-amber-450 via-amber-500 to-amber-550 text-neutral-950 font-medium rounded-tr-none shadow-md shadow-amber-950/20 border border-amber-400/40'
                        : 'bg-neutral-900/90 border border-neutral-800 text-neutral-200 rounded-tl-none shadow-md'
                    }`}
                  >
                    {/* Role header inside message bubble */}
                    <div className="flex items-center justify-between pb-1 border-b border-black/10">
                      <span className={`text-[10.5px] font-bold uppercase tracking-wider ${isUser ? 'text-amber-950' : 'text-purple-400'}`}>
                        {isUser ? 'You (Question / Query)' : 'SAARTHI (JEE AI Guidance)'}
                      </span>
                      <span className={`text-[9.5px] font-mono ${isUser ? 'text-amber-900/80' : 'text-neutral-500'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {/* Attached Media in User Message */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 pb-2">
                        <div className="flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="relative rounded-xl overflow-hidden border border-black/20 bg-neutral-950/20 p-1 group/att"
                            >
                              {att.previewUrl ? (
                                <div
                                  className="relative cursor-pointer"
                                  onClick={() => setPreviewImageModal(att.previewUrl!)}
                                >
                                  <img
                                    src={att.previewUrl}
                                    alt={att.name}
                                    className="max-h-48 max-w-xs object-contain rounded-lg"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 flex items-center justify-center transition-opacity rounded-lg text-white gap-1 text-[11px]">
                                    <Eye className="w-4 h-4" />
                                    <span>View</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900 text-neutral-200 text-xs">
                                  <FileText className="w-5 h-5 text-amber-400" />
                                  <div className="truncate max-w-[160px]">
                                    <div className="truncate font-semibold">{att.name}</div>
                                    <div className="text-[10px] text-neutral-400">PDF Document</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Copy full message button on assistant messages */}
                    {!isUser && (
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="p-1 rounded-md bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-100 text-[10px] flex items-center gap-1 transition-colors"
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Rich Markdown & LaTeX Message Rendering */}
                    <MarkdownMessage content={msg.content} role={msg.role} />

                    {/* Executed App Actions Tray */}
                    {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                      <div className="pt-2.5 border-t border-neutral-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                            StudyOS Actions Executed:
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40">
                            {msg.actionsExecuted.length} {msg.actionsExecuted.length === 1 ? 'Action' : 'Actions'}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {msg.actionsExecuted.map((action, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 p-2 rounded-lg bg-neutral-950/80 border border-neutral-800/80 text-[11px]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-neutral-200 font-medium">{action.details}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[10px] font-mono pt-1 ${
                        isUser ? 'text-neutral-800 text-right' : 'text-neutral-500 text-left'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 border border-amber-300/40 flex items-center justify-center text-neutral-950 font-black shrink-0 mt-0.5 shadow-sm text-[11px]">
                      YOU
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Active Generation State */}
          {isCurrentChatGenerating && (
            <div className="flex gap-3 justify-start items-center text-neutral-400 text-xs animate-in fade-in">
              <div className="w-8 h-8 rounded-xl bg-purple-900/60 border border-purple-700/60 flex items-center justify-center text-purple-300 shrink-0 animate-pulse">
                <Brain className="w-4 h-4" />
              </div>
              <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center gap-2.5 shadow-md">
                <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0" />
                <span className="text-neutral-300 font-medium text-xs">
                  SAARTHI is inspecting questions, diagrams & reasoning on JEE solution...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
          {QUICK_CHIPS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              disabled={isCurrentChatGenerating}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-300 text-[11px] rounded-full whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Attached Items Preview Tray (Above Input) */}
        {attachments.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-neutral-950/80 border border-neutral-800 rounded-xl overflow-x-auto shrink-0 animate-in fade-in">
            <span className="text-[10px] uppercase font-bold text-neutral-400 px-1 font-mono">
              Attached ({attachments.length}):
            </span>
            {attachments.map((att) => {
              const sizeLabel = att.sizeBytes
                ? att.sizeBytes > 1024 * 1024
                  ? `${(att.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                  : `${Math.round(att.sizeBytes / 1024)} KB`
                : '';

              const renderIcon = () => {
                if (att.previewUrl) {
                  return (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-6 h-6 object-cover rounded"
                    />
                  );
                }
                if (att.type === 'code') {
                  return <Code className="w-4 h-4 text-cyan-400 shrink-0" />;
                }
                if (att.type === 'document') {
                  return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
                }
                if (att.type === 'pdf') {
                  return <FileText className="w-4 h-4 text-amber-400 shrink-0" />;
                }
                return <File className="w-4 h-4 text-purple-400 shrink-0" />;
              };

              return (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-purple-800/40 text-xs shrink-0"
                >
                  {renderIcon()}
                  <div className="truncate max-w-[140px]">
                    <div className="truncate text-neutral-200 font-medium text-[11px]" title={att.name}>
                      {att.name}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-purple-300 font-mono uppercase">
                      <span>{att.type}</span>
                      {sizeLabel && <span className="text-neutral-500 font-normal">({sizeLabel})</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playDeleteSoft();
                      removeAttachment(att.id);
                    }}
                    className="p-1 text-neutral-400 hover:text-rose-400 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input Box Bar */}
        <div className="space-y-1.5 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center gap-1.5 p-1.5 bg-neutral-900 border border-neutral-800 rounded-2xl focus-within:border-purple-500/80 transition-colors shadow-xl"
          >
            {/* The + (Plus) Icon for Uploading Questions, PDFs & Whiteboard */}
            <div className="relative" ref={plusMenuRef}>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playSoftClick();
                  setIsPlusMenuOpen(!isPlusMenuOpen);
                }}
                className={`p-2 rounded-xl transition-all flex items-center justify-center ${
                  isPlusMenuOpen
                    ? 'bg-purple-600 text-white rotate-45'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white'
                }`}
                title="Add screenshot, photo of question, coaching PDF, or sketch on Whiteboard"
              >
                <Plus className="w-4 h-4 transition-transform duration-200" />
              </button>

              {/* Plus Menu Popup Tray */}
              {isPlusMenuOpen && (
                <div className="absolute bottom-12 left-0 w-68 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl p-2 z-40 space-y-1 animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-2 py-1 text-[10px] uppercase font-mono font-bold text-neutral-400">
                    Add to StudyOS AI:
                  </div>

                  {/* 1. Upload Question Photo / Screenshot */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playSoftClick();
                      imageInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-800 text-neutral-200 text-xs text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-purple-950 border border-purple-700/50 flex items-center justify-center text-purple-300 shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-100">Upload Question Photo</div>
                      <div className="text-[10px] text-neutral-400">Screenshots, PNG, JPG, WEBP</div>
                    </div>
                  </button>

                  {/* 2. Open Live Doubt Whiteboard */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playWhiteboardLaunch();
                      setIsWhiteboardOpen(true);
                      setIsPlusMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-800 text-neutral-200 text-xs text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-300 shrink-0">
                      <Pencil className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-100">Live Doubt Whiteboard</div>
                      <div className="text-[10px] text-neutral-400">Sketch FBDs, forces & graphs</div>
                    </div>
                  </button>

                  {/* 3. Upload Document (PDF, DOCX, HTML, CSS, Code up to 50MB) */}
                  <button
                    type="button"
                    onClick={() => {
                      soundEffects.playSoftClick();
                      pdfInputRef.current?.click();
                    }}
                    className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-neutral-800 text-neutral-200 text-xs text-left transition-colors"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-950 border border-amber-700/50 flex items-center justify-center text-amber-300 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-100">Documents & Notes (Up to 50MB)</div>
                      <div className="text-[10px] text-neutral-400">PDF, DOCX, HTML, CSS, Code, Notes</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              placeholder={
                isCurrentChatGenerating
                  ? 'AI is thinking in this chat... (You can switch to another chat to ask different questions)'
                  : attachments.length > 0
                  ? 'Describe what to solve in the attached file, or press Send...'
                  : 'Ask question, drop photo, PDF, DOCX, HTML, CSS, or sketch on Whiteboard...'
              }
              className="flex-1 bg-transparent px-2.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
            />

            {isCurrentChatGenerating ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl transition-all shadow-xs flex items-center gap-1 shrink-0"
                title="Stop AI response"
              >
                <Square className="w-3 h-3 fill-white" />
                <span className="text-[11px]">Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-purple-900/30 flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            )}
          </form>
        </div>

        {/* Live Whiteboard Canvas Modal */}
        <WhiteboardModal
          isOpen={isWhiteboardOpen}
          onClose={() => setIsWhiteboardOpen(false)}
          onAttachSketch={handleWhiteboardAttach}
        />

        {/* Full Image Preview Modal */}
        {previewImageModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
            onClick={() => setPreviewImageModal(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={previewImageModal}
                alt="Enlarged view"
                className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
              />
              <button
                onClick={() => setPreviewImageModal(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* API & Model Settings Modal */}
        <APISettingsModal
          isOpen={isApiSettingsOpen}
          onClose={() => setIsApiSettingsOpen(false)}
        />

        {/* Target Exam & Countdown Customization Modal */}
        <ExamTargetModal
          isOpen={isExamModalOpen}
          onClose={() => setIsExamModalOpen(false)}
        />
      </div>
    </div>
  );
};
