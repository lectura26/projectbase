"use client";

import type { Priority, ProjectStatus, ProjectVisibility, RoutineInterval } from "@prisma/client";
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
import { priorityLabelDa, statusLabelDa } from "@/components/projekter/project-helpers";
import { DatePicker } from "@/components/ui/DatePicker";

type UserOption = { id: string; name: string; email: string };

type NytProjektModalProps = {
  open: boolean;
  onClose: () => void;
  users: UserOption[];
  mode?: "create" | "edit";
  projectId?: string;
  initialEdit?: EditProjectInitial | null;
  /** Hex colors already used by this user's projects (edit: current project may still use its color). */
  usedColors: string[];
};

const cellLabelClass =
  "mb-0.5 block text-[11px] font-medium uppercase tracking-[0.04em] text-[#9ca3af]";
const cellBoxClass =
  "flex min-h-0 min-w-0 flex-col rounded-[6px] bg-[#f8f9fa] px-3 py-2";
const inputBaseClass =
  "w-full rounded-[6px] border border-[#e8e8e8] px-[14px] py-[10px] font-body text-[13px] text-[#0f1923] outline-none placeholder:text-[#9ca3af] focus:border-[#1a3167]";
const textareaBaseClass =
  `${inputBaseClass} min-h-[80px] resize-y leading-relaxed`;

export function NytProjektModal({
  open,
  onClose,
  users,
  mode = "create",
  projectId,
  initialEdit = null,
  usedColors,
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
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("NOT_STARTED");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [teamVisible, setTeamVisible] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [isRoutine, setIsRoutine] = useState(false);
  const [routineInterval, setRoutineInterval] = useState<RoutineInterval>("MONTHLY");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLORS[0]!);
  const [nameError, setNameError] = useState("");

  const resetForm = useCallback(() => {
    setName("");
    setStartDate("");
    setDeadline("");
    setDescription("");
    setProjectStatus("NOT_STARTED");
    setPriority("MEDIUM");
    setTeamVisible(true);
    setTags([]);
    setTagDraft("");
    setIsRoutine(false);
    setRoutineInterval("MONTHLY");
    setContactName("");
    setContactEmail("");
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
      setProjectStatus(initialEdit.status);
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
          status: projectStatus,
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
          status: projectStatus,
          visibility,
          tags,
          isRoutine,
          routineInterval: isRoutine ? routineInterval : null,
          contactName: contactName || undefined,
          contactEmail: contactEmail || undefined,
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
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <label htmlFor="np-name" className={`${cellLabelClass} ml-0`}>
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
                  className={`${inputBaseClass} mt-1`}
                  autoComplete="off"
                  aria-invalid={Boolean(nameError)}
                />
                {nameError ? (
                  <p className="mt-2 text-xs text-error">{nameError}</p>
                ) : null}
              </div>
              <div>
                <label htmlFor="np-deadline" className={`${cellLabelClass} ml-0`}>
                  Frist
                </label>
                <div className="mt-1">
                  <DatePicker
                    id="np-deadline"
                    value={deadline}
                    onChange={setDeadline}
                    className={`${inputBaseClass} !mt-0 border-0 border-b-2 border-outline-variant/70 !bg-surface-container-low pr-10`}
                  />
                </div>
              </div>
            </section>

            <div className="h-px bg-[#f3f4f6]" />

            <section className="space-y-0">
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
                <div className="mt-4 space-y-0">
                  <div className="grid grid-cols-1 gap-3 border-b border-[#f3f4f6] pb-4 md:grid-cols-2">
                    <div className={cellBoxClass}>
                      <span className={cellLabelClass}>Status</span>
                      <select
                        value={projectStatus}
                        onChange={(e) =>
                          setProjectStatus(e.target.value as ProjectStatus)
                        }
                        className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-[#0f1923] outline-none"
                      >
                        {(
                          [
                            "NOT_STARTED",
                            "IN_PROGRESS",
                            "WAITING",
                            "COMPLETED",
                          ] as const
                        ).map((s) => (
                          <option key={s} value={s}>
                            {statusLabelDa(s)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={cellBoxClass}>
                      <span className={cellLabelClass}>Prioritet</span>
                      <select
                        value={priority}
                        onChange={(e) =>
                          setPriority(e.target.value as Priority)
                        }
                        className="mt-0.5 w-full cursor-pointer border-0 bg-transparent p-0 text-[13px] font-medium text-[#0f1923] outline-none"
                      >
                        {(["HIGH", "MEDIUM", "LOW"] as const).map((p) => (
                          <option key={p} value={p}>
                            {priorityLabelDa(p)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-b border-[#f3f4f6] py-4 md:grid-cols-2">
                    <div className={cellBoxClass}>
                      <span className={cellLabelClass}>Startdato</span>
                      <div className="mt-0.5 min-w-0 [&_button]:text-[13px] [&_button]:font-medium">
                        <DatePicker
                          value={startDate}
                          onChange={setStartDate}
                          placeholder="Ingen"
                          className="!w-full !border-0 !bg-transparent !p-0 !text-[13px] !font-medium !text-[#0f1923] !shadow-none"
                        />
                      </div>
                    </div>
                    <div className={`${cellBoxClass} justify-center`}>
                      <span className={cellLabelClass}>Rutineprojekt</span>
                      <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-[12px] text-[#6b7280]">
                          Genstart automatisk når afsluttet
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isRoutine}
                          onClick={() => setIsRoutine((v) => !v)}
                          className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                            isRoutine ? "bg-[#1a3167]" : "bg-[#d1d5db]"
                          }`}
                        >
                          <span
                            className={`absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${
                              isRoutine ? "right-1" : "left-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isRoutine ? (
                    <div className="border-b border-[#f3f4f6] py-4">
                      <span className={cellLabelClass}>Rutineinterval</span>
                      <div className="relative mt-2">
                        <select
                          value={routineInterval}
                          onChange={(e) =>
                            setRoutineInterval(e.target.value as RoutineInterval)
                          }
                          className={`${inputBaseClass} w-full appearance-none pr-8`}
                        >
                          <option value="DAILY">Daglig</option>
                          <option value="WEEKLY">Ugentlig</option>
                          <option value="MONTHLY">Månedlig</option>
                          <option value="CUSTOM">Tilpasset (månedlig frist)</option>
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]"
                          aria-hidden
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="border-b border-[#f3f4f6] py-4">
                    <label htmlFor="np-desc" className={cellLabelClass}>
                      Beskrivelse
                    </label>
                    <textarea
                      id="np-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Beskriv projektets formål…"
                      className={`${textareaBaseClass} mt-2 w-full`}
                    />
                  </div>

                  <div className="border-b border-[#f3f4f6] py-4">
                    <span className={cellLabelClass}>Kontaktpersoner</span>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {contactName.trim() && contactEmail.trim() ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#f3f4f6] px-3 py-1.5 text-[12px] font-medium text-[#0f1923]">
                          {contactName.trim()} · {contactEmail.trim()}
                          <button
                            type="button"
                            onClick={() => {
                              setContactName("");
                              setContactEmail("");
                            }}
                            className="text-[#6b7280] hover:text-[#0f1923]"
                            aria-label="Fjern kontakt"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Navn"
                        className={inputBaseClass}
                      />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="E-mail"
                        className={inputBaseClass}
                      />
                    </div>
                  </div>

                  <div className="border-b border-[#f3f4f6] py-4">
                    <span className={cellLabelClass}>Tags</span>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#1a3167] px-2.5 py-1 text-[11px] font-semibold text-white"
                        >
                          {t}
                          <button
                            type="button"
                            onClick={() => removeTag(t)}
                            className="text-white/80 hover:text-white"
                            aria-label={`Fjern ${t}`}
                          >
                            <X className="h-3 w-3" aria-hidden />
                          </button>
                        </span>
                      ))}
                      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-md border border-[#e8e8e8] px-2 py-1.5 sm:max-w-xs">
                        <input
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="Tilføj tag…"
                          className="min-w-0 flex-1 border-0 bg-transparent py-0.5 text-[13px] text-[#0f1923] outline-none placeholder:text-[#9ca3af]"
                        />
                        <button
                          type="button"
                          onClick={addTag}
                          className="shrink-0 text-[#1a3167]"
                          aria-label="Tilføj tag"
                        >
                          <Plus className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 py-4 md:grid-cols-2">
                    <div className={cellBoxClass}>
                      <span className={cellLabelClass}>Projektfarve</span>
                      <div className="mt-2">
                        <ProjectColorPicker
                          value={color}
                          onChange={setColor}
                          usedColors={usedColors}
                          currentProjectColor={
                            mode === "edit" && initialEdit ? initialEdit.color : null
                          }
                          showLabel={false}
                        />
                      </div>
                    </div>
                    <div className={cellBoxClass}>
                      <span className={cellLabelClass}>Synlighed</span>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          {teamVisible ? (
                            <Unlock className="h-4 w-4 shrink-0 text-[#1a3167]/70" aria-hidden />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0 text-[#1a3167]/70" aria-hidden />
                          )}
                          <span className="text-[12px] font-medium text-[#0f1923]">
                            {teamVisible ? "Synlig for teamet" : "Kun synlig for ejer"}
                          </span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={teamVisible}
                          onClick={() => setTeamVisible((v) => !v)}
                          className={`relative h-5 w-10 shrink-0 rounded-full transition-colors ${
                            teamVisible ? "bg-[#1a3167]" : "bg-[#d1d5db]"
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
    document.body,
  );
}
