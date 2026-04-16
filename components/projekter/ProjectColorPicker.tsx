"use client";

import { X } from "lucide-react";
import { PROJECT_COLORS } from "@/lib/projekter/project-colors";

const labelClass =
  "block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1 font-label";

function normHex(hex: string): string {
  return hex.trim().toLowerCase();
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
  /** Colors already used by the user's projects; those swatches are disabled unless they match `currentProjectColor`. */
  usedColors?: string[];
  /** When editing, this project's color stays selectable even if listed in `usedColors`. */
  currentProjectColor?: string | null;
  /** When false, omit the built-in label (e.g. when the parent already shows "Projektfarve"). */
  showLabel?: boolean;
};

export function ProjectColorPicker({
  value,
  onChange,
  usedColors = [],
  currentProjectColor = null,
  showLabel = true,
}: Props) {
  const v = value.trim().toLowerCase();
  const usedSet = new Set(usedColors.map(normHex));
  const own = currentProjectColor != null ? normHex(currentProjectColor) : null;

  return (
    <div className="md:col-span-2">
      {showLabel ? <span className={labelClass}>Projektfarve</span> : null}
      <div
        className="grid w-max max-w-full gap-[5px]"
        style={{ gridTemplateColumns: "repeat(6, 20px)" }}
        role="listbox"
        aria-label="Projektfarve"
      >
        {PROJECT_COLORS.map((c) => {
          const selected = c.toLowerCase() === v;
          const isUsed = usedSet.has(normHex(c));
          const disabled = isUsed && (own == null || normHex(c) !== own);
          return (
            <div key={c} className="relative h-5 w-5 shrink-0">
              {disabled ? (
                <div
                  role="option"
                  aria-disabled
                  aria-selected={selected}
                  aria-label={`Farve optaget (${c})`}
                  className="pointer-events-none h-5 w-5 cursor-not-allowed rounded-full opacity-25"
                  style={{
                    backgroundColor: c,
                    boxShadow: selected ? `inset 0 0 0 2px #fff, 0 0 0 2px ${c}` : undefined,
                  }}
                >
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <X className="h-2.5 w-2.5 text-white drop-shadow-sm" strokeWidth={3} aria-hidden />
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-label={`Vælg farve ${c}`}
                  onClick={() => onChange(c)}
                  className="h-5 w-5 shrink-0 rounded-full transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  style={{
                    backgroundColor: c,
                    boxShadow: selected ? `inset 0 0 0 2px #fff, 0 0 0 2px ${c}` : undefined,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
