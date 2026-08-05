import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Newsreader, Courier_Prime } from "next/font/google";
import { ClerkProvider, SignInButton, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Disclaimer } from "@/components/Disclaimer";
import "./globals.css";

// Three faces, three voices: the verdict, the explanation, the document itself.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
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
    <html
      lang="en"
      className={`${archivo.variable} ${newsreader.variable} ${courier.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        {/* Header set as a document masthead: a filed-under label above the
            title, and a heavy rule closing it — the way a form is headed. */}
        <header className="sticky top-0 z-20 border-b-2 border-ink bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-2.5">
            <Link href="/" className="group flex items-baseline gap-2.5">
              <span className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
                I&nbsp;Agree
              </span>
              <span className="field-label hidden sm:inline">The Fine Print Decoder</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/registry"
                className="field-label transition-colors hover:text-ditto"
              >
                Registry
              </Link>
              {clerkConfigured && (
                <>
                  <Link
                    href="/history"
                    className="field-label transition-colors hover:text-ditto"
                  >
                    History
                  </Link>
                  {signedIn ? (
                    <UserButton />
                  ) : (
                    <SignInButton mode="modal">
                      <button className="field-label border border-ink px-2.5 py-1 text-ink transition-colors hover:bg-ink hover:text-paper">
                        Sign in
                      </button>
                    </SignInButton>
                  )}
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
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
