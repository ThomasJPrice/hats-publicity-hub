"use client";

import { useEffect, useState } from "react";

/** Suggests a slug from the label field (until the user edits the slug themselves). */
export function SlugField() {
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const label = document.getElementById("label") as HTMLInputElement | null;
    if (!label) return;
    const onInput = () => {
      if (touched) return;
      setSlug(
        label.value
          .toLowerCase()
          .replace(/&/g, " and ")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 60),
      );
    };
    label.addEventListener("input", onInput);
    return () => label.removeEventListener("input", onInput);
  }, [touched]);

  return (
    <div>
      <label className="label" htmlFor="slug">Slug (printed in the short link, cannot change later)</label>
      <input
        id="slug"
        name="slug"
        value={slug}
        pattern="[a-z0-9\-]+"
        minLength={2}
        maxLength={60}
        onChange={(e) => {
          setTouched(true);
          setSlug(e.target.value.toLowerCase());
        }}
        className="input font-mono"
      />
    </div>
  );
}
