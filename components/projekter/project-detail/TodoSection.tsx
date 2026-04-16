"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createTodoItem,
  deleteTodoItem,
  reorderTodoItems,
  toggleTodoItem,
  updateTodoItem,
} from "@/app/(dashboard)/projekter/project-detail-actions";
import type { TodoItemDTO } from "@/types/project-detail";

const TODO_DRAWER_HEIGHT_PX = 280;

function reorder<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed!);
  return result;
}

export type TodoSectionProps = {
  todos: TodoItemDTO[];
  taskId: string | null;
  meetingId: string | null;
  onTodosReplace: (next: TodoItemDTO[]) => void;
};

export function TodoSection({
  todos,
  taskId,
  meetingId,
  onTodosReplace,
}: TodoSectionProps) {
  const [todoDrawerOpen, setTodoDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  const sortedTodos = useMemo(
    () =>
      [...todos].sort((a, b) =>
        a.sortOrder !== b.sortOrder
          ? a.sortOrder - b.sortOrder
          : a.createdAt.localeCompare(b.createdAt),
      ),
    [todos],
  );

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const openCount = todos.filter((t) => !t.done).length;
  const showBadge = openCount > 0;

  const droppableId = taskId ? `todo-task-${taskId}` : meetingId ? `todo-meeting-${meetingId}` : "todo-none";

  const handleToggle = useCallback(
    async (id: string) => {
      const prev = todos;
      const next = prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
      onTodosReplace(next);
      try {
        await toggleTodoItem(id);
      } catch (e) {
        onTodosReplace(prev);
        toast.error(e instanceof Error ? e.message : "Fejl");
      }
    },
    [todos, onTodosReplace],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const prev = todos;
      onTodosReplace(prev.filter((t) => t.id !== id));
      try {
        await deleteTodoItem(id);
      } catch (e) {
        onTodosReplace(prev);
        toast.error(e instanceof Error ? e.message : "Fejl");
      }
    },
    [todos, onTodosReplace],
  );

  const handleCreate = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;
    if (!taskId && !meetingId) return;

    const prev = todos;
    const nextOrder =
      prev.length > 0 ? Math.max(...prev.map((t) => t.sortOrder), -1) + 1 : 0;
    const tempId = `opt-${Date.now()}`;
    const optimistic: TodoItemDTO = {
      id: tempId,
      content: text,
      done: false,
      createdAt: new Date().toISOString(),
      sortOrder: nextOrder,
    };
    onTodosReplace([...prev, optimistic].sort((a, b) => a.sortOrder - b.sortOrder));
    setDraft("");
    try {
      const created = await createTodoItem(taskId, meetingId, text);
      onTodosReplace(
        [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder),
      );
    } catch (e) {
      onTodosReplace(prev);
      setDraft(text);
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  }, [draft, taskId, meetingId, todos, onTodosReplace]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleCreate();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDraft("");
    }
  };

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const t = editDraft.trim();
    const original = todos.find((x) => x.id === editingId);
    if (!original) {
      setEditingId(null);
      return;
    }
    if (!t || t === original.content) {
      setEditingId(null);
      return;
    }
    const prev = todos;
    onTodosReplace(prev.map((x) => (x.id === editingId ? { ...x, content: t } : x)));
    setEditingId(null);
    try {
      const updated = await updateTodoItem(editingId, t);
      onTodosReplace(prev.map((x) => (x.id === editingId ? updated : x)));
    } catch (e) {
      onTodosReplace(prev);
      toast.error(e instanceof Error ? e.message : "Fejl");
    }
  }, [editingId, editDraft, todos, onTodosReplace]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;
    const reordered = reorder(sortedTodos, result.source.index, result.destination.index);
    const next = reordered.map((item, i) => ({ ...item, sortOrder: i }));
    const prev = todos;
    onTodosReplace(next);
    try {
      await reorderTodoItems(taskId, meetingId, reordered.map((t) => t.id));
    } catch (e) {
      onTodosReplace(prev);
      toast.error(e instanceof Error ? e.message : "Kunne ikke gemme rækkefølge.");
    }
  };

  const onKeyDownEdit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void saveEdit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const labelRow = (
    <div
      className="flex items-center justify-between px-5 pt-3 pb-2"
      style={{ padding: "12px 20px 8px" }}
    >
      <span className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#9ca3af]">
        TO-DO
      </span>
    </div>
  );

  const listAndInput = (
    <>
      <DragDropContext onDragEnd={(r) => void onDragEnd(r)}>
        <Droppable droppableId={droppableId}>
          {(provided) => (
            <ul
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="list-none space-y-0 px-0"
            >
              {sortedTodos.map((t, index) => (
                <Draggable key={t.id} draggableId={t.id} index={index} isDragDisabled={editingId === t.id}>
                  {(dragProvided, snapshot) => (
                    <li
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`group flex min-h-8 items-center gap-[6px] px-5 hover:rounded-[4px] hover:bg-[#f8f9fa] ${
                        snapshot.isDragging ? "opacity-80 shadow-md" : ""
                      }`}
                    >
                      <button
                        type="button"
                        aria-label="Træk for at omarrangere"
                        {...dragProvided.dragHandleProps}
                        className="flex h-8 w-8 shrink-0 cursor-grab items-center justify-center rounded border-0 bg-transparent p-0 opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100"
                      >
                        <GripVertical className="h-[14px] w-[14px] text-[#d1d5db]" aria-hidden strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        aria-label={t.done ? "Marker som ikke fuldført" : "Marker som fuldført"}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors ${
                          t.done
                            ? "border-transparent bg-[#1a3167]"
                            : "border-[#d1d5db] hover:border-[#1a3167]"
                        }`}
                        onClick={() => void handleToggle(t.id)}
                      >
                        {t.done ? (
                          <Check className="h-3 w-3 text-white" strokeWidth={2.5} aria-hidden />
                        ) : null}
                      </button>
                      {editingId === t.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onBlur={() => void saveEdit()}
                          onKeyDown={onKeyDownEdit}
                          className="min-w-0 flex-1 border-0 border-b border-solid border-[#1a3167] bg-transparent p-0 text-[13px] text-[#0f1923] outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          className={`min-w-0 flex-1 cursor-text border-0 bg-transparent p-0 text-left text-[13px] ${
                            t.done
                              ? "text-[#9ca3af] line-through decoration-[#9ca3af]"
                              : "text-[#0f1923]"
                          }`}
                          onClick={() => {
                            setEditingId(t.id);
                            setEditDraft(t.content);
                          }}
                        >
                          {t.content}
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Slet to-do"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 opacity-0 transition-opacity hover:text-[#dc2626] group-hover:opacity-100"
                        onClick={() => void handleDelete(t.id)}
                      >
                        <X className="h-[14px] w-[14px] text-[#d1d5db]" aria-hidden strokeWidth={2} />
                      </button>
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
      <div
        className="flex items-center gap-2 px-5 py-1"
        style={{ padding: "4px 20px" }}
      >
        <Plus className="h-[14px] w-[14px] shrink-0 text-[#9ca3af]" aria-hidden strokeWidth={2} />
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder={inputFocused ? "" : "Tilføj to-do..."}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13px] text-[#0f1923] outline-none placeholder:text-[#6b7280]"
        />
      </div>
    </>
  );

  if (!taskId && !meetingId) return null;

  return (
    <>
      <button
        type="button"
        className="flex h-[44px] w-full shrink-0 items-center justify-between border-t border-[#e8e8e8] bg-white px-[20px]"
        onClick={() => setTodoDrawerOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          {todoDrawerOpen ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden strokeWidth={2} />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[#6b7280]" aria-hidden strokeWidth={2} />
          )}
          <span className="text-[13px] font-medium text-[#0f1923]">To-do</span>
        </span>
        {showBadge ? (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#1a3167] px-[5px] text-[11px] font-semibold text-white">
            {openCount}
          </span>
        ) : null}
      </button>

      <motion.div
        initial={false}
        animate={{ height: todoDrawerOpen ? TODO_DRAWER_HEIGHT_PX : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden border-t border-[#e8e8e8] bg-white"
      >
        <div className="flex h-[280px] flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {labelRow}
            {listAndInput}
          </div>
        </div>
      </motion.div>
    </>
  );
}
