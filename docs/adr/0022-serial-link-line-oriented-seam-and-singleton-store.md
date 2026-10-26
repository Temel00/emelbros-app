# Serial: a line-oriented `SerialLink` seam and one global connection store

`platform/serial/` wraps Web Serial behind a small interface that speaks text lines, and holds exactly one connection per tab in a module-level store. Modules (Coffee's Send to machine, the Dev Tools Bluetooth Serial tool) share it; neither touches `navigator.serial`.

Decided while building [#225](https://github.com/Temel00/emelbros-app/issues/225) under map [#229](https://github.com/Temel00/emelbros-app/issues/229).

## Decision

- **`SerialLink` is line-oriented.** Callers `write(text)` and receive whole lines through `onLine`. They never see bytes, streams, readers or locks. A streaming `TextDecoder` and a pure `splitLines(pending, chunk)` reassemble the fragmented replies an HC-06 produces (`\r`, `\n` and `\r\n`, including a pair split across chunks; empty lines dropped).
- **The link knows no device protocol.** Framing of commands and parsing of replies belong to the calling module.
- **Errors are surfaced, never swallowed, and there are no retries.** `connect` and `write` reject; a read error, an ended stream or a failed write goes through `onError` and the link settles in `disconnected`. Android fires no connect/disconnect events, so loss is detected only by those failures.
- **Support gate:** `'serial' in navigator && isSecureContext`; otherwise status `unsupported` and `connect` rejects.
- **`connect(baud, { silent: true })`** reopens a previously granted port via `getPorts()` with no picker and resolves into `disconnected` if there is none. Without it, `requestPort()` needs a user gesture; a cancelled picker rejects and leaves the link `disconnected`.
- **One global link in a `useSyncExternalStore` singleton** (`useSerialLink`, `getSerialLink`, `restoreSerialLink`), with no React provider. Connection state survives client-side navigation between the Coffee module and the Dev Tools tool.
- **`FakeSerialLink`** is the test adapter; `setSerialLink` swaps it in. `WebSerialLink` is tested against a mocked `navigator.serial`.

## Considered Options

- **Expose raw streams/bytes:** rejected. Every caller would re-implement decoding, buffering and lock handling, and the fragmentation bugs would recur per caller.
- **A React context provider:** rejected. The link must outlive any one subtree and a provider adds a mount-order dependency for no gain; a module singleton with a subscribable store is enough.
- **Auto-reconnect with backoff:** rejected. A silent retry loop hides a dead grinder link from someone standing at the machine; the UI should say it is disconnected.
- **One link per consumer:** rejected. A paired HC-06 is a single exclusive port; two links would fight over it.

## Consequences

Only one device can be connected at a time per tab. Any module that needs serial imports `platform/serial` and stays ignorant of Web Serial. Tests for consumers use `FakeSerialLink` with a scripted `reply`, so no hardware is needed until the real-hardware verification ticket.
