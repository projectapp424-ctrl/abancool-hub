import { Link } from "@tanstack/react-router";
import { Cloud, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-[color:var(--brand-navy)] text-white">
      <div className="container-x grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cloud className="h-4 w-4" />
            </span>
            <span className="text-base">Abancool Technology</span>
          </Link>
          <p className="mt-4 max-w-sm text-sm text-white/60">
            Reliable hosting, domains, custom web development, POS systems and bulk SMS — all
            under one trusted platform.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-white/70">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <a href="mailto:info@abancool.com" className="hover:text-white">info@abancool.com</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <a href="tel:+254111679286" className="hover:text-white">0111 679 286</a>
              <span className="text-white/40">/</span>
              <a href="tel:+254728825152" className="hover:text-white">0728 825 152</a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" /> Nairobi, Kenya
            </li>
          </ul>
        </div>

        <FooterCol
          title="Services"
          links={[
            { to: "/hosting", label: "Web Hosting" },
            { to: "/domains", label: "Domain Names" },
            { to: "/web-development", label: "Web Development" },
            { to: "/pos-systems", label: "POS Systems" },
            { to: "/bulk-sms", label: "Bulk SMS" },
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            { to: "/", label: "About" },
            { to: "/pricing", label: "Pricing" },
            { to: "/contact", label: "Contact" },
          ]}
        />
        <FooterCol
          title="Support"
          links={[
            { to: "/contact", label: "Help Center" },
            { to: "/contact", label: "Open a Ticket" },
            { to: "/contact", label: "Status" },
          ]}
        />
      </div>
      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-6 text-xs text-white/50 md:flex-row">
          <p>© {new Date().getFullYear()} Abancool Technology. All rights reserved.</p>
          <p>Built for businesses that demand uptime.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: "/" | "/domains" | "/hosting" | "/web-development" | "/pos-systems" | "/bulk-sms" | "/pricing" | "/contact"; label: string }[];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm text-white/60">
        {links.map((l, i) => (
          <li key={i}>
            <Link to={l.to} className="hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
