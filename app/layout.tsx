import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://tutoria-game-lab-aleks.akupruk.chatgpt.site"),
  title: "Tutoria — Games Design Learning Hub",
  description:
    "Lesson folders, practical video guides and teacher-created learning resources for games design.",
  openGraph: {
    title: "Tutoria — Games Design Learning Hub",
    description:
      "Learn, create, collaborate and succeed. Video lessons with clear written steps.",
  },
  twitter: {
    card: "summary",
    title: "Tutoria — Games Design Learning Hub",
    description: "Video lessons with clear written steps.",
  },
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
