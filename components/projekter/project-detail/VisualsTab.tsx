"use client";

import { Download, Loader2, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { deleteVisual, uploadVisual } from "@/app/(dashboard)/projekter/project-detail-actions";
import { validateVisualUpload } from "@/lib/storage/file-validation";
import { formatDanishDate } from "@/lib/datetime/format-danish";
import type { ProjectDetailPayload, VisualDTO } from "@/types/project-detail";

type Props = {
  initial: ProjectDetailPayload;
  onRefresh: () => void;
};

export function VisualsTab({ initial, onRefresh }: Props) {
  const [visuals, setVisuals] = useState<VisualDTO[]>(initial.visuals);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lightbox, setLightbox] = useState<VisualDTO | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setVisuals(initial.visuals);
  }, [initial.visuals, initial.updatedAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    if (lightbox) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [lightbox]);

  const runUpload = useCallback(
    async (file: File) => {
      const checked = validateVisualUpload({
        size: file.size,
        name: file.name,
        type: file.type,
      });
      if (!checked.ok) {
        toast.error(checked.reason);
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("projectId", initial.id);
        fd.append("file", file);
        const created = await uploadVisual(fd);
        setVisuals((prev) => [created, ...prev]);
        toast.success("Billede uploadet");
        onRefresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload fejlede");
      } finally {
        setUploading(false);
      }
    },
    [initial.id, onRefresh],
  );

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await runUpload(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await runUpload(file);
  };

  const remove = async (v: VisualDTO) => {
    try {
      await deleteVisual(v.id);
      setVisuals((prev) => prev.filter((x) => x.id !== v.id));
      setConfirmDeleteId(null);
      if (lightbox?.id === v.id) setLightbox(null);
      toast.success("Slettet");
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kunne ikke slette");
    }
  };

  return (
    <div
      className="relative min-h-[120px]"
      onDragEnter={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return;
        setDragActive(false);
      }}
      onDrop={(e) => void handleDrop(e)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,.png,.jpg,.jpeg,.svg"
          className="hidden"
          onChange={(ev) => void onFile(ev)}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-outline-variant/20 px-3 py-1.5 font-body text-sm font-medium text-primary"
        >
          Upload billede
        </button>
      </div>

      {visuals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Upload className="mb-2 h-8 w-8 text-[#9ca3af]" aria-hidden />
          <p className="font-body text-[13px] text-[#9ca3af]">Ingen visuals uploadet endnu.</p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}
        >
          {visuals.map((v) => (
            <div
              key={v.id}
              className="group relative overflow-hidden rounded-[8px] border border-[#e8e8e8] bg-white"
            >
              <button
                type="button"
                className="relative block w-full border-0 bg-[#f8f9fa] p-0 text-left"
                onClick={() => setLightbox(v)}
              >
                <div className="relative flex h-[160px] items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.url}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </button>
              <div className="truncate px-2.5 pt-2 text-[12px] font-medium text-[#0f1923]">{v.name}</div>
              <div className="px-2.5 pb-2 text-[11px] text-[#9ca3af]">{formatDanishDate(v.createdAt)}</div>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 bg-[rgba(0,0,0,0.35)] opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                <a
                  href={v.url}
                  download={v.name}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#0f1923] shadow"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download className="h-4 w-4" aria-hidden />
                </a>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#dc2626] shadow"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteId(v.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>

              {confirmDeleteId === v.id ? (
                <div
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/95 p-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-center text-xs text-[#0f1923]">Slette dette billede?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded bg-[#dc2626] px-3 py-1 text-xs font-medium text-white"
                      onClick={() => void remove(v)}
                    >
                      Slet
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-1 text-xs"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Annuller
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {uploading ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[8px] bg-[rgba(240,246,255,0.9)]"
          aria-live="polite"
        >
          <Loader2 className="h-10 w-10 animate-spin text-[#1a3167]" aria-hidden />
          <p className="mt-3 text-[16px] font-medium text-[#1a3167]">Uploader...</p>
        </div>
      ) : dragActive ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[8px] border-2 border-dashed border-[#1a3167] bg-[rgba(240,246,255,0.9)]"
          aria-hidden
        >
          <UploadCloud className="h-10 w-10 text-[#1a3167]" aria-hidden />
          <p className="mt-3 text-[16px] font-medium text-[#1a3167]">Slip billedet her</p>
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(0,0,0,0.85)] p-4"
          role="presentation"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border-0 bg-white/10 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            aria-label="Luk"
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
