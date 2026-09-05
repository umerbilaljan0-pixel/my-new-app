import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import Home from "@/pages/Home";
import ToolPage from "@/pages/ToolPage";
import Pricing from "@/pages/Pricing";
import Download from "@/pages/Download";
import Docs from "@/pages/Docs";
import Changelog from "@/pages/Changelog";
import Blog from "@/pages/Blog";
import Terms from "@/pages/legal/Terms";
import Privacy from "@/pages/legal/Privacy";
import AcceptableUse from "@/pages/legal/AcceptableUse";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tools/:slug" element={<ToolPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/download" element={<Download />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/changelog" element={<Changelog />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />
          <Route path="/legal/acceptable-use" element={<AcceptableUse />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
