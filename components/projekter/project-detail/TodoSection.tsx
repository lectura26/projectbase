"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import {
  createTodoItem,
  deleteTodoItem,
  toggleTodoItem,
} from "@/app/(dashboard)/projekter/project-detail-actions";
import type { TodoItemDTO } from "@/types/project-detail";

const DRAWER_EXPAND_PX = 400;

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
  const drawerMode =
    todos.length === 0 || todos.every((t) => t.done);
  const [todoDrawerOpen, setTodoDrawerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (drawerMode) setTodoDrawerOpen(false);
  }, [drawerMode]);

  const handleToggle = useCallback(
    async (id: string) => {
      const prev = todos;
      const next = prev.map((t) =>
        t.id === id ? { ...t, done: !t.done } : t,
      );
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
    const tempId = `opt-${Date.now()}`;
    const optimistic: TodoItemDTO = {
      id: tempId,
      content: text,
      done: false,
      createdAt: new Date().toISOString(),
    };
    onTodosReplace([...prev, optimistic].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ));
    setDraft("");
    try {
      const created = await createTodoItem(taskId, meetingId, text);
      onTodosReplace(
        [...prev, created].sort((a, b) =>
          a.createdAt.localeCompare(b.createdAt),
        ),
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

  const badgeAllDone =
    todos.length > 0 && todos.every((t) => t.done);

  const labelRow = (opts: { showCollapseChevron: boolean }) => (
    <div
      className="flex items-center justify-between px-5 pt-3 pb-2"
      style={{ padding: "12px 20px 8px" }}
    >
      <span className="text-[11px] font-normal uppercase tracking-[0.04em] text-[#9ca3af]">
        TO-DO
      </span>
      {opts.showCollapseChevron ? (
        <button
          type="button"
          aria-label="Skjul to-do"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-[#6b7280] hover:bg-[#f8f9fa]"
          onClick={() => setTodoDrawerOpen(false)}
        >
          <ChevronUp className="h-4 w-4" aria-hidden strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );

  const listAndInput = (
    <>
      <ul className="list-none space-y-0 px-0">
        {todos.map((t) => (
          <li
            key={t.id}
            className="group flex h-8 items-center gap-[10px] px-5 hover:rounded-[4px] hover:bg-[#f8f9fa]"
          >
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
            <span
              className={`min-w-0 flex-1 text-[13px] ${
                t.done
                  ? "text-[#9ca3af] line-through decoration-[#9ca3af]"
                  : "text-[#0f1923]"
              }`}
            >
              {t.content}
            </span>
            <button
              type="button"
              aria-label="Slet to-do"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 opacity-0 transition-opacity hover:text-[#dc2626] group-hover:opacity-100"
              onClick={() => void handleDelete(t.id)}
            >
              <X className="h-[14px] w-[14px] text-[#d1d5db]" aria-hidden strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
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

  const expandedBlock = (
    <div className="border-t border-[#e8e8e8] bg-white">
      {labelRow({ showCollapseChevron: false })}
      {listAndInput}
    </div>
  );

  if (!drawerMode) {
    return expandedBlock;
  }

  return (
    <>
      <motion.div
        initial={false}
        animate={{ height: todoDrawerOpen ? DRAWER_EXPAND_PX : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="overflow-hidden border-t border-[#e8e8e8] bg-white"
      >
        <AnimatePresence initial={false}>
          {todoDrawerOpen ? (
            <motion.div
              key="todo-drawer-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex max-h-[400px] flex-col overflow-y-auto"
            >
              {labelRow({ showCollapseChevron: true })}
              {listAndInput}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      <button
        type="button"
        className="flex h-[44px] w-full shrink-0 items-center justify-between border-t border-[#e8e8e8] bg-white px-5"
        onClick={() => setTodoDrawerOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          {todoDrawerOpen ? (
            <ChevronUp className="h-4 w-4 text-[#6b7280]" aria-hidden strokeWidth={2} />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6b7280]" aria-hidden strokeWidth={2} />
          )}
          <span className="text-[13px] font-medium text-[#0f1923]">To-do</span>
        </span>
        {todos.length > 0 ? (
          <span
            className={`flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-[5px] text-[11px] font-semibold text-white ${
              badgeAllDone ? "bg-[#16a34a]" : "bg-[#1a3167]"
            }`}
          >
            {todos.length}
          </span>
        ) : null}
      </button>
    </>
  );
}
