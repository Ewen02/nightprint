import mono400 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2";
import mono500 from "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2";
import sans400 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2";
import sans500 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2";
import sans600 from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2";
import { loadFont } from "@remotion/fonts";
import { fonts } from "./theme";

// The site's fonts, from the same Fontsource packages as apps/web. Each component imports this
// module, so a connected composition opened on its own still renders in Plex. `loadFont` holds
// every frame until its font is loaded, and fails the render if one cannot be.
for (const [family, url, weight] of [
  [fonts.sans, sans400, "400"],
  [fonts.sans, sans500, "500"],
  [fonts.sans, sans600, "600"],
  [fonts.mono, mono400, "400"],
  [fonts.mono, mono500, "500"],
] as const) {
  void loadFont({ family, url, weight });
}
