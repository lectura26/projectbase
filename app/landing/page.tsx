import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AppWindow,
  ChartGantt,
  Check,
  CheckCircle2,
  Cloud,
  Grid2x2,
  MessageSquare,
  Repeat,
  Shield,
  Target,
} from "lucide-react";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: "Projectbase — Nordisk projektstyring",
  description:
    "Disciplineret projektstyring til finansielle teams — overblik, opgaver, kalender og Gantt i ét system.",
};

function IconBox({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3f4f5] text-[#1a3167] transition-colors duration-300 group-hover:bg-[#1a3167] group-hover:text-white">
      {children}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
  badge,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  badge?: string;
}) {
  return (
    <div className="group">
      <IconBox>{icon}</IconBox>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold text-[#0f1923]">{title}</h3>
        {badge ? (
          <span className="rounded bg-[#cce8f4] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#1a3167]">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-[#6b7280]">{text}</p>
    </div>
  );
}

function HeroProjectMockup() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-[#e8e8e8]/60 bg-[#f3f4f5] p-4 shadow-[0_24px_48px_-12px_rgba(26,49,103,0.12)]">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#edeeef] bg-white px-4 py-3">
            <span className="text-sm font-bold tracking-tight text-[#0f1923]">Aktive projekter</span>
            <span className="text-[#6b7280]" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h10M4 18h16" />
              </svg>
            </span>
          </div>
          <div className="divide-y divide-[#edeeef]">
            {[
              { t: "Q3 Revision — Nordics", a: "Ansvarlig: A. M.", p: 75, s: "I gang", sc: "bg-emerald-50 text-emerald-800" },
              { t: "AML Compliance Update", a: "Ansvarlig: S. L.", p: 40, s: "Planlagt", sc: "bg-amber-50 text-amber-800" },
              { t: "Market Analysis", a: "Ansvarlig: J. K.", p: 90, s: "Næsten færdig", sc: "bg-emerald-50 text-emerald-800" },
            ].map((row) => (
              <div
                key={row.t}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#f8f9fa]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#cce8f4] text-[#1a3167]">
                    <Grid2x2 className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[#0f1923]">{row.t}</div>
                    <div className="text-xs text-[#6b7280]">{row.a}</div>
                  </div>
                </div>
                <div className="hidden w-28 sm:block">
                  <div className="h-1 w-full overflow-hidden rounded-full bg-[#cce8f4]">
                    <div className="h-full bg-[#1a3167]" style={{ width: `${row.p}%` }} />
                  </div>
                </div>
                <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${row.sc}`}>
                  {row.s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        className="pointer-events-none absolute -bottom-10 -right-10 -z-10 h-64 w-64 rounded-full bg-[#cbe7f3]/30 blur-3xl"
        aria-hidden
      />
    </div>
  );
}

function KanbanMockup() {
  const cols = [
    { title: "At gøre", tint: "bg-[#f3f4f5]" },
    { title: "I gang", tint: "bg-[#cce8f4]/40" },
    { title: "Færdig", tint: "bg-[#f3f4f5]" },
  ];
  return (
    <div className="rounded-2xl bg-[#e7e8e9] p-2">
      <div className="grid min-h-[320px] gap-2 rounded-xl bg-[#e7e8e9] sm:grid-cols-3">
        {cols.map((c) => (
          <div key={c.title} className={`flex flex-col rounded-lg ${c.tint} p-2`}>
            <p className="mb-2 px-1 text-xs font-semibold text-[#6b7280]">{c.title}</p>
            <div className="space-y-2">
              <div className="rounded-lg border border-[#e8e8e8] bg-white p-2 shadow-sm">
                <p className="text-xs font-medium text-[#0f1923]">Opgave</p>
                <p className="mt-1 text-[10px] text-[#9ca3af]">Deadline</p>
              </div>
              <div className="rounded-lg border border-[#e8e8e8] bg-white p-2 shadow-sm">
                <p className="text-xs font-medium text-[#0f1923]">Review</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SidePanelMockup() {
  return (
    <div className="rounded-2xl bg-[#e7e8e9] p-2">
      <div className="ml-auto flex h-[min(400px,50vh)] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-lg">
        <div className="border-b border-[#e8e8e8] px-4 py-3">
          <div className="h-3 w-3/4 rounded bg-[#f3f4f5]" />
          <div className="mt-2 h-2 w-1/2 rounded bg-[#edeeef]" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          <div className="h-2 w-full rounded bg-[#f3f4f5]" />
          <div className="h-2 w-5/6 rounded bg-[#edeeef]" />
          <div className="h-2 w-4/6 rounded bg-[#edeeef]" />
        </div>
        <div className="border-t border-[#e8e8e8] p-3">
          <div className="h-8 rounded-md border border-[#e8e8e8] bg-[#f8f9fa]" />
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen min-w-[1024px] bg-[#f8f9fa] font-body text-[#0f1923] antialiased">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-8">
          <Link href="/landing" className="flex shrink-0 items-center gap-2">
            <Logo className="h-9 w-auto" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="border-b-2 border-[#1a3167] pb-1 text-sm font-semibold text-[#1a3167]"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm font-medium text-[#6b7280] transition-colors hover:text-[#1a3167]"
            >
              Sådan virker det
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden rounded-xl border border-[#e8e8e8] px-5 py-2 text-sm font-medium text-[#0f1923] transition-colors hover:bg-[#f8f9fa] md:inline-flex"
            >
              Log ind
            </Link>
            <Link
              href="/login"
              className="rounded-xl bg-[#1a3167] px-5 py-2 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Kom i gang
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-16">
        {/* Hero */}
        <section className="overflow-hidden bg-white py-20 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-16 px-8 lg:grid-cols-2">
            <div className="space-y-8">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#0f1923] lg:text-5xl xl:text-6xl">
                Ét sted til alle dine projekter.
              </h1>
              <p className="max-w-lg text-lg leading-relaxed text-[#6b7280]">
                Projectbase samler projekter, opgaver, møder og filer så du og dit team altid har overblik — uanset hvor
                mange bolde I har i luften.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/login"
                  className="rounded-xl bg-[#1a3167] px-8 py-4 text-base font-semibold text-white transition-transform active:scale-[0.98]"
                >
                  Kom i gang
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-[#c5c6d1]/40 px-8 py-4 text-base font-semibold text-[#1a3167] transition-colors hover:border-[#c5c6d1]"
                >
                  Se hvordan det virker
                </Link>
              </div>
              <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6b7280]">
                <span>✓ Data i EU</span>
                <span className="text-[#d1d5db]">·</span>
                <span>✓ GDPR-compliant</span>
              </p>
            </div>
            <HeroProjectMockup />
          </div>
        </section>

        {/* Social proof — tonal shift, no heavy border */}
        <section className="bg-[#f3f4f5] py-12">
          <div className="mx-auto max-w-7xl px-8 text-center">
            <p className="mx-auto max-w-3xl text-base font-medium italic leading-relaxed tracking-tight text-[#6b7280]">
              Brugt af finansielle rådgivere, projektledere og teams i ledende skandinaviske organisationer.
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-8">
            <div className="mb-16 max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-[#0f1923]">
                Hvad du får med Projectbase
              </h2>
              <p className="text-[#6b7280]">
                Alt hvad du har brug for til at holde styr på dine projekter.
              </p>
            </div>
            <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Grid2x2 className="h-6 w-6" strokeWidth={1.75} />}
                title="Projektoverblik"
                text="Se alle projekter samlet med status, fremdrift og deadline. Skift mellem liste, kanban og gantt."
              />
              <FeatureCard
                icon={<CheckCircle2 className="h-6 w-6" strokeWidth={1.75} />}
                title="Opgavestyring"
                text="Opret opgaver under hvert projekt. Sæt deadline, prioritet og følg fremdriften."
              />
              <FeatureCard
                icon={<Repeat className="h-6 w-6" strokeWidth={1.75} />}
                title="Rutineprojekter"
                text="Projekter der gentager sig kan sættes som rutine og genstartes automatisk når de afsluttes."
              />
              <FeatureCard
                icon={<ChartGantt className="h-6 w-6" strokeWidth={1.75} />}
                title="Gantt-diagram"
                text="Se alle opgaver og deadlines på en tidslinje. Dag, uge og månedsoverblik."
              />
              <FeatureCard
                icon={<MessageSquare className="h-6 w-6" strokeWidth={1.75} />}
                title="Kommentarer og noter"
                text="Skriv kommentarer på projekter og opgaver. Tilføj noter og se al aktivitet samlet."
              />
              <FeatureCard
                icon={<Target className="h-6 w-6" strokeWidth={1.75} />}
                title="Dagligt fokus"
                text="Start dagen med et overblik over dine vigtigste opgaver og næste deadlines."
              />
              <FeatureCard
                icon={<Cloud className="h-6 w-6" strokeWidth={1.75} />}
                title="Filer og dokumenter"
                text="Upload filer direkte til projekter så alt materiale ligger samlet."
              />
              <FeatureCard
                icon={<Shield className="h-6 w-6" strokeWidth={1.75} />}
                title="Sikkerhed og GDPR"
                text="Data opbevares i EU. Understøtter ansvarlig og dokumenterbar brug af persondata."
              />
              <FeatureCard
                icon={<AppWindow className="h-6 w-6" strokeWidth={1.75} />}
                title="Microsoft 365"
                text="Integration med Outlook og Teams er planlagt som kommende funktion."
                badge="Kommer snart"
              />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-[#f8f9fa] py-24">
          <div className="mx-auto max-w-7xl px-8">
            <h2 className="mb-20 text-center text-3xl font-bold text-[#1a3167]">Sådan kommer du i gang</h2>
            <div className="relative grid gap-12 md:grid-cols-3">
              <div className="absolute left-1/4 right-1/4 top-12 -z-0 hidden h-0.5 bg-[#cce8f4]/40 md:block" aria-hidden />
              <div className="relative z-10 space-y-4 text-center">
                <div className="text-7xl font-black leading-none text-[#cce8f4]/70">01</div>
                <h3 className="text-xl font-bold text-[#0f1923]">Log ind med Google</h3>
                <p className="px-4 text-[#6b7280]">
                  Brug dit eksisterende Google-login. Ingen ny konto eller adgangskode.
                </p>
              </div>
              <div className="relative z-10 space-y-4 text-center">
                <div className="text-7xl font-black leading-none text-[#cce8f4]/70">02</div>
                <h3 className="text-xl font-bold text-[#0f1923]">Opret et projekt</h3>
                <p className="px-4 text-[#6b7280]">
                  Giv projektet et navn, en deadline og tilføj de første opgaver.
                </p>
              </div>
              <div className="relative z-10 space-y-4 text-center">
                <div className="text-7xl font-black leading-none text-[#cce8f4]/70">03</div>
                <h3 className="text-xl font-bold text-[#0f1923]">Hold styr på det hele</h3>
                <p className="px-4 text-[#6b7280]">
                  Følg status og fremdrift på tværs af projekter — for dig selv eller hele teamet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature highlights */}
        <section id="feature-highlights" className="overflow-hidden bg-white py-24">
          <div className="mx-auto max-w-7xl space-y-32 px-8">
            <div className="flex flex-col items-center gap-16 lg:flex-row">
              <div className="space-y-6 lg:w-1/2">
                <h2 className="text-4xl font-bold tracking-tight text-[#0f1923]">Tre visninger til samme data</h2>
                <p className="text-lg leading-relaxed text-[#6b7280]">
                  Vælg den visning der passer til opgaven. Liste til overblik, kanban til workflow og gantt til
                  tidsplanlægning.
                </p>
                <ul className="space-y-4 text-sm font-medium text-[#0f1923]">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a3167]" strokeWidth={2.5} />
                    Liste til hurtig scanning
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a3167]" strokeWidth={2.5} />
                    Kanban til daglig workflow
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a3167]" strokeWidth={2.5} />
                    Gantt til deadlineoverblik
                  </li>
                </ul>
              </div>
              <div className="w-full lg:w-1/2">
                <KanbanMockup />
              </div>
            </div>

            <div className="flex flex-col items-center gap-16 lg:flex-row-reverse">
              <div className="space-y-6 lg:w-1/2">
                <h2 className="text-4xl font-bold tracking-tight text-[#0f1923]">Opgavedetaljer i et sidepanel</h2>
                <p className="text-lg leading-relaxed text-[#6b7280]">
                  Klik på en opgave og få alle detaljer i et panel til højre — uden at forlade projektvisningen.
                </p>
                <ul className="space-y-4 text-sm font-medium text-[#0f1923]">
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a3167]" strokeWidth={2.5} />
                    Status, prioritet og datoer
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a3167]" strokeWidth={2.5} />
                    Beskrivelse og noter med log
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#1a3167]" strokeWidth={2.5} />
                    Kommentarer direkte på opgaven
                  </li>
                </ul>
              </div>
              <div className="w-full lg:w-1/2">
                <SidePanelMockup />
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1a3167] py-24">
          <div className="mx-auto max-w-4xl space-y-8 px-8 text-center">
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Klar til at prøve det?</h2>
            <p className="mx-auto max-w-2xl text-lg text-[#cce8f4]/95">
              Log ind med Google og vær i gang på få minutter.
            </p>
            <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
              <Link
                href="/login"
                className="rounded-xl bg-white px-10 py-5 text-lg font-bold text-[#1a3167] transition-transform active:scale-[0.98]"
              >
                Kom i gang
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-white/40 px-10 py-5 text-lg font-bold text-white transition-colors hover:bg-white/10"
              >
                Kontakt salg
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#f8f9fa] py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 px-8 text-sm md:flex-row">
            <Link href="/landing" className="flex items-center gap-2">
              <Logo className="h-7 w-auto" />
            </Link>
            <nav className="flex flex-wrap justify-center gap-8" aria-label="Footer">
              <Link href="/privacy" className="text-[#6b7280] transition-colors hover:text-[#1a3167]">
                Privacy
              </Link>
              <Link href="/privacy" className="text-[#6b7280] transition-colors hover:text-[#1a3167]">
                Terms
              </Link>
              <Link href="/privacy" className="text-[#6b7280] transition-colors hover:text-[#1a3167]">
                Security
              </Link>
              <a href="mailto:kontakt@projectbase.dk" className="text-[#6b7280] transition-colors hover:text-[#1a3167]">
                Contact
              </a>
            </nav>
            <p className="text-center text-xs text-[#9ca3af] md:text-right">
              © 2026 Projectbase. Udviklet af Rasmus Vilstrup
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
