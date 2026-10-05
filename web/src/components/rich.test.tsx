import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { Rich } from "./Rich";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function render(text: string): HTMLElement {
  const host = document.createElement("div");
  act(() => createRoot(host).render(<Rich text={text} />));
  return host;
}

describe("Rich", () => {
  it("renders paragraph, bullets and a trailing paragraph in one block", () => {
    const el = render("Tentative (check on the bench):\n- A: Hg lamp\n- B: lens\nAlso: the multimeter.");
    expect(el.querySelectorAll("p")).toHaveLength(2);
    expect(el.querySelectorAll("li")).toHaveLength(2);
    expect(el.textContent).not.toContain("- A");
  });
  it("renders subscripts, bold and pipe tables", () => {
    const el = render("**Q:** n_b = N_b/t_b\n\n|r|σ_n|\n|---|---|\n|2|4|");
    expect(el.querySelector("strong")?.textContent).toBe("Q:");
    expect(el.querySelectorAll("sub")).toHaveLength(4); // n_b, N_b, t_b and σ_n in the table
    expect(el.querySelectorAll("table td")).toHaveLength(2);
  });
});
