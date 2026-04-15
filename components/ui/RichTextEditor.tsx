"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import { initialContentFromNote } from "@/lib/richtext/note-html";
import "./rich-text-editor.css";

export interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "",
  minHeight = 240,
}: RichTextEditorProps) {
  const skipSyncFromParent = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({
        placeholder,
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    content: initialContentFromNote(content),
    editorProps: {
      attributes: {
        class:
          "min-h-[inherit] px-[14px] py-[10px] text-[13px] leading-[1.7] text-[#0f1923] outline-none focus:outline-none",
      },
    },
    onUpdate: ({ editor: ed }) => {
      skipSyncFromParent.current = true;
      onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (skipSyncFromParent.current) {
      skipSyncFromParent.current = false;
      return;
    }
    const next = initialContentFromNote(content);
    const cur = editor.getHTML();
    if (cur === next) return;
    editor.commands.setContent(next, { emitUpdate: false });
  }, [content, editor]);

  if (!editor) {
    return (
      <div
        className="rounded-b-[6px] border border-[#e8e8e8] bg-white"
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  return (
    <div className="flex min-h-[240px] max-h-[calc(100vh-500px)] min-w-0 resize-y flex-col overflow-hidden rounded-[6px] border border-[#e8e8e8] focus-within:border-[#1a3167]">
      <div
        className="flex h-8 shrink-0 items-center gap-1 border-b border-[#e8e8e8] bg-[#f8f9fa] px-2"
        role="toolbar"
        aria-label="Formatering"
      >
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[13px] font-bold text-[#6b7280] hover:bg-[#f3f4f6] ${
            editor.isActive("bold") ? "bg-[#f0f6ff] text-[#1a3167]" : ""
          }`}
          aria-pressed={editor.isActive("bold")}
          title="Fed (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[13px] italic text-[#6b7280] hover:bg-[#f3f4f6] ${
            editor.isActive("italic") ? "bg-[#f0f6ff] text-[#1a3167]" : ""
          }`}
          aria-pressed={editor.isActive("italic")}
          title="Kursiv (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[13px] text-[#6b7280] underline hover:bg-[#f3f4f6] ${
            editor.isActive("underline") ? "bg-[#f0f6ff] text-[#1a3167]" : ""
          }`}
          aria-pressed={editor.isActive("underline")}
          title="Understregning (Ctrl+U)"
        >
          U
        </button>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-[#e8e8e8]" aria-hidden />
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[13px] text-[#6b7280] hover:bg-[#f3f4f6] ${
            editor.isActive("bulletList") ? "bg-[#f0f6ff] text-[#1a3167]" : ""
          }`}
          aria-pressed={editor.isActive("bulletList")}
          title="Punktliste"
        >
          •
        </button>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} className="rich-text-editor-inner h-full" />
      </div>
    </div>
  );
}
