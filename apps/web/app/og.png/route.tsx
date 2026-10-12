import { hexagonal, machines, upcoming } from "@nightprint/catalog";
import { homeOgCard } from "../../components/og-card";

// Drawn once at build: a static export prerenders route handlers only when told to.
export const dynamic = "force-static";

export function GET() {
  return homeOgCard(hexagonal, machines.length, upcoming.length);
}
