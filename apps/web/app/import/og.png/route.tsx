import { nightprint } from "@nightprint/catalog";
import { importOgCard } from "../../../components/og-card";

// Drawn once at build: a drawing is shared by a query on /import, which a static
// export cannot draw a preview for, so every shared drawing shows this one.
export const dynamic = "force-static";

export function GET() {
  return importOgCard(nightprint);
}
