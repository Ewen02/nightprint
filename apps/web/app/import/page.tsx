import type { Metadata } from "next";
import { ImportView } from "../../components/import-view";

export const metadata: Metadata = {
  title: "Draw a repository",
  description:
    "Paste a public GitHub repository and get its architecture as a machine you can run: parts, imports and scenarios, every route standing on an import in the code.",
  // A drawing is made for whoever asks, from code no one here has read: kept out of search.
  robots: { index: false, follow: false },
};

export default function ImportPage() {
  return <ImportView />;
}
