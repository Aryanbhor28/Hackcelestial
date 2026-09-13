import type { Metadata } from "next";
import { Caveat, Plus_Jakarta_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Logo, Nav } from "@/components/Nav";
import { AuthProvider } from "@/lib/auth";
import { LaunchIntro } from "@/components/LaunchIntro";
import { ToastProvider } from "@/components/Toast";
import { THEME_GUARD, ThemeSync } from "@/components/ThemeSync";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const hand = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hand-loaded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LocalFlow — Real Places. Deeper Stories.",
  description:
    "Discover experiences that feel local. Personalized, real-time and meaningful — powered by AI and the people who live there.",
};

const FOOTER = [
  {
    h: "Explore",
    links: [
      ["Experiences", "/experiences"],
      ["Plan My Day", "/discover"],
      ["Stories", "/discovery"],
    ],
  },
  {
    h: "For hosts",
    links: [
      ["Local Hosts", "/provider"],
      ["List your experience", "/provider/new"],
      ["How we verify", "/discovery"],
    ],
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // the intro guard stamps data-intro on <html> before hydration, by design
    <html lang="en" className={`${sans.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        {/* runs before first paint so a dark-theme account never flashes light */}
        <script dangerouslySetInnerHTML={{ __html: THEME_GUARD }} />
      </head>
      <body style={{ ["--font-hand" as string]: `var(--font-hand-loaded), "Segoe Script", cursive` }}>
        <AuthProvider>
          <ToastProvider>
            <ThemeSync />
            <LaunchIntro />
            <Nav />
            <main>{children}</main>

        <footer className="mt-24 bg-[var(--color-deep)] text-white">
          <div className="mx-auto max-w-[1500px] px-5 py-14 lg:px-8">
            <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
              <div>
                <Logo dark />
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
                  Find, plan and experience the real side of every city — powered by AI and the
                  people who live there.
                </p>
              </div>
              {FOOTER.map((col) => (
                <div key={col.h}>
                  <p className="text-xs font-semibold tracking-[0.09em] text-white/45 uppercase">
                    {col.h}
                  </p>
                  <ul className="mt-4 space-y-2.5">
                    {col.links.map(([label, href]) => (
                      <li key={href}>
                        <Link href={href} className="text-sm text-white/75 hover:text-[var(--color-amber-2)]">
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-12 border-t border-white/12 pt-6 text-xs leading-relaxed text-white/45">
              <p className="font-medium text-white/60">LocalFlow — prototype. Manali pilot.</p>
              <p className="mt-1.5 max-w-3xl">
                Experiences shown are curated seed data for demonstration, structured exactly as
                real provider submissions would be. Photography is representative Creative Commons
                imagery of the Kullu valley, not photographs of the individual providers. Match
                scores are a stated platform methodology, not a measure of certainty.
              </p>
            </div>
          </div>
            </footer>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
