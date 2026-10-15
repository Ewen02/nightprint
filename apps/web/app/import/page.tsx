import { nightprint } from "@nightprint/catalog";
import type { Metadata } from "next";
import { ImportView } from "../../components/import-view";
import { previewImage, socialMetadata } from "../../components/seo";

const title = "Draw a repository";
const description =
  "Paste a public GitHub repository and get its architecture as a machine you can run: parts, imports and scenarios, every route standing on an import in the code.";

export const metadata: Metadata = {
  title,
  description,
  // A drawing is made for whoever asks, from code no one here has read: kept out of search.
  robots: { index: false, follow: false },
  // Shared drawings are links to this page: they preview with its card.
  ...socialMetadata({
    title: "Your repository, drawn as a machine",
    description,
    path: "/import/",
    image: previewImage(
      "/import/",
      nightprint.revised,
      "A real repository drawn as a machine and seen from above, under the words: your repository, drawn as a machine",
    ),
  }),
};

export default function ImportPage() {
  return <ImportView />;
}
