"use client";

import type { Priority, ProjectVisibility, RoutineInterval } from "@prisma/client";
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Plus,
  Unlock,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  createProject,
  updateProject,
  type EditProjectInitial,
} from "@/app/(dashboard)/projekter/actions";
import { commitYmdString } from "@/lib/datetime/ymd";
import { ProjectColorPicker } from "@/components/projekter/ProjectColorPicker";
import { PROJECT_COLORS } from "@/lib/projekter/project-colors";
import { DatePicker } from "@/components/ui/DatePicker";

type UserOption = { id: string; name: string; email: string };

type NytProjektModalProps = {
  open: boolean;
  onClose: () => void;
  users: UserOption[];
  mode?: "create" | "edit";
  projectId?: string;
  initialEdit?: EditProjectInitial | null;
};

const labelClass =
  "block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1 font-label";

const inputUnderlineClass =
  "w-full bg-transparent border-0 border-b-2 border-outline-variant/70 py-3 text-sm font-medium text-on-surface shadow-none transition-colors placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-0";

export function NytProjektModal({
  open,
  onClose,
  users,
  mode = "create",
  projectId,
  initialEdit = null,
}: NytProjektModalProps) {
  const router = useRouter();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [moreOpen, setMoreOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [teamVisible, setTeamVisible] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isRoutine, setIsRoutine] = useState(false);
  const [routineInterval, setRoutineInterval] = useState<RoutineInterval>("MONTHLY");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]!);
  const [nameError, setNameError] = useState("");

  const resetForm = useCallback(() => {
    setName("");
    setStartDate("");
    setDeadline("");
    setDescription("");
    setPriority("MEDIUM");
    setTeamVisible(true);
    setTags([]);
    setTagDraft("");
    setIsRoutine(false);
    setRoutineInterval("MONTHLY");
    setContactName("");
    setContactEmail("");
    setSaveAsTemplate(false);
    setColor(PROJECT_COLORS[0]!);
    setNameError("");
    setError(null);
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return undefined;
    }
    setMoreOpen(true);
    document.body.style.overflow = "hidden";
    if (mode === "edit" && initialEdit) {
      setName(initialEdit.name);
      setNameError("");
      setStartDate(initialEdit.startDate);
      setDeadline(initialEdit.deadline);
      setDescription(initialEdit.description);
      setPriority(initialEdit.priority);
      setTeamVisible(
        initialEdit.visibility === "TEAM" || initialEdit.visibility === "ALL",
      );
      setTags(initialEdit.tags);
      setTagDraft("");
      setIsRoutine(initialEdit.isRoutine);
      setRoutineInterval(initialEdit.routineInterval ?? "MONTHLY");
      setContactName(initialEdit.contactName);
      setContactEmail(initialEdit.contactEmail);
      setColor(initialEdit.color);
      setError(null);
    } else {
      resetForm();
    }
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
    };
  }, [open, mode, initialEdit, resetForm]);

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
    setNameError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Projektnavn er påkrævet.");
      return;
    }
    if (!users.length) {
      setError("Der er ingen brugere i systemet — tilføj en bruger først.");
      return;
    }
    setSubmitting(true);
    try {
      const visibility: ProjectVisibility = (() => {
        if (!teamVisible) return "ONLY_ME";
        if (mode === "edit" && initialEdit?.visibility === "ALL") return "ALL";
        return "TEAM";
      })();
      if (mode === "edit" && projectId) {
        await updateProject({
          projectId,
          name: trimmedName,
          description: description || undefined,
          startDate: commitYmdString(startDate) || null,
          deadline: commitYmdString(deadline) || null,
          priority,
          visibility,
          tags,
          isRoutine,
          routineInterval: isRoutine ? routineInterval : null,
          contactName: contactName || undefined,
          contactEmail: contactEmail || undefined,
          color,
        });
      } else {
        await createProject({
          name: trimmedName,
          description: description || undefined,
          startDate: commitYmdString(startDate) || null,
          deadline: commitYmdString(deadline) || null,
          priority,
          visibility,
          tags,
          isRoutine,
          routineInterval: isRoutine ? routineInterval : null,
          contactName: contactName || undefined,
          contactEmail: contactEmail || undefined,
          saveAsTemplate: saveAsTemplate || undefined,
          color,
        });
        toast.success("Projekt oprettet");
      }
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
          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
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
        className="absolute inset-0 bg-on-surface/10 backdrop-blur-md"
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(90vh,880px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0_8px_24px_rgba(15,25,35,0.06)] ring-1 ring-black/5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/10 px-8 pt-8 pb-4">
          <div>
            <h2
              id={titleId}
              className="font-headline text-2xl font-extrabold tracking-tight text-primary sm:text-3xl"
            >
              {mode === "edit" ? "Rediger projekt" : "Opret projekt"}
            </h2>
            <p className="mt-1 font-body text-sm font-medium text-on-surface-variant">
              {mode === "edit"
                ? "Opdater projektets rammer og metadata."
                : "Konfigurer rammerne for jeres næste succesfulde initiativ."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            aria-label="Luk"
          >
            <X className="h-6 w-6" aria-hidden />
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
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError("");
                  }}
                  placeholder="Indtast projektets fulde navn..."
                  className={`${inputUnderlineClass} text-lg font-semibold sm:text-xl`}
                  autoComplete="off"
                  aria-invalid={Boolean(nameError)}
                />
                {nameError ? (
                  <p className="mt-2 text-xs text-error">{nameError}</p>
                ) : null}
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
                    className={`${inputUnderlineClass} appearance-none bg-surface-container-low pr-8`}
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
                  <ChevronDown
                    className="pointer-events-none absolute right-1 top-3 h-6 w-6 text-primary/40"
                    aria-hidden
                  />
                </div>
              </div>
              <div>
                <label htmlFor="np-start" className={labelClass}>
                  Startdato{" "}
                  <span className="font-normal normal-case tracking-normal text-on-surface-variant/70">
                    (valgfri)
                  </span>
                </label>
                <DatePicker
                  id="np-start"
                  value={startDate}
                  onChange={setStartDate}
                  className={`${inputUnderlineClass} bg-surface-container-low border-0 border-b-2 border-outline-variant/70 pr-10`}
                />
              </div>
              <div>
                <label htmlFor="np-deadline" className={labelClass}>
                  Frist
                </label>
                <DatePicker
                  id="np-deadline"
                  value={deadline}
                  onChange={setDeadline}
                  className={`${inputUnderlineClass} bg-surface-container-low border-0 border-b-2 border-outline-variant/70 pr-10`}
                />
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
                <ChevronDown
                  className={`h-6 w-6 text-primary/40 transition-transform ${moreOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
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
                      className={`${inputUnderlineClass} resize-none bg-surface-container-low`}
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
                    <div className="flex items-center gap-4 rounded-lg bg-surface-container-low p-3">
                      {teamVisible ? (
                        <Unlock className="h-5 w-5 text-primary/60" aria-hidden />
                      ) : (
                        <Lock className="h-5 w-5 text-primary/60" aria-hidden />
                      )}
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

                  <ProjectColorPicker value={color} onChange={setColor} />

                  <div className="md:col-span-2">
                    <span className={labelClass}>Tags</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="flex items-center gap-2 rounded-md bg-surface-container-high px-3 py-1.5 text-[11px] font-bold text-on-surface-variant"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            className="text-primary/70 hover:text-primary"
                            aria-label={`Fjern ${t}`}
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
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
                          <Plus className="h-3.5 w-3.5" aria-hidden />
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
                        Ved fuldførelse oprettes et nyt identisk projekt med næste frist.
                      </span>
                    </div>
                  </div>

                  {isRoutine ? (
                    <div className="md:col-span-2">
                      <label htmlFor="np-routine" className={labelClass}>
                        Rutineinterval
                      </label>
                      <div className="relative">
                        <select
                          id="np-routine"
                          value={routineInterval}
                          onChange={(e) =>
                            setRoutineInterval(e.target.value as RoutineInterval)
                          }
                          className={`${inputUnderlineClass} appearance-none bg-surface-container-low pr-8`}
                        >
                          <option value="DAILY">Daglig</option>
                          <option value="WEEKLY">Ugentlig</option>
                          <option value="MONTHLY">Månedlig</option>
                          <option value="CUSTOM">Tilpasset (månedlig frist)</option>
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-1 top-3 h-6 w-6 text-primary/40"
                          aria-hidden
                        />
                      </div>
                    </div>
                  ) : null}

                  {mode === "create" ? (
                    <div className="md:col-span-2 flex items-start gap-3 rounded-lg border border-outline-variant/15 bg-surface-container-low/50 px-4 py-3">
                      <input
                        id="np-template"
                        type="checkbox"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-outline-variant text-primary"
                      />
                      <label htmlFor="np-template" className="text-sm text-on-surface">
                        <span className="font-semibold text-primary">Gem som skabelon</span>
                        <span className="mt-0.5 block text-xs text-on-surface-variant">
                          Skabelonen vises under Indstillinger og kan genbruges senere.
                        </span>
                      </label>
                    </div>
                  ) : null}
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
              {submitting
                ? mode === "edit"
                  ? "Gemmer…"
                  : "Opretter…"
                : mode === "edit"
                  ? "Gem ændringer"
                  : "Opret projekt"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
