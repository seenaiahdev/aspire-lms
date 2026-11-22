import { supabase } from '../supabase';
import { cachedQuery, invalidateCache } from '../queryCache';
import { incrementUserXP, recalculateUserStreak } from './gamification';

export async function fetchQuizAttempts(userId: string) {
  if (!userId || userId === 'guest') return [];
  return cachedQuery(`student_qa_full:${userId}`, async () => {
    try {
      const { data, error } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('attempted_at', { ascending: false });

      if (error) {
        console.warn('quiz_attempts table not available:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  }, 15_000); // 15 seconds
}

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  score: number,
  answers?: number[],
  totalQuestions?: number,
  correctAnswers?: number
) {
  try {
    let verifiedScore = score;
    let verifiedCorrect = correctAnswers;
    let verifiedTotal = totalQuestions;

    if (answers && answers.length > 0) {
      try {
        const { data: quizData } = await supabase
          .from('quizzes')
          .select('mcqs')
          .eq('id', quizId)
          .maybeSingle();

        if (quizData?.mcqs && Array.isArray(quizData.mcqs) && quizData.mcqs.length > 0) {
          verifiedTotal = quizData.mcqs.length;
          let matched = 0;
          quizData.mcqs.forEach((q: any, i: number) => {
            if (q.correctIndex !== undefined && answers[i] === q.correctIndex) {
              matched++;
            }
          });
          verifiedCorrect = matched;
          verifiedScore = Math.round((matched / verifiedTotal) * 100);
        }
      } catch (evalErr) {
        console.warn('Authoritative quiz scoring evaluation note:', evalErr);
      }
    }

    const isPassed = verifiedScore >= 70;
    const baseRow = {
      user_id: userId,
      quiz_id: quizId,
      score: verifiedScore,
      total_questions: verifiedTotal ?? null,
      correct_answers: verifiedCorrect ?? null,
      status: isPassed ? 'passed' : 'failed',
      attempted_at: new Date().toISOString(),
    };

    let savedRow: any = null;
    const { data: withAns, error } = await supabase
      .from('quiz_attempts')
      .insert({ ...baseRow, answers: answers ?? [] })
      .select()
      .single();
    if (!error) {
      savedRow = withAns;
    } else {
      console.warn('Quiz attempt insert with answers failed, retrying without:', error.message);
      const { data: noAns, error: err2 } = await supabase
        .from('quiz_attempts')
        .insert(baseRow)
        .select()
        .single();
      if (err2) {
        console.error('Error inserting quiz attempt:', err2.message);
        throw err2;
      }
      savedRow = noAns;
    }

    const AUTHORITATIVE_QUIZ_XP = 10;
    if (isPassed) {
      try {
        await incrementUserXP(userId, AUTHORITATIVE_QUIZ_XP);
        await recalculateUserStreak(userId);
      } catch (xpErr) {
        console.warn('Failed to increment XP for passed quiz:', xpErr);
      }
    }

    invalidateCache(`student_qa:${userId}`);
    invalidateCache(`student_qa_full:${userId}`);
    invalidateCache(`student_profile:${userId}`);

    return savedRow;
  } catch (err) {
    console.error('submitQuizAttempt failed:', err);
    throw err;
  }
}

export async function deleteQuizAttempt(userId: string, quizId: string) {
  try {
    const { error } = await supabase
      .from('quiz_attempts')
      .delete()
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    if (error) throw error;
    invalidateCache(`student_qa:${userId}`);
    invalidateCache(`student_qa_full:${userId}`);
    invalidateCache(`student_profile:${userId}`);
  } catch (err) {
    console.error('Failed to delete quiz attempt:', err);
    throw err;
  }
}

export async function submitPracticeProblem(
  userId: string,
  problemId: string,
  language: string,
  _code?: string,
  _sandboxUrl?: string,
  storageUrl?: string,
  projectName?: string,
  fileCount: number = 1,
  totalSize: number = 0,
  rewardXp?: number
) {
  let priorRow: { id: string; attempt_count?: number } | null = null;
  try {
    const { data } = await supabase
      .from('practice_submissions')
      .select('id, attempt_count')
      .eq('student_id', userId)
      .eq('problem_id', problemId)
      .maybeSingle();
    priorRow = data;
  } catch {
    priorRow = null;
  }

  const meta = {
    storage_url: storageUrl,
    project_name: projectName,
    file_count: fileCount,
    total_size: totalSize,
    language,
    status: 'solved',
    submitted_at: new Date().toISOString(),
  };

  if (priorRow) {
    try {
      await supabase
        .from('practice_submissions')
        .update({ ...meta, attempt_count: (priorRow.attempt_count || 1) + 1 })
        .eq('id', priorRow.id);
    } catch (e) {
      console.warn('Failed to update practice submission:', e);
    }
    invalidateCache(`student_ps:${userId}`);
    invalidateCache(`student_ps_full:${userId}`);
    invalidateCache(`student_profile:${userId}`);
    return priorRow;
  }

  const row = { id: `psub-${Date.now()}`, student_id: userId, problem_id: problemId, attempt_count: 1, ...meta };
  const { data, error } = await supabase.from('practice_submissions').insert(row).select().single();

  if (error) {
    console.error('Error storing practice submission:', error.message);
    throw error;
  }

  const AUTHORITATIVE_PRACTICE_XP = 25;
  try {
    await incrementUserXP(userId, AUTHORITATIVE_PRACTICE_XP);
    await recalculateUserStreak(userId);
  } catch (xpErr) {
    console.warn('Failed to increment XP / recalculate streak after solving problem:', xpErr);
  }

  invalidateCache(`student_ps:${userId}`);
  invalidateCache(`student_ps_full:${userId}`);
  invalidateCache(`student_profile:${userId}`);

  return data;
}

export async function fetchUserSubmissions(userId: string) {
  if (!userId || userId === 'guest') return [];
  return cachedQuery(`student_ps_full:${userId}`, async () => {
    const { data, error } = await supabase
      .from('practice_submissions')
      .select('*')
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('practice_submissions table not available:', error.message);
      return [];
    }
    return data || [];
  }, 300_000); // 5 minutes cache (invalidated on submit/delete)
}

export async function deletePracticeSubmission(studentId: string, problemId: string) {
  try {
    const { error } = await supabase
      .from('practice_submissions')
      .delete()
      .eq('student_id', studentId)
      .eq('problem_id', problemId);

    if (error) throw error;
    invalidateCache(`student_ps:${studentId}`);
    invalidateCache(`student_ps_full:${studentId}`);
    invalidateCache(`student_profile:${studentId}`);
  } catch (err) {
    console.error('Failed to delete practice submission:', err);
    throw err;
  }
}

export async function rejectPracticeSubmission(studentId: string, problemId: string) {
  try {
    const { error } = await supabase
      .from('practice_submissions')
      .update({ status: 'rejected' })
      .eq('student_id', studentId)
      .eq('problem_id', problemId);

    if (error) throw error;
    invalidateCache(`student_ps:${studentId}`);
    invalidateCache(`student_ps_full:${studentId}`);
    invalidateCache(`student_profile:${studentId}`);
  } catch (err) {
    console.error('Failed to reject practice submission:', err);
    throw err;
  }
}

export async function submitAssignmentAttempt(
  userId: string,
  assignmentId: string,
  status: 'pending' | 'submitted' | 'reviewed' | 'overdue',
  grade?: number,
  _feedback?: string,
  _attachments: number = 0,
  rewardXp?: number,
  answers?: number[]
) {
  let verifiedScore = grade ?? 0;
  if (answers && answers.length > 0) {
    try {
      const { data: assess } = await supabase
        .from('assessments')
        .select('mcqs')
        .eq('id', assignmentId)
        .maybeSingle();
      if (assess?.mcqs && Array.isArray(assess.mcqs) && assess.mcqs.length > 0) {
        let correctCount = 0;
        assess.mcqs.forEach((q: any, i: number) => {
          if (q.correctIndex !== undefined && answers[i] === q.correctIndex) {
            correctCount++;
          }
        });
        verifiedScore = Math.round((correctCount / assess.mcqs.length) * 100);
      }
    } catch (e) {
      console.warn('Authoritative assessment scoring note:', e);
    }
  }
  const score = verifiedScore;

  let priorRow: { id: string; attempt_count?: number } | null = null;
  try {
    const { data } = await supabase
      .from('assessment_attempts')
      .select('id, attempt_count')
      .eq('student_id', userId)
      .eq('assignment_id', assignmentId)
      .maybeSingle();
    priorRow = data;
  } catch {
    priorRow = null;
  }

  if (priorRow) {
    try {
      await supabase
        .from('assessment_attempts')
        .update({ attempt_count: (priorRow.attempt_count || 1) + 1 })
        .eq('id', priorRow.id);
    } catch (e) {
      console.warn('Failed to bump assessment attempt_count:', e);
    }
    invalidateCache(`student_aa:${userId}`);
    invalidateCache(`student_aa_full:${userId}`);
    invalidateCache(`student_profile:${userId}`);
    return priorRow;
  }

  const row = {
    id: `aatt-${Date.now()}`,
    student_id: userId,
    assignment_id: assignmentId,
    score,
    status,
    attempt_count: 1,
    submitted_at: new Date().toISOString(),
  };

  let data: any = null;
  {
    const { data: withAns, error } = await supabase
      .from('assessment_attempts')
      .insert({ ...row, answers: answers ?? [] })
      .select()
      .single();
    if (error) {
      console.warn('Assessment attempt insert with answers failed, retrying without:', error.message);
      const { data: noAns, error: err2 } = await supabase
        .from('assessment_attempts')
        .insert(row)
        .select()
        .single();
      if (err2) {
        console.error('Error storing assessment attempt:', err2.message);
        throw err2;
      }
      data = noAns;
    } else {
      data = withAns;
    }
  }

  const AUTHORITATIVE_ASSESSMENT_MAX_XP = 25;
  try {
    if (score >= 70) {
      const pointsAwarded = Math.max(0, Math.min(AUTHORITATIVE_ASSESSMENT_MAX_XP, Math.round((score / 100) * AUTHORITATIVE_ASSESSMENT_MAX_XP)));
      if (pointsAwarded > 0) {
        await incrementUserXP(userId, pointsAwarded);
      }
      await recalculateUserStreak(userId);
    }
  } catch (xpErr) {
    console.warn('Failed to increment XP / recalculate streak after assessment attempt:', xpErr);
  }

  invalidateCache(`student_aa:${userId}`);
  invalidateCache(`student_aa_full:${userId}`);
  invalidateCache(`student_profile:${userId}`);

  return data;
}

export async function fetchAssignmentAttempts(userId: string) {
  if (!userId || userId === 'guest') return [];
  return cachedQuery(`student_aa_full:${userId}`, async () => {
    const { data, error } = await supabase
      .from('assessment_attempts')
      .select('*')
      .eq('student_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('assessment_attempts table not available:', error.message);
      return [];
    }
    return data || [];
  }, 15_000); // 15 seconds
}

export async function deleteAssessmentAttempt(studentId: string, assignmentId: string) {
  try {
    const { error } = await supabase
      .from('assessment_attempts')
      .delete()
      .eq('student_id', studentId)
      .eq('assignment_id', assignmentId);

    if (error) throw error;
    invalidateCache(`student_aa:${studentId}`);
    invalidateCache(`student_aa_full:${studentId}`);
    invalidateCache(`student_profile:${studentId}`);
  } catch (err) {
    console.error('Failed to delete assessment attempt:', err);
    throw err;
  }
}
