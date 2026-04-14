"use client";

import { AnimatePresence, motion } from "framer-motion";
import { differenceInCalendarDays, startOfDay } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
  statusBadgeClass,
  statusLabelDa,
} from "@/components/projekter/project-helpers";
import type { OversigtFocusSuggestion } from "@/types/oversigt";

export function fristLine(deadlineIso: string | null): { text: string; urgent: boolean } {
  if (!deadlineIso) return { text: "Ingen frist", urgent: false };
  const dl = startOfDay(new Date(deadlineIso));
  const now = startOfDay(new Date());
  const d = differenceInCalendarDays(dl, now);
  if (d < 0) return { text: `${Math.abs(d)} dage overskredet`, urgent: true };
  if (d === 0) return { text: "Frist i dag", urgent: true };
  if (d <= 3) return { text: `Frist om ${d} dage`, urgent: true };
  return { text: `Frist om ${d} dage`, urgent: false };
}

type Props = {
  open: boolean;
  displayName: string;
  todayLabel: string;
  suggestions: OversigtFocusSuggestion[];
  autoSelectedId: string | null;
  onClose: () => void;
  onConfirm: (projectId: string) => Promise<void>;
};

export function FocusPicker({
  open,
  displayName,
  todayLabel,
  suggestions,
  autoSelectedId,
  onClose,
  onConfirm,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(autoSelectedId);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSelectedId(autoSelectedId);
  }, [open, autoSelectedId]);

  const topSuggestionId = autoSelectedId ?? suggestions[0]?.id ?? null;

  const handleSkip = useCallback(async () => {
    if (!topSuggestionId) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(topSuggestionId);
    } finally {
      setSubmitting(false);
    }
  }, [topSuggestionId, onConfirm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }, [selectedId, onConfirm, onClose]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="focus-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="focus-picker-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(15, 25, 35, 0.4)",
            backdropFilter: "blur(2px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-[480px] rounded-[12px] bg-white px-8 py-9 shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="focus-picker-title"
              className="text-[22px] font-semibold leading-tight text-[#0f1923]"
            >
              God morgen, {displayName} 👋
            </h2>
            <p className="mt-1.5 text-[14px] leading-[1.6] text-[#6b7280]">
              Hvad er dit fokusprojekt i dag?
            </p>
            <p className="mt-1 text-[12px] capitalize text-[#9ca3af]">{todayLabel}</p>
            <div className="my-5 h-px bg-[#e8e8e8]" />

            <div className="max-h-[min(50vh,360px)] overflow-y-auto">
              {suggestions.map((s) => {
                const sel = selectedId === s.id;
                const frist = fristLine(s.deadline);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="mb-2.5 w-full rounded-[8px] bg-white px-4 py-3.5 text-left transition-[box-shadow,background-color,border-color] duration-150 last:mb-0"
                    style={{
                      boxShadow: `inset 3px 0 0 ${s.color}`,
                      borderWidth: sel ? 2 : 1,
                      borderStyle: "solid",
                      borderColor: sel ? "#1a3167" : "#e8e8e8",
                      backgroundColor: sel ? "#f0f6ff" : "#ffffff",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[14px] font-medium text-[#0f1923]">{s.name}</span>
                      <span
                        className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(s.status)}`}
                      >
                        {statusLabelDa(s.status)}
                      </span>
                    </div>
                    <div className="mt-2.5 h-1 w-full overflow-hidden rounded-[2px] bg-[#e8e8e8]">
                      <div
                        className="h-full rounded-[2px]"
                        style={{
                          width: `${s.progress}%`,
                          backgroundColor: s.color,
                        }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className="text-[12px]"
                        style={{ color: frist.urgent ? "#dc2626" : "#6b7280" }}
                      >
                        {frist.text}
                      </span>
                      {s.overdueCount > 0 ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-[#dc2626]">
                          {s.overdueCount} overskredte
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={submitting || !topSuggestionId}
                onClick={() => void handleSkip()}
                className="rounded-[6px] border border-[#e8e8e8] bg-white px-[18px] py-2 text-[13px] font-medium text-[#6b7280] hover:bg-[#f8f9fa] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Spring over
              </button>
              <button
                type="button"
                disabled={!selectedId || submitting}
                onClick={() => void handleConfirm()}
                className="rounded-[6px] bg-[#1a3167] px-[18px] py-2 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sæt fokus
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
