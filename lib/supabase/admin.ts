import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_STORAGE_BUCKET } from "@/lib/supabase/storage-bucket";

let singleton: SupabaseClient | null = null;

function assertServiceEnv(): { url: string; serviceKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error(
      "Manglende NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY. Tilføj service_role-nøglen fra Supabase Dashboard → Settings → API → Project API keys → service_role (hemmelig) i .env.local.",
    );
  }
  return { url, serviceKey };
}

/**
 * Lazy singleton: service role client for Storage (uploads, deletes, signed URLs).
 * Never use the anon key for storage — private buckets require the service role.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!singleton) {
    const { url, serviceKey } = assertServiceEnv();
    singleton = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return singleton;
}

/** @deprecated Prefer `getSupabaseAdmin()` — same singleton. */
export function createSupabaseAdminClient(): SupabaseClient {
  return getSupabaseAdmin();
}

/**
 * Same client as `getSupabaseAdmin()` — lazy via Proxy so env is read on first use, not at import time.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin(), prop, receiver);
  },
});

/** Ensures the app storage bucket exists (creates it if missing). Call before upload. */
export async function ensureProjectFilesBucket(): Promise<void> {
  const admin = getSupabaseAdmin();
  const { data: buckets, error: listErr } = await admin.storage.listBuckets();
  if (listErr) {
    console.error("Storage listBuckets error:", listErr);
    throw new Error(`Storage: ${listErr.message}`);
  }
  const exists = buckets?.some((b) => b.id === SUPABASE_STORAGE_BUCKET);
  if (exists) return;

  const { error: createErr } = await admin.storage.createBucket(SUPABASE_STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
  });
  if (createErr) {
    const msg = createErr.message ?? "";
    if (/already exists|duplicate/i.test(msg)) return;
    console.error("Storage createBucket error:", createErr);
    throw new Error(`Storage: ${createErr.message}`);
  }
}
