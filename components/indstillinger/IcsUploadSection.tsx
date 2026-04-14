"use client";

import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  UploadCloud,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

type UiState =
  | { phase: "idle" }
  | { phase: "selected"; file: File }
  | { phase: "uploading"; file: File }
  | { phase: "success"; count: number; importedAt: string }
  | { phase: "error"; message: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatImportedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IcsUploadSection() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [state, setState] = useState<UiState>({ phase: "idle" });

  const reset = useCallback(() => {
    setState({ phase: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const pickFile = useCallback((file: File | null) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".ics")) {
      setState({ phase: "error", message: "Vælg en .ics-fil." });
      return;
    }
    setState({ phase: "selected", file });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const f = e.dataTransfer.files?.[0];
      pickFile(f ?? null);
    },
    [pickFile],
  );

  const upload = useCallback(async (file: File) => {
    setState({ phase: "uploading", file });
    const fd = new FormData();
    fd.set("icsFile", file);
    try {
      const res = await fetch("/api/ics-upload", { method: "POST", body: fd });
      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        imported?: number;
        updated?: number;
        importedAt?: string;
      };
      if (!res.ok) {
        setState({
          phase: "error",
          message: data.error ?? "Upload fejlede.",
        });
        return;
      }
      const n = (data.imported ?? 0) + (data.updated ?? 0);
      setState({
        phase: "success",
        count: n,
        importedAt: data.importedAt ?? new Date().toISOString(),
      });
    } catch {
      setState({ phase: "error", message: "Netværksfejl — prøv igen." });
    }
  }, []);

  return (
    <section
      className="rounded-[8px] border border-[#e8e8e8] bg-white p-6"
      style={{ padding: 24 }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-[#0f1923]">
          Kalender integration
        </h2>
        <span className="rounded bg-[#f0f9ff] px-2 py-0.5 text-[11px] text-[#0ea5e9]">
          Outlook / Teams
        </span>
      </div>
      <p className="mb-4 mt-1 text-[13px] leading-relaxed text-[#6b7280]">
        Importer dine møder fra Outlook eller Teams ved at uploade en .ics-fil fra din
        kalender.
      </p>

      <button
        type="button"
        onClick={() => setHelpOpen((o) => !o)}
        className="mb-4 flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-[12px] font-medium text-[#1a3167]"
      >
        Hvordan eksporterer jeg?
        <ChevronDown
          className={`h-4 w-4 transition-transform ${helpOpen ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {helpOpen ? (
        <div
          className="mb-4 rounded-[8px] border border-[#e8e8e8] bg-[#f8f9fa] px-4 py-3 text-[12px] leading-[1.8] text-[#6b7280]"
          style={{ padding: "12px 16px" }}
        >
          <ol className="list-decimal space-y-1 pl-5">
            <li>Gå til outlook.office.com → Kalender</li>
            <li>
              Klik Indstillinger (tandhjul) → Vis alle indstillinger → Kalender → Delte
              kalendere
            </li>
            <li>
              Under &quot;Publicer en kalender&quot; vælg din kalender og &quot;Kan se alle
              detaljer&quot;
            </li>
            <li>Klik Publicer og download .ics-filen</li>
            <li>Upload filen herunder</li>
          </ol>
        </div>
      ) : null}

      {state.phase === "idle" || state.phase === "selected" ? (
        <>
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-[8px] border-2 border-dashed px-8 py-8 text-center transition-colors ${
              dragActive
                ? "border-[#1a3167] bg-[#f0f6ff]"
                : "border-[#e8e8e8] bg-[#f8f9fa]"
            }`}
            style={{ padding: 32 }}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-[#9ca3af]" strokeWidth={1.5} />
            <p className="mt-2 text-[14px] text-[#6b7280]">Træk din .ics-fil hertil</p>
            <p className="mt-1 text-[12px] text-[#9ca3af]">eller</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-2 rounded-[5px] border border-[#e8e8e8] bg-white px-4 py-1.5 text-[12px] text-[#0f1923]"
            >
              Vælg fil
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".ics"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {state.phase === "selected" ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-[#6b7280]">
                {state.file.name} · {formatBytes(state.file.size)}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="border-0 bg-transparent p-0 text-[12px] text-[#6b7280] underline-offset-2 hover:underline"
                >
                  Fjern
                </button>
                <button
                  type="button"
                  onClick={() => void upload(state.file)}
                  className="rounded-[5px] bg-[#1a3167] px-[18px] py-[7px] text-[13px] font-medium text-white hover:opacity-90"
                >
                  Upload
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {state.phase === "uploading" ? (
        <div className="flex flex-wrap items-center justify-center gap-2 py-6">
          <Loader2 className="h-5 w-5 animate-spin text-[#6b7280]" aria-hidden />
          <span className="text-[13px] text-[#6b7280]">Importerer...</span>
        </div>
      ) : null}

      {state.phase === "success" ? (
        <div className="py-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-[#16a34a]">
                {state.count} møder importeret
              </p>
              <p className="mt-1 text-[11px] text-[#9ca3af]">
                Sidst importeret: {formatImportedAt(state.importedAt)}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-2 border-0 bg-transparent p-0 text-[12px] font-medium text-[#1a3167] hover:underline"
              >
                Importér igen
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {state.phase === "error" ? (
        <div className="py-2">
          <div className="flex items-start gap-2">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#dc2626]" aria-hidden />
            <div>
              <p className="text-[13px] text-[#dc2626]">{state.message}</p>
              <button
                type="button"
                onClick={reset}
                className="mt-2 border-0 bg-transparent p-0 text-[12px] font-medium text-[#1a3167] hover:underline"
              >
                Prøv igen
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
