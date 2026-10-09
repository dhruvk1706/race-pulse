import type { Metadata, Viewport } from "next";
import "@fontsource/barlow-semi-condensed/400.css";
import "@fontsource/barlow-semi-condensed/500.css";
import "@fontsource/barlow-semi-condensed/600.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/exo-2/700-italic.css";
import "@fontsource/exo-2/800-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Race Pulse — Grand Prix Dashboard",
  description: "Your race-weekend command center with current Grand Prix session times.",
};

export const viewport: Viewport = { themeColor: "#080c0f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
