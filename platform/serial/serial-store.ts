"use client";

import { useSyncExternalStore } from "react";

import {
  type SerialLink,
  type SerialStatus,
  type Unsubscribe,
} from "@/platform/serial/serial-link";
import { WebSerialLink } from "@/platform/serial/web-serial-link";

type SerialState = { status: SerialStatus; error: Error | null };

const SERVER_STATE: SerialState = { status: "unsupported", error: null };

// One global link: there is one physical serial device and one browser port
// grant, so every consumer (Coffee, Dev Tools) shares this connection.
let link: SerialLink | null = null;
let unsubscribeLink: Unsubscribe[] = [];
let state: SerialState = SERVER_STATE;
const listeners = new Set<() => void>();

function setState(next: SerialState) {
  state = next;
  for (const listener of [...listeners]) listener();
}

function attach(next: SerialLink) {
  for (const off of unsubscribeLink) off();
  link = next;
  state = { status: next.getStatus(), error: null };
  unsubscribeLink = [
    next.onStatus((status) => setState({ ...state, status })),
    next.onError((error) => setState({ ...state, error })),
  ];
}

/** The shared link, created on first use in the browser. */
export function getSerialLink(): SerialLink {
  if (!link) attach(new WebSerialLink());
  return link!;
}

/** Swap in another link (a `FakeSerialLink` in tests). */
export function setSerialLink(next: SerialLink) {
  attach(next);
  for (const listener of [...listeners]) listener();
}

/**
 * Silently reopen a port the user granted on an earlier visit (no picker).
 * Safe to call on every mount: it only acts while `disconnected`, and a
 * failed reopen leaves the link `disconnected` with the error recorded so the
 * UI can offer Reconnect. It never retries.
 */
export async function restoreSerialLink(baud: number): Promise<void> {
  const current = getSerialLink();
  if (current.getStatus() !== "disconnected") return;
  try {
    await current.connect(baud, { silent: true });
  } catch (error) {
    setState({
      ...state,
      error: error instanceof Error ? error : new Error(String(error)),
    });
  }
}

function subscribe(listener: () => void) {
  getSerialLink();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => {
  getSerialLink();
  return state;
};

/**
 * React view of the shared serial link: `status`, the latest `error`, and the
 * link itself for `connect`/`write`/`onLine`. No provider needed.
 */
export function useSerialLink() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_STATE,
  );
  return { ...snapshot, link: getSerialLink() };
}
