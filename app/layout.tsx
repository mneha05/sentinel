import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SENTINEL · Sensor Anomaly Workbench",
  description:
    "Multi-channel time-series anomaly detection with AI-assisted decision support.",
};

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
