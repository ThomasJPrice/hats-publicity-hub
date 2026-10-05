import { isbot } from "isbot";
import type { DeviceClass } from "@/lib/constants";

/** Coarse classification only; the user agent itself is never stored. */
export function classifyRequest(userAgent: string | null | undefined): {
  deviceClass: DeviceClass;
  isBot: boolean;
} {
  if (!userAgent) return { deviceClass: "unknown", isBot: false };
  const bot = isbot(userAgent);
  if (/iPad|Tablet/i.test(userAgent) || (/Android/i.test(userAgent) && !/Mobile/i.test(userAgent))) {
    return { deviceClass: "tablet", isBot: bot };
  }
  if (/Mobi|iPhone|iPod|Android/i.test(userAgent)) return { deviceClass: "mobile", isBot: bot };
  return { deviceClass: "desktop", isBot: bot };
}
