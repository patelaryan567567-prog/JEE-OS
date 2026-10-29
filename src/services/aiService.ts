import {
  AppState,
  AIChatMessage,
  TaskCategory,
  TaskPriority,
  LectureStatus,
  DestructiveActionConfirmation,
  Chapter,
  ChatAttachment,
} from '../types';
import { buildStudyOSContext } from './aiContextEngine';
import { executeStudyOSTool, ToolExecutionResult } from './aiTools';

export interface AppActionHandlers {
  addTask: (task: any) => Promise<void>;
  updateTask: (task: any) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  moveTaskCategory: (id: string, category: TaskCategory) => Promise<void>;
  addLecture: (lecture: any) => Promise<void>;
  updateLecture: (lecture: any) => Promise<void>;
  deleteLecture: (id: string) => Promise<void>;
  setLectureStatus: (id: string, status: LectureStatus) => Promise<void>;
  recordPracticeSession: (
    chapterId: string,
    subjectId: string,
    attempted: number,
    correct: number,
    source: string,
    difficult?: string[]
  ) => Promise<void>;
  addReminder: (reminder: any) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updateChapter: (chapter: Chapter) => Promise<void>;
  addChapter: (chapter: Omit<Chapter, 'id'>) => Promise<void>;
  deleteModulePractice: (id: string) => Promise<void>;
  updateExamTarget?: (target: any) => Promise<void>;
  requestDestructiveConfirmation?: (conf: DestructiveActionConfirmation) => void;
}

export async function sendChatMessageToAI(
  userMessage: string,
  state: AppState,
  chatHistory: AIChatMessage[],
  handlers: AppActionHandlers,
  options?: {
    model?: string;
    persona?: string;
    apiKey?: string;
    signal?: AbortSignal;
    attachments?: ChatAttachment[];
  }
): Promise<{ reply: string; actionsExecuted: Array<{ action: string; details: string; success: boolean }>; aborted?: boolean }> {
  // Check if already aborted
  if (options?.signal?.aborted) {
    return {
      reply: '⏹️ *Response stopped by user.*',
      actionsExecuted: [],
      aborted: true,
    };
  }

  // 1. Build rich, comprehensive StudyOS context
  const contextSummary = buildStudyOSContext(state, userMessage);

  // 2. Call server-side proxy route (/api/chat)
  let response: Response;
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      signal: options?.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: userMessage,
        context: contextSummary,
        history: (chatHistory || []).slice(-8).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        attachments: options?.attachments,
        model: options?.model,
        persona: options?.persona,
        apiKey: options?.apiKey,
      }),
    });
  } catch (fetchErr: any) {
    if (fetchErr.name === 'AbortError' || options?.signal?.aborted) {
      return {
        reply: '⏹️ *Response stopped by user.*',
        actionsExecuted: [],
        aborted: true,
      };
    }
    throw fetchErr;
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    const msg = errData?.error || `Server responded with HTTP ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const functionCalls = data.functionCalls || [];
  let replyText = data.reply || '';

  const actionsExecuted: Array<{ action: string; details: string; success: boolean }> = [];

  // Check if aborted before executing tools
  if (options?.signal?.aborted) {
    return {
      reply: '⏹️ *Response stopped by user.*',
      actionsExecuted: [],
      aborted: true,
    };
  }

  // 3. Execute any tool / function calls against local StudyOS state
  if (functionCalls.length > 0) {
    const toolResults: Array<{ name: string; message: string; success: boolean }> = [];

    for (const call of functionCalls) {
      if (options?.signal?.aborted) {
        break;
      }

      const toolResult: ToolExecutionResult = await executeStudyOSTool(
        call.name,
        call.args || {},
        state,
        handlers as any
      );

      actionsExecuted.push({
        action: call.name,
        details: toolResult.message,
        success: toolResult.success,
      });

      toolResults.push({
        name: call.name,
        message: toolResult.message,
        success: toolResult.success,
      });
    }

    if (options?.signal?.aborted) {
      return {
        reply: '⏹️ *Response stopped by user.*',
        actionsExecuted,
        aborted: true,
      };
    }

    // If Gemini only issued tool calls without conversational text, query followup
    if (!replyText || replyText.trim().length === 0) {
      try {
        const followupRes = await fetch('/api/chat/followup', {
          method: 'POST',
          signal: options?.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            context: contextSummary,
            history: (chatHistory || []).slice(-6).map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            functionCalls,
            toolResults,
          }),
        });

        if (followupRes.ok) {
          const followupData = await followupRes.json();
          if (followupData.reply && followupData.reply.trim()) {
            replyText = followupData.reply.trim();
          }
        }
      } catch (followupErr: any) {
        if (followupErr.name === 'AbortError' || options?.signal?.aborted) {
          return {
            reply: '⏹️ *Response stopped by user.*',
            actionsExecuted,
            aborted: true,
          };
        }
        console.warn('Followup reasoning failed, falling back to summary:', followupErr);
      }
    }
  }

  if (!replyText && actionsExecuted.length > 0) {
    replyText = `Done! I've updated your StudyOS workspace:\n${actionsExecuted
      .map((a) => `• ${a.details}`)
      .join('\n')}`;
  } else if (!replyText) {
    replyText = "I've reviewed your StudyOS workspace. Let me know what you'd like to plan or work on next!";
  }

  return { reply: replyText, actionsExecuted };
}
