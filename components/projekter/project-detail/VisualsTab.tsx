"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import { GripVertical, Loader2, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteVisual,
  reorderVisuals,
  uploadVisual,
} from "@/app/(dashboard)/projekter/project-detail-actions";
import { formatDanishDate } from "@/lib/datetime/format-danish";
import { validateVisualUpload } from "@/lib/storage/file-validation";
import type { ProjectDetailPayload, VisualDTO } from "@/types/project-detail";

type Props = {
  initial: ProjectDetailPayload;
  onRefresh: () => void;
};

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed!);
  return result;
}

export function VisualsTab({ initial, onRefresh }: Props) {
  const [visuals, setVisuals] = useState<VisualDTO[]>(initial.visuals);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<VisualDTO | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedVisuals = useMemo(
    () =>
      [...visuals].sort((a, b) =>
        a.sortOrder !== b.sortOrder
          ? a.sortOrder - b.sortOrder
          : a.createdAt.localeCompare(b.createdAt),
      ),
    [visuals],
  );

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

  /** Shared upload path: FormData → uploadVisual → state + refresh. */
  const uploadFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      const list = files ? Array.from(files) : [];
      if (list.length === 0) return;

      setUploading(true);
      let successCount = 0;
      try {
        for (const file of list) {
          const checked = validateVisualUpload({
            size: file.size,
            name: file.name,
            type: file.type,
          });
          if (!checked.ok) {
            console.error("[VisualsTab] upload validation failed:", checked.reason, file.name);
            toast.error(checked.reason);
            continue;
          }

          try {
            const fd = new FormData();
            fd.append("projectId", initial.id);
            fd.append("file", file);
            const created = await uploadVisual(fd);
            successCount += 1;
            setVisuals((prev) =>
              [...prev, created].sort((a, b) =>
                a.sortOrder !== b.sortOrder
                  ? a.sortOrder - b.sortOrder
                  : a.createdAt.localeCompare(b.createdAt),
              ),
            );
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error("[VisualsTab] uploadVisual failed:", err);
            toast.error(message);
          }
        }

        if (successCount > 0) {
          toast.success(
            successCount === 1 ? "Billede uploadet" : `${successCount} billeder uploadet`,
          );
          onRefresh();
        }
      } finally {
        setUploading(false);
      }
    },
    [initial.id, onRefresh],
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    void uploadFiles(files);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  /** Capture phase so OS file drops are handled before @hello-pangea/dnd. */
  const onContainerFileDropCapture = (e: React.DragEvent) => {
    const dt = e.dataTransfer;
    if (!dt?.files?.length) return;
    e.preventDefault();
    e.stopPropagation();
    void uploadFiles(dt.files);
  };

  const onContainerDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types?.includes("Files")) {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = reorder(sortedVisuals, result.source.index, result.destination.index);
    const next = reordered.map((item, i) => ({ ...item, sortOrder: i }));
    const prev = visuals;
    setVisuals(next);
    try {
      await reorderVisuals(reordered.map((v) => v.id));
    } catch (e) {
      setVisuals(prev);
      toast.error(e instanceof Error ? e.message : "Kunne ikke gemme rækkefølge.");
    }
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
      console.error("[VisualsTab] deleteVisual failed:", err);
      toast.error(err instanceof Error ? err.message : "Kunne ikke slette");
    }
  };

  const droppableId = `visuals-${initial.id}`;

  const emptyState =
    visuals.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <UploadCloud className="h-10 w-10 text-[#9ca3af]" strokeWidth={1.5} aria-hidden />
        <p className="mt-3 text-[14px] text-[#6b7280]">Ingen visuals endnu</p>
        <p className="mt-1 text-[13px] text-[#9ca3af]">Klik &apos;Vælg filer&apos; for at uploade</p>
      </div>
    ) : null;

  return (
    <div
      className="relative min-h-[120px]"
      onDragOver={onContainerDragOver}
      onDropCapture={onContainerFileDropCapture}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.svg"
        multiple
        className="hidden"
        onChange={onFileInputChange}
      />

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          disabled={uploading}
          onClick={openFilePicker}
          className="inline-flex items-center gap-1.5 rounded-[5px] border border-solid border-[#e8e8e8] bg-white px-[14px] py-1.5 text-[12px] font-medium text-[#0f1923] disabled:opacity-60"
        >
          <Upload className="h-[14px] w-[14px] shrink-0" aria-hidden />
          Vælg filer
        </button>
      </div>

      {uploading ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-[8px] bg-white/70"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#1a3167]" aria-hidden />
          <p className="mt-3 text-[14px] font-medium text-[#1a3167]">Uploader...</p>
        </div>
      ) : null}

      {emptyState}

      {sortedVisuals.length > 0 ? (
        <DragDropContext onDragEnd={(r) => void onDragEnd(r)}>
          <Droppable droppableId={droppableId}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="pb-2">
                {sortedVisuals.map((v, index) => (
                  <Draggable key={v.id} draggableId={v.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`group relative mx-auto mb-12 max-w-[800px] ${
                          snapshot.isDragging ? "opacity-70" : ""
                        }`}
                        style={{
                          ...dragProvided.draggableProps.style,
                          ...(snapshot.isDragging
                            ? {
                                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                              }
                            : {}),
                        }}
                      >
                        <div
                          className={`flex justify-center transition-opacity duration-150 ${
                            snapshot.isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <button
                            type="button"
                            aria-label="Træk for at omarrangere"
                            {...dragProvided.dragHandleProps}
                            className="flex cursor-grab items-center justify-center rounded border-0 bg-transparent p-0 pb-1 active:cursor-grabbing"
                          >
                            <GripVertical className="h-[18px] w-[18px] text-[#d1d5db]" aria-hidden />
                          </button>
                        </div>

                        <div
                          className={`overflow-hidden rounded-[8px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] transition-transform ${
                            snapshot.isDragging ? "scale-[1.01]" : ""
                          }`}
                        >
                          <button
                            type="button"
                            className="block w-full border-0 bg-white p-0 text-left"
                            onClick={() => setLightbox(v)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={v.url}
                              alt=""
                              className="h-auto w-full object-contain"
                            />
                          </button>
                        </div>

                        <p className="mt-3 text-center text-[14px] font-medium text-[#0f1923]">{v.name}</p>
                        <p className="mt-0.5 text-center text-[12px] text-[#9ca3af]">
                          {formatDanishDate(v.createdAt)}
                        </p>

                        <div
                          className={`mt-2 flex justify-center transition-opacity duration-150 ${
                            confirmDeleteId === v.id
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {confirmDeleteId === v.id ? (
                            <button
                              type="button"
                              className="border-0 bg-transparent p-0 text-[14px] font-medium text-[#dc2626] underline-offset-2 hover:underline"
                              onClick={() => void remove(v)}
                            >
                              Slet?
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label="Slet billede"
                              className="rounded border-0 bg-transparent p-0 text-[#d1d5db] transition-colors hover:text-[#dc2626]"
                              onClick={() => setConfirmDeleteId(v.id)}
                            >
                              <Trash2 className="h-[14px] w-[14px]" strokeWidth={2} aria-hidden />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : null}

      <AnimatePresence>
        {lightbox ? (
          <motion.div
            key={lightbox.id}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[rgba(0,0,0,0.9)] p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-white transition-colors hover:bg-[rgba(255,255,255,0.15)]"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              aria-label="Luk"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <div
              className="flex max-h-[90vh] max-w-[90vw] flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.url}
                alt=""
                className="max-h-[90vh] max-w-[90vw] object-contain"
              />
              <p className="mt-3 max-w-[90vw] text-center text-[14px] text-white/80">{lightbox.name}</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
