import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Projectbase — Ét sted til alle dine projekter",
  description:
    "Projectbase giver dig og dit team fuldt overblik over projekter, opgaver, deadlines og aktivitet.",
};

function IconGridSquares() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect x="2" y="2" width="10" height="10" rx="2" fill="#1a3167" />
      <rect x="16" y="2" width="10" height="10" rx="2" fill="#1a3167" />
      <rect x="2" y="16" width="10" height="10" rx="2" fill="#1a3167" />
      <rect x="16" y="16" width="10" height="10" rx="2" fill="#1a3167" />
    </svg>
  );
}

function IconCheckCircle() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <circle cx="14" cy="14" r="12" stroke="#1a3167" strokeWidth="2" fill="none" />
      <path d="M8 14l4 4 8-8" stroke="#1a3167" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <path
        d="M6 12a8 8 0 0114.5-4M22 16a8 8 0 01-14.5 4"
        stroke="#1a3167"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M4 12h4V8M24 16h-4v4" stroke="#1a3167" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <path
        d="M6 8a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3h-6l-5 4v-4H9a3 3 0 01-3-3V8z"
        stroke="#1a3167"
        strokeWidth="2"
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCloudUpload() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <path
        d="M8 18a5 5 0 01.3-10 4 4 0 017.7 2.5A4 4 0 0118 20h-1"
        stroke="#1a3167"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M14 12v8M10 16l4-4 4 4" stroke="#1a3167" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect x="4" y="6" width="20" height="18" rx="2" stroke="#1a3167" strokeWidth="2" fill="none" />
      <path d="M4 11h20M10 4v4M18 4v4" stroke="#1a3167" strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="17" r="1.5" fill="#1a3167" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <path
        d="M14 5a5 5 0 00-5 5v3l-2 3h14l-2-3v-3a5 5 0 00-5-5zM11 21a3 3 0 006 0"
        stroke="#1a3167"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMicrosoft() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <rect x="2" y="2" width="11" height="11" fill="#1a3167" />
      <rect x="15" y="2" width="11" height="11" fill="#1a3167" opacity="0.85" />
      <rect x="2" y="15" width="11" height="11" fill="#1a3167" opacity="0.85" />
      <rect x="15" y="15" width="11" height="11" fill="#1a3167" />
    </svg>
  );
}

function IconTeam() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <circle cx="10" cy="10" r="4" stroke="#1a3167" strokeWidth="2" fill="none" />
      <circle cx="18" cy="10" r="4" stroke="#1a3167" strokeWidth="2" fill="none" />
      <path d="M4 24c0-4 3-6 6-6M18 18c3 0 6 2 6 6" stroke="#1a3167" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  text: string;
  badge?: string;
};

function FeatureCard({ icon, title, text, badge }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-[#e8e8e8] bg-white p-8">
      {icon}
      <h3 className="mt-4 text-base font-semibold text-[#0f1923]">{title}</h3>
      <p className="mt-2 text-sm leading-[1.7] text-[#6b7280]">{text}</p>
      {badge ? (
        <span className="mt-3 inline-block rounded bg-[#fef3c7] px-2.5 py-0.5 text-[10px] font-medium text-[#d97706]">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen min-w-[1024px] bg-[#f8f9fa] font-body text-[#0f1923] antialiased">
      {/* NAVBAR */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-[#e8e8e8] bg-white px-10">
        <Link href="/landing" className="flex items-center">
          <Logo className="h-8 w-auto" />
        </Link>
        <Link
          href="/login"
          className="rounded-lg bg-[#1a3167] px-5 py-2 text-[13px] font-medium text-white"
        >
          Log ind
        </Link>
      </header>

      <main className="pt-16">
        {/* HERO — luft under fast header (nav = h-16; main har pt-16) */}
        <section className="bg-white px-10 pb-20 pt-16">
          <div className="mx-auto max-w-[720px] text-center">
            <span className="inline-block rounded-full bg-[#cce8f4] px-3.5 py-1 text-[11px] font-medium text-[#1a3167]">
              Til professionelle teams
            </span>
            <h1 className="mt-4 text-[52px] font-semibold leading-[1.15] text-[#0f1923]">
              Ét sted til alle dine projekter.
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-lg leading-[1.7] text-[#6b7280]">
              Projectbase giver dig og dit team fuldt overblik over projekter, opgaver, deadlines og aktivitet — uden støj,
              uden kompleksitet.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                className="rounded-lg bg-[#1a3167] px-8 py-3.5 text-[15px] font-medium text-white"
              >
                Kom i gang gratis
              </Link>
              <a
                href="#features"
                className="rounded-lg border border-[#e8e8e8] bg-white px-8 py-3.5 text-[15px] font-medium text-[#0f1923]"
              >
                Se funktioner
              </a>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="px-10 py-[100px]">
          <p className="text-center text-[11px] uppercase tracking-[0.08em] text-[#9ca3af]">Hvad du får</p>
          <h2 className="mx-auto mt-2 max-w-[560px] text-center text-4xl font-semibold text-[#0f1923]">
            Bygget til at gøre arbejdet lettere
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-base text-[#6b7280]">
            Alt hvad du har brug for samlet i et enkelt, hurtigt og intuitivt værktøj.
          </p>

          <div className="mx-auto mt-[60px] grid max-w-[1000px] grid-cols-3 gap-5">
            <FeatureCard
              icon={<IconGridSquares />}
              title="Fuldt projektoverblik"
              text="Se alle aktive projekter med status, prioritet, fremdrift og deadline på ét sted. Skift mellem liste- og kanban-visning alt efter hvad der passer dig bedst."
            />
            <FeatureCard
              icon={<IconCheckCircle />}
              title="Opgavestyring der virker"
              text="Opret opgaver direkte under hvert projekt. Sæt deadline, prioritet og ansvarlig. Marker opgaver færdige med ét klik — fremdriften opdateres automatisk."
            />
            <FeatureCard
              icon={<IconRepeat />}
              title="Rutineprojekter"
              text="Har du projekter der gentager sig hver måned? Sæt dem som rutine og de genopstår automatisk når de er fuldført — med alle opgaver nulstillet og klar til brug."
            />
            <FeatureCard
              icon={<IconChat />}
              title="Kommentarer og noter"
              text="Skriv kommentarer direkte på projekter og på individuelle opgaver. Tilføj frie noter og mødereferater under aktivitet — al kommunikation samlet ét sted."
            />
            <FeatureCard
              icon={<IconCloudUpload />}
              title="Filer og dokumenter"
              text="Upload relevante filer direkte til projekter. Alle dokumenter, præsentationer og bilag ligger præcis der de hører hjemme — knyttet til det rigtige projekt."
            />
            <FeatureCard
              icon={<IconCalendar />}
              title="Møder og aktivitet"
              text="Tilføj møder manuelt til projekter med dato og beskrivelse. Få et samlet aktivitetsoverblik over alt der er sket på hvert projekt."
            />
            <FeatureCard
              icon={<IconBell />}
              title="Notifikationer"
              text="Få besked når opgaver er overskredet, rutineprojekter genstartes eller nye opgaver tildeles dig. Alt samlet i ét diskret notifikationscenter."
            />
            <FeatureCard
              icon={<IconMicrosoft />}
              title="Microsoft 365 integration"
              text="Kommende funktion: forbind Outlook, Teams og OneNote så mails, møder og noter automatisk tilknyttes de rigtige projekter via AI-matching."
              badge="Kommer snart"
            />
            <FeatureCard
              icon={<IconTeam />}
              title="Team og samarbejde"
              text="Inviter kolleger til dine projekter. Se teamets aktive projekter og opgaver. Administrer roller og adgang direkte fra indstillinger."
            />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-white px-10 py-[100px]">
          <p className="text-center text-[11px] uppercase tracking-[0.08em] text-[#9ca3af]">Sådan virker det</p>
          <h2 className="mt-2 text-center text-4xl font-semibold text-[#0f1923]">I gang på 2 minutter</h2>

          <div className="mx-auto mt-[60px] flex max-w-[800px] justify-between gap-10">
            <div className="flex-1 text-center">
              <p className="text-[48px] font-semibold leading-none text-[#cce8f4]">01</p>
              <h3 className="mt-4 text-lg font-semibold text-[#0f1923]">Log ind med Google</h3>
              <p className="mt-2 text-sm leading-[1.7] text-[#6b7280]">
                Opret din konto med et enkelt klik via Google. Ingen adgangskode, ingen opsætning.
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[48px] font-semibold leading-none text-[#cce8f4]">02</p>
              <h3 className="mt-4 text-lg font-semibold text-[#0f1923]">Opret dit første projekt</h3>
              <p className="mt-2 text-sm leading-[1.7] text-[#6b7280]">
                Giv projektet et navn, en deadline og en prioritet. Tilføj opgaver, kontaktpersoner og noter.
              </p>
            </div>
            <div className="flex-1 text-center">
              <p className="text-[48px] font-semibold leading-none text-[#cce8f4]">03</p>
              <h3 className="mt-4 text-lg font-semibold text-[#0f1923]">Inviter dit team</h3>
              <p className="mt-2 text-sm leading-[1.7] text-[#6b7280]">
                Del projekter med kolleger og arbejd sammen i realtid. Alle ser de samme opdateringer.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1a3167] px-10 py-[100px] text-center">
          <h2 className="text-[40px] font-semibold text-white">Klar til at prøve det?</h2>
          <p className="mt-4 text-base text-white/75">
            Log ind med Google og vær i gang på under 2 minutter. Gratis.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-block rounded-lg bg-white px-10 py-4 text-base font-semibold text-[#1a3167]"
          >
            Log ind med Google
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-[#e8e8e8] bg-white px-10 py-8">
          <div className="grid grid-cols-3 items-center">
            <div className="justify-self-start">
              <Link href="/landing">
                <Logo className="h-7 w-auto" />
              </Link>
            </div>
            <p className="text-center text-xs text-[#9ca3af]">© 2026 Projectbase</p>
            <div className="flex justify-end gap-6 text-xs text-[#6b7280]">
              <a href="mailto:kontakt@projectbase.dk" className="hover:text-[#1a3167]">
                Kontakt
              </a>
              <Link href="/privacy" className="hover:text-[#1a3167]">
                Privatlivspolitik
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
