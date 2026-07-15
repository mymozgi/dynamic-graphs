/**
 * Country name → ISO 3166-1 alpha-2 resolution, with common aliases.
 * Used to attach flags to entities (both the sample data and imported data).
 * Unknown names resolve to null and simply render without a flag.
 */

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Keys are already normalized.
const ALIASES: Record<string, string> = {
  // Sample dataset
  us: "us", usa: "us", "united states": "us", "united states of america": "us", america: "us",
  china: "cn", "peoples republic of china": "cn", prc: "cn",
  india: "in",
  indonesia: "id",
  brazil: "br",
  pakistan: "pk",
  nigeria: "ng",
  bangladesh: "bd",
  russia: "ru", "russian federation": "ru",
  japan: "jp",
  mexico: "mx",
  germany: "de",
  uk: "gb", "united kingdom": "gb", britain: "gb", "great britain": "gb", england: "gb",
  france: "fr",
  italy: "it",
  // Common extras
  canada: "ca",
  "south korea": "kr", korea: "kr", "republic of korea": "kr",
  spain: "es",
  australia: "au",
  "saudi arabia": "sa",
  turkey: "tr", turkiye: "tr", türkiye: "tr",
  argentina: "ar",
  "south africa": "za",
  egypt: "eg",
  philippines: "ph",
  vietnam: "vn", "viet nam": "vn",
  thailand: "th",
  iran: "ir",
  poland: "pl",
  ukraine: "ua",
  netherlands: "nl", holland: "nl",
  belgium: "be",
  sweden: "se",
  norway: "no",
  switzerland: "ch",
  austria: "at",
  greece: "gr",
  portugal: "pt",
  ireland: "ie",
  "new zealand": "nz",
  singapore: "sg",
  malaysia: "my",
  colombia: "co",
  chile: "cl",
  peru: "pe",
};

export function resolveIso(name: string): string | null {
  return ALIASES[normalize(name)] ?? null;
}

/** All ISO codes we bundle flags for. */
export const SUPPORTED_ISO = [...new Set(Object.values(ALIASES))];
