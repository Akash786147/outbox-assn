import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import type { ReactNode } from "react";
import {
  Bold,
  Italic,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignStart,
  Type,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/utils/cn";

interface RichTextEditorProps {
  onChange: (html: string, isEmpty: boolean) => void;
}

const HEADINGS = [0, 1, 2, 3] as const;
const ALIGNS = ["left", "center", "right"] as const;
const ALIGN_ICONS = { left: TextAlignStart, center: TextAlignCenter, right: TextAlignEnd };

function ToolButton({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-surface",
        active && "bg-brand-soft text-brand",
      )}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-6 w-px bg-line" />;

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      heading: HEADINGS.find((level) => level > 0 && editor.isActive("heading", { level })) ?? 0,
      align: ALIGNS.find((align) => editor.isActive({ textAlign: align })) ?? "left",
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
    }),
  });

  const chain = () => editor.chain().focus();

  const cycleHeading = () => {
    const next = HEADINGS[(HEADINGS.indexOf(state.heading) + 1) % HEADINGS.length];
    if (next === 0) chain().setParagraph().run();
    else chain().setHeading({ level: next }).run();
  };

  const cycleAlign = () => {
    const next = ALIGNS[(ALIGNS.indexOf(state.align) + 1) % ALIGNS.length];
    chain().setTextAlign(next).run();
  };

  const AlignIcon = ALIGN_ICONS[state.align];
  const icon = "h-[18px] w-[18px]";

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-full bg-white px-4 py-1.5">
      <ToolButton label="Undo" onClick={() => chain().undo().run()}>
        <Undo2 className={icon} />
      </ToolButton>
      <ToolButton label="Redo" onClick={() => chain().redo().run()}>
        <Redo2 className={icon} />
      </ToolButton>
      <Divider />
      <ToolButton label="Heading" active={state.heading > 0} onClick={cycleHeading}>
        <Type className={icon} />
      </ToolButton>
      <Divider />
      <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}>
        <Bold className={icon} />
      </ToolButton>
      <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}>
        <Italic className={icon} />
      </ToolButton>
      <ToolButton label="Underline" active={state.underline} onClick={() => chain().toggleUnderline().run()}>
        <Underline className={icon} />
      </ToolButton>
      <Divider />
      <ToolButton label="Align" active={state.align !== "left"} onClick={cycleAlign}>
        <AlignIcon className={icon} />
      </ToolButton>
      <Divider />
      <ToolButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}>
        <ListOrdered className={icon} />
      </ToolButton>
      <ToolButton label="Bullet list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}>
        <List className={icon} />
      </ToolButton>
      <ToolButton label="Indent" onClick={() => chain().sinkListItem("listItem").run()}>
        <ListIndentIncrease className={icon} />
      </ToolButton>
      <ToolButton label="Outdent" onClick={() => chain().liftListItem("listItem").run()}>
        <ListIndentDecrease className={icon} />
      </ToolButton>
      <ToolButton label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}>
        <Quote className={icon} />
      </ToolButton>
      <Divider />
      <ToolButton label="Strikethrough" active={state.strike} onClick={() => chain().toggleStrike().run()}>
        <Strikethrough className={icon} />
      </ToolButton>
    </div>
  );
}

export function RichTextEditor({ onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Type Your Reply..." }),
    ],
    editorProps: { attributes: { class: "rich-content" } },
    onUpdate: ({ editor }) => onChange(editor.getHTML(), editor.isEmpty),
  });

  if (!editor) return null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-neutral-50 p-5">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} className="px-1" />
    </div>
  );
}
