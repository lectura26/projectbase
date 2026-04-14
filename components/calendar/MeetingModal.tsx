"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  createMeeting,
  deleteMeeting,
  updateMeeting,
} from "@/lib/calendar/actions";
import { isoToYmd } from "@/lib/datetime/ymd";
import type { CalendarMeetingDTO, CalendarProjectOption } from "@/types/calendar";
import { DatePicker } from "@/components/ui/DatePicker";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  /** ISO strings for meeting fields */
  initial: CalendarMeetingDTO | null;
  /** When creating, pre-select this project */
  defaultProjectId?: string | null;
  projects: CalendarProjectOption[];
  onSaved: () => void;
};

function timeInputFromStored(s: string | null): string {
  if (!s?.trim()) return "";
  const t = s.trim();
  if (/^\d{2}:\d{2}$/.test(t)) return t;
  return t.slice(0, 5);
}

export function MeetingModal({
  open,
  onClose,
  mode,
  initial,
  defaultProjectId,
  projects,
  onSaved,
}: Props) {
  const titleId = useId();
  const [title, setTitle] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setTitle(initial.title);
      setDateYmd(isoToYmd(initial.date));
      setStartTime(timeInputFromStored(initial.startTime));
      setEndTime(timeInputFromStored(initial.endTime));
      setProjectId(initial.projectId);
    } else {
      setTitle("");
      setDateYmd(isoToYmd(new Date().toISOString()));
      setStartTime("");
      setEndTime("");
      setProjectId(defaultProjectId ?? null);
    }
    setProjectSearch("");
    setProjectOpen(false);
  }, [open, mode, initial, defaultProjectId]);

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projects, projectId],
  );

  const save = useCallback(async () => {
    const t = title.trim();
    if (!t || !dateYmd) return;
    setBusy(true);
    try {
      if (mode === "create") {
        await createMeeting({
          title: t,
          date: dateYmd,
          startTime: startTime || null,
          endTime: endTime || null,
          projectId: projectId ?? undefined,
        });
      } else if (initial) {
        await updateMeeting(initial.id, {
          title: t,
          date: dateYmd,
          startTime: startTime || null,
          endTime: endTime || null,
          projectId,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [title, dateYmd, startTime, endTime, projectId, mode, initial, onSaved, onClose]);

  const remove = useCallback(async () => {
    if (!initial || mode !== "edit") return;
    if (!window.confirm("Slet dette møde?")) return;
    setBusy(true);
    try {
      await deleteMeeting(initial.id);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }, [initial, mode, onSaved, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Luk"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-[440px] rounded-[12px] bg-white p-6 shadow-xl"
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-semibold text-[#0f1923]">
            {mode === "create" ? "Nyt møde" : "Rediger møde"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#6b7280] hover:bg-[#f3f4f6]"
            aria-label="Luk"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6b7280]">
              Titel
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm text-[#0f1923] outline-none focus:border-[#1a3167]"
              placeholder="Mødetitel"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[#6b7280]">
              Dato
            </label>
            <DatePicker
              value={dateYmd}
              onChange={setDateYmd}
              placeholder="DD-MM-YYYY"
              className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#6b7280]">
                Fra
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="14:00"
                className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm text-[#0f1923]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-[#6b7280]">
                Til
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="15:00"
                className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-sm text-[#0f1923]"
              />
            </div>
          </div>
          <div className="relative">
            <label className="mb-1 block text-[11px] font-medium text-[#6b7280]">
              Tilknyt projekt
            </label>
            <button
              type="button"
              onClick={() => setProjectOpen((o) => !o)}
              className="flex w-full items-center gap-2 rounded-lg border border-[#e8e8e8] px-3 py-2 text-left text-sm"
            >
              {selectedProject ? (
                <>
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: selectedProject.color }}
                  />
                  <span className="truncate text-[#0f1923]">{selectedProject.name}</span>
                </>
              ) : (
                <span className="text-[#9ca3af]">Ingen projekt</span>
              )}
            </button>
            <input
              type="text"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              onFocus={() => setProjectOpen(true)}
              placeholder="Søg projekt..."
              className="mt-2 w-full rounded-lg border border-[#e8e8e8] px-3 py-1.5 text-xs"
            />
            {projectOpen ? (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#e8e8e8] bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setProjectId(null);
                    setProjectOpen(false);
                  }}
                  className="flex w-full px-3 py-2 text-left text-sm text-[#6b7280] hover:bg-[#f8f9fa]"
                >
                  Ingen projekt
                </button>
                {filteredProjects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProjectId(p.id);
                      setProjectOpen(false);
                      setProjectSearch("");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#f8f9fa]"
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="truncate text-[#0f1923]">{p.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="text-sm font-medium text-[#dc2626] hover:underline disabled:opacity-50"
            >
              Slet møde
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#6b7280] hover:bg-[#f3f4f6]"
            >
              Annuller
            </button>
            <button
              type="button"
              disabled={busy || !title.trim() || !dateYmd}
              onClick={() => void save()}
              className="rounded-lg bg-[#1a3167] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Gem møde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
