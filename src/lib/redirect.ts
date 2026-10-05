import { classifyRequest } from "@/lib/device";
import { buildDestination, envDefaultDestinationUrl } from "@/lib/qr-url";
import { findLinkBySlug, recordScan } from "@/lib/services/qr";
import { getShowSettings } from "@/lib/services/show";

export type ScanResolution = {
  /** Where to send the visitor. Always set: a printed code must never dead-end. */
  location: string;
  /** Call after the response has been sent. Never throws. */
  log?: () => Promise<void>;
};

/** The ticket page from show settings; the env/seed value if the database can't be read. */
export async function defaultDestination(): Promise<string> {
  try {
    return (await getShowSettings()).defaultDestinationUrl;
  } catch {
    return envDefaultDestinationUrl();
  }
}

/**
 * Pure of the request/response objects so it can be tested. The destination only ever
 * comes from the database (set by the authenticated user), never from the request.
 * Unknown, inactive and archived links all go to the default destination.
 */
export async function resolveScan(slug: string, userAgent: string | null): Promise<ScanResolution> {
  let link;
  try {
    link = await findLinkBySlug(slug);
  } catch {
    return { location: await defaultDestination() };
  }
  if (!link || !link.isActive || link.archivedAt) return { location: await defaultDestination() };

  let location: string;
  try {
    location = buildDestination(link);
  } catch {
    return { location: await defaultDestination() };
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
