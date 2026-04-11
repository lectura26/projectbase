import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";

/**
 * Remove an object from the project storage bucket (server-only).
 * Prefers SUPABASE_SERVICE_ROLE_KEY for private buckets.
 */
export async function removeStorageObject(storagePath: string): Promise<{ ok: true } | { ok: false }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.storage.from(SUPABASE_STORAGE_BUCKET).remove([storagePath]);
    if (error) {
      console.error("[removeStorageObject]", error.message);
      return { ok: false };
    }
    return { ok: true };
  }

  const supabase = createServerClient();
  const { error } = await supabase.storage.from(SUPABASE_STORAGE_BUCKET).remove([storagePath]);
  if (error) {
    console.error("[removeStorageObject]", error.message);
    return { ok: false };
  }
  return { ok: true };
}
