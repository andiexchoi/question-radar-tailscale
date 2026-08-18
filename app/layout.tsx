import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  const title = "Question Radar — Tailscale demand intelligence";
  const description = "A directional public-signal sample, eight content hypotheses, and one documentation-validated Tailscale Kubernetes tutorial.";

  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: image, width: 1728, height: 896, alt: "Question Radar — Tailscale demand intelligence" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
