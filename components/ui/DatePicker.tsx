"use client";

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  danishDisplayToIsoYmd,
  isoYmdToDanishDisplay,
  normalizePartialDanishDate,
} from "@/lib/datetime/format-danish";

const WEEKDAYS = ["MAN", "TIR", "ONS", "TOR", "FRE", "LØR", "SØN"] as const;

type Props = {
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  /** Stored as yyyy-MM-dd (ISO date) for Prisma. */
  value: string;
  onChange: (isoDate: string) => void;
  onBlurCommit?: (committed: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
};

function parseValueToLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value ?? "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d, 12, 0, 0);
  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function DatePicker({
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  value,
  onChange,
  onBlurCommit,
  placeholder = "DD-MM-YYYY",
  label,
  className = "",
  disabled,
}: Props) {
  const genId = useId();
  const inputId = id ?? genId;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => isoYmdToDanishDisplay(value));
  const [viewMonth, setViewMonth] = useState(() =>
    parseValueToLocalDate(value) ?? new Date(),
  );

  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setText(isoYmdToDanishDisplay(value));
  }, [value]);

  useEffect(() => {
    if (open) {
      const d = parseValueToLocalDate(value);
      setViewMonth(d ?? new Date());
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const calendarDays = useMemo(() => {
    const ms = startOfMonth(viewMonth);
    const me = endOfMonth(viewMonth);
    const start = startOfWeek(ms, { weekStartsOn: 1 });
    const end = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [viewMonth]);

  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12, 0, 0);
  }, []);

  const selectedDate = parseValueToLocalDate(value);

  const selectDay = useCallback(
    (day: Date) => {
      const y = day.getFullYear();
      const mo = String(day.getMonth() + 1).padStart(2, "0");
      const d = String(day.getDate()).padStart(2, "0");
      const iso = `${y}-${mo}-${d}`;
      setText(isoYmdToDanishDisplay(iso));
      onChange(iso);
      onBlurCommit?.(iso);
      setOpen(false);
    },
    [onChange, onBlurCommit],
  );

  const commitText = useCallback(() => {
    const iso = danishDisplayToIsoYmd(text);
    setText(isoYmdToDanishDisplay(iso));
    onChange(iso);
    onBlurCommit?.(iso);
  }, [text, onChange, onBlurCommit]);

  const inputBase =
    "w-full min-w-0 rounded border border-outline-variant/30 bg-white py-2 pl-3 pr-10 font-body text-sm text-on-surface placeholder:text-outline-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div ref={rootRef} className="relative w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="mb-1 block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant"
        >
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-expanded={open}
          aria-haspopup="dialog"
          value={text}
          maxLength={10}
          onChange={(e) => {
            const next = normalizePartialDanishDate(e.target.value);
            setText(next);
            const iso = danishDisplayToIsoYmd(next);
            if (iso && next.length === 10) {
              onChange(iso);
            }
          }}
          onBlur={() => {
            commitText();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
          className={`${inputBase} ${className}`.trim()}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-primary/50 hover:bg-surface-container-low hover:text-primary disabled:opacity-40"
          aria-label="Åbn kalender"
          onClick={(e) => {
            e.preventDefault();
            if (!disabled) setOpen((o) => !o);
          }}
        >
          <Calendar className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {open && !disabled ? (
        <div
          className="absolute left-0 top-full z-[150] mt-1 w-[min(100vw-2rem,280px)] rounded-[8px] border border-[#e8e8e8] bg-white p-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          role="dialog"
          aria-label="Vælg dato"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#0f1923] hover:bg-[#f0f6ff]"
              aria-label="Forrige måned"
              onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-0 flex-1 text-center font-body text-sm font-semibold capitalize text-[#0f1923]">
              {format(viewMonth, "MMMM yyyy", { locale: da })}
            </span>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#0f1923] hover:bg-[#f0f6ff]"
              aria-label="Næste måned"
              onClick={() => setViewMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-0 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="pb-1 font-body text-[11px] font-medium text-[#9ca3af]"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isToday = isSameDay(day, today);
              const isSelected =
                selectedDate != null && isSameDay(day, selectedDate);
              return (
                <div key={day.toISOString()} className="flex justify-center">
                  <button
                    type="button"
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-body text-[13px] font-medium transition-colors ${
                      isSelected
                        ? "bg-[#1a3167] text-white"
                        : isToday
                          ? "border border-solid border-[#1a3167] text-[#0f1923]"
                          : inMonth
                            ? "text-[#0f1923] hover:bg-[#f0f6ff]"
                            : "text-[#d1d5db] hover:bg-[#f8f9fa]"
                    }`}
                    onClick={() => selectDay(day)}
                  >
                    {format(day, "d")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
