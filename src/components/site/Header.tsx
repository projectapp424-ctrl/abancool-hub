import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Cloud, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { CartButton } from "@/components/site/CartDrawer";
import { WHMCS_HOME_URL, WHMCS_LOGIN_URL } from "@/lib/whmcs-public";

const nav = [
  { to: "/", label: "Home" },
  { to: "/domains", label: "Domains" },
  { to: "/hosting", label: "Hosting" },
  { to: "/web-development", label: "Web Development" },
  { to: "/pos-systems", label: "POS Systems" },
  { to: "/bulk-sms", label: "Bulk SMS" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cloud className="h-4 w-4" />
          </span>
          <span className="text-base tracking-tight">
            Abancool<span className="text-primary">.</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "text-foreground bg-secondary" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <CartButton />
          {user ? (
            <Button size="sm" asChild>
              <Link to="/dashboard"><LayoutDashboard className="mr-1 h-4 w-4" />Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <a href={WHMCS_LOGIN_URL} target="_blank" rel="noopener noreferrer">Sign in</a>
              </Button>
              <Button size="sm" asChild>
                <a href={WHMCS_HOME_URL} target="_blank" rel="noopener noreferrer">Get Started</a>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <CartButton />
          <button
            aria-label="Toggle menu"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "text-foreground bg-secondary" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {user ? (
                <Button size="sm" className="flex-1" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <a href={WHMCS_LOGIN_URL} target="_blank" rel="noopener noreferrer">Sign in</a>
                  </Button>
                  <Button size="sm" className="flex-1" asChild>
                    <a href={WHMCS_HOME_URL} target="_blank" rel="noopener noreferrer">Get Started</a>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
