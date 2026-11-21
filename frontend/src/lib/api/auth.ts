import { supabase } from '../supabase';
import { cachedQuery } from '../queryCache';
import { cleanPhoneSuffix } from '../utils';

export { cleanPhoneSuffix } from '../utils';

/**
 * Base URL for the backend API service when deployed as a separate server.
 * Defaults to empty string (same domain / proxy), or e.g. 'https://api.aspirenext.com'
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

/**
 * Resolves a student record from Supabase matching their mobile number.
 */
export async function fetchStudentByPhone(phone: string) {
  const searchSuffix = cleanPhoneSuffix(phone);
  if (!searchSuffix) return null;

  return cachedQuery(`student_phone:${searchSuffix}`, async () => {
    const pickExact = (rows: any[]) =>
      rows.find((s: any) => s?.mobile_number && cleanPhoneSuffix(s.mobile_number) === searchSuffix) || rows[0] || null;

    // SECURITY (preferred): the get_student_by_phone SECURITY DEFINER RPC returns ONLY the single matching
    // row, so once the 20260905000000_lock_students_pii migration is applied (which also revokes anon SELECT
    // on `students`), the PII table can't be dumped with the public anon key.
    const { data, error } = await supabase.rpc('get_student_by_phone', { suffix: searchSuffix });

    if (!error) {
      return pickExact(Array.isArray(data) ? data : data ? [data] : []);
    }

    // Migration not applied yet (RPC missing → PGRST202) — fall back to the direct suffix lookup so LOGIN
    // KEEPS WORKING. This path stops working (by design) only after the migration revokes anon SELECT, at
    // which point the RPC above succeeds instead. Any error other than "function not found" is re-thrown.
    const fnMissing = error.code === 'PGRST202' || /Could not find the function|schema cache/i.test(error.message || '');
    if (!fnMissing) {
      console.error('Error fetching student by phone (RPC):', error);
      throw error;
    }
    console.warn('get_student_by_phone RPC not found — using direct lookup (apply 20260905000000_lock_students_pii to enable the secure path).');

    const { data: rows, error: err2 } = await supabase
      .from('students')
      .select('*')
      .ilike('mobile_number', `%${searchSuffix}`)
      .limit(5);
    if (err2) {
      console.error('Error fetching student by phone (fallback):', err2);
      throw err2;
    }
    return pickExact(rows || []);
  }, 15_000); // 15 seconds
}

/**
 * Resolves a cohort batch category (e.g. 'Weekday' or 'Weekend') by batch code.
 */
export async function fetchBatchCategory(batchCode: string): Promise<'Weekday' | 'Weekend' | null> {
  return cachedQuery(`batch_category:${batchCode}`, async () => {
    const { data, error } = await supabase
      .from('batches')
      .select('category')
      .eq('code', batchCode)
      .maybeSingle();

    if (error) {
      console.error('Error fetching batch category:', error);
      throw error;
    }

    return (data?.category as 'Weekday' | 'Weekend') || null;
  }, 300_000); // 5 minutes — batch categories rarely change
}

/**
 * Fetches the real-time student count for a specific batch code.
 * Queries the students table for exact count, and falls back to batches table.
 */
export async function fetchBatchStudentCount(batchCode?: string): Promise<number> {
  if (!batchCode) return 1;
  return cachedQuery(`batch_count:${batchCode}`, async () => {
    try {
      const { count, error } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('batch', batchCode);

      if (!error && typeof count === 'number' && count > 0) {
        return count;
      }

      const { data: bData } = await supabase
        .from('batches')
        .select('student_count')
        .eq('code', batchCode)
        .maybeSingle();

      if (bData?.student_count && bData.student_count > 0) {
        return bData.student_count;
      }

      return typeof count === 'number' && count > 0 ? count : 1;
    } catch (err) {
      console.warn('Failed to fetch batch student count:', err);
      return 1;
    }
  }, 300_000); // 5 minutes
}

export async function getBatchesMap(): Promise<{ codeToId: Record<string, string>; idToCode: Record<string, string> }> {
  return cachedQuery('batches_map', async () => {
    try {
      const { data, error } = await supabase.from('batches').select('id, code');
      if (error || !data) return { codeToId: {}, idToCode: {} };
      const codeToId: Record<string, string> = {};
      const idToCode: Record<string, string> = {};
      data.forEach((b: any) => {
        if (b.id && b.code) {
          const upper = String(b.code).trim().toUpperCase();
          codeToId[upper] = b.id;
          codeToId[String(b.code).trim()] = b.id;
          idToCode[b.id] = b.code;
        }
      });
      return { codeToId, idToCode };
    } catch {
      return { codeToId: {}, idToCode: {} };
    }
  }, 300_000); // 5 minutes cache
}
