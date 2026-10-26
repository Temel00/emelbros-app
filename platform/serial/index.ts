export { FakeSerialLink } from "@/platform/serial/fake-serial-link";
export { splitLines } from "@/platform/serial/line-splitter";
export {
  isSerialSupported,
  type ConnectOptions,
  type SerialLink,
  type SerialStatus,
  type Unsubscribe,
} from "@/platform/serial/serial-link";
export {
  getSerialLink,
  restoreSerialLink,
  setSerialLink,
  useSerialLink,
} from "@/platform/serial/serial-store";
export { WebSerialLink } from "@/platform/serial/web-serial-link";
