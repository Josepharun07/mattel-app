import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { SignIn } from "@/views/auth/sign-in";
import { AccentRoot } from "@/views/shell/accent-root";
import { AppShell } from "@/views/shell/AppShell";
import { getPortalData } from "@/controllers/operations";
import { getCurrentSession } from "@/lib/auth/current";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Mattel Infrastructures",
    template: "%s · Mattel Infrastructures",
  },
  description:
    "Inventory, rentals, payroll, and billing for Mattel Infrastructures.",
  icons: {
    icon: "/mattel-logo.png",
    apple: "/mattel-logo.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getCurrentSession();
  const portal = session && session.kind !== "staff" ? await getPortalData() : null;
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-steel">
        {session ? (
          <WorkspaceProvider>
            <AccentRoot>
              <AppShell session={session} portal={portal}>
                {children}
              </AppShell>
            </AccentRoot>
          </WorkspaceProvider>
        ) : (
          <SignIn />
        )}
      </body>
    </html>
  );
}
