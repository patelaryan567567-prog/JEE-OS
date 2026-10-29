import {
  AppState,
  Task,
  TaskCategory,
  TaskPriority,
  Lecture,
  LectureStatus,
  Reminder,
  Chapter,
  Subject,
} from '../types';

export interface ToolExecutionResult {
  toolName: string;
  success: boolean;
  message: string;
  data?: any;
  requiresConfirmation?: boolean;
}

export interface ToolExecutorHandlers {
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  updateTask: (task: Task) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  moveTaskCategory: (id: string, category: TaskCategory) => Promise<void>;
  addLecture: (lecture: Omit<Lecture, 'id'>) => Promise<void>;
  updateLecture: (lecture: Lecture) => Promise<void>;
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
  addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'completed'>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  updateChapter: (chapter: Chapter) => Promise<void>;
  addChapter: (chapter: Omit<Chapter, 'id'>) => Promise<void>;
  deleteModulePractice: (id: string) => Promise<void>;
  updateExamTarget?: (target: any) => Promise<void>;
  requestDestructiveConfirmation?: (conf: {
    id: string;
    title: string;
    description: string;
    actionName: string;
    itemCount: number;
    execute: () => Promise<void>;
  }) => void;
}

// Complete set of declared tools as required by the StudyOS AI Brain
export const STUDYOS_FUNCTION_DECLARATIONS = [
  // --- TASKS ---
  {
    name: 'getTasks',
    description: 'Get current tasks filtered by category (today, upcoming, backlog, completed) or subject.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', enum: ['today', 'upcoming', 'backlog', 'completed', 'all'] },
        subjectName: { type: 'STRING' },
      },
    },
  },
  {
    name: 'createTask',
    description: 'Create a new study task or problem set in StudyOS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Title of task' },
        description: { type: 'STRING', description: 'Detailed notes or exercise numbers' },
        subjectName: { type: 'STRING', description: 'Physics, Chemistry, or Mathematics' },
        chapterName: { type: 'STRING', description: 'Associated chapter' },
        priority: { type: 'STRING', enum: ['urgent', 'high', 'medium', 'low'] },
        category: { type: 'STRING', enum: ['today', 'upcoming', 'backlog'] },
        dueDate: { type: 'STRING', description: 'YYYY-MM-DD' },
        estimatedMinutes: { type: 'NUMBER' },
      },
      required: ['title'],
    },
  },
  {
    name: 'updateTask',
    description: 'Update task properties such as priority, due date, or estimated duration.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskQuery: { type: 'STRING', description: 'Task title or ID' },
        priority: { type: 'STRING', enum: ['urgent', 'high', 'medium', 'low'] },
        dueDate: { type: 'STRING', description: 'YYYY-MM-DD' },
        category: { type: 'STRING', enum: ['today', 'upcoming', 'backlog', 'completed'] },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'completeTask',
    description: 'Mark a task as completed in StudyOS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskQuery: { type: 'STRING', description: 'Task title or ID' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'uncompleteTask',
    description: 'Reopen a previously completed task back to today or upcoming queue.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskQuery: { type: 'STRING', description: 'Task title or ID' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'deleteTask',
    description: 'Delete a single task or request confirmation if multiple tasks are targeted.',
    parameters: {
      type: 'OBJECT',
      properties: {
        taskQuery: { type: 'STRING', description: 'Task title or ID' },
      },
      required: ['taskQuery'],
    },
  },
  {
    name: 'deleteLecture',
    description: 'Delete a lecture from StudyOS tracker.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lectureQuery: { type: 'STRING', description: 'Lecture title or keywords' },
      },
      required: ['lectureQuery'],
    },
  },
  {
    name: 'deletePractice',
    description: 'Delete a module practice record or question set source from StudyOS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        practiceQuery: { type: 'STRING', description: 'Module source name or chapter name' },
      },
      required: ['practiceQuery'],
    },
  },

  // --- BACKLOGS ---
  {
    name: 'getBacklogs',
    description: 'Get all pending backlog tasks, unstarted lectures, and under-practiced chapters.',
    parameters: {
      type: 'OBJECT',
      properties: {
        filterType: { type: 'STRING', enum: ['all', 'tasks', 'lectures', 'practice'] },
      },
    },
  },
  {
    name: 'createBacklog',
    description: 'Add an item explicitly to the Backlog queue.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        subjectName: { type: 'STRING' },
        chapterName: { type: 'STRING' },
        priority: { type: 'STRING', enum: ['urgent', 'high', 'medium', 'low'] },
      },
      required: ['title'],
    },
  },
  {
    name: 'completeBacklog',
    description: 'Mark a backlog task as completed and resolved.',
    parameters: {
      type: 'OBJECT',
      properties: {
        backlogQuery: { type: 'STRING' },
      },
      required: ['backlogQuery'],
    },
  },

  // --- LECTURES ---
  {
    name: 'getLectures',
    description: 'Retrieve lectures with their completion status and durations.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', enum: ['all', 'not_started', 'in_progress', 'completed'] },
        subjectName: { type: 'STRING' },
      },
    },
  },
  {
    name: 'createLecture',
    description: 'Add a new lecture to track in StudyOS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        subjectName: { type: 'STRING' },
        chapterName: { type: 'STRING' },
        durationMinutes: { type: 'NUMBER' },
        facultyOrPlatform: { type: 'STRING' },
        notes: { type: 'STRING' },
      },
      required: ['title', 'subjectName'],
    },
  },
  {
    name: 'completeLecture',
    description: 'Mark a lecture as completed in StudyOS.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lectureQuery: { type: 'STRING' },
      },
      required: ['lectureQuery'],
    },
  },
  {
    name: 'updateLecture',
    description: 'Update lecture status or details.',
    parameters: {
      type: 'OBJECT',
      properties: {
        lectureQuery: { type: 'STRING' },
        status: { type: 'STRING', enum: ['not_started', 'in_progress', 'completed'] },
        notes: { type: 'STRING' },
      },
      required: ['lectureQuery'],
    },
  },

  // --- SUBJECTS & CHAPTERS ---
  {
    name: 'getSubjects',
    description: 'Get list of subjects (Physics, Chemistry, Math) and their overall syllabus statistics.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'getChapters',
    description: 'Get chapters for a subject with revision stage (Not Started, In Progress, Formulas Revised, Mastered).',
    parameters: {
      type: 'OBJECT',
      properties: {
        subjectName: { type: 'STRING' },
        classYear: { type: 'NUMBER', enum: [11, 12] },
      },
    },
  },
  {
    name: 'addChapter',
    description: 'Add a new syllabus chapter to Physics, Chemistry, or Mathematics for Class 11 or Class 12 JEE.',
    parameters: {
      type: 'OBJECT',
      properties: {
        subjectName: { type: 'STRING', description: 'Physics, Chemistry, or Mathematics' },
        chapterName: { type: 'STRING', description: 'Name of the chapter' },
        classYear: { type: 'NUMBER', description: '11 or 12' },
        weightage: { type: 'STRING', enum: ['High', 'Medium', 'Low'] },
      },
      required: ['subjectName', 'chapterName', 'classYear'],
    },
  },
  {
    name: 'createCustomBadge',
    description: 'Create and award a new custom achievement badge in Analytics/Badges for the user.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING', description: 'Badge title' },
        description: { type: 'STRING', description: 'Badge description and achievement criteria' },
      },
      required: ['title', 'description'],
    },
  },
  {
    name: 'getWeakChapters',
    description: 'Find chapters with low question accuracy or uncompleted high-weightage topics.',
    parameters: { type: 'OBJECT', properties: {} },
  },

  // --- PRACTICE ---
  {
    name: 'getPracticeProgress',
    description: 'Get module question solving statistics, accuracy rates, and difficult questions.',
    parameters: {
      type: 'OBJECT',
      properties: {
        subjectName: { type: 'STRING' },
        chapterName: { type: 'STRING' },
      },
    },
  },
  {
    name: 'updatePracticeProgress',
    description: 'Record newly solved questions, accuracy, and star difficult questions for revision.',
    parameters: {
      type: 'OBJECT',
      properties: {
        chapterName: { type: 'STRING' },
        subjectName: { type: 'STRING' },
        attemptedCount: { type: 'NUMBER' },
        correctCount: { type: 'NUMBER' },
        sourceName: { type: 'STRING' },
        difficultQuestions: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['chapterName', 'subjectName', 'attemptedCount'],
    },
  },

  // --- REVISION ---
  {
    name: 'getRevisionData',
    description: 'Get revision status of all chapters across Physics, Chemistry, and Math.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'scheduleRevision',
    description: 'Schedule a formula revision session or task for a chapter.',
    parameters: {
      type: 'OBJECT',
      properties: {
        chapterName: { type: 'STRING' },
        subjectName: { type: 'STRING' },
        targetDate: { type: 'STRING' },
      },
      required: ['chapterName'],
    },
  },

  // --- REMINDERS ---
  {
    name: 'getReminders',
    description: 'Get all scheduled study reminders and alarms.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'createReminder',
    description: 'Set a timed study reminder.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: { type: 'STRING' },
        targetDate: { type: 'STRING', description: 'YYYY-MM-DD' },
        targetTime: { type: 'STRING', description: 'HH:MM in 24hr format' },
        type: { type: 'STRING', enum: ['lecture', 'task', 'revision', 'practice'] },
        notes: { type: 'STRING' },
      },
      required: ['title', 'targetDate', 'targetTime'],
    },
  },
  {
    name: 'deleteReminder',
    description: 'Delete a scheduled reminder.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reminderQuery: { type: 'STRING' },
      },
      required: ['reminderQuery'],
    },
  },

  // --- ANALYTICS ---
  {
    name: 'getStudyAnalytics',
    description: 'Get comprehensive analytics: daily/weekly study hours, accuracy, XP, streaks, and subject distribution.',
    parameters: { type: 'OBJECT', properties: {} },
  },

  // --- PLANNING ---
  {
    name: 'createStudyPlan',
    description: 'Generate and schedule an integrated multi-task JEE study plan for today or upcoming days.',
    parameters: {
      type: 'OBJECT',
      properties: {
        planTitle: { type: 'STRING' },
        tasks: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              subjectName: { type: 'STRING' },
              estimatedMinutes: { type: 'NUMBER' },
              priority: { type: 'STRING', enum: ['urgent', 'high', 'medium', 'low'] },
            },
            required: ['title'],
          },
        },
      },
      required: ['planTitle', 'tasks'],
    },
  },
];

// Helper: Safe Entity Matching (Section 16)
export function findBestMatchingTask(query: string, tasks: Task[]): { match: Task | null; ambiguous?: Task[] } {
  const q = query.trim().toLowerCase();
  // 1. Exact ID match
  const byId = tasks.find((t) => t.id === query.trim());
  if (byId) return { match: byId };

  // 2. Exact Title match
  const exact = tasks.filter((t) => t.title.toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0] };
  if (exact.length > 1) return { match: null, ambiguous: exact };

  // 3. Substring match
  const contains = tasks.filter((t) => t.title.toLowerCase().includes(q));
  if (contains.length === 1) return { match: contains[0] };
  if (contains.length > 1) return { match: null, ambiguous: contains };

  // 4. Word overlap fuzzy
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const matched = tasks.filter((t) => {
    const tLower = t.title.toLowerCase();
    return words.some((w) => tLower.includes(w));
  });
  if (matched.length === 1) return { match: matched[0] };
  if (matched.length > 1) return { match: null, ambiguous: matched };

  return { match: null };
}

export function findBestMatchingLecture(query: string, lectures: Lecture[]): { match: Lecture | null; ambiguous?: Lecture[] } {
  const q = query.trim().toLowerCase();
  const byId = lectures.find((l) => l.id === query.trim());
  if (byId) return { match: byId };

  const exact = lectures.filter((l) => l.title.toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0] };
  if (exact.length > 1) return { match: null, ambiguous: exact };

  const contains = lectures.filter((l) => l.title.toLowerCase().includes(q));
  if (contains.length === 1) return { match: contains[0] };
  if (contains.length > 1) return { match: null, ambiguous: contains };

  return { match: null };
}

// Master Tool Execution Function
export async function executeStudyOSTool(
  name: string,
  args: any,
  state: AppState,
  handlers: ToolExecutorHandlers
): Promise<ToolExecutionResult> {
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    switch (name) {
      // --- TASKS ---
      case 'getTasks': {
        const cat = args.category || 'all';
        let list = state.tasks;
        if (cat !== 'all') {
          list = list.filter((t) => t.category === cat);
        }
        if (args.subjectName) {
          const sub = state.subjects.find((s) => s.name.toLowerCase() === args.subjectName.toLowerCase());
          if (sub) list = list.filter((t) => t.subjectId === sub.id);
        }
        return {
          toolName: name,
          success: true,
          message: `Found ${list.length} tasks`,
          data: list.map((t) => ({ id: t.id, title: t.title, category: t.category, priority: t.priority })),
        };
      }

      case 'createTask': {
        const sub = state.subjects.find((s) => s.name.toLowerCase() === (args.subjectName || '').toLowerCase());
        const ch = state.chapters.find((c) => c.name.toLowerCase().includes((args.chapterName || '').toLowerCase()));

        await handlers.addTask({
          title: args.title,
          description: args.description,
          subjectId: sub?.id,
          chapterId: ch?.id,
          priority: (args.priority as TaskPriority) || 'high',
          category: (args.category as TaskCategory) || 'today',
          dueDate: args.dueDate || todayStr,
          estimatedMinutes: args.estimatedMinutes || 45,
          isBacklog: args.category === 'backlog',
        });
        return {
          toolName: name,
          success: true,
          message: `Created task "${args.title}" in ${args.category || 'today'} queue`,
        };
      }

      case 'updateTask': {
        const { match, ambiguous } = findBestMatchingTask(args.taskQuery, state.tasks);
        if (ambiguous && ambiguous.length > 1) {
          return {
            toolName: name,
            success: false,
            message: `Found ${ambiguous.length} tasks matching "${args.taskQuery}": ${ambiguous.map((t) => `"${t.title}"`).join(', ')}. Which one did you mean?`,
          };
        }
        if (!match) {
          return { toolName: name, success: false, message: `Task matching "${args.taskQuery}" not found.` };
        }

        const updated: Task = {
          ...match,
          priority: args.priority || match.priority,
          dueDate: args.dueDate || match.dueDate,
          category: args.category || match.category,
        };
        await handlers.updateTask(updated);
        return { toolName: name, success: true, message: `Updated task "${match.title}"` };
      }

      case 'completeTask': {
        const { match, ambiguous } = findBestMatchingTask(args.taskQuery, state.tasks);
        if (ambiguous && ambiguous.length > 1) {
          return {
            toolName: name,
            success: false,
            message: `Ambiguous match for "${args.taskQuery}": ${ambiguous.map((t) => `"${t.title}"`).join(', ')}. Please specify.`,
          };
        }
        if (!match) {
          return { toolName: name, success: false, message: `Task matching "${args.taskQuery}" not found.` };
        }
        await handlers.toggleTaskCompletion(match.id);
        return { toolName: name, success: true, message: `Completed task "${match.title}"` };
      }

      case 'uncompleteTask': {
        const { match } = findBestMatchingTask(args.taskQuery, state.tasks);
        if (!match) {
          return { toolName: name, success: false, message: `Task matching "${args.taskQuery}" not found.` };
        }
        await handlers.moveTaskCategory(match.id, 'today');
        return { toolName: name, success: true, message: `Reopened task "${match.title}" to today` };
      }

      case 'deleteTask': {
        const { match } = findBestMatchingTask(args.taskQuery, state.tasks);
        if (!match) {
          return { toolName: name, success: false, message: `Task matching "${args.taskQuery}" not found.` };
        }
        if (handlers.requestDestructiveConfirmation) {
          handlers.requestDestructiveConfirmation({
            id: `delete-task-${match.id}`,
            title: `Approve AI Deletion: Task`,
            description: `AI wants to delete task "${match.title}". Do you approve or decline this deletion?`,
            actionName: 'Delete Task',
            itemCount: 1,
            execute: async () => {
              await handlers.deleteTask(match.id);
            },
          });
          return {
            toolName: name,
            success: true,
            message: `Requested confirmation to delete task "${match.title}". Please approve in the confirmation modal.`,
            requiresConfirmation: true,
          };
        } else {
          await handlers.deleteTask(match.id);
          return { toolName: name, success: true, message: `Deleted task "${match.title}"` };
        }
      }

      case 'deleteLecture': {
        const query = (args.lectureQuery || '').toLowerCase();
        const match = state.lectures.find((l) => l.title.toLowerCase().includes(query));
        if (!match) {
          return { toolName: name, success: false, message: `Lecture matching "${args.lectureQuery}" not found.` };
        }
        if (handlers.requestDestructiveConfirmation) {
          handlers.requestDestructiveConfirmation({
            id: `delete-lec-${match.id}`,
            title: `Approve AI Deletion: Lecture`,
            description: `AI wants to delete lecture "${match.title}". Do you approve or decline this deletion?`,
            actionName: 'Delete Lecture',
            itemCount: 1,
            execute: async () => {
              await handlers.deleteLecture(match.id);
            },
          });
          return {
            toolName: name,
            success: true,
            message: `Requested confirmation to delete lecture "${match.title}". Please approve in the confirmation modal.`,
            requiresConfirmation: true,
          };
        } else {
          await handlers.deleteLecture(match.id);
          return { toolName: name, success: true, message: `Deleted lecture "${match.title}"` };
        }
      }

      case 'deletePractice': {
        const query = (args.practiceQuery || '').toLowerCase();
        const match = state.modulePractices.find((p) => p.sourceName.toLowerCase().includes(query) || p.id.toLowerCase().includes(query));
        if (!match) {
          return { toolName: name, success: false, message: `Practice record matching "${args.practiceQuery}" not found.` };
        }
        if (handlers.requestDestructiveConfirmation) {
          handlers.requestDestructiveConfirmation({
            id: `delete-prac-${match.id}`,
            title: `Approve AI Deletion: Question Practice`,
            description: `AI wants to delete practice record "${match.sourceName}". Do you approve or decline this deletion?`,
            actionName: 'Delete Practice',
            itemCount: 1,
            execute: async () => {
              await handlers.deleteModulePractice(match.id);
            },
          });
          return {
            toolName: name,
            success: true,
            message: `Requested confirmation to delete practice record "${match.sourceName}". Please approve in the confirmation modal.`,
            requiresConfirmation: true,
          };
        } else {
          await handlers.deleteModulePractice(match.id);
          return { toolName: name, success: true, message: `Deleted practice record "${match.sourceName}"` };
        }
      }

      case 'moveUnfinishedTasks': {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const targetDate = args.targetDate || d.toISOString().split('T')[0];
        const fromCat = (args.fromCategory as TaskCategory) || 'today';
        const pending = state.tasks.filter((t) => t.category === fromCat && !t.completedAt);
        if (pending.length === 0) {
          return {
            toolName: name,
            success: true,
            message: `No unfinished tasks in ${fromCat} queue to move.`,
          };
        }
        for (const t of pending) {
          await handlers.updateTask({
            ...t,
            dueDate: targetDate,
            category: 'upcoming',
          });
        }
        return {
          toolName: name,
          success: true,
          message: `Moved ${pending.length} unfinished tasks to ${targetDate}`,
        };
      }

      case 'bulkDeleteTasks': {
        let toDelete: Task[] = [];
        if (args.filterCategory === 'completed') {
          toDelete = state.tasks.filter((t) => !!t.completedAt);
        } else if (args.filterCategory === 'backlog') {
          toDelete = state.tasks.filter((t) => t.category === 'backlog');
        } else if (args.filterCategory === 'all_pending') {
          toDelete = state.tasks.filter((t) => !t.completedAt);
        } else {
          toDelete = state.tasks.filter((t) => !!t.completedAt);
        }

        if (toDelete.length === 0) {
          return { toolName: name, success: true, message: 'No matching tasks found to delete.' };
        }

        if (handlers.requestDestructiveConfirmation) {
          handlers.requestDestructiveConfirmation({
            id: `bulk-delete-${Date.now()}`,
            title: `Delete ${toDelete.length} tasks?`,
            description: `You are about to delete ${toDelete.length} tasks (${args.targetDescription || 'selected tasks'}). This action cannot be undone. Continue?`,
            actionName: 'Delete Tasks',
            itemCount: toDelete.length,
            execute: async () => {
              for (const t of toDelete) {
                await handlers.deleteTask(t.id);
              }
            },
          });
          return {
            toolName: name,
            success: true,
            message: `Requested confirmation to delete ${toDelete.length} tasks. Please confirm or cancel in the modal.`,
            requiresConfirmation: true,
          };
        } else {
          for (const t of toDelete) {
            await handlers.deleteTask(t.id);
          }
          return {
            toolName: name,
            success: true,
            message: `Deleted ${toDelete.length} tasks.`,
          };
        }
      }

      // --- BACKLOGS ---
      case 'getBacklogs': {
        const tasks = state.tasks.filter((t) => t.category === 'backlog');
        const lectures = state.lectures.filter((l) => l.status === 'not_started');
        return {
          toolName: name,
          success: true,
          message: `Backlog: ${tasks.length} tasks, ${lectures.length} unstarted lectures`,
          data: {
            tasks: tasks.map((t) => t.title),
            lectures: lectures.map((l) => l.title),
          },
        };
      }

      case 'createBacklog': {
        const sub = state.subjects.find((s) => s.name.toLowerCase() === (args.subjectName || '').toLowerCase());
        const ch = state.chapters.find((c) => c.name.toLowerCase().includes((args.chapterName || '').toLowerCase()));
        await handlers.addTask({
          title: args.title,
          category: 'backlog',
          priority: args.priority || 'high',
          dueDate: todayStr,
          subjectId: sub?.id,
          chapterId: ch?.id,
          isBacklog: true,
        });
        return { toolName: name, success: true, message: `Created backlog item "${args.title}"` };
      }

      case 'completeBacklog': {
        const { match } = findBestMatchingTask(args.backlogQuery, state.tasks);
        if (match) {
          await handlers.moveTaskCategory(match.id, 'completed');
          return { toolName: name, success: true, message: `Cleared backlog task "${match.title}"` };
        }
        return { toolName: name, success: false, message: `Backlog item "${args.backlogQuery}" not found.` };
      }

      // --- LECTURES ---
      case 'getLectures': {
        let lecs = state.lectures;
        if (args.status && args.status !== 'all') {
          lecs = lecs.filter((l) => l.status === args.status);
        }
        return {
          toolName: name,
          success: true,
          message: `Found ${lecs.length} lectures`,
          data: lecs.map((l) => ({ id: l.id, title: l.title, status: l.status, duration: l.durationMinutes })),
        };
      }

      case 'createLecture': {
        const sub = state.subjects.find((s) => s.name.toLowerCase() === (args.subjectName || '').toLowerCase()) || state.subjects[0];
        const ch = state.chapters.find((c) => c.name.toLowerCase().includes((args.chapterName || '').toLowerCase())) || state.chapters[0];
        await handlers.addLecture({
          title: args.title,
          subjectId: sub.id,
          chapterId: ch.id,
          durationMinutes: args.durationMinutes || 60,
          status: 'not_started',
          facultyOrPlatform: args.facultyOrPlatform,
          notes: args.notes,
        });
        return { toolName: name, success: true, message: `Added lecture "${args.title}" under ${sub.name}` };
      }

      case 'completeLecture': {
        const { match, ambiguous } = findBestMatchingLecture(args.lectureQuery, state.lectures);
        if (ambiguous && ambiguous.length > 1) {
          return {
            toolName: name,
            success: false,
            message: `Found multiple lectures matching "${args.lectureQuery}": ${ambiguous.map((l) => `"${l.title}"`).join(', ')}. Which one did you complete?`,
          };
        }
        if (!match) {
          return { toolName: name, success: false, message: `Lecture matching "${args.lectureQuery}" not found.` };
        }
        await handlers.setLectureStatus(match.id, 'completed');
        return { toolName: name, success: true, message: `Marked lecture "${match.title}" as completed (+50 XP)` };
      }

      case 'updateLecture': {
        const { match } = findBestMatchingLecture(args.lectureQuery, state.lectures);
        if (!match) {
          return { toolName: name, success: false, message: `Lecture "${args.lectureQuery}" not found.` };
        }
        if (args.status) {
          await handlers.setLectureStatus(match.id, args.status as LectureStatus);
        }
        return { toolName: name, success: true, message: `Updated lecture "${match.title}"` };
      }

      // --- SUBJECTS & CHAPTERS ---
      case 'getSubjects': {
        return {
          toolName: name,
          success: true,
          message: `Subjects: Physics, Chemistry, Mathematics`,
          data: state.subjects.map((s) => ({
            name: s.name,
            chaptersCount: state.chapters.filter((c) => c.subjectId === s.id).length,
          })),
        };
      }

      case 'getChapters': {
        let chs = state.chapters;
        if (args.subjectName) {
          const sub = state.subjects.find((s) => s.name.toLowerCase() === args.subjectName.toLowerCase());
          if (sub) chs = chs.filter((c) => c.subjectId === sub.id);
        }
        if (args.classYear) {
          chs = chs.filter((c) => c.classYear === args.classYear);
        }
        return {
          toolName: name,
          success: true,
          message: `Found ${chs.length} chapters`,
          data: chs.map((c) => ({ name: c.name, classYear: c.classYear, revisionStatus: c.revisionStatus, weightage: c.weightage })),
        };
      }

      case 'getWeakChapters': {
        const weak = state.chapters.filter((ch) => {
          const practice = state.modulePractices.find((p) => p.chapterId === ch.id);
          if (practice && practice.attemptedQuestions >= 20) {
            return (practice.correctQuestions / practice.attemptedQuestions) < 0.7;
          }
          return ch.weightage === 'High' && ch.revisionStatus === 'Not Started';
        });
        return {
          toolName: name,
          success: true,
          message: `Identified ${weak.length} weak/priority chapters`,
          data: weak.map((c) => c.name),
        };
      }

      // --- PRACTICE ---
      case 'getPracticeProgress': {
        const practices = state.modulePractices.map((p) => {
          const ch = state.chapters.find((c) => c.id === p.chapterId);
          const sub = state.subjects.find((s) => s.id === p.subjectId);
          return {
            chapter: ch?.name,
            subject: sub?.name,
            attempted: p.attemptedQuestions,
            correct: p.correctQuestions,
            accuracy: p.attemptedQuestions > 0 ? Math.round((p.correctQuestions / p.attemptedQuestions) * 100) : 0,
            starred: p.markedDifficult,
          };
        });
        return { toolName: name, success: true, message: `Practice progress retrieved`, data: practices };
      }

      case 'updatePracticeProgress': {
        const sub = state.subjects.find((s) => s.name.toLowerCase() === (args.subjectName || '').toLowerCase()) || state.subjects[0];
        const ch = state.chapters.find((c) => c.name.toLowerCase().includes((args.chapterName || '').toLowerCase())) || state.chapters[0];
        await handlers.recordPracticeSession(
          ch.id,
          sub.id,
          Number(args.attemptedCount),
          Number(args.correctCount || args.attemptedCount),
          args.sourceName || 'Module Practice',
          args.difficultQuestions || []
        );
        return {
          toolName: name,
          success: true,
          message: `Recorded ${args.attemptedCount} practice questions for ${ch.name}`,
        };
      }

      case 'addChapter': {
        const sub = state.subjects.find((s) => s.name.toLowerCase() === (args.subjectName || '').toLowerCase()) || state.subjects[0];
        const yr = Number(args.classYear) === 12 ? 12 : 11;
        await handlers.addChapter({
          subjectId: sub.id,
          name: args.chapterName,
          classYear: yr,
          weightage: args.weightage || 'High',
          revisionStatus: 'Not Started',
        });
        return {
          toolName: name,
          success: true,
          message: `Added new Class ${yr} chapter "${args.chapterName}" to ${sub.name}`,
        };
      }

      case 'createCustomBadge': {
        return {
          toolName: name,
          success: true,
          message: `Created and awarded custom achievement badge: "${args.title}" (${args.description})!`,
        };
      }

      // --- REVISION ---
      case 'getRevisionData': {
        const rev = state.chapters.map((c) => ({
          name: c.name,
          revisionStatus: c.revisionStatus,
          lastRevisedAt: c.lastRevisedAt,
        }));
        return { toolName: name, success: true, message: 'Revision data retrieved', data: rev };
      }

      case 'scheduleRevision': {
        const ch = state.chapters.find((c) => c.name.toLowerCase().includes(args.chapterName.toLowerCase()));
        if (!ch) {
          return { toolName: name, success: false, message: `Chapter "${args.chapterName}" not found.` };
        }
        await handlers.addTask({
          title: `Revise formulas & key theorems: ${ch.name}`,
          category: 'today',
          priority: 'high',
          dueDate: args.targetDate || todayStr,
          chapterId: ch.id,
          subjectId: ch.subjectId,
          estimatedMinutes: 30,
        });
        return { toolName: name, success: true, message: `Scheduled revision task for "${ch.name}"` };
      }

      // --- REMINDERS ---
      case 'getReminders': {
        return {
          toolName: name,
          success: true,
          message: `Found ${state.reminders.length} reminders`,
          data: state.reminders.map((r) => ({ title: r.title, date: r.targetDate, time: r.targetTime })),
        };
      }

      case 'createReminder': {
        await handlers.addReminder({
          title: args.title,
          targetDate: args.targetDate,
          targetTime: args.targetTime,
          type: args.type || 'revision',
          notes: args.notes,
        });
        return {
          toolName: name,
          success: true,
          message: `Scheduled reminder "${args.title}" at ${args.targetTime} on ${args.targetDate}`,
        };
      }

      case 'deleteReminder': {
        const found = state.reminders.find((r) => r.title.toLowerCase().includes(args.reminderQuery.toLowerCase()));
        if (!found) {
          return { toolName: name, success: false, message: `Reminder matching "${args.reminderQuery}" not found.` };
        }
        await handlers.deleteReminder(found.id);
        return { toolName: name, success: true, message: `Deleted reminder "${found.title}"` };
      }

      // --- ANALYTICS ---
      case 'getStudyAnalytics': {
        const totalMins = Math.round(state.sessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);
        return {
          toolName: name,
          success: true,
          message: 'Analytics retrieved',
          data: {
            level: state.userStats.level,
            xp: state.userStats.totalXp,
            streakDays: state.userStats.currentStreak,
            totalStudyHours: (totalMins / 60).toFixed(1),
            totalQuestionsAttempted: state.userStats.totalQuestionsAttempted,
            totalQuestionsCorrect: state.userStats.totalQuestionsCorrect,
            accuracy: state.userStats.totalQuestionsAttempted > 0
              ? Math.round((state.userStats.totalQuestionsCorrect / state.userStats.totalQuestionsAttempted) * 100)
              : 0,
          },
        };
      }

      // --- PLANNING ---
      case 'createStudyPlan': {
        const planTasks = args.tasks || [];
        let created = 0;
        for (const item of planTasks) {
          const sub = state.subjects.find((s) => s.name.toLowerCase() === (item.subjectName || '').toLowerCase());
          await handlers.addTask({
            title: item.title,
            subjectId: sub?.id,
            priority: (item.priority as TaskPriority) || 'high',
            category: 'today',
            dueDate: todayStr,
            estimatedMinutes: item.estimatedMinutes || 45,
          });
          created++;
        }
        return {
          toolName: name,
          success: true,
          message: `Created JEE Study Plan "${args.planTitle}" with ${created} scheduled tasks`,
        };
      }

      // --- EXAM TARGET ---
      case 'updateExamTarget': {
        if (handlers.updateExamTarget) {
          await handlers.updateExamTarget({
            examName: args.examName,
            sessionName: args.sessionName,
            examDate: args.examDate,
            targetSyllabusPercent: args.targetSyllabusPercent ? Number(args.targetSyllabusPercent) : undefined,
          });
          const syllabusNote = args.targetSyllabusPercent ? ` with target syllabus set to ${args.targetSyllabusPercent}%` : '';
          return {
            toolName: name,
            success: true,
            message: `Updated Exam Countdown target to "${args.examName || 'Target Exam'}" (${args.sessionName || 'Session'})${syllabusNote}`,
          };
        }
        return { toolName: name, success: false, message: 'updateExamTarget handler not available' };
      }

      default:
        return { toolName: name, success: false, message: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { toolName: name, success: false, message: `Error executing ${name}: ${err.message}` };
  }
}
