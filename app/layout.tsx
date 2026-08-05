import type { Metadata } from "next";
import Link from "next/link";
import { Geist } from "next/font/google";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Disclaimer } from "@/components/Disclaimer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "I AGREE — The Fine Print Decoder",
  description:
    "Paste any Terms of Service, privacy policy, or rental agreement and get a ten-second verdict — every warning proven by the exact clause that caused it.",
};

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

async function Shell({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  if (clerkConfigured) {
    try {
      signedIn = Boolean((await auth()).userId);
    } catch {
      signedIn = false;
    }
  }
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-screen flex-col font-sans">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              I&nbsp;AGREE{" "}
              <span className="hidden text-sm font-normal text-slate-500 sm:inline">
                — The Fine Print Decoder
              </span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/registry" className="text-slate-600 hover:text-slate-900">
                Registry
              </Link>
              {clerkConfigured && (
                <>
                  <Link href="/history" className="text-slate-600 hover:text-slate-900">
                    History
                  </Link>
                  {signedIn ? (
                    <UserButton />
                  ) : (
                    <SignInButton mode="modal">
                      <button className="rounded-lg bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700">
                        Sign in
                      </button>
                    </SignInButton>
                  )}
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
        <Disclaimer />
      </body>
    </html>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  if (!clerkConfigured) return <Shell>{children}</Shell>;
  return (
    <ClerkProvider>
      <Shell>{children}</Shell>
    </ClerkProvider>
  );
}
