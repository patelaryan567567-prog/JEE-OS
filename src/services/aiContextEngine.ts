import { AppState } from '../types';

export interface StudyOSContextSummary {
  profile: {
    level: number;
    totalXp: number;
    currentStreak: number;
    longestStreak: number;
    todayStudyMinutes: number;
    dailyTargetMinutes: number;
    dailyTargetMet: boolean;
  };
  todaySummary: {
    totalTasksToday: number;
    completedTasksToday: number;
    pendingTasksToday: Array<{ id: string; title: string; priority: string; subject?: string; chapter?: string }>;
    activeLecturesToday: Array<{ id: string; title: string; status: string; subject?: string; chapter?: string }>;
  };
  backlogOverview: {
    totalBacklogCount: number;
    urgentTasks: Array<{ id: string; title: string; subject?: string }>;
    unstartedLecturesCount: number;
    underPracticedChapters: Array<{ name: string; subject: string; attempted: number; weightage: string }>;
  };
  subjectsBreakdown: Array<{
    name: string;
    chaptersTotal: number;
    masteredChapters: number;
    syllabusCoveredPct: number;
    questionsAttempted: number;
    accuracyPct: number;
    studyMinutes: number;
  }>;
  weakAreasAndRevisionNeeds: Array<{
    chapterName: string;
    subject: string;
    weightage: string;
    revisionStatus: string;
    accuracyPct?: number;
    reason: string;
  }>;
  recentDifficultStarredQuestions: Array<{
    chapter: string;
    subject: string;
    questions: string[];
  }>;
  examTargetInfo?: {
    examName: string;
    sessionName: string;
    examDate: string;
    daysLeft: number;
    targetSyllabusPercent: number;
    currentSyllabusCoveredPercent: number;
    totalChapters: number;
    startedChapters: number;
  };
  relevantQueryCalculations?: Record<string, any>;
}

export function buildStudyOSContext(state: AppState, userQuery: string = ''): StudyOSContextSummary {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Profile & Daily study
  const todaySessions = state.sessions.filter(
    (s) => s.completedAt.split('T')[0] === todayStr
  );
  const todayStudySeconds = todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const todayStudyMinutes = Math.round(todayStudySeconds / 60);

  // 2. Today's Tasks
  const todayTasks = state.tasks.filter((t) => t.category === 'today');
  const completedTodayTasks = todayTasks.filter((t) => !!t.completedAt);
  const pendingTodayTasks = todayTasks
    .filter((t) => !t.completedAt)
    .map((t) => {
      const sub = state.subjects.find((s) => s.id === t.subjectId);
      const ch = state.chapters.find((c) => c.id === t.chapterId);
      return {
        id: t.id,
        title: t.title,
        priority: t.priority,
        subject: sub?.name,
        chapter: ch?.name,
      };
    });

  // Today's Lectures
  const activeLecturesToday = state.lectures
    .filter((l) => l.scheduledDate === todayStr || l.status === 'in_progress')
    .map((l) => {
      const sub = state.subjects.find((s) => s.id === l.subjectId);
      const ch = state.chapters.find((c) => c.id === l.chapterId);
      return {
        id: l.id,
        title: l.title,
        status: l.status,
        subject: sub?.name,
        chapter: ch?.name,
      };
    });

  // 3. Backlog items
  const backlogTasks = state.tasks.filter((t) => t.category === 'backlog');
  const unstartedLectures = state.lectures.filter((l) => l.status === 'not_started');
  const underPracticedChaptersList = state.chapters
    .filter((ch) => {
      const practice = state.modulePractices.find((p) => p.chapterId === ch.id);
      return !practice || practice.attemptedQuestions < 35;
    })
    .map((ch) => {
      const sub = state.subjects.find((s) => s.id === ch.subjectId);
      const practice = state.modulePractices.find((p) => p.chapterId === ch.id);
      return {
        name: ch.name,
        subject: sub?.name || 'General',
        attempted: practice?.attemptedQuestions || 0,
        weightage: ch.weightage,
      };
    })
    .slice(0, 5);

  // 4. Subjects Breakdown
  const subjectsBreakdown = state.subjects.map((sub) => {
    const chs = state.chapters.filter((c) => c.subjectId === sub.id);
    const mastered = chs.filter((c) => c.revisionStatus === 'Mastered').length;
    const covered = chs.filter((c) => c.revisionStatus !== 'Not Started').length;
    const coveragePct = chs.length > 0 ? Math.round((covered / chs.length) * 100) : 0;

    const practices = state.modulePractices.filter((p) => p.subjectId === sub.id);
    const attempted = practices.reduce((acc, p) => acc + p.attemptedQuestions, 0);
    const correct = practices.reduce((acc, p) => acc + p.correctQuestions, 0);
    const accPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

    const subSessions = state.sessions.filter((s) => s.subjectId === sub.id);
    const studyMins = Math.round(
      subSessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
    );

    return {
      name: sub.name,
      chaptersTotal: chs.length,
      masteredChapters: mastered,
      syllabusCoveredPct: coveragePct,
      questionsAttempted: attempted,
      accuracyPct: accPct,
      studyMinutes: studyMins,
    };
  });

  // 5. Weak areas & Urgent revision needs
  const weakAreas: StudyOSContextSummary['weakAreasAndRevisionNeeds'] = [];
  state.chapters.forEach((ch) => {
    const sub = state.subjects.find((s) => s.id === ch.subjectId);
    const practice = state.modulePractices.find((p) => p.chapterId === ch.id);
    if (practice && practice.attemptedQuestions >= 20) {
      const acc = Math.round((practice.correctQuestions / practice.attemptedQuestions) * 100);
      if (acc < 70) {
        weakAreas.push({
          chapterName: ch.name,
          subject: sub?.name || '',
          weightage: ch.weightage,
          revisionStatus: ch.revisionStatus,
          accuracyPct: acc,
          reason: `Low accuracy rate (${acc}%) in module questions.`,
        });
      }
    } else if (ch.weightage === 'High' && ch.revisionStatus === 'Not Started') {
      weakAreas.push({
        chapterName: ch.name,
        subject: sub?.name || '',
        weightage: ch.weightage,
        revisionStatus: ch.revisionStatus,
        reason: 'High JEE weightage chapter not started yet.',
      });
    }
  });

  // 6. Recent Starred Difficult Questions
  const starred = state.modulePractices
    .filter((p) => p.markedDifficult && p.markedDifficult.length > 0)
    .slice(0, 4)
    .map((p) => {
      const ch = state.chapters.find((c) => c.id === p.chapterId);
      const sub = state.subjects.find((s) => s.id === p.subjectId);
      return {
        chapter: ch?.name || 'Chapter',
        subject: sub?.name || '',
        questions: p.markedDifficult,
      };
    });

  // 7. Dynamic targeted calculations based on query keywords
  const queryLower = userQuery.toLowerCase();
  const relevantQueryCalculations: Record<string, any> = {};

  if (queryLower.includes('week') || queryLower.includes('weekly')) {
    const past7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const weeklySessions = state.sessions.filter((s) =>
      past7Days.includes(s.completedAt.split('T')[0])
    );
    const weeklyMinutes = Math.round(
      weeklySessions.reduce((acc, s) => acc + s.durationSeconds, 0) / 60
    );
    relevantQueryCalculations.past7DaysStudyHours = (weeklyMinutes / 60).toFixed(1);
    relevantQueryCalculations.weeklySessionsCount = weeklySessions.length;
  }

  if (queryLower.includes('physics') || queryLower.includes('phy')) {
    const phySub = subjectsBreakdown.find((s) => s.name === 'Physics');
    const remainingPhyChapters = state.chapters.filter(
      (c) => c.subjectId === 'subj-phy' && c.revisionStatus === 'Not Started'
    );
    relevantQueryCalculations.physicsRemainingChapters = remainingPhyChapters.map((c) => c.name);
    relevantQueryCalculations.physicsCoverage = `${phySub?.syllabusCoveredPct}%`;
  }

  if (queryLower.includes('chemistry') || queryLower.includes('chem')) {
    const chemSub = subjectsBreakdown.find((s) => s.name === 'Chemistry');
    const remainingChemChapters = state.chapters.filter(
      (c) => c.subjectId === 'subj-chem' && c.revisionStatus === 'Not Started'
    );
    relevantQueryCalculations.chemistryRemainingChapters = remainingChemChapters.map((c) => c.name);
    relevantQueryCalculations.chemistryCoverage = `${chemSub?.syllabusCoveredPct}%`;
  }

  if (queryLower.includes('math') || queryLower.includes('maths')) {
    const mathSub = subjectsBreakdown.find((s) => s.name === 'Mathematics');
    const remainingMathChapters = state.chapters.filter(
      (c) => c.subjectId === 'subj-math' && c.revisionStatus === 'Not Started'
    );
    relevantQueryCalculations.mathRemainingChapters = remainingMathChapters.map((c) => c.name);
    relevantQueryCalculations.mathCoverage = `${mathSub?.syllabusCoveredPct}%`;
  }

  // 8. Exam Target and Countdown details
  const examTarget = state.userStats.examTarget || {
    examName: 'JEE Mains 2026 Target',
    sessionName: 'Session 1',
    examDate: '2026-01-24',
    targetSyllabusPercent: 100,
  };
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const targetDateObj = new Date(examTarget.examDate);
  targetDateObj.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(0, Math.ceil((targetDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
  const totalChaptersCount = state.chapters.length || 45;
  const startedChaptersCount = state.chapters.filter((c) => c.revisionStatus !== 'Not Started').length;
  const currentSyllabusCoveredPercent = totalChaptersCount > 0 ? Math.round((startedChaptersCount / totalChaptersCount) * 100) : 0;

  return {
    profile: {
      level: state.userStats.level,
      totalXp: state.userStats.totalXp,
      currentStreak: state.userStats.currentStreak,
      longestStreak: state.userStats.longestStreak,
      todayStudyMinutes,
      dailyTargetMinutes: 360,
      dailyTargetMet: todayStudyMinutes >= 360,
    },
    todaySummary: {
      totalTasksToday: todayTasks.length,
      completedTasksToday: completedTodayTasks.length,
      pendingTasksToday: pendingTodayTasks,
      activeLecturesToday,
    },
    backlogOverview: {
      totalBacklogCount: backlogTasks.length + unstartedLectures.length,
      urgentTasks: backlogTasks.slice(0, 5).map((t) => {
        const sub = state.subjects.find((s) => s.id === t.subjectId);
        return { id: t.id, title: t.title, subject: sub?.name };
      }),
      unstartedLecturesCount: unstartedLectures.length,
      underPracticedChapters: underPracticedChaptersList,
    },
    subjectsBreakdown,
    weakAreasAndRevisionNeeds: weakAreas.slice(0, 6),
    recentDifficultStarredQuestions: starred,
    examTargetInfo: {
      examName: examTarget.examName,
      sessionName: examTarget.sessionName,
      examDate: examTarget.examDate,
      daysLeft,
      targetSyllabusPercent: examTarget.targetSyllabusPercent || 100,
      currentSyllabusCoveredPercent,
      totalChapters: totalChaptersCount,
      startedChapters: startedChaptersCount,
    },
    relevantQueryCalculations:
      Object.keys(relevantQueryCalculations).length > 0 ? relevantQueryCalculations : undefined,
  };
}
