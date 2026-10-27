import type { Unsubscribe } from "@/platform/serial/serial-link";

/** Minimal typed listener set shared by the real and fake links. */
export function createEmitter<T>() {
  const listeners = new Set<(value: T) => void>();
  return {
    subscribe(callback: (value: T) => void): Unsubscribe {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    emit(value: T) {
      for (const callback of [...listeners]) callback(value);
    },
  };
}
