import { supabase } from '../supabase';
import { cachedQuery, invalidateCache, invalidateCacheByPrefix } from '../queryCache';
import { API_BASE_URL } from './auth';
import type { AttendanceRecord, AttendanceStats } from '../../types';

export interface StudentProfileRow {
  student_id: string;
  bio: string;
  program: string;
  college?: string;
  start_year?: number;
  end_year?: number;
  skills: { name: string; level: number }[];
  socials: { label: string; value: string }[];
  notif_assignments: boolean;
  notif_live: boolean;
  notif_placement: boolean;
  notif_weekly: boolean;
  connected_github: boolean;
  connected_linkedin: boolean;
  connected_portfolio: boolean;
  progress?: number;
  course_progress?: Record<string, number>;
  attendance?: number;
  gpa?: number;
  xp?: number;
  updated_at: string;
  created_at: string;
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfileRow | null> {
  if (!studentId || studentId === 'guest') return null;
  return cachedQuery(`student_profile:${studentId}`, async () => {
    const { data, error } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching student profile:', error);
      return null;
    }

    return data as StudentProfileRow | null;
  }, 30_000); // 30 seconds
}

export async function upsertStudentProfile(
  studentId: string,
  updates: Partial<Omit<StudentProfileRow, 'student_id' | 'created_at'>>
): Promise<StudentProfileRow | null> {
  const { data, error } = await supabase
    .from('student_profiles')
    .upsert(
      { student_id: studentId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'student_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting student profile:', error);
    throw error;
  }

  invalidateCache(`student_profile:${studentId}`);
  return data as StudentProfileRow;
}

function resizeImageToDataUrl(file: File, size = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas unavailable'));
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error('could not read image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('could not read file'));
    reader.readAsDataURL(file);
  });
}

export async function updateStudentAvatar(studentId: string, file: File): Promise<string> {
  const dataUrl = await resizeImageToDataUrl(file, 256);
  let finalUrl = dataUrl;
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const path = `avatars/${String(studentId).replace(/[^a-zA-Z0-9._-]/g, '_')}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('submissions').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
    if (!error) {
      const { data } = supabase.storage.from('submissions').getPublicUrl(path);
      if (data?.publicUrl) finalUrl = data.publicUrl;
    }
  } catch {}
  try {
    const { error: rpcErr } = await supabase.rpc('update_student_avatar', {
      p_student_id: studentId,
      p_avatar_url: finalUrl,
    });
    if (!rpcErr) return finalUrl;
  } catch {}
  const { error: updErr } = await supabase.from('students').update({ avatar: finalUrl }).eq('id', studentId);
  if (updErr) throw updErr;
  return finalUrl;
}

export async function fetchJobs(batchCategory: string, batchCode: string = '') {
  return cachedQuery(`jobs:${batchCategory}:${batchCode}`, async () => {
    const targetBatchStr = batchCategory === 'Weekday' ? 'Weekday Batch' : 'Weekend Batch';
    let orQuery = `target_batch.is.null,target_batch.eq.All Batches,target_batch.eq.${targetBatchStr}`;
    if (batchCode) {
      orQuery += `,target_batch.eq.${batchCode}`;
    }

    const { data, error } = await supabase
      .from('jobs')
      .select('id, company, job_title, location, job_type, salary, posted_date, logo, description, publish_status, tech_stack, is_locked')
      .or(orQuery);

    if (error) {
      console.warn('Warning: jobs fetch returned error (falling back to empty):', error);
      return [];
    }

    if (!data) return [];

    return data
      .filter((item: any) => !item.is_locked)
      .map((item: any) => {
        let skills: string[] = ['Python', 'Django', 'SQL'];
        if (item.tech_stack) {
          if (Array.isArray(item.tech_stack)) {
            skills = item.tech_stack;
          } else if (typeof item.tech_stack === 'string') {
            try {
              const parsed = JSON.parse(item.tech_stack);
              if (Array.isArray(parsed)) skills = parsed;
              else skills = item.tech_stack.split(',').map((s: string) => s.trim()).filter(Boolean);
            } catch {
              skills = item.tech_stack.split(',').map((s: string) => s.trim()).filter(Boolean);
            }
          }
        }

        return {
          id: item.id,
          company: item.company || 'TechCorp Solutions',
          role: item.job_title || 'Software Engineer',
          location: item.location || 'Remote',
          type: item.job_type || 'Full-Time',
          salary: item.salary || 'LPA',
          posted: item.posted_date || 'Recent',
          logo: item.logo || '',
          description: item.description || 'Job details...',
          status: item.publish_status === 'Closed' ? 'closed' : 'open',
          skills,
          isLocked: item.is_locked ?? false
        };
      });
  }, 60_000); // 60 seconds
}

export async function fetchPlacementResources() {
  return cachedQuery('placement_resources', async () => {
    try {
      const { data, error } = await supabase
        .from('placement_resources')
        .select('*')
        .eq('publish_status', 'Published')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching placement resources:', error);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  });
}

export async function submitJobApplication(application: {
  student_id: string;
  job_id: string;
  full_name: string;
  contact_number: string;
  resume_link: string;
  cover_letter?: string;
}) {
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      id: `app-${Date.now()}`,
      student_id: application.student_id,
      job_id: application.job_id,
      full_name: application.full_name,
      contact_number: application.contact_number,
      resume_link: application.resume_link,
      cover_letter: application.cover_letter || null,
      status: 'applied',
      applied_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting job application:', error);
    throw error;
  }
  invalidateCache(`job_applications:${application.student_id}`);
  return data;
}

export async function fetchJobApplications(studentId: string) {
  if (!studentId || studentId === 'guest') return [];
  return cachedQuery(`job_applications:${studentId}`, async () => {
    const { data, error } = await supabase
      .from('job_applications')
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching job applications:', error);
      return [];
    }
    return data || [];
  }, 30_000); // 30 seconds
}

export async function fetchPersonalTasks(studentId: string) {
  if (!studentId || studentId === 'guest') return [];
  return cachedQuery(`personal_tasks:${studentId}`, async () => {
    const { data, error } = await supabase
      .from('personal_tasks')
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      console.error('Error fetching personal tasks:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      student_id: row.student_id,
      title: row.title,
      type: row.type,
      date: row.date,
      dateKey: row.date_key,
      time: row.time,
      completed: row.completed
    }));
  }, 15_000); // 15 seconds
}

export async function submitPersonalTask(task: {
  id: string;
  student_id: string;
  title: string;
  type: string;
  date: string;
  dateKey: string;
  time: string;
  completed: boolean;
}) {
  const { data, error } = await supabase
    .from('personal_tasks')
    .insert({
      id: task.id,
      student_id: task.student_id,
      title: task.title,
      type: task.type,
      date: task.date,
      date_key: task.dateKey,
      time: task.time,
      completed: task.completed
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting personal task:', error);
    throw error;
  }
  invalidateCache(`personal_tasks:${task.student_id}`);
  return data;
}

export async function updatePersonalTaskCompletion(taskId: string, completed: boolean) {
  const { data, error } = await supabase
    .from('personal_tasks')
    .update({ completed: completed })
    .eq('id', taskId);

  if (error) {
    console.error('Error updating personal task completion:', error);
    throw error;
  }
  invalidateCacheByPrefix('personal_tasks:');
  return data;
}

export async function deletePersonalTask(taskId: string): Promise<{ success: boolean; deleted?: boolean; error?: string }> {
  if (!taskId) {
    throw new Error('Task ID is required for deletion.');
  }

  const sessionToken = typeof window !== 'undefined' ? localStorage.getItem('aspire_session_token') : null;
  if (sessionToken && API_BASE_URL) {
    try {
      const resp = await fetch(`${API_BASE_URL}/api/delete-personal-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ taskId }),
      });

      if (resp.ok) {
        const data = await resp.json();
        invalidateCacheByPrefix('personal_tasks:');
        return { success: true, deleted: data.deleted !== false };
      }
    } catch {}
  }

  const { data, error } = await supabase
    .from('personal_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting personal task:', error);
    throw error;
  }

  invalidateCacheByPrefix('personal_tasks:');
  return { success: true, deleted: true };
}

export function invalidateAttendanceCache(studentId?: string) {
  if (studentId) {
    invalidateCacheByPrefix(`attendance_stats:${studentId}`);
  } else {
    invalidateCacheByPrefix('attendance_stats:');
  }
}

export async function fetchStudentAttendanceStats(
  studentId: string,
  batchCode?: string,
  registrationId?: string
): Promise<AttendanceStats> {
  if (!studentId || studentId === 'guest') {
    return {
      percentage: 0,
      presentCount: 0,
      absentCount: 0,
      totalSessions: 0,
      records: [],
    };
  }

  const cacheKey = `attendance_stats:${studentId}:${registrationId || ''}:${batchCode || ''}`;
  return cachedQuery(cacheKey, async () => {
    try {
      let query = supabase
        .from('attendance_records')
        .select('*');

      if (registrationId && registrationId !== studentId) {
        query = query.or(`student_id.eq.${studentId},student_id.eq.${registrationId}`);
      } else {
        query = query.eq('student_id', studentId);
      }

      const { data: studentRecords, error: errStudent } = await query.order('date', { ascending: false });

      if (errStudent) {
        console.warn('Error fetching student attendance records:', errStudent);
      }

      const records: AttendanceRecord[] = (studentRecords as AttendanceRecord[]) || [];

      const presentCount = records.filter((r) => {
        const s = (r.status || '').toLowerCase().trim();
        return s === 'present' || s === 'attended' || s === 'late';
      }).length;

      const absentCount = records.filter((r) => {
        const s = (r.status || '').toLowerCase().trim();
        return s === 'absent';
      }).length;

      const totalSessions = presentCount + absentCount;

      let percentage = 0;
      if (totalSessions > 0) {
        percentage = Math.min(100, Math.max(0, Math.round((presentCount / totalSessions) * 100)));
      }

      const latestRecord = records.length > 0 ? records[0] : undefined;

      return {
        percentage,
        presentCount,
        absentCount,
        totalSessions,
        records,
        latestRecord,
      };
    } catch (err) {
      console.error('Failed to compute attendance stats:', err);
      return {
        percentage: 0,
        presentCount: 0,
        absentCount: 0,
        totalSessions: 0,
        records: [],
      };
    }
  }, 10_000); // 10s TTL
}

export async function fetchCommunityPosts() {
  return cachedQuery('community_posts', async () => {
    try {
      const { data, error } = await supabase
        .from('community_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('community_posts table not available:', error.message);
        return [];
      }
      return data || [];
    } catch {
      return [];
    }
  });
}
