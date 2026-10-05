import { beforeEach, describe, expect, it, vi } from "vitest";

const findLinkBySlug = vi.fn();
const recordScan = vi.fn();
vi.mock("@/lib/services/qr", () => ({
  findLinkBySlug: (...a: unknown[]) => findLinkBySlug(...a),
  recordScan: (...a: unknown[]) => recordScan(...a),
}));

import { resolveScan } from "@/lib/redirect";
import { buildDestination } from "@/lib/qr-url";

const DEFAULT = "https://tickets.example.com/event";
const MOBILE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const BOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const link = {
  id: "link-1",
  slug: "a3-shops",
  isActive: true,
  destinationUrl: "https://tickets.example.com/event",
  utmSource: "poster_a3",
  utmMedium: "print",
  utmCampaign: "wizard-of-oz-2027",
  utmContent: "a3-shops",
};

beforeEach(() => {
  findLinkBySlug.mockReset();
  recordScan.mockReset();
  process.env.DEFAULT_DESTINATION_URL = DEFAULT;
});

describe("resolveScan", () => {
  it("redirects an active link to its destination with UTM parameters and logs the scan", async () => {
    findLinkBySlug.mockResolvedValue(link);
    const res = await resolveScan("a3-shops", MOBILE);
    const url = new URL(res.location);
    expect(url.origin + url.pathname).toBe("https://tickets.example.com/event");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "poster_a3",
      utm_medium: "print",
      utm_campaign: "wizard-of-oz-2027",
      utm_content: "a3-shops",
    });
    await res.log?.();
    expect(recordScan).toHaveBeenCalledWith({ linkId: "link-1", deviceClass: "mobile", isBot: false });
  });

  it("sends an inactive link to the default destination without logging", async () => {
    findLinkBySlug.mockResolvedValue({ ...link, isActive: false });
    const res = await resolveScan("a3-shops", MOBILE);
    expect(res.location).toBe(DEFAULT);
    expect(res.log).toBeUndefined();
  });

  it("sends an unknown slug to the default destination (never a 404)", async () => {
    findLinkBySlug.mockResolvedValue(null);
    const res = await resolveScan("nope", MOBILE);
    expect(res.location).toBe(DEFAULT);
    expect(res.log).toBeUndefined();
  });

  it("falls back to the default destination if the lookup fails", async () => {
    findLinkBySlug.mockRejectedValue(new Error("db down"));
    const res = await resolveScan("a3-shops", MOBILE);
    expect(res.location).toBe(DEFAULT);
  });

  it("stores bot scans flagged as bots so counts can exclude them", async () => {
    findLinkBySlug.mockResolvedValue(link);
    const res = await resolveScan("a3-shops", BOT);
    await res.log?.();
    expect(recordScan).toHaveBeenCalledWith(expect.objectContaining({ isBot: true }));
  });

  it("a logging failure never throws", async () => {
    findLinkBySlug.mockResolvedValue(link);
    recordScan.mockRejectedValue(new Error("write failed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await resolveScan("a3-shops", MOBILE);
    await expect(res.log?.()).resolves.toBeUndefined();
    spy.mockRestore();
  });
});

describe("buildDestination", () => {
  it("preserves an existing query and overrides same-named UTM keys", () => {
    const out = new URL(
      buildDestination({ ...link, destinationUrl: "https://t.example.com/e?ref=abc&utm_source=old" }),
    );
    expect(out.searchParams.get("ref")).toBe("abc");
    expect(out.searchParams.get("utm_source")).toBe("poster_a3");
    expect(out.searchParams.get("utm_content")).toBe("a3-shops");
  });
  it("skips empty UTM values", () => {
    const out = new URL(buildDestination({ ...link, utmContent: "" }));
    expect(out.searchParams.has("utm_content")).toBe(false);
  });
});
