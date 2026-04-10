"use client";

import type { Priority, ProjectVisibility } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createProject } from "@/app/(dashboard)/projekter/actions";

type UserOption = { id: string; name: string; email: string };

type NytProjektModalProps = {
  open: boolean;
  onClose: () => void;
  users: UserOption[];
};

const labelClass =
  "block text-[10px] font-bold uppercase tracking-widest text-primary/50 mb-3 ml-1 font-label";

const inputUnderlineClass =
  "w-full bg-transparent border-0 border-b-2 border-outline-variant/70 py-3 text-sm font-medium text-on-surface shadow-none transition-colors placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-0";

export function NytProjektModal({ open, onClose, users }: NytProjektModalProps) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [teamVisible, setTeamVisible] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isRoutine, setIsRoutine] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const resetForm = useCallback(() => {
    setName("");
    setDeadline("");
    setDescription("");
    setPriority("MEDIUM");
    setTeamVisible(true);
    setTags([]);
    setTagDraft("");
    setIsRoutine(false);
    setContactName("");
    setContactEmail("");
    setError(null);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      resetForm();
      setMoreOpen(true);
      document.body.style.overflow = "hidden";
      const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagDraft("");
  };

  const removeTag = (t: string) => setTags((prev) => prev.filter((x) => x !== t));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!users.length) {
      setError("Der er ingen brugere i systemet — tilføj en bruger først.");
      return;
    }
    setSubmitting(true);
    try {
      const visibility: ProjectVisibility = teamVisible ? "TEAM" : "ONLY_ME";
      await createProject({
        name,
        description: description || undefined,
        deadline: deadline || null,
        priority,
        visibility,
        tags,
        isRoutine,
        contactName: contactName || undefined,
        contactEmail: contactEmail || undefined,
      });
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette projekt.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !open) return null;

  const priorityBtn = (p: Priority, label: string) => (
    <button
      key={p}
      type="button"
      onClick={() => setPriority(p)}
      className={`flex-1 rounded-md py-3 px-4 text-xs font-bold uppercase tracking-tight transition-colors ${
        priority === p
          ? "bg-primary text-on-primary"
          : "bg-surface-container-low text-on-surface-variant hover:bg-secondary-container"
      }`}
    >
      {label}
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-primary/25 backdrop-blur-md"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_8px_32px_rgba(26,49,103,0.12)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 px-8 pt-8 pb-4">
          <div>
            <h2
              id={titleId}
              className="font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-3xl"
            >
              Opret projekt
            </h2>
            <p className="mt-1 font-body text-sm font-medium italic text-on-surface-variant/80">
              Konfigurer rammerne for jeres næste succesfulde initiativ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary/60 transition-colors hover:bg-secondary-container hover:text-primary"
            aria-label="Luk"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-8 pb-8 pt-6"
        >
          <div className="space-y-10">
            <section className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="np-name" className={labelClass}>
                  Projektnavn
                </label>
                <input
                  id="np-name"
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Indtast projektets fulde navn..."
                  className={`${inputUnderlineClass} text-lg font-semibold sm:text-xl`}
                  required
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="np-owner" className={labelClass}>
                  Ansvarlig
                </label>
                <div className="relative">
                  <select
                    id="np-owner"
                    value={users[0]?.id ?? ""}
                    onChange={() => {}}
                    disabled={!users.length}
                    className={`${inputUnderlineClass} appearance-none bg-secondary-container/30 pr-8`}
                    required
                  >
                    {users.length === 0 ? (
                      <option value="">— Ingen brugere —</option>
                    ) : (
                      users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))
                    )}
                  </select>
                  <span className="pointer-events-none absolute right-1 top-3 text-primary/40 material-symbols-outlined text-xl">
                    expand_more
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor="np-deadline" className={labelClass}>
                  Frist
                </label>
                <div className="relative">
                  <input
                    id="np-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={`${inputUnderlineClass} bg-secondary-container/30`}
                  />
                  <span className="pointer-events-none absolute right-1 top-2.5 text-primary/40 material-symbols-outlined">
                    calendar_today
                  </span>
                </div>
              </div>
            </section>

            <div className="h-px bg-outline-variant/15" />

            <section className="space-y-8">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className="flex w-full items-center justify-between text-left"
              >
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Flere indstillinger
                </h3>
                <span
                  className={`material-symbols-outlined text-primary/40 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                >
                  keyboard_arrow_down
                </span>
              </button>

              {moreOpen ? (
                <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="np-desc" className={labelClass}>
                      Beskrivelse
                    </label>
                    <textarea
                      id="np-desc"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Beskriv projektets formål og succeskriterier..."
                      className={`${inputUnderlineClass} resize-none bg-secondary-container/20`}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <span className={labelClass}>Prioritet</span>
                    <div className="flex gap-2">
                      {priorityBtn("LOW", "Lav")}
                      {priorityBtn("MEDIUM", "Medium")}
                      {priorityBtn("HIGH", "Høj")}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className={labelClass}>Synlighed</span>
                    <div className="flex items-center gap-4 rounded-lg bg-secondary-container/20 p-3">
                      <span className="material-symbols-outlined text-primary/60">
                        {teamVisible ? "lock_open" : "lock"}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-semibold text-primary">
                          {teamVisible ? "Synlig for teamet" : "Kun synlig for ejer"}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60">
                          {teamVisible
                            ? "Teammedlemmer kan finde projektet i hubben."
                            : "Kun den ansvarlige ser projektet."}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={teamVisible}
                        onClick={() => setTeamVisible((v) => !v)}
                        className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                          teamVisible ? "bg-primary" : "bg-outline-variant/40"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${
                            teamVisible ? "right-1" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className={labelClass}>Tags</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-2 rounded-full bg-secondary-container/50 px-3 py-1.5 text-[11px] font-bold text-primary"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            className="text-primary/70 hover:text-primary"
                            aria-label={`Fjern ${t}`}
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </span>
                      ))}
                      <div className="flex items-center gap-1 rounded-full border-2 border-dashed border-outline-variant/60 px-2 py-1 transition-colors focus-within:border-primary">
                        <input
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="Tag…"
                          className="min-w-[120px] border-0 bg-transparent py-1 text-[11px] font-bold text-primary outline-none placeholder:text-outline-variant"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="flex items-center gap-0.5 rounded-full px-1 text-[11px] font-bold text-primary hover:underline"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="np-cname" className={labelClass}>
                      Kontaktperson (navn)
                    </label>
                    <input
                      id="np-cname"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className={inputUnderlineClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="np-cemail" className={labelClass}>
                      Kontaktperson (e-mail)
                    </label>
                    <input
                      id="np-cemail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className={inputUnderlineClass}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-start gap-4 rounded-xl border border-outline-variant/10 bg-surface-bright p-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRoutine}
                      onClick={() => setIsRoutine((v) => !v)}
                      className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors ${
                        isRoutine ? "bg-primary" : "bg-outline-variant/30"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                          isRoutine ? "right-1" : "left-1"
                        }`}
                      />
                    </button>
                    <div>
                      <span className="block text-xs font-bold text-primary">Rutineprojekt</span>
                      <span className="text-[10px] leading-relaxed text-on-surface-variant/70">
                        Gentag opgaven automatisk med faste intervaller (konfigureres senere).
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>

          {error ? (
            <p className="mt-6 rounded-lg bg-error-container px-4 py-2 text-sm text-on-error-container">
              {error}
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center justify-end gap-4 border-t border-outline-variant/10 pt-8">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold uppercase tracking-widest text-primary/60 transition-colors hover:text-primary"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={submitting || !users.length}
              className="flex items-center gap-3 rounded-md bg-primary px-8 py-3 text-sm font-extrabold uppercase tracking-widest text-on-primary shadow-lg shadow-primary/20 transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              {submitting ? "Opretter…" : "Opret projekt"}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
