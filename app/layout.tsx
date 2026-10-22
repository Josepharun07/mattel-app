import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { AccentRoot } from "@/components/shell/accent-root";
import { AppShell } from "@/components/shell/AppShell";
import { WorkspaceProvider } from "@/lib/workspace/store";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mattel Infrastructures",
    template: "%s · Mattel Infrastructures",
  },
  description:
    "Inventory, rentals, payroll, and billing for Mattel Infrastructures.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-steel">
        <WorkspaceProvider>
          <AccentRoot>
            <AppShell>{children}</AppShell>
          </AccentRoot>
        </WorkspaceProvider>
      </body>
    </html>
  );
}
