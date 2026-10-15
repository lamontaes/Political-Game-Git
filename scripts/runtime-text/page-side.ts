/**
 * Code that runs inside the browser page. Playwright serializes each function,
 * so none of them may use an import or a name from outside its own body.
 */

/** Installed before the application loads; collects what the sink is given. */
export function installSink(): void {
  const engine = new Map<string, { bank: string; variant?: string }>();
  let world: unknown = null;
  const target = globalThis as unknown as Record<string, unknown>;
  target.__ocdRuntimeText = {
    engine: (text: string, origin: { bank: string; variant?: string }) => {
      if (!engine.has(text)) engine.set(text, origin);
    },
    world: (next: unknown) => {
      world = next;
    },
  };
  let values: Set<string> | null = null;
  target.__ocdTextAudit = {
    engine: () => [...engine.entries()],
    coverage: (texts: string[]) => {
      if (!values) {
        values = new Set<string>();
        const seen = new WeakSet<object>();
        const stack: unknown[] = [world];
        while (stack.length > 0) {
          const node = stack.pop();
          if (typeof node === "string") {
            if (node.length >= 2 && node.length <= 80) values.add(node);
          } else if (node && typeof node === "object") {
            if (seen.has(node as object)) continue;
            seen.add(node as object);
            for (const child of Object.values(node as object))
              stack.push(child);
          }
        }
      }
      const out: [
        string,
        { covered: number; total: number; values: string[] },
      ][] = [];
      for (const text of texts) {
        const tokens = text.split(" ");
        let covered = 0;
        const matched: string[] = [];
        let i = 0;
        while (i < tokens.length) {
          let hit = 0;
          for (let n = Math.min(8, tokens.length - i); n >= 1; n -= 1) {
            const phrase = tokens
              .slice(i, i + n)
              .join(" ")
              .replace(/^[("']+/, "")
              .replace(/[,.;:!?)"']+$/, "");
            if (
              values.has(phrase) &&
              (n > 1 || /^[A-Z0-9$]/.test(phrase)) &&
              phrase.length >= 2
            ) {
              hit = n;
              matched.push(phrase);
              break;
            }
          }
          if (hit > 0) {
            covered += hit;
            i += hit;
          } else i += 1;
        }
        out.push([text, { covered, total: tokens.length, values: matched }]);
      }
      return out;
    },
  };
}

/** The player-facing text on the page right now. */
export function readScreenText(): {
  text: string;
  kind: string;
  testid: string;
}[] {
  const out: { text: string; kind: string; testid: string }[] = [];
  const nearestId = (element: Element) =>
    element.closest("[data-testid]")?.getAttribute("data-testid") ?? "";
  const shown = (element: Element) => {
    if (element.getClientRects().length === 0) return false;
    const style = getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const element = node.parentElement;
    if (!element || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(element.tagName))
      continue;
    const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
    if (!text || !shown(element)) continue;
    out.push({ text, kind: "text", testid: nearestId(element) });
  }
  for (const attribute of ["aria-label", "title", "placeholder", "alt"]) {
    for (const element of Array.from(
      document.querySelectorAll(`[${attribute}]`),
    )) {
      const text = (element.getAttribute(attribute) ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (text && shown(element))
        out.push({ text, kind: attribute, testid: nearestId(element) });
    }
  }
  return out;
}
