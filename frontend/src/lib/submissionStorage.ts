import { supabase } from './supabase';
import type { ProjectBundle } from '@/components/practice/FileExplorerViewer';

const BUCKET = 'submissions';

/** Make a student/problem id safe for a storage object path. */
function slug(s: string): string {
  return String(s || 'anon').replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Uploads a submission bundle to the Supabase Storage `submissions` bucket and returns its
 * public URL. Keeps DB consumption low: only the returned URL + metadata is stored in the DB,
 * never the files themselves. The path is deterministic (`<student>/<kind>/<item>.json`) so a
 * re-submit OVERWRITES the previous object — no orphaned files accumulate.
 *
 * Best-effort: returns `null` if the bucket is missing or the upload fails, so callers can fall
 * back to the local (browser) link.
 */
export async function uploadSubmissionBundle(
  bundle: ProjectBundle,
  studentId: string,
  itemId: string,
  kind: 'practice' | 'project' = 'practice'
): Promise<string | null> {
  try {
    const path = `${slug(studentId)}/${kind}/${slug(itemId)}.json`;
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });

    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: 'application/json',
    });
    if (error) {
      console.warn('Submission upload to Storage failed:', error.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.warn('Submission upload error:', e);
    return null;
  }
}
