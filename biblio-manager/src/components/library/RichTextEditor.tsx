import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { FontFamily, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

import { isHtml } from "./RichText";

const FONTS = [
  { label: "Default", value: "" },
  { label: "Serif", value: "var(--font-display, Lora), Georgia, serif" },
  { label: "Sans", value: "var(--font-sans, 'Nunito Sans'), system-ui, sans-serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
];

const SIZES = [
  { label: "Small", value: "13px" },
  { label: "Normal", value: "" },
  { label: "Large", value: "19px" },
  { label: "Huge", value: "24px" },
];

function toDoc(value: string) {
  if (!value) return "";
  if (isHtml(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br />").replace(/</g, "&lt;")}</p>`)
    .join("");
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = "8rem",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle,
      FontFamily,
      FontSize,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: toDoc(value),
    editorProps: {
      attributes: {
        class: "margin-prose focus:outline-none px-4 py-3",
        style: `min-height:${minHeight}`,
        "data-placeholder": placeholder ?? "",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = toDoc(value);
    if (incoming !== editor.getHTML() && (editor.isEmpty || !value)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value === ""]);

  if (!editor) {
    return (
      <div
        className="rounded-xl border border-border bg-background"
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const chain = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-secondary/60 px-2 py-1.5">
      <select
        aria-label="Font"
        className="h-7 rounded-md border border-border bg-background px-1.5 text-[12px]"
        value={editor.getAttributes("textStyle").fontFamily ?? ""}
        onChange={(e) =>
          e.target.value
            ? chain().setFontFamily(e.target.value).run()
            : chain().unsetFontFamily().run()
        }
      >
        {FONTS.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Font size"
        className="h-7 rounded-md border border-border bg-background px-1.5 text-[12px]"
        value={editor.getAttributes("textStyle").fontSize ?? ""}
        onChange={(e) =>
          e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run()
        }
      >
        {SIZES.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <Sep />
      <Btn on={editor.isActive("bold")} onClick={() => chain().toggleBold().run()} label="Bold">
        <span className="font-bold">B</span>
      </Btn>
      <Btn on={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()} label="Italic">
        <span className="italic">I</span>
      </Btn>
      <Btn
        on={editor.isActive("underline")}
        onClick={() => chain().toggleUnderline().run()}
        label="Underline"
      >
        <span className="underline">U</span>
      </Btn>
      <Btn
        on={editor.isActive("strike")}
        onClick={() => chain().toggleStrike().run()}
        label="Strikethrough"
      >
        <span className="line-through">S</span>
      </Btn>
      <Btn
        on={editor.isActive("highlight")}
        onClick={() => chain().toggleHighlight().run()}
        label="Highlight"
      >
        <span className="rounded-sm bg-accent px-1">H</span>
      </Btn>
      <Btn on={editor.isActive("code")} onClick={() => chain().toggleCode().run()} label="Code">
        <span className="font-mono">{"</>"}</span>
      </Btn>

      <Sep />
      <Btn
        on={editor.isActive("heading", { level: 1 })}
        onClick={() => chain().toggleHeading({ level: 1 }).run()}
        label="Heading 1"
      >
        H1
      </Btn>
      <Btn
        on={editor.isActive("heading", { level: 2 })}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
        label="Heading 2"
      >
        H2
      </Btn>
      <Btn
        on={editor.isActive("blockquote")}
        onClick={() => chain().toggleBlockquote().run()}
        label="Quote"
      >
        &ldquo;&rdquo;
      </Btn>
      <Btn
        on={editor.isActive("bulletList")}
        onClick={() => chain().toggleBulletList().run()}
        label="Bullet list"
      >
        •
      </Btn>
      <Btn
        on={editor.isActive("orderedList")}
        onClick={() => chain().toggleOrderedList().run()}
        label="Numbered list"
      >
        1.
      </Btn>

      <Sep />
      <Btn
        on={editor.isActive({ textAlign: "left" })}
        onClick={() => chain().setTextAlign("left").run()}
        label="Align left"
      >
        ⇤
      </Btn>
      <Btn
        on={editor.isActive({ textAlign: "center" })}
        onClick={() => chain().setTextAlign("center").run()}
        label="Align centre"
      >
        ↔
      </Btn>
      <Btn
        on={editor.isActive({ textAlign: "right" })}
        onClick={() => chain().setTextAlign("right").run()}
        label="Align right"
      >
        ⇥
      </Btn>
      <Btn onClick={() => chain().setHorizontalRule().run()} label="Divider">
        —
      </Btn>

      <Sep />
      <Btn onClick={() => chain().undo().run()} label="Undo">
        ↶
      </Btn>
      <Btn onClick={() => chain().redo().run()} label="Redo">
        ↷
      </Btn>
      <Btn
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
        label="Clear formatting"
      >
        ✕
      </Btn>
    </div>
  );
}

function Sep() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />;
}

function Btn({
  children,
  onClick,
  on,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  on?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      onClick={onClick}
      className={`h-7 min-w-7 rounded-md px-1.5 text-[12.5px] leading-none transition-colors ${
        on
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
