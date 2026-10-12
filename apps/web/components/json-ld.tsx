/**
 * Structured data for crawlers, in a plain script tag (the Next.js JSON-LD guide).
 * `<` is escaped so no string in the data can close the tag.
 */
export function JsonLd({ data }: { readonly data: object }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON from our own catalog, with < escaped.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
