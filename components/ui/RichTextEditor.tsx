'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Pilcrow } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#121F30', '#CAAE99', '#b91c1c', '#15803d', '#1d4ed8', '#a16207'];

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  invalid?: boolean;
}

/** Tiptap tabanlı zengin metin editörü — kalın/eğik/altı çizili/liste/renk. HTML üretir. */
export function RichTextEditor({ value, onChange, invalid }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
    ],
    content: value || '',
    // SSR hidrasyon uyumsuzluğunu önle (Next.js App Router).
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'tiptap-content min-h-[120px] px-3 py-2 focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Boş editör Tiptap'te '<p></p>' döner — onu boş kabul et.
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Dış kaynaktan (ör. taslak geri yükleme) value değişirse editörü senkronla.
  // Yazarken value === editor.getHTML() olduğu için döngü oluşmaz.
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="rounded-xl border border-[color:var(--border)] bg-[color:var(--bg-elev)] min-h-[160px]" />
    );
  }

  const Btn = ({ active, onClick, label, children }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'size-8 rounded-md flex items-center justify-center border text-sm',
        active
          ? 'border-gold-400 bg-gold-400/15 text-gold-300'
          : 'border-[color:var(--border)] bg-[color:var(--bg-card)] text-[color:var(--fg)] hover:border-[color:var(--border-strong)]',
      )}
    >
      {children}
    </button>
  );

  return (
    <div className={cn('rounded-xl border bg-[color:var(--bg-elev)] overflow-hidden', invalid ? 'border-danger ring-2 ring-danger/40' : 'border-[color:var(--border)]')}>
      <div className="flex flex-wrap items-center gap-1 border-b border-[color:var(--border)] p-1.5 bg-[color:var(--bg-card)]">
        <Btn label="Kalın" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></Btn>
        <Btn label="Eğik" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></Btn>
        <Btn label="Altı çizili" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={15} /></Btn>
        <Btn label="Madde listesi" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></Btn>
        <Btn label="Numaralı liste" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></Btn>
        <div className="w-px h-6 bg-[color:var(--border)] mx-0.5" />
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Renk ${c}`}
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }}
            className="size-6 rounded-full border border-[color:var(--border-strong)]"
            style={{ background: c }}
          />
        ))}
        <Btn label="Rengi temizle" onClick={() => editor.chain().focus().unsetColor().run()}><Pilcrow size={14} /></Btn>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
