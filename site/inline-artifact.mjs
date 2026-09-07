// Build self-contained HTML from the Vite dist by inlining CSS + JS.
// IMPORTANT: use function replacers so `$` inside the minified bundle is never
// interpreted as a String.replace substitution pattern (that corrupts the JS).
import { readFileSync, writeFileSync } from "node:fs";

const outDir = process.argv[2];
const idx = readFileSync("dist/index.html", "utf8");
const cssHref = idx.match(/href="(\/assets\/[^"]+\.css)"/)[1];
const jsSrc = idx.match(/src="(\/assets\/[^"]+\.js)"/)[1];
const css = readFileSync("dist" + cssHref, "utf8");
const js = readFileSync("dist" + jsSrc, "utf8").split("http://localhost:5173").join("#/download");

// full standalone document (for local testing)
const full = idx
  .replace(/<link rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`)
  .replace(/<script type="module"[^>]*><\/script>/, () => `<script type="module">${js}</script>`)
  .replace(/<link rel="icon"[^>]*>/, () => "");
writeFileSync(outDir + "/cleanplate-site.html", full);

// artifact inner content (no <html>/<head>/<body> — wrapped at publish time)
const inner =
  `<title>CLEANPLATE</title>\n<style>${css}</style>\n<div id="root"></div>\n` +
  `<script type="module">${js}</script>\n`;
writeFileSync(outDir + "/cleanplate-site-artifact.html", inner);

console.log("inlined ok — js bytes:", js.length, "| contains </script>:", js.includes("</script>"));
