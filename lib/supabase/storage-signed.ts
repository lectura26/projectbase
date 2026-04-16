import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Time-limited signed URL for a storage object. Always uses the service role client.
 */
export async function createSignedStorageUrl(
  storagePath: string,
  expiresInSeconds: number,
): Promise<{ signedUrl: string } | { error: string }> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      console.error("Storage signed URL error:", error);
      return {
        error: error?.message ?? "Kunne ikke oprette download-link.",
      };
    }
    return { signedUrl: data.signedUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Storage signed URL error:", e);
    return { error: msg };
  }
}
