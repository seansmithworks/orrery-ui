// Specimen only. The generated token CSS sets every role on :root, so one page can show one brand.
// To put brands and modes side by side, each panel gets the same generated declarations, byte for
// byte, under its own selector: :root becomes [data-brand="<brand>"], and the panel's data-theme picks
// the mode. The prefers-color-scheme block is dropped so a panel never follows the OS.
import orreryCss from "../../tokens/generated/css/orrery.css?raw";
import orrerySystemCss from "../../tokens/generated/css/orrery.system.css?raw";
import solarCss from "../../tokens/generated/css/solar.css?raw";
import solarSystemCss from "../../tokens/generated/css/solar.system.css?raw";

const SOURCES: Record<string, string[]> = {
  orrery: [orreryCss, orrerySystemCss],
  solar: [solarCss, solarSystemCss],
};

const scope = (css: string, brand: string) =>
  css
    .replace(/@media \(prefers-color-scheme: [a-z]+\) \{[\s\S]*?\n\}\n/g, "")
    .replaceAll(":root", `[data-brand="${brand}"]`);

export function installBrandTokens() {
  for (const [brand, files] of Object.entries(SOURCES)) {
    const style = document.createElement("style");
    style.dataset.brandTokens = brand;
    style.textContent = files.map((f) => scope(f, brand)).join("\n");
    document.head.append(style);
  }
}
