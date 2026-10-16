// Task descriptions are Markdown (GFM). Card previews show plain text, so the
// syntax markers are stripped here — otherwise "#", "**", "- [ ]" leak into
// the UI verbatim. Mirrors notes' stripHtml() for the Markdown case.

/** Strip Markdown syntax to readable plain text (single-spaced). */
export function stripMarkdown(markdown: string): string {
  return markdown
    // YAML frontmatter, dropped whole. Tasks written by Alfred and by the
    // vault start with a `--- name: ... ---` block; without this the card
    // preview is all metadata and none of the actual body.
    .replace(/^﻿?\s*---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, " ")
    .replace(/^\s*(```|~~~).*$/gm, " ") // code fences (keep the code text)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images -> alt text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> label
    .replace(/^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*:?-*:?\s*\|?\s*$/gm, " ") // table separator rows
    .replace(/^\s*([-*_]\s*){3,}$/gm, " ") // horizontal rules
    .replace(/^\s*(>\s*)+/gm, "") // blockquotes
    .replace(/^\s*#{1,6}\s+/gm, "") // headings
    .replace(/^\s*([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/gm, "") // list + checklist markers
    .replace(/(\*\*|__|~~)(.+?)\1/g, "$2") // bold / strikethrough
    .replace(/(^|[^\w*])[*_]([^*_\s][^*_]*?)[*_](?![\w*])/g, "$1$2") // italic
    .replace(/`([^`]*)`/g, "$1") // inline code
    .replace(/\|/g, " ") // table cell pipes
    .replace(/\s+/g, " ")
    .trim();
}
