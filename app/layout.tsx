import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tutoria — Game development lab",
  description:
    "Practical game development tutorials with video chapters, written guides and challenges.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
