// PROTOTYPE (#196): dummy tool data. Throwaway — real tools come from per-tool
// manifests (ADR-0019). 1 real tool + 19 placeholders to test grid density.
export type DummyTool = {
  slug: string;
  name: string;
  blurb: string;
  icon: string;
};

export const DUMMY_TOOLS: DummyTool[] = [
  {
    slug: "svg-sandbox",
    name: "SVG Sandbox",
    blurb: "Edit SVG code with a live preview and draw tools.",
    icon: "PenTool",
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    blurb: "Pretty-print and validate JSON.",
    icon: "Braces",
  },
  {
    slug: "base64",
    name: "Base64",
    blurb: "Encode and decode Base64 text.",
    icon: "Binary",
  },
  {
    slug: "color-picker",
    name: "Color Picker",
    blurb: "Pick colours and convert between formats.",
    icon: "Pipette",
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    blurb: "Try regular expressions against sample text.",
    icon: "Regex",
  },
  {
    slug: "uuid",
    name: "UUID Generator",
    blurb: "Generate v4 and v7 UUIDs.",
    icon: "Fingerprint",
  },
  {
    slug: "timestamp",
    name: "Timestamp",
    blurb: "Convert Unix time to dates and back.",
    icon: "Clock",
  },
  {
    slug: "diff",
    name: "Text Diff",
    blurb: "Compare two blocks of text.",
    icon: "GitCompare",
  },
  {
    slug: "url-codec",
    name: "URL Codec",
    blurb: "Encode and decode URL components.",
    icon: "Link",
  },
  {
    slug: "markdown",
    name: "Markdown Preview",
    blurb: "Write Markdown and see it rendered.",
    icon: "FileText",
  },
  {
    slug: "lorem",
    name: "Lorem Ipsum",
    blurb: "Generate placeholder text.",
    icon: "Type",
  },
  {
    slug: "hash",
    name: "Hash",
    blurb: "SHA and MD5 digests of text.",
    icon: "Hash",
  },
  {
    slug: "css-units",
    name: "CSS Units",
    blurb: "Convert px, rem, em and vw.",
    icon: "Ruler",
  },
  {
    slug: "gradient",
    name: "Gradient Maker",
    blurb: "Build CSS gradients visually.",
    icon: "Blend",
  },
  {
    slug: "qr",
    name: "QR Code",
    blurb: "Turn text into a QR code.",
    icon: "QrCode",
  },
  {
    slug: "jwt",
    name: "JWT Decoder",
    blurb: "Inspect JSON Web Token claims.",
    icon: "KeyRound",
  },
  {
    slug: "cron",
    name: "Cron Helper",
    blurb: "Explain and build cron expressions.",
    icon: "CalendarClock",
  },
  {
    slug: "image-resize",
    name: "Image Resizer",
    blurb: "Resize and compress images locally.",
    icon: "ImageDown",
  },
  {
    slug: "case",
    name: "Case Converter",
    blurb: "camelCase, snake_case, Title Case.",
    icon: "CaseSensitive",
  },
  {
    slug: "word-count",
    name: "Word Count",
    blurb: "Count words, characters and lines.",
    icon: "ListOrdered",
  },
];
