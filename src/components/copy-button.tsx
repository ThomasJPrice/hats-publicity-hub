"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy caption" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: nothing useful to do.
        }
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
