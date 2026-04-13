"use client";

import { useEffect, useState } from "react";
import { commitYmdString, normalizePartialYmd } from "@/lib/datetime/ymd";

type Props = {
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  value: string;
  onChange: (ymd: string) => void;
  /** Fired after blur with normalized yyyy-MM-dd (or ""). */
  onBlurCommit?: (committed: string) => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Controlled calendar input: values are always normalized to YYYY-MM-DD on blur (4-digit year).
 * Emits partial strings while typing so parents can commit on form submit with `commitYmdString`.
 */
export function DateInputYmd({
  id,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  value,
  onChange,
  onBlurCommit,
  className,
  disabled,
}: Props) {
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      value={text}
      onChange={(e) => {
        const next = normalizePartialYmd(e.target.value);
        setText(next);
        onChange(next);
      }}
      onBlur={() => {
        const committed = commitYmdString(text);
        setText(committed);
        onChange(committed);
        onBlurCommit?.(committed);
      }}
      className={className}
    />
  );
}
