# Web Serial over Bluetooth RFCOMM: support matrix (incl. Android Chrome / Galaxy S22+)

Research for #219 (child of wayfinder map #217, blocks #222). Question: which browsers/OSes can use Web Serial to reach a paired Bluetooth Classic (SPP/RFCOMM) device, with focus on Chrome on Android. Primary sources only: Chrome Platform Status API records, the blink-dev Intent to Ship thread, the WICG Serial spec, Chrome developer docs, MDN. Researched 2026-10-25.

## Short answer

- **Desktop Chrome/Edge (Windows, macOS, Linux, ChromeOS):** supported since Chrome 89. A paired HC-06 appears as a Bluetooth serial port.
- **Chrome on Android:** Web Serial over Bluetooth RFCOMM is **shipped by default, no flag** (Chrome 138 per the Chrome 138 beta post; Chrome Platform Status still carries an inconsistent "In development" label, see Discrepancies). A Galaxy S22+ on current Chrome should support it. Wired USB serial on Android is a separate, later feature (milestone 148, Proposed) and is irrelevant to the HC-06.
- **Firefox:** Neutral signal. **Safari:** Negative signal (Chrome Platform Status). Treat as unsupported.
- **Android WebView:** explicitly not supported.
- **Installed PWA on Android:** no primary source addresses it. Must be verified on the device.

## Findings

### 1. Android Chrome: shipped, no flag

- Chrome Platform Status feature 5139978918821888, "Web serial over Bluetooth on Android": "Lets web pages and web apps connect to serial ports over Bluetooth RFCOMM on Android." `android_first` = 138, `flag_name` = null, Finch name `BluetoothRfcommAndroid`, rollout plan "Will ship enabled for all users". Source: https://chromestatus.com/api/v0/features/5139978918821888 (record `accurate_as_of` 2025-06-24).
- Intent to Ship on blink-dev (April 2025): no about://flags entry; listed as "Shipping on Android" (estimated M137 in the thread, 138 in the status record); WebView will not have it. Source: https://groups.google.com/a/chromium.org/d/msgid/blink-dev/680a7018.170a0220.15e62e.03e0.GAE%40google.com
- Chrome 138 beta notes: "Chrome on Android now supports Web Serial API over Bluetooth RFCOMM." Source: https://developer.chrome.com/blog/chrome-138-beta
- Required flags: none per the above. The page at developer.chrome.com/docs/capabilities/serial does NOT mention this yet; it still says Web Serial "is available on all desktop platforms" and that on Android "support for USB-based serial ports is possible using the WebUSB API" via a polyfill. That page is stale on this point.

### 2. Android wired serial is a different feature

Feature 6043992171085824, "Web Serial API on Android": `chrome_android` = 148, status "Proposed", finch `WebSerialWiredDevicesAndroid`, security/privacy review "Pending". Covers wired (USB) devices needing Android system-level serial support. Not needed for HC-06. Source: https://chromestatus.com/api/v0/features/6043992171085824. The Bluetooth record notes `SerialAllowUsbDevicesForUrls` has no effect until wired serial support exists.

### 3. Known Android limitations

From the Intent to Ship thread (Garfield Tan, Apr 29): connected/disconnected events and `SerialPort.connected` cannot be fully supported over Bluetooth on Android yet. Desktop has them (feature 5118102654418944, "connected attribute and RFCOMM connection events", desktop 130). So do not rely on `connect`/`disconnect` events or `port.connected` on Android; detect failure from `open()` rejection and stream errors. The API shape is otherwise the same as desktop ("the UA handles platform differences").

### 4. Pairing

The WICG spec does not say pairing is required, but defines a wireless port as available when "the wireless device hosting the port is registered with the system" (i.e. paired at OS level). Practical implication: pair the HC-06 in Android Bluetooth settings first, then `requestPort()` lists it in the chooser. No Chrome source read documents an in-browser pairing flow. Source: https://wicg.github.io/serial/. `requestPort()` needs a user gesture (standard Web Serial behaviour; verify on device).

### 5. Choosing a Bluetooth port (filters)

Spec `SerialPortFilter` has a "Bluetooth service class ID" member and `allowedBluetoothServiceClassIds` is a list of `BluetoothServiceUUID`. The spec says nothing more specific about RFCOMM. SPP's standard UUID is 00001101-0000-1000-8000-00805F9B34FB (Bluetooth SIG assigned number, not re-verified here). Use `requestPort({ allowedBluetoothServiceClassIds: [...], filters: [{ bluetoothServiceClassId: ... }] })` to limit the chooser to SPP devices; confirm on the real rig. Source: https://wicg.github.io/serial/

### 6. `open()` needs baudRate

`baudRate` is "the only required member" of `SerialOptions` (`required [EnforceRange] unsigned long baudRate`). Chrome docs: for USB and Bluetooth devices that emulate a serial port the baud rate "may be set to any value". The map already lists the real baud as unknown, to be learned from hardware. Sources: https://wicg.github.io/serial/, https://developer.chrome.com/docs/capabilities/serial

### 7. Secure context and Permissions Policy

- Spec IDL is `[Exposed=Window, SecureContext]`: HTTPS (localhost counts) required. "This specification requires the site to be served from a secure context." Vercel hosting satisfies this. MDN confirms: available only in secure contexts.
- Permissions Policy feature name is `serial`, default allowlist `'self'`. Same-origin top-level use needs no header; only cross-origin iframes need `allow="serial"`. If the app ever sets a restrictive `Permissions-Policy` header, do not block `serial` for self.
- Also exposed in Dedicated Workers (`WorkerNavigator.serial`) per MDN.
- Sources: https://wicg.github.io/serial/, https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API

### 8. Feature detection for the Send button

Chrome docs: check for `serial` on `navigator`. `navigator.serial` presence proves the API exists, not that Bluetooth ports work; there is no spec API to ask that before `requestPort()`. Recommended gating:

```ts
const canSend =
  typeof navigator !== 'undefined' &&
  'serial' in navigator &&
  window.isSecureContext;
```

Disable Send (with an explanatory hint) when false. Handle everything else at runtime (no paired device, user dismisses chooser, `open()` rejects). Pre-138 Android Chrome lacks `navigator.serial` entirely, so the one check also excludes it. Source: https://developer.chrome.com/docs/capabilities/serial

### 9. Support matrix

| Browser / OS                                        | Web Serial + Bluetooth RFCOMM        | Source                                              |
| --------------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Chrome / Edge desktop (Win, macOS, Linux, ChromeOS) | Yes, since 89                        | Chrome docs                                         |
| Chrome Android (incl. Galaxy S22+)                  | Yes since 138, no flag               | chromestatus 5139978918821888; Chrome 138 beta post |
| Android WebView                                     | No                                   | blink-dev Intent to Ship                            |
| Firefox (all)                                       | No; standards position Neutral       | chromestatus                                        |
| Safari / iOS                                        | No; standards position Negative      | chromestatus                                        |
| Installed PWA on Android Chrome                     | Not documented; verify on the device | none                                                |

The iOS line is inferred from the WebKit "Negative" signal; no iOS-specific primary source was read.

## Discrepancies and open items

- Chrome Platform Status labels feature 5139978918821888 "In development" with `is_released: false` even though `android_first` = 138 and the Chrome 138 beta post announces it; the record's `last_updated` is 2025-08. The label is likely stale. The Intent thread said M137, the record says 138. Real-device confirmation on the S22+ is the tiebreaker (open the app, check `'serial' in navigator`, call `requestPort()`).
- Installed PWA behaviour on Android is undocumented in any primary source read. A standalone PWA runs in the same Chrome engine, so it is expected to behave the same, but that is inference. Test installed and in-tab.
- Not verified: Chrome-for-Android chooser/prompt UX, minimum Android version, whether Android's "nearby devices" runtime permission appears on first use.
- Spec Bluetooth sections were read through a summarizing fetch of the WICG spec; re-read the exact RFCOMM filter wording if the transport seam depends on it.
