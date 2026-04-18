import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-[color:var(--brand-navy)] text-white">
      <div
        className="absolute inset-0 opacity-30"
        style={{ background: "var(--gradient-hero)" }}
      />
      <div
        aria-hidden
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full"
        style={{ background: "radial-gradient(closest-side, oklch(0.62 0.18 250 / 0.35), transparent)" }}
      />
      <div className="container-x relative py-20 md:py-28">
        {eyebrow && (
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-3xl text-4xl font-bold md:text-5xl lg:text-6xl">{title}</h1>
        {subtitle && (
          <p className="mt-5 max-w-2xl text-base text-white/70 md:text-lg">{subtitle}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
