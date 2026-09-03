import { useEffect, useRef } from "react";

export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || document.activeElement === ref.current) return;
    if (ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const command = (name) => {
    ref.current?.focus();
    document.execCommand(name, false, null);
    onChange(ref.current?.innerHTML || "");
  };

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <button type="button" onClick={() => command("bold")} title="Bold">
          <strong>B</strong>
        </button>
        <button type="button" onClick={() => command("italic")} title="Italic">
          <em>I</em>
        </button>
        <button type="button" onClick={() => command("underline")} title="Underline">
          <u>U</u>
        </button>
      </div>
      <div
        ref={ref}
        className="editor-area"
        contentEditable
        data-placeholder={placeholder}
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
    </div>
  );
}
