"use client";

import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [loading, setLoading] = useState(false);

  async function signInWithGoogle() {
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (signInError) {
      setLoading(false);
      console.error(signInError.message);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 py-12">
      <div className="flex w-full max-w-[400px] flex-col items-center">
        <Logo className="mb-8 h-auto w-[180px]" />
        <div className="w-full rounded-xl bg-surface-container-lowest p-10 shadow-sm ring-1 ring-black/5">
          {error ? (
            <p className="rounded-lg bg-error-container px-4 py-2 text-sm text-on-error-container">
              Login mislykkedes. Prøv igen.
            </p>
          ) : null}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className={`flex w-full items-center justify-center rounded-md bg-primary py-3 text-[15px] font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60 ${error ? "mt-6" : ""}`}
          >
            {loading ? "Omdirigerer…" : "Log ind med Google"}
          </button>
          <p className="mt-4 text-center font-body text-xs text-on-surface-variant">
            Kun adgang for Projectbase-brugere
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface" />}>
      <LoginForm />
    </Suspense>
  );
}
