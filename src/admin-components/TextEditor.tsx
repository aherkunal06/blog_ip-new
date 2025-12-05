"use client";

import { useEffect, useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  FaBold,
  FaItalic,
  FaUnderline,
  FaListOl,
  FaListUl,
  FaHeading,
} from "react-icons/fa";
import { useThemeContext } from "@/context/ThemeContext";

interface TextEditorProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: boolean;
  helperText?: string;
  label?: string;
}

const TextEditor = ({
  name,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  label = "Description",
}: TextEditorProps) => {
  const { theme } = useThemeContext();
  const isDark = theme === "dark";

  const [headingLevel, setHeadingLevel] = useState<number>(1);
  const [isLinkDialogOpen, setLinkDialogOpen] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        protocols: ["http", "https"],
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "min-h-[150px] outline-none prose prose-stone dark:prose-invert max-w-none",
      },
      handleDOMEvents: {
        blur: () => {
          onBlur?.();
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const cleanedValue =
        value
          ?.replace(/style="[^"]*"/g, "")
          ?.replace(/color:[^;"]*;?/g, "") || "";
      editor.commands.setContent(cleanedValue, false);
    }
  }, [value, editor]);

  const toolbarButtons: {
    title: string;
    icon: React.ReactNode;
    isActive: (editor: Editor) => boolean;
    command: (editor: Editor, openDialog?: () => void) => void;
    customHandler?: boolean;
  }[] = [
    {
      title: "Bold",
      icon: <FaBold className="w-4 h-4" />,
      isActive: (editor) => editor.isActive("bold"),
      command: (editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      title: "Italic",
      icon: <FaItalic className="w-4 h-4" />,
      isActive: (editor) => editor.isActive("italic"),
      command: (editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      title: "Underline",
      icon: <FaUnderline className="w-4 h-4" />,
      isActive: (editor) => editor.isActive("underline"),
      command: (editor) => editor.chain().focus().toggleUnderline().run(),
    },
    {
      title: "Bullet List",
      icon: <FaListUl className="w-4 h-4" />,
      isActive: (editor) => editor.isActive("bulletList"),
      command: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      title: "Numbered List",
      icon: <FaListOl className="w-4 h-4" />,
      isActive: (editor) => editor.isActive("orderedList"),
      command: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      title: "Insert/Edit Link",
      icon: <span className="w-4 h-4 flex items-center justify-center">🔗</span>,
      isActive: (editor) => editor.isActive("link"),
      command: (editor, openDialog) => openDialog?.(),
      customHandler: true,
    },
  ];

  const openLinkDialog = () => {
    const previousUrl = editor?.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setLinkDialogOpen(true);
  };

  const handleLinkSubmit = () => {
    if (!editor) return;
    let finalUrl = linkUrl.trim();

    if (finalUrl === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      if (!/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
      }
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: finalUrl })
        .run();
    }

    setLinkDialogOpen(false);
  };

  if (!editor) return null;

  const fieldLabelClass = isDark ? "text-gray-300" : "text-gray-700";
  const panelBg = isDark ? "bg-gray-900" : "bg-white";
  const panelBorder = isDark ? "border-gray-700" : "border-gray-300";
  const toolbarBg = isDark ? "bg-gray-850" : "bg-gray-50";
  const toolbarBorder = isDark ? "border-gray-700" : "border-gray-200";
  const btnBase =
    "px-2 py-1 rounded-md text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0";
  const btnIdle = isDark
    ? "bg-gray-800 border border-gray-700 text-gray-200 hover:bg-gray-700 focus:ring-blue-600"
    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-blue-300";
  const btnActive = isDark
    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-500"
    : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700";

  return (
    <div className="mt-4">
      <label className={`block text-sm font-medium mb-2 ${fieldLabelClass}`}>
        {label}
      </label>

      {/* Toolbar */}
      <div
        className={`flex flex-wrap items-center gap-2 mb-3 rounded-md border ${toolbarBorder} ${toolbarBg} p-2`}
      >
        {/* Heading dropdown */}
        <div className="relative">
          <button
            type="button"
            className={`${btnBase} ${btnIdle} flex items-center gap-2`}
          >
            <FaHeading className="w-4 h-4" />
          </button>
          <select
            className="absolute inset-0 opacity-0 cursor-pointer"
            value={headingLevel.toString()}
            onChange={(e) => {
              const level = Number(e.target.value);
              setHeadingLevel(level);
              editor.chain().focus().toggleHeading({ level }).run();
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                H{level}
              </option>
            ))}
          </select>
        </div>

        {toolbarButtons.map((btn, i) => {
          const active = btn.isActive(editor);
          return (
            <button
              key={i}
              type="button"
              title={btn.title}
              onClick={() =>
                btn.customHandler
                  ? btn.command(editor, openLinkDialog)
                  : btn.command(editor)
              }
              className={`${btnBase} ${
                active ? btnActive : btnIdle
              } flex items-center justify-center`}
            >
              <span className="w-4 h-4 flex items-center justify-center">
                {btn.icon}
              </span>
            </button>
          );
        })}
      </div>

      {/* Editor area */}
      <div
        className={`rounded-md p-3 min-h-[150px] border ${panelBorder} ${panelBg}`}
      >
        <EditorContent editor={editor} />
      </div>

      {error && <p className="text-red-500 text-xs mt-1">{helperText}</p>}

      {/* Link Dialog */}
      {isLinkDialogOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div
            className={`rounded-lg p-6 w-full max-w-md shadow-lg border ${
              isDark
                ? "bg-gray-900 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            <h2
              className={`text-lg font-semibold mb-4 ${
                isDark ? "text-gray-100" : "text-gray-900"
              }`}
            >
              Insert/Edit Link
            </h2>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className={`w-full rounded-md px-3 py-2 mb-4 text-sm focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-gray-900 border border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-blue-600"
                  : "bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 focus:ring-blue-300"
              }`}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm ${
                  isDark
                    ? "bg-gray-800 text-gray-200 hover:bg-gray-700"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
                onClick={() => setLinkDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 rounded-md text-sm ${
                  isDark
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={handleLinkSubmit}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextEditor;

