import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "Multi Agents",
  description: "Distributed AI agent orchestration platform for local LLM clusters",
  icons: {
    icon: "/AgentSmith_logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-1)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
