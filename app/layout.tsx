import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://tutoria-game-lab-aleks.akupruk.chatgpt.site"),
  title: "Tutoria — Digital Technologies Hub",
  description:
    "Lesson folders, practical video guides and teacher-created learning resources for computing, games design and digital technologies.",
  openGraph: {
    title: "Tutoria — Digital Technologies Hub",
    description:
      "Learn, create, collaborate and succeed. Video lessons with clear written steps.",
  },
  twitter: {
    card: "summary",
    title: "Tutoria — Digital Technologies Hub",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var saved=localStorage.getItem('tutoria-theme');var theme=saved==='dark'||saved==='light'?saved:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
