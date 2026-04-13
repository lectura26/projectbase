"use client";

import { PROJECT_COLORS } from "@/lib/projekter/project-colors";

const labelClass =
  "block text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1 font-label";

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export function ProjectColorPicker({ value, onChange }: Props) {
  const v = value.trim().toLowerCase();
  return (
    <div className="md:col-span-2">
      <span className={labelClass}>Projektfarve</span>
      <div
        className="grid w-max max-w-full gap-[5px]"
        style={{ gridTemplateColumns: "repeat(6, 20px)" }}
        role="listbox"
        aria-label="Projektfarve"
      >
        {PROJECT_COLORS.map((c) => {
          const selected = c.toLowerCase() === v;
          return (
            <button
              key={c}
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
          );
        })}
      </div>
    </div>
  );
}
