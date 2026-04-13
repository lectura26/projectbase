"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import type { ProjectStatus } from "@prisma/client";
import { GripVertical } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { updateProjectStatus } from "@/app/(dashboard)/projekter/actions";
import type { ProjectListItem } from "@/types/projekter";
import { ProjectCardBody } from "./ProjectCard";
import { statusLabelDa } from "./project-helpers";

const COLUMN_ORDER: ProjectStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING",
  "COMPLETED",
];

export function ProjekterKanban({
  projects,
  onProjectsUpdate,
}: {
  projects: ProjectListItem[];
  onProjectsUpdate: (updater: (prev: ProjectListItem[]) => ProjectListItem[]) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<ProjectStatus, ProjectListItem[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      WAITING: [],
      COMPLETED: [],
    };
    for (const p of projects) {
      map[p.status].push(p);
    }
    for (const k of COLUMN_ORDER) {
      map[k].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return map;
  }, [projects]);

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result;
      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      ) {
        return;
      }
      const newStatus = destination.droppableId as ProjectStatus;
      const oldStatus = source.droppableId as ProjectStatus;
      if (newStatus === oldStatus) return;

      let snapshot: ProjectListItem[] = [];
      onProjectsUpdate((prev) => {
        snapshot = prev;
        return prev.map((p) =>
          p.id === draggableId ? { ...p, status: newStatus } : p
        );
      });

      try {
        const r = await updateProjectStatus(draggableId, newStatus);
        if (r.routineRestarted) {
          toast.success(`Rutineprojekt genstartet: ${r.routineRestarted.name}`);
        }
      } catch {
        onProjectsUpdate(() => snapshot);
      }
    },
    [onProjectsUpdate]
  );

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {COLUMN_ORDER.map((columnId) => (
          <div key={columnId} className="flex min-w-0 flex-col">
            <h2 className="mb-2 px-0.5 font-body text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
              {statusLabelDa(columnId)}
            </h2>
            <Droppable droppableId={columnId}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[120px] flex-1 rounded-lg p-2 transition-colors ${
                    snapshot.isDraggingOver ? "bg-surface-container-low" : "bg-surface-container-low/50"
                  }`}
                >
                  {grouped[columnId].length === 0 ? (
                    <p className="py-6 text-center text-[11px] text-on-surface-variant/90">
                      Ingen projekter her.
                    </p>
                  ) : null}
                  {grouped[columnId].map((project, index) => (
                    <Draggable
                      key={project.id}
                      draggableId={project.id}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`mb-3 last:mb-0 ${
                            dragSnapshot.isDragging ? "opacity-90" : ""
                          }`}
                        >
                          <div
                            {...dragProvided.dragHandleProps}
                            className="flex cursor-grab items-center gap-1 rounded-t-lg border border-b-0 border-outline-variant/20 bg-surface-container-lowest px-2 py-1 active:cursor-grabbing"
                            aria-label="Træk kort"
                          >
                            <GripVertical
                              className="h-4 w-4 text-on-surface-variant/50"
                              aria-hidden
                            />
                          </div>
                          <Link
                            href={`/projekter/${project.id}`}
                            className="block rounded-b-lg border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-surface-container-low/40"
                            onClick={(e) => {
                              if (dragSnapshot.isDragging) e.preventDefault();
                            }}
                          >
                            <ProjectCardBody
                              project={project}
                              statusColumn={columnId}
                            />
                          </Link>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
