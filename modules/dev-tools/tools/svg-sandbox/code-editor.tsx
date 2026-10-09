"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  redo,
  redoDepth,
  undo,
  undoDepth,
} from "@codemirror/commands";
import { xml } from "@codemirror/lang-xml";

export type EditorApi = { undo: () => void; redo: () => void };
export type HistoryState = { canUndo: boolean; canRedo: boolean };

/**
 * The CodeMirror pane. Loaded only through `next/dynamic` (ssr: false) from
 * the Tool, so CodeMirror stays in the sandbox's own chunk. History is owned
 * by CodeMirror alone (ADR-0021), capped at ~25 events.
 */
export default function CodeEditor({
  initial,
  onChange,
  onHistory,
  apiRef,
}: {
  initial: string;
  onChange: (doc: string) => void;
  onHistory: (state: HistoryState) => void;
  apiRef: React.MutableRefObject<EditorApi | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  // The editor is built once; keep the latest callbacks reachable from it.
  const callbacks = useRef({ onChange, onHistory });
  useEffect(() => {
    callbacks.current = { onChange, onHistory };
  });

  useEffect(() => {
    const view = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: initial,
        extensions: [
          lineNumbers(),
          history({ minDepth: 25 }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          xml(),
          EditorView.lineWrapping,
          EditorView.theme({
            "&": { height: "100%", fontSize: "13px" },
            ".cm-scroller": { fontFamily: "var(--font-mono, ui-monospace)" },
          }),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            callbacks.current.onChange(u.state.doc.toString());
            callbacks.current.onHistory({
              canUndo: undoDepth(u.state) > 0,
              canRedo: redoDepth(u.state) > 0,
            });
          }),
        ],
      }),
    });
    apiRef.current = {
      undo: () => {
        undo(view);
        view.focus();
      },
      redo: () => {
        redo(view);
        view.focus();
      },
    };
    callbacks.current.onChange(initial);
    return () => {
      apiRef.current = null;
      view.destroy();
    };
    // Built once from the initial draft; later text changes come from typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="h-full overflow-hidden" />;
}
