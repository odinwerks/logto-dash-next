import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Logto Next.js Sample",
  description: "Sample app with Logto authentication",
};

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