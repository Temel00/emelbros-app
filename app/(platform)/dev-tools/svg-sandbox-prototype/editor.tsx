"use client";

// PROTOTYPE (#201): CodeMirror 6 pane. Canvas edits arrive via apiRef.insertShape as
// tagged transactions (selection auto-mapped, scroll untouched, undoable).
import { useEffect, useRef } from "react";
import { EditorState, Annotation, type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { xml } from "@codemirror/lang-xml";

const fromCanvas = Annotation.define<boolean>();

export type EditorApi = { insertShape: (snippet: string) => void };

export default function Editor({
  initial,
  onDoc,
  apiRef,
}: {
  initial: string;
  onDoc: (doc: string, fromCanvas: boolean) => void;
  apiRef: React.MutableRefObject<EditorApi | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const onDocRef = useRef(onDoc); // onDoc is stable (useCallback [])

  useEffect(() => {
    const ext: Extension[] = [
      lineNumbers(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      xml(),
      EditorView.lineWrapping,
      EditorView.theme({
        "&": { height: "100%", fontSize: "13px" },
        ".cm-scroller": { fontFamily: "var(--font-mono, ui-monospace)" },
      }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged)
          onDocRef.current(
            u.state.doc.toString(),
            u.transactions.some((t) => t.annotation(fromCanvas) === true),
          );
      }),
    ];
    const view = new EditorView({
      state: EditorState.create({ doc: initial, extensions: ext }),
      parent: host.current!,
    });
    apiRef.current = {
      insertShape(snippet) {
        const doc = view.state.doc.toString();
        const at = doc.lastIndexOf("</svg>");
        if (at < 0) return;
        view.dispatch({
          changes: { from: at, insert: `  ${snippet}\n` },
          annotations: fromCanvas.of(true),
        });
      },
    };
    onDocRef.current(initial, false);
    return () => {
      apiRef.current = null;
      view.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} className="h-full overflow-hidden" />;
}
