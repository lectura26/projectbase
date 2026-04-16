import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Remove an object from the project storage bucket (server-only). Uses service role.
 */
export async function removeStorageObject(storagePath: string): Promise<{ ok: true } | { ok: false }> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.storage.from(SUPABASE_STORAGE_BUCKET).remove([storagePath]);
    if (error) {
      console.error("Storage remove error:", error);
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("Storage remove error:", e);
    return { ok: false };
  }
}
