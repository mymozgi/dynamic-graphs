/**
 * Builds an @font-face stylesheet with the web fonts embedded as base64 woff2,
 * so a serialized SVG rasterizes with the correct typeface instead of a
 * system fallback. Results are cached; failures degrade gracefully to "".
 */

interface FontRequest {
  family: string;
  weights: number[];
}

const cssCache = new Map<string, string>();

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function buildCssUrl(fonts: FontRequest[]): string {
  const families = fonts
    .map((f) => `family=${encodeURIComponent(f.family)}:wght@${[...f.weights].sort((a, b) => a - b).join(";")}`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * @param family  active chart font (skipped if a system font)
 * @returns a `<style>`-ready CSS string, or "" if embedding failed / not needed
 */
export async function buildEmbeddedFontCss(family: string): Promise<string> {
  const fonts: FontRequest[] = [];
  const isSystem = /system|sans-serif|serif|monospace/i.test(family);
  if (!isSystem) fonts.push({ family, weights: [400, 500, 600, 700, 800] });
  // Oswald powers the big date counter regardless of the chosen font.
  if (!/oswald/i.test(family)) fonts.push({ family: "Oswald", weights: [500, 600, 700] });

  if (fonts.length === 0) return "";

  const cssUrl = buildCssUrl(fonts);
  if (cssCache.has(cssUrl)) return cssCache.get(cssUrl)!;

  try {
    const cssText = await (await fetch(cssUrl)).text();
    const urlRe = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
    const links = [...new Set([...cssText.matchAll(urlRe)].map((m) => m[1]))];

    const dataByLink = new Map<string, string>();
    await Promise.all(
      links.map(async (link) => {
        const buf = await (await fetch(link)).arrayBuffer();
        dataByLink.set(link, `data:font/woff2;base64,${arrayBufferToBase64(buf)}`);
      }),
    );

    const embedded = cssText.replace(urlRe, (_m, link: string) => `url(${dataByLink.get(link) ?? link})`);
    cssCache.set(cssUrl, embedded);
    return embedded;
  } catch {
    // Offline or blocked — export still works, just with fallback fonts.
    return "";
  }
}
