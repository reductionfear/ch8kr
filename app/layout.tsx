import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Card Checker Migration",
  description: "Migration of card checker bot to Next.js web application",
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
