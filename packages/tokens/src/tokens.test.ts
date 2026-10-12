import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import { toThemeCss } from "./css";
import { flow, neutral, surfaceRoles, textRoles } from "./index";

const AA = 4.5;

describe("contrast", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  for (const text of textRoles) {
    for (const surface of surfaceRoles) {
      it(`${text} on ${surface} reaches AA`, () => {
        expect(contrastRatio(neutral[text], neutral[surface])).toBeGreaterThanOrEqual(AA);
      });
    }
  }

  for (const [name, value] of Object.entries(flow)) {
    it(`flow ${name} is readable as log text on the inset`, () => {
      expect(contrastRatio(value, neutral.inset)).toBeGreaterThanOrEqual(AA);
    });
    it(`a balloon number on flow ${name} reaches AA`, () => {
      expect(contrastRatio(neutral.bg, value)).toBeGreaterThanOrEqual(AA);
    });
  }
});

describe("theme css", () => {
  const css = toThemeCss();

  it("removes the default Tailwind palette", () => {
    expect(css).toContain("--color-*: initial;");
  });

  it("exposes every colour token", () => {
    expect(css).toContain("--color-text-secondary: #9AA1AB;");
    expect(css).toContain("--color-flow-error: #FF5A36;");
    const colours = css.match(/--color-[a-z-]+: #/g) ?? [];
    expect(colours).toHaveLength(Object.keys(neutral).length + Object.keys(flow).length);
  });

  it("maps the font variables set by next/font", () => {
    expect(css).toContain(
      '--font-mono: var(--font-plex-mono, "IBM Plex Mono"), ui-monospace, monospace;',
    );
  });
});
