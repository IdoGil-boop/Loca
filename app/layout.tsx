import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import AnalyticsProvider from "@/components/shared/AnalyticsProvider";
import BodyOverflowFixer from "@/components/shared/BodyOverflowFixer";

export const metadata: Metadata = {
  title: "Loca - Find your vibe, anywhere",
  description: "Love a place? Discover similar spots with the same vibe in any city around the world. Cafes, restaurants, museums, bars, and more.",
  keywords: "travel, recommendations, cafes, restaurants, museums, bars, personalized travel, place finder",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AnalyticsProvider />
        <BodyOverflowFixer />
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
