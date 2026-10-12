import { getMachine, machines } from "@nightprint/catalog";
import { machineOgCard } from "../../../../components/og-card";

// Drawn once per machine at build.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return machines.map((m) => ({ slug: m.slug }));
}

export async function GET(
  _request: Request,
  { params }: { readonly params: Promise<{ slug: string }> },
) {
  const machine = getMachine((await params).slug);
  return machine ? machineOgCard(machine) : new Response(null, { status: 404 });
}
