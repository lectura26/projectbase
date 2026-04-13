import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";

/**
 * Create a time-limited signed URL for a storage object.
 * Uses SUPABASE_SERVICE_ROLE_KEY when set (recommended for private buckets);
 * otherwise falls back to the caller's server session (anon JWT).
 */
export async function createSignedStorageUrl(
  storagePath: string,
  expiresInSeconds: number,
): Promise<{ signedUrl: string } | { error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds);
    if (error || !data?.signedUrl) {
      return { error: "Kunne ikke oprette download-link." };
    }
    return { signedUrl: data.signedUrl };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data?.signedUrl) {
    return { error: "Kunne ikke oprette download-link." };
  }
  return { signedUrl: data.signedUrl };
}
