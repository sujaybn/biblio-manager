import DOMPurify from "dompurify";
import { useMemo } from "react";

/** Older entries were saved as plain text; newer ones as HTML from the editor. */
export function isHtml(value: string) {
  return /<\/?(p|h1|h2|h3|ul|ol|li|blockquote|strong|em|u|s|br|mark|span|hr|pre|code)\b/i.test(
    value,
  );
}

export function isRichTextEmpty(value?: string | null) {
  if (!value) return true;
  const stripped = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
  return stripped.trim().length === 0;
}

export function RichText({ value, className = "" }: { value: string; className?: string }) {
  const html = useMemo(() => {
    if (!isHtml(value)) return null;
    if (!DOMPurify.isSupported) return null; // no DOM (SSR): fall back to plain text
    return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } });
  }, [value]);

  if (html === null) {
    return (
      <div className={`whitespace-pre-wrap ${className}`}>{value.replace(/<[^>]*>/g, "")}</div>
    );
  }
  return (
    <div className={`margin-prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
