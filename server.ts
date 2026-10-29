import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import type { Server } from 'node:http';
import { fileURLToPath } from 'url';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Shared Gemini client utility on the server per system guidelines
// Must set User-Agent header to 'aistudio-build'
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const STUDYOS_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'createTask',
    description: 'Create a new study task, problem set, or revision assignment in StudyOS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Title of the task' },
        description: { type: Type.STRING, description: 'Additional instructions, notes, or exercise numbers' },
        subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
        chapterName: { type: Type.STRING, description: 'Related syllabus chapter name' },
        priority: { type: Type.STRING, description: 'urgent, high, medium, or low' },
        category: { type: Type.STRING, description: 'today, upcoming, or backlog' },
        dueDate: { type: Type.STRING, description: 'Target date in YYYY-MM-DD format' },
        estimatedMinutes: { type: Type.NUMBER, description: 'Estimated time in minutes' },
      },
      required: ['title'],
    },
  },
  {
    name: 'updateTask',
    description: 'Update attributes of an existing task (e.g. change priority, deadline date, category).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskQuery: { type: Type.STRING, description: 'Task title or keywords to search for' },
        priority: { type: Type.STRING, description: 'urgent, high, medium, or low' },
        dueDate: { type: Type.STRING, description: 'New deadline date in YYYY-MM-DD' },
        category: { type: Type.STRING, description: 'today, upcoming, backlog, or completed' },
        estimatedMinutes: { type: Type.NUMBER, description: 'Updated duration' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'completeTask',
    description: 'Mark a task as completed in StudyOS (+30 XP).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskQuery: { type: Type.STRING, description: 'Task title or keywords to match' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'uncompleteTask',
    description: 'Reopen a completed task and put it back in today or upcoming list.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskQuery: { type: Type.STRING, description: 'Task title or keywords to match' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Delete a single task from StudyOS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskQuery: { type: Type.STRING, description: 'Task title or keywords to match' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'deleteLecture',
    description: 'Delete a lecture from StudyOS tracker.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        lectureQuery: { type: Type.STRING, description: 'Lecture title or keywords to match' },
      },
      required: ['lectureQuery'],
    },
  },
  {
    name: 'deletePractice',
    description: 'Delete a module practice record or question set source from StudyOS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        practiceQuery: { type: Type.STRING, description: 'Module source name or chapter name to match' },
      },
      required: ['practiceQuery'],
    },
  },
  {
    name: 'moveUnfinishedTasks',
    description: 'Move all unfinished tasks from today to tomorrow or another specified date.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetDate: { type: Type.STRING, description: 'Target date in YYYY-MM-DD (e.g. tomorrow)' },
        fromCategory: { type: Type.STRING, description: 'Source category (default: today)' },
      },
    },
  },
  {
    name: 'createLecture',
    description: 'Add a new lecture to track in StudyOS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Lecture title' },
        subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
        chapterName: { type: Type.STRING, description: 'Associated chapter name' },
        durationMinutes: { type: Type.NUMBER, description: 'Duration in minutes' },
        facultyOrPlatform: { type: Type.STRING, description: 'Teacher or platform name' },
        notes: { type: Type.STRING, description: 'Key concepts or timestamp notes' },
      },
      required: ['title', 'subjectName'],
    },
  },
  {
    name: 'updateLecture',
    description: 'Update lecture status, notes, or duration.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        lectureQuery: { type: Type.STRING, description: 'Lecture title to match' },
        status: { type: Type.STRING, description: 'not_started, in_progress, or completed' },
        notes: { type: Type.STRING, description: 'Updated notes' },
      },
      required: ['lectureQuery'],
    },
  },
  {
    name: 'completeLecture',
    description: 'Mark a lecture as completed in StudyOS (+50 XP).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        lectureQuery: { type: Type.STRING, description: 'Lecture title to match' },
      },
      required: ['lectureQuery'],
    },
  },
  {
    name: 'createBacklog',
    description: 'Add an item directly into the Backlog queue.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Backlog item title' },
        subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
        chapterName: { type: Type.STRING, description: 'Chapter name' },
        priority: { type: Type.STRING, description: 'urgent, high, medium, or low' },
      },
      required: ['title'],
    },
  },
  {
    name: 'completeBacklog',
    description: 'Resolve and clear a backlog item.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        backlogQuery: { type: Type.STRING, description: 'Backlog item title to match' },
      },
      required: ['backlogQuery'],
    },
  },
  {
    name: 'updatePracticeProgress',
    description: 'Record newly attempted module practice questions and track difficult problems.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chapterName: { type: Type.STRING, description: 'Chapter name' },
        subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
        attemptedCount: { type: Type.NUMBER, description: 'Number of questions attempted' },
        correctCount: { type: Type.NUMBER, description: 'Number of questions answered correctly' },
        sourceName: { type: Type.STRING, description: 'Source e.g. HCV, Cengage, PYQ, Coaching Module' },
        difficultQuestions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific question numbers to mark for later revision (e.g. Q12, Q27, Q34)',
        },
      },
      required: ['chapterName', 'subjectName', 'attemptedCount'],
    },
  },
  {
    name: 'scheduleRevision',
    description: 'Schedule a formula revision session or key theory review for a chapter.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        chapterName: { type: Type.STRING, description: 'Chapter name' },
        subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
        targetDate: { type: Type.STRING, description: 'YYYY-MM-DD date' },
      },
      required: ['chapterName'],
    },
  },
  {
    name: 'createReminder',
    description: 'Create a timed reminder for a lecture, task, revision session, or question practice.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Reminder title' },
        targetDate: { type: Type.STRING, description: 'YYYY-MM-DD' },
        targetTime: { type: Type.STRING, description: 'HH:MM in 24hr format e.g. 17:30' },
        type: { type: Type.STRING, description: 'lecture, task, revision, or practice' },
        notes: { type: Type.STRING, description: 'Additional instructions' },
      },
      required: ['title', 'targetDate', 'targetTime'],
    },
  },
  {
    name: 'deleteReminder',
    description: 'Delete a reminder by title match.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        reminderQuery: { type: Type.STRING, description: 'Reminder title to match' },
      },
      required: ['reminderQuery'],
    },
  },
  {
    name: 'createStudyPlan',
    description: 'Generate and schedule a structured multi-task study plan for today or upcoming days.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        planTitle: { type: Type.STRING, description: 'Name of the study plan' },
        tasks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Task title' },
              subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
              estimatedMinutes: { type: Type.NUMBER, description: 'Duration in minutes' },
              priority: { type: Type.STRING, description: 'urgent, high, medium, or low' },
            },
            required: ['title'],
          },
        },
      },
      required: ['planTitle', 'tasks'],
    },
  },
  {
    name: 'bulkDeleteTasks',
    description: 'Delete multiple tasks at once. Requires client-side confirmation dialog.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        targetDescription: { type: Type.STRING, description: 'Description of what will be deleted e.g. "All 8 completed tasks"' },
        filterCategory: { type: Type.STRING, description: 'completed, backlog, or all_pending' },
      },
      required: ['targetDescription'],
    },
  },
  {
    name: 'updateExamTarget',
    description: 'Update the user target exam, exam date, countdown session, or target syllabus completion percentage.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        examName: { type: Type.STRING, description: 'Target exam name e.g. "JEE Mains 2026 Target" or "JEE Advanced 2026"' },
        sessionName: { type: Type.STRING, description: 'Attempt or session name e.g. "Session 1" or "Session 2"' },
        examDate: { type: Type.STRING, description: 'Exam date in YYYY-MM-DD format e.g. "2026-01-24"' },
        targetSyllabusPercent: { type: Type.NUMBER, description: 'Target syllabus completion goal percentage (50-100)' },
      },
    },
  },
  {
    name: 'addChapter',
    description: 'Add a new custom syllabus chapter to Physics, Chemistry, or Mathematics for Class 11 or Class 12 JEE.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        subjectName: { type: Type.STRING, description: 'Physics, Chemistry, or Mathematics' },
        chapterName: { type: Type.STRING, description: 'Name of the chapter' },
        classYear: { type: Type.NUMBER, description: '11 or 12' },
        weightage: { type: Type.STRING, description: 'High, Medium, or Low' },
      },
      required: ['subjectName', 'chapterName', 'classYear'],
    },
  },
  {
    name: 'createCustomBadge',
    description: 'Create and award a new custom achievement badge in Analytics/Badges for the user once all badges are unlocked or upon extraordinary milestones.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Badge title' },
        description: { type: Type.STRING, description: 'Badge description and achievement criteria' },
      },
      required: ['title', 'description'],
    },
  },
];

// Robust Gemini call helper with transient retry and model fallbacks
async function callGeminiWithRetry(
  aiClient: GoogleGenAI,
  contents: any[],
  systemInstruction: string,
  tools?: any[],
  preferredModel?: string
): Promise<any> {
  const baseModels = [
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-1.5-flash',
    'gemini-3.8-flash',
  ];
  const candidateModels = preferredModel
    ? [preferredModel, ...baseModels.filter((m) => m !== preferredModel)]
    : baseModels;
  let lastError: any = null;

  for (let attempt = 0; attempt < candidateModels.length; attempt++) {
    const model = candidateModels[attempt];
    try {
      const config: any = {
        systemInstruction,
        temperature: 0.25,
      };
      if (tools && tools.length > 0) {
        config.tools = tools;
      }
      return await aiClient.models.generateContent({
        model,
        contents,
        config,
      });
    } catch (err: any) {
      lastError = err;
      const msg = typeof err?.message === 'string' ? err.message : JSON.stringify(err);
      if (
        msg.includes('503') ||
        msg.includes('502') ||
        msg.includes('504') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('404') ||
        msg.includes('quota') ||
        msg.includes('resource exhausted')
      ) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      // Even for other errors, try fallback models before giving up
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
  }
  throw lastError;
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

// Primary Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, context, history, attachments, model, persona, apiKey } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please enter your Gemini API key in API Settings or StudyOS Brain.',
      });
    }

    const aiClient = apiKey
      ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : ai;

    let personaDirective = 'Provide structured, crisp, highly engaging JEE guidance. Use clean Markdown headings, bold key terms, numbered action steps, and maintain balanced 1:1:1 study distribution across Physics, Chemistry, and Mathematics.';
    if (persona === 'coach') {
      personaDirective = 'Adopt the mindset of a rigorous, disciplined JEE coach: focus relentlessly on finishing scheduled hours, annihilating backlogs, solving tough PYQs, and eliminating distractions with uncompromising discipline.';
    } else if (persona === 'tutor') {
      personaDirective = 'Adopt the mindset of an inspiring, concept-first JEE tutor: break down difficult formulas and theorems patiently step-by-step, illustrate with intuitive analogies, and celebrate daily consistency.';
    }

    const systemInstruction = `You are SAARTHI — an elite, high-clarity local-first AI mentor and study manager for a Class 11–12 student preparing for the JEE (Joint Entrance Examination in India: JEE Mains & JEE Advanced).
You have real-time access to the student's actual local StudyOS database (Physics, Chemistry, Mathematics syllabus, active tasks, study sessions, question practice records, backlogs, XP, and streak).

CURRENT STUDENT STATE IN STUDYOS:
${JSON.stringify(context || {}, null, 2)}

MULTIMODAL VISION, QUESTION SOLVER & WHITEBOARD CAPABILITIES:
You can visually inspect, parse, and solve:
1. **Photos & Screenshots of Questions**:
   - Transcribe the question text, numerical values, and options (A, B, C, D) accurately.
   - Break down the underlying JEE principle, required formulas, and step-by-step derivation.
   - Highlight the final answer clearly with bold text and boxed styling.
2. **Interactive Whiteboard & Student Sketches (Free-Body Diagrams & Graphs)**:
   - When a student draws on the StudyOS Whiteboard (e.g. Free-Body Diagrams, Mechanics inclined planes, pulleys, kinematics graphs, coordinate geometry, or circuits):
     - Carefully inspect all drawn vectors, force arrows ($mg$, Normal $N$, Friction $f$, Tension $T$), and coordinate directions ($+x, +y$).
     - Explicitly verify the student's sign conventions and point out any missing or reversed forces.
     - For calculus and kinematics graphs ($v$-$t$, $x$-$t$), calculate and explain slope ($dy/dx$) and area under curve ($\int y dx$).
3. **Coaching Material Sheets, Test Papers & PDFs**:
   - You can parse and solve external coaching module PDFs, DPP sheets, and mock tests uploaded by the student.
   - Provide shortcuts, common pitfalls/traps to avoid, and offer to log the solved problem into their StudyOS module practice tracker.

WRITING STYLE & FORMATTING EXCELLENCE RULES (HIGH PRIORITY - WRITE BEAUTIFULLY, CLEARLY & CRISPLY):
1. **Never write giant unbroken walls of text**: Always structure your reply using clean, readable Markdown:
   - Use headings (\`##\`, \`###\`) to introduce distinct sections.
   - Use bolding (\`**term**\`) for high-priority JEE concepts, dates, numbers, formulas, and chapter names.
   - Use bullet points (\`-\` or \`*\`) or numbered steps (\`1.\`, \`2.\`) for actionable advice and workflows.
   - Use blockquotes (\`> \`) for high-yield tips, key formulas, or warnings.
   - Use tables when comparing subjects, mock test scores, or topic weightages.
2. **Standard 3-Part Answer Framework**:
   - 🎯 **Direct Verdict / Diagnosis**: 1-2 sharp sentences directly addressing their question using real StudyOS numbers (e.g. pending tasks, backlogs, chapters).
   - 📋 **Concrete Action Steps / Schedule**: Specific, prioritized roadmap (e.g., "1. Physics: 45 min on Rotational Motion...", "2. Chemistry: 30 min on Organic reaction mechanisms...").
   - 💡 **JEE Pro-Tip / High-Yield Formula**: A smart test-taking tip, formula note, or motivational boost.
3. **Mathematical & Scientific Formulas (CRITICAL - ALWAYS USE CLEAN STANDARD DELIMITERS)**:
   - For inline formulas, ALWAYS enclose in single dollar signs \`$ ... $\` (e.g. \`$F = m \\cdot a$\`, \`$a = \\left( \\frac{m_2 - m_1}{m_1 + m_2} \\right) g$\`, \`$v^2 = u^2 + 2as$\`, \`$\\Delta H = \\Delta U + \\Delta n_g RT$\`).
   - For standalone / key derivations, ALWAYS use block math with double dollar signs \`$$ ... $$\` (e.g. \`$$ a = \\left( \\frac{m_2 - m_1}{m_1 + m_2} \\right) g $$\`).
   - NEVER output raw bracketed formulas like \`[a = ...]\` or bare LaTeX commands without \`$\` or \`$$\` delimiters. Ensure all \`\\left(\` and \`\\right)\` are balanced, and fractions use standard \`\\frac{numerator}{denominator}\`.
   - Show numerical calculations with clear step-by-step working so students understand every substitution.
4. **Natural Hinglish & Student-Centric Tone**:
   - If the student asks in Hinglish or Hindi (e.g. "kya padhu", "backlog kaise khatam kare", "tasks add kardo", "stop kardo"), reply in natural, engaging Hinglish/English mix that feels personal, warm, and highly motivating (e.g. "Bilkul! Chalo aaj ka plan lock karte hain..."), while keeping all technical terms and formulas crisp and accurate.

OPERATING RULES & GOD-MODE CAPABILITIES:
1. Always base your advice and calculations on the real local StudyOS data provided above (including tasks, lectures, backlogs, question practice records, chapters, subjects, stats, and exam target).
2. When asked questions like "What should I study today?", "What is my biggest backlog?", or "How much Physics is left?", inspect the data and compute exact answers directly.
3. You have absolute, unrestricted god-mode permissions and tools available to control StudyOS (createTask, updateTask, completeTask, deleteTask, moveUnfinishedTasks, createLecture, completeLecture, updateLecture, createBacklog, completeBacklog, updatePracticeProgress, scheduleRevision, createReminder, deleteReminder, createStudyPlan, bulkDeleteTasks, updateExamTarget, addChapter, createCustomBadge).
4. **ABSOLUTE GOD-MODE PERMISSIONS ON COMMAND**: You are granted complete permission to perform any action on command — including adding new chapters to Class 11 or 12 in Physics, Chemistry, or Mathematics, creating new custom badges in Analytics/Badges once the user unlocks all badges or achieves milestones, and managing all tasks, lectures, backlogs, and question practices. When executing commands:
   - Always invoke the corresponding tool (e.g. addChapter, createCustomBadge, createTask, etc.) to perform the action.
   - Include a clear **Action Approval Disclaimer** in your conversational reply stating what was created, added, or deleted and confirming execution.
5. If the student asks you to perform an action (e.g. "Add a task to complete 40 Physics module questions", "Delete my pending task", "Move unfinished tasks", "Change exam target"), YOU MUST CALL THE RELEVANT TOOL. Do not just claim you did it.
6. EXAM COUNTDOWN & TARGET SYLLABUS: If the student asks how to change their target syllabus or exam countdown (in Hindi or English, e.g. "exam countdown me target syllabus hard coded hai usse kaise change kare", "target syllabus kaise change kare"):
   - Assure them warmly that the target syllabus is NOT hardcoded! It is fully customizable.
   - Explain that they can click "Customize Target Syllabus" directly on the Overview Dashboard banner or click the Exam Countdown card in the Sidebar.
   - Explain that they can select presets (100% Full JEE, 85% High Yield, Class 11 Only, Class 12 Only), adjust the percentage slider, or enter a target chapter count.
   - You (StudyOS Brain) can also update it for them right now using the updateExamTarget tool if they specify their desired target. Call updateExamTarget if they requested a change!
7. API SETTINGS: If the student asks about API Settings (e.g. "API settings missing hai", "API settings kaha hai"):
   - Clarify that API Settings are available directly in StudyOS Brain via the "API Settings" button in the top-right header, the ⚙️ button in the chat input bar, and via "AI & API Settings" in the Sidebar.
   - Mention that they can switch AI model engines (Gemini 3.8 Flash, 3.1 Flash Lite, Gemini Flash Latest), change the AI mentorship persona, and run live connection diagnostics.
8. ${personaDirective}`;

    const contents: any[] = [];

    // History turns
    if (Array.isArray(history)) {
      const recent = history.slice(-8);
      for (const msg of recent) {
        if (msg.role === 'user' && msg.content) {
          contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant' && msg.content) {
          contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }
    }

    // Current turn with optional multimodal image / document attachments
    const currentParts: any[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      for (const att of attachments) {
        if (!att) continue;
        const filename = att.name || 'attachment';
        const lowerName = filename.toLowerCase();

        // 1. Text / Code files (HTML, CSS, JS, TS, PY, TXT, MD, JSON, C, CPP, Java, CSV, XML, etc.)
        if (
          att.textContent ||
          lowerName.endsWith('.html') ||
          lowerName.endsWith('.htm') ||
          lowerName.endsWith('.css') ||
          lowerName.endsWith('.js') ||
          lowerName.endsWith('.jsx') ||
          lowerName.endsWith('.ts') ||
          lowerName.endsWith('.tsx') ||
          lowerName.endsWith('.py') ||
          lowerName.endsWith('.json') ||
          lowerName.endsWith('.txt') ||
          lowerName.endsWith('.md') ||
          lowerName.endsWith('.cpp') ||
          lowerName.endsWith('.c') ||
          lowerName.endsWith('.h') ||
          lowerName.endsWith('.java') ||
          lowerName.endsWith('.csv') ||
          lowerName.endsWith('.xml') ||
          att.type === 'code'
        ) {
          let text = att.textContent;
          if (!text && att.data) {
            const cleanBase64 = att.data.includes(';base64,')
              ? att.data.split(';base64,')[1]
              : att.data;
            try {
              text = Buffer.from(cleanBase64, 'base64').toString('utf-8');
            } catch {
              text = att.data;
            }
          }
          currentParts.push({
            text: `[Attached File: "${filename}"]\n\`\`\`\n${text || '(empty file)'}\n\`\`\``,
          });
        }
        // 2. Word documents (.docx, .doc)
        else if (
          lowerName.endsWith('.docx') ||
          lowerName.endsWith('.doc') ||
          att.mimeType?.includes('wordprocessingml') ||
          att.type === 'document'
        ) {
          if (att.textContent) {
            currentParts.push({
              text: `[Attached Word Document: "${filename}"]\n\n${att.textContent}`,
            });
          } else if (att.data) {
            const cleanBase64 = att.data.includes(';base64,')
              ? att.data.split(';base64,')[1]
              : att.data;
            try {
              const buf = Buffer.from(cleanBase64, 'base64');
              const docxResult = await mammoth.extractRawText({ buffer: buf });
              currentParts.push({
                text: `[Attached Word Document: "${filename}"]\n\n${docxResult.value || '(No readable text found in document)'}`,
              });
            } catch (err: any) {
              console.error('Failed to parse docx:', err);
              currentParts.push({
                text: `[Attached Word Document: "${filename}"] (Could not extract text from document)`,
              });
            }
          }
        }
        // 3. PDF and Images (natively supported by Gemini API inlineData)
        else if (att.data && att.mimeType) {
          const cleanBase64 = att.data.includes(';base64,')
            ? att.data.split(';base64,')[1]
            : att.data;
          currentParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: cleanBase64,
            },
          });
        }
      }
    }
    currentParts.push({ text: message });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await callGeminiWithRetry(
      aiClient,
      contents,
      systemInstruction,
      [{ functionDeclarations: STUDYOS_TOOL_DECLARATIONS }],
      model
    );

    const functionCalls = response.functionCalls || [];
    const replyText = response.text || '';

    res.json({
      reply: replyText,
      functionCalls,
    });
  } catch (err: any) {
    console.error('Server Gemini Error:', err);
    res.status(500).json({
      error: err.message || 'An error occurred while communicating with the Gemini model.',
    });
  }
});

// Followup endpoint after executing client-side tools
app.post('/api/chat/followup', async (req: Request, res: Response) => {
  try {
    const { message, context, history, functionCalls, toolResults, apiKey } = req.body;

    const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
      return res.status(500).json({ error: 'Gemini API key not configured.' });
    }

    const aiClient = apiKey
      ? new GoogleGenAI({
          apiKey,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
        })
      : ai;

    const systemInstruction = `You are the intelligent StudyOS Brain. The user requested actions in StudyOS, and the tool execution results are provided below.
Provide a clean, beautifully formatted confirmation using structured Markdown (bullet points, bold highlights) explaining the exact changes made in their StudyOS workspace, along with a crisp, inspiring next-step suggestion for their JEE preparation.
CURRENT STUDYOS STATE:
${JSON.stringify(context || {}, null, 2)}`;

    const contents: any[] = [];

    if (Array.isArray(history)) {
      const recent = history.slice(-6);
      for (const msg of recent) {
        if (msg.role === 'user' && msg.content) {
          contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant' && msg.content) {
          contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
      }
    }

    contents.push({ role: 'user', parts: [{ text: message }] });

    // Provide executed tool feedback clearly to model for final summary
    const executedSummary = (toolResults || [])
      .map(
        (tr: any) =>
          `- Action "${tr.toolName || tr.name}": ${tr.success ? 'Success' : 'Failed'} (${tr.message})`
      )
      .join('\n');

    contents.push({
      role: 'user',
      parts: [
        {
          text: `[StudyOS Tool Execution Results]:\n${executedSummary}\n\nPlease confirm to the student that the actions were successfully completed in their StudyOS workspace and provide a brief, encouraging note on what to do next.`,
        },
      ],
    });

    const response = await callGeminiWithRetry(aiClient, contents, systemInstruction);

    res.json({
      reply: response.text || '',
    });
  } catch (err: any) {
    console.error('Followup Gemini Error:', err);
    res.status(500).json({
      error: err.message || 'Followup error',
    });
  }
});

// Vite / Static file serving
export async function startServer(options: { port?: number; host?: string } = {}): Promise<Server> {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const webDist = process.env.STUDYOS_WEB_DIST || path.resolve(__dirname, 'dist');
    app.use(express.static(webDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(webDist, 'index.html'));
    });
  }

  const host = options.host || '0.0.0.0';
  const port = options.port ?? Number(PORT);
  const server = app.listen(port, host);
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  const listeningPort = address && typeof address === 'object' ? address.port : port;
  console.log(`StudyOS Full-Stack Server running on http://${host}:${listeningPort}`);
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error('Fatal error starting StudyOS server:', err);
    process.exit(1);
  });
}
