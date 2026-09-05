import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";

const LINKS: [string, string][] = [
  ["/tools/erase", "Tools"],
  ["/pricing", "Pricing"],
  ["/download", "Download"],
  ["/docs", "Docs"],
  ["/changelog", "Changelog"],
  ["/blog", "Blog"],
];

export function Nav() {
  const loc = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-border" style={{ background: "color-mix(in srgb, var(--bg-void) 88%, transparent)", backdropFilter: "blur(8px)" }}>
      <div className="container-grid flex items-center gap-6 h-14">
        <Link to="/" className="flex items-center gap-2"><Logo size={17} /></Link>
        <nav className="hidden md:flex items-center gap-5 ml-2">
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to}
              className="text-[13px] link-mid"
              style={{ color: loc.pathname.startsWith(to.split("/").slice(0, 2).join("/")) ? "var(--text-hi)" : undefined }}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/download" className="btn h-9 text-[13px]">Download</Link>
          <a href="http://localhost:5173" className="btn btn-primary h-9 text-[13px]">Open Web App</a>
        </div>
      </div>
    </header>
  );
}
