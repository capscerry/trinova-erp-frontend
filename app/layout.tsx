import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trinova ",
  description: "Business Management Suite",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
