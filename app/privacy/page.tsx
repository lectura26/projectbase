import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privatlivspolitik — Projectbase",
  description: "Privatlivspolitik for Projectbase.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] font-body antialiased">
      <div className="mx-auto max-w-[720px] bg-white px-10 py-[60px]">
        <Logo className="h-8 w-auto" />
        <p className="mt-6">
          <Link
            href="/landing"
            className="text-sm font-medium text-[#1a3167] hover:underline"
          >
            ← Tilbage
          </Link>
        </p>

        <h1 className="mt-10 text-3xl font-semibold text-[#1a3167]">Privatlivspolitik</h1>
        <p className="mt-2 text-sm text-[#6b7280]">Sidst opdateret: 13. april 2026</p>
        <p className="mt-1 text-sm text-[#6b7280]">Dataansvarlig: Rasmus Vilstrup</p>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">1. Hvad vi indsamler</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Vi indsamler navn og e-mailadresse via Google login. Derudover gemmes de projekter, opgaver,
            kommentarer, filer og noter du selv opretter i applikationen.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">2. Hvorfor vi indsamler det</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Data indsamles udelukkende for at drive applikationens funktionalitet. Vi indsamler ikke data til
            markedsføring, analyse eller videresalg.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">3. Hvor data opbevares</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Alle data opbevares på servere i EU (Frankfurt, Tyskland) hos Supabase og Vercel. Data forlader ikke EU.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">4. Hvem har adgang</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Kun du har adgang til dine egne data. Supabase og Vercel fungerer som databehandlere og har indgået
            GDPR-compliant databehandleraftaler.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">5. Dine rettigheder</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Du har ret til indsigt i, rettelse af og sletning af dine personoplysninger. Du kan slette din konto og
            alle tilhørende data under Indstillinger. For spørgsmål kontakt:{" "}
            <a href="mailto:rasmusvilstrup@gmail.com" className="text-[#1a3167] underline hover:no-underline">
              rasmusvilstrup@gmail.com
            </a>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">6. Cookies</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Applikationen anvender nødvendige session-cookies til at holde dig logget ind. Der anvendes ingen
            tracking- eller markedsføringscookies.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[#1a3167]">7. Kontakt</h2>
          <p className="mt-3 text-sm leading-[1.7] text-[#6b7280]">
            Rasmus Vilstrup
            <br />
            E-mail:{" "}
            <a href="mailto:rasmusvilstrup@gmail.com" className="text-[#1a3167] underline hover:no-underline">
              rasmusvilstrup@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
