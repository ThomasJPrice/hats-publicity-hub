import { classifyRequest } from "@/lib/device";
import { buildDestination, defaultDestinationUrl } from "@/lib/qr-url";
import { findLinkBySlug, recordScan } from "@/lib/services/qr";

export type ScanResolution = {
  /** Where to send the visitor. Always set: a printed code must never dead-end. */
  location: string;
  /** Call after the response has been sent. Never throws. */
  log?: () => Promise<void>;
};

/**
 * Pure of the request/response objects so it can be tested. The destination only ever
 * comes from the database (set by the authenticated user), never from the request.
 */
export async function resolveScan(slug: string, userAgent: string | null): Promise<ScanResolution> {
  const fallback = defaultDestinationUrl();

  let link;
  try {
    link = await findLinkBySlug(slug);
  } catch {
    return { location: fallback };
  }
  if (!link || !link.isActive) return { location: fallback };

  let location: string;
  try {
    location = buildDestination(link);
  } catch {
    return { location: fallback };
  }

  const { deviceClass, isBot } = classifyRequest(userAgent);
  return {
    location,
    log: async () => {
      try {
        await recordScan({ linkId: link.id, deviceClass, isBot });
      } catch (err) {
        console.error("Failed to record QR scan", err);
      }
    },
  };
}
