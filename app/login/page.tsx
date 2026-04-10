"use client";

import Image from "next/image";
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
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#cce8f4" }}
    >
      <div className="flex w-full flex-col items-center" style={{ maxWidth: "400px" }}>
        <Image
          src="/projectbase_logo_white.svg"
          alt="Projectbase"
          width={180}
          height={45}
          priority
          style={{ marginBottom: "32px" }}
        />
        <div
          className="w-full border bg-white shadow-none"
          style={{
            borderWidth: "1px",
            borderColor: "#b8d4e8",
            borderRadius: "12px",
            padding: "48px 40px",
            boxShadow: "none",
          }}
        >
          {error ? (
            <p className="rounded-lg bg-error-container px-4 py-2 text-sm text-on-error-container">
              Login mislykkedes. Prøv igen.
            </p>
          ) : null}
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            className={`flex w-full items-center justify-center border-0 font-body font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 ${error ? "mt-8" : ""}`}
            style={{
              backgroundColor: "#1a3167",
              fontSize: "15px",
              fontWeight: 500,
              padding: "12px 24px",
              borderRadius: "8px",
            }}
          >
            {loading ? "Omdirigerer…" : "Log ind med Google"}
          </button>
          <p
            className="mt-4 text-center font-body text-on-surface-variant/75"
            style={{ fontSize: "12px" }}
          >
            Kun adgang for Projectbase-brugere
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ backgroundColor: "#cce8f4" }} />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
