import { neutral } from "@nightprint/tokens";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { site } from "../components/seo";
import { plexMono, plexSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Relative URLs in metadata (canonical, Open Graph) resolve against the site.
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  authors: [{ name: site.author.name, url: site.author.url }],
  creator: site.author.name,
};

export const viewport: Viewport = {
  themeColor: neutral.bg,
  colorScheme: "dark",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="bg-bg font-sans text-text antialiased">{children}</body>
    </html>
  );
}
