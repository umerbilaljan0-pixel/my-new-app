import { Link } from "react-router-dom";
import { Monogram } from "./Logo";
import { TOOLS } from "@/data";

export function Footer() {
  return (
    <footer className="border-t border-border mt-24">
      <div className="container-grid py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Monogram size={26} />
          <p className="text-[12px] text-text-low mt-3 max-w-[22ch]">
            Remove it. Rebuild it. Ship it. Runs on your own machine.
          </p>
        </div>
        <FooterCol title="Tools" links={TOOLS.map((t) => [`/tools/${t.slug}`, t.name])} />
        <FooterCol title="Product" links={[["/pricing", "Pricing"], ["/download", "Download"], ["/docs", "Docs"], ["/changelog", "Changelog"]]} />
        <FooterCol title="Legal" links={[["/legal/terms", "Terms"], ["/legal/privacy", "Privacy"], ["/legal/acceptable-use", "Acceptable Use"]]} />
        <FooterCol title="More" links={[["/blog", "Blog"], ["/docs", "API"]]} />
      </div>
      <div className="container-grid pb-10 flex items-center justify-between border-t border-border pt-6">
        <span className="text-[11px] text-text-low num">© {new Date().getFullYear()} CLEANPLATE</span>
        <span className="text-[11px] text-text-low">Non-destructive by law.</span>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="label mb-3">{title}</div>
      <ul className="space-y-2">
        {links.map(([to, label]) => (
          <li key={to + label}><Link to={to} className="text-[13px] link-mid">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
