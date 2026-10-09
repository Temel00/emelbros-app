import { parseSvg, type ViewBox } from "./parse-svg";

export type SvgError = { line: number; col: number; message: string };

export type PreviewState = {
  /** Sanitised markup of the last text that parsed. */
  html: string;
  /** viewBox of the last good render, for the preview outline. */
  viewBox: ViewBox | null;
  /** Set while the current text is invalid; `html` is then the last good render. */
  error: SvgError | null;
};

export const EMPTY_PREVIEW: PreviewState = {
  html: "",
  viewBox: null,
  error: null,
};

/**
 * One hot-reload step (ADR-0021): valid text replaces the render and clears
 * the error; invalid text keeps the previous render and reports line:col.
 */
export function nextPreview(
  prev: PreviewState,
  text: string,
  sanitise: (text: string) => string,
): PreviewState {
  const parsed = parseSvg(text);
  if (parsed.ok) {
    return { html: sanitise(text), viewBox: parsed.viewBox, error: null };
  }
  const { line, col, message } = parsed;
  return { ...prev, error: { line, col, message } };
}
