import { CAMPAIGN, type PlacementType } from "@/lib/constants";

type Destination = {
  destinationUrl: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
};

/** Destination with the link's UTM parameters merged in; any other existing query is preserved. */
export function buildDestination(link: Destination): string {
  const url = new URL(link.destinationUrl);
  const utm: [string, string][] = [
    ["utm_source", link.utmSource],
    ["utm_medium", link.utmMedium],
    ["utm_campaign", link.utmCampaign],
    ["utm_content", link.utmContent],
  ];
  for (const [key, value] of utm) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function defaultUtm(placementType: PlacementType, slug: string) {
  return {
    utmSource: placementType,
    utmMedium: "print",
    utmCampaign: CAMPAIGN,
    utmContent: slug,
  };
}

export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function baseUrl(): string {
  return (process.env.BASE_URL ?? "").replace(/\/+$/, "");
}

export function shortUrl(slug: string): string {
  return `${baseUrl()}/q/${slug}`;
}

export function defaultDestinationUrl(): string {
  return process.env.DEFAULT_DESTINATION_URL || baseUrl() || "https://example.com";
}
