import { themeCssVars } from "@/lib/design-tokens";

/**
 * Injected into <head>. Two responsibilities, both before first paint to avoid
 * any flash of the wrong theme (FOUC):
 *
 *  1. <style> — all theme colour custom properties, generated from
 *     lib/design-tokens.ts (the single source of truth). No hex lives in CSS.
 *  2. <script> — reads the persisted theme choice from localStorage and stamps
 *     `data-theme` on <html> synchronously, so the correct palette is applied
 *     before the body renders.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem("cleanplate-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export function ThemeStyles() {
  return (
    <style
      // Generated from tokens — deterministic, no user input.
      dangerouslySetInnerHTML={{ __html: themeCssVars() }}
    />
  );
}

export function ThemeInitScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
