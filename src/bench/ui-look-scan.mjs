/* global document, getComputedStyle, window, NodeFilter, innerHeight */
// The scans of the menu look guard (owner, Nov 23: "a box around boxes ... explicitly
// forbid it. Make it turn main red" and "none of these scrollers, especially when there's
// ample dead space in these menus"). Each is a function that runs inside the page, so a
// browser check passes it to `page.evaluate`; docs/mocks/2026-11-07-approved/MENU-LOOK.md
// is the rule they enforce, tests/guards/ui-look-baseline.json what is still allowed.

/**
 * Guard A, box in box. Every element inside the open framed panel that is a container and
 * not a control, and draws a box: a visible border, a fill (a background color with alpha
 * or a background image) or an inset shadow. Returns one row per element: its selector key.
 * Controls (a button, a tab, an input, a select, a picture, a face or a portrait) are the
 * things that may be boxes; the Nov 5 tab rails are allowed by name.
 */
export function scanBoxes(panelSelector) {
  const root = document.querySelector(panelSelector);
  if (!root) return [];
  const CONTROL =
    "button,[role=tab],.pick,input,select,textarea,option,img,picture,canvas,svg,video,a,label,summary,progress,meter";
  // A face or a portrait: a class that names one, on the element or any ancestor inside the panel.
  const PICTURE =
    /(^|[-_\s])(face|portrait|bust|avatar|picture|photo|figure|crop|plate-art)([-_\s]|$)/i;
  // Allowed by name: the tab rails he approved on Nov 5 and the portrait's pool of light.
  const ALLOWED = ["#sheet-tabs", "#person-tabs", ".tab-rail", ".mxglow"];
  const alpha = (color) => {
    const m = color.match(/rgba?\(([^)]*)\)/);
    if (!m) return color === "transparent" ? 0 : 1;
    const parts = m[1].split(/[,/ ]+/).filter(Boolean);
    return parts.length > 3 ? Number(parts[3]) : 1;
  };
  const classesOf = (node) =>
    typeof node.className === "string"
      ? node.className.split(/\s+/).filter(Boolean).sort()
      : [];
  const keyOf = (node) => {
    const own = `${node.tagName.toLowerCase()}${classesOf(node)
      .map((c) => `.${c}`)
      .join("")}`;
    if (classesOf(node).length || node.id) return node.id ? `#${node.id}` : own;
    const parent = node.parentElement;
    return parent && parent !== root ? `${keyOf(parent)} > ${own}` : own;
  };
  const rows = [];
  for (const node of root.querySelectorAll("*")) {
    if (node === root) continue;
    if (!node.checkVisibility()) continue;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    if (node.closest(CONTROL)) continue;
    if (ALLOWED.some((s) => node.closest(s))) continue;
    // A picture, face or portrait is a control-like part: skip it and what it holds.
    let pictured = false;
    for (let n = node; n && n !== root; n = n.parentElement)
      if (PICTURE.test(typeof n.className === "string" ? n.className : "")) {
        pictured = true;
        break;
      }
    if (pictured) continue;
    const cs = getComputedStyle(node);
    const why = [];
    // A border is a box when it draws two sides or more; one side is a rule or a dot leader.
    let sides = 0;
    for (const side of ["Top", "Right", "Bottom", "Left"]) {
      const style = cs[`border${side}Style`];
      if (
        style !== "none" &&
        style !== "hidden" &&
        parseFloat(cs[`border${side}Width`]) > 0 &&
        alpha(cs[`border${side}Color`]) > 0
      )
        sides += 1;
    }
    if (sides >= 2) why.push("border");
    if (alpha(cs.backgroundColor) > 0) why.push("fill");
    if (cs.backgroundImage !== "none") why.push("picture-fill");
    if (cs.boxShadow !== "none" && /inset/.test(cs.boxShadow))
      why.push("inset-shadow");
    if (why.length) rows.push({ selector: keyOf(node), why: why.join("+") });
  }
  return rows;
}

/**
 * Guard B, scroll with free space. The panel, or anything in it, that scrolls (either way)
 * while the panel is shorter than the height the screen allows it. A list beside its detail
 * may scroll inside itself only when the panel is already at its full height
 * (MENU-LOOK, "Menus never scroll as a page"). Returns one row per scroller, with the
 * panel's height, the height it is allowed and whether it is at full height.
 */
export function scanScrollers(panelSelector) {
  const root = document.querySelector(panelSelector);
  if (!root) return [];
  const cs = getComputedStyle(root);
  const rect = root.getBoundingClientRect();
  const maxHeight = parseFloat(cs.maxHeight);
  const bottom = parseFloat(cs.bottom);
  const allowed = Number.isFinite(maxHeight)
    ? maxHeight
    : Number.isFinite(bottom)
      ? window.innerHeight - rect.top - bottom
      : rect.height;
  const full = rect.height >= allowed - 8;
  const keyOf = (node) => {
    if (node === root) return `#${root.id || "panel"}`;
    const classes =
      typeof node.className === "string"
        ? node.className.split(/\s+/).filter(Boolean).sort()
        : [];
    return node.id
      ? `#${node.id}`
      : `${node.tagName.toLowerCase()}${classes.map((c) => `.${c}`).join("")}`;
  };
  const rows = [];
  for (const node of [root, ...root.querySelectorAll("*")]) {
    if (!node.checkVisibility()) continue;
    const s = getComputedStyle(node);
    const y =
      /(auto|scroll)/.test(s.overflowY) &&
      node.scrollHeight - node.clientHeight > 1;
    const x =
      /(auto|scroll)/.test(s.overflowX) &&
      node.scrollWidth - node.clientWidth > 1;
    if (!y && !x) continue;
    rows.push({
      selector: keyOf(node),
      axis: `${y ? "y" : ""}${x ? "x" : ""}`,
      panelHeight: Math.round(rect.height),
      allowedHeight: Math.round(allowed),
      full,
    });
  }
  return rows;
}

/**
 * Rule 1, text clipped at a box's edge (Impeccable: "text-overflow", content cut by a clipping
 * ancestor). A line of text that is partly inside a scroller or a clipping box and partly cut by its
 * edge: a list whose last row shows its top half ("FAILED" at the foot of Bills). A line wholly
 * scrolled out of sight is not a hit, and a one-line truncation with an ellipsis is meant.
 * Returns one row per clipping box that cuts a line, keyed by the box's selector.
 */
export function scanClipped(panelSelector) {
  const root = document.querySelector(panelSelector);
  if (!root) return [];
  const classesOf = (node) =>
    typeof node.className === "string"
      ? node.className.split(/\s+/).filter(Boolean).sort()
      : [];
  const keyOf = (node) =>
    node.id
      ? `#${node.id}`
      : `${node.tagName.toLowerCase()}${classesOf(node)
          .map((c) => `.${c}`)
          .join("")}`;
  const clips = (node) => {
    const s = getComputedStyle(node);
    return /(auto|scroll|hidden|clip)/.test(`${s.overflowX} ${s.overflowY}`);
  };
  const rows = new Map();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.nodeValue.trim()) continue;
    const el = t.parentElement;
    if (!el || !el.checkVisibility()) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const lines = [...range.getClientRects()].filter(
      (r) => r.width > 2 && r.height > 4,
    );
    if (!lines.length) continue;
    for (let a = el; a; a = a.parentElement) {
      if (clips(a)) {
        const s = getComputedStyle(a);
        const ellipsis =
          s.textOverflow === "ellipsis" ||
          getComputedStyle(el).textOverflow === "ellipsis";
        const box = a.getBoundingClientRect();
        const top = box.top + a.clientTop;
        const bottom = top + a.clientHeight;
        const left = box.left + a.clientLeft;
        const right = left + a.clientWidth;
        for (const r of lines) {
          const seenH = Math.min(r.bottom, bottom) - Math.max(r.top, top);
          const seenW = Math.min(r.right, right) - Math.max(r.left, left);
          const cutV = seenH > 1 && r.height - seenH >= 3;
          const cutH = !ellipsis && seenW > 1 && r.width - seenW >= 3;
          if (cutV || cutH) rows.set(keyOf(a), { selector: keyOf(a) });
        }
      }
      if (a === root) break;
    }
  }
  return [...rows.values()];
}

/**
 * Rule 2, one fact shown twice on one screen (Impeccable: "repeated-container-text"). A fact is
 * narrowly an exact date ("June 21, 2026", "Jun 21, 2026": the same day) or a record number (a bill
 * or ordinance: HB 2, H.R. 2, Ordinance 2025-1) in the visible text. It is a hit when the same fact
 * stands in two or more different elements of the one panel. Returns one row per kind of fact
 * repeated, with an example.
 */
export function scanRepeated(panelSelector) {
  const root = document.querySelector(panelSelector);
  if (!root) return [];
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];
  const date =
    /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.? (\d{1,2}),? (\d{4})\b/g;
  const number =
    /\b(H\.R\.|HB|SB|LB|AB|HF|SF|Ordinance|Act|Resolution)\s?(\d+(?:-\d+)?)\b/g;
  const found = { date: new Map(), "record number": new Map() };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement;
    if (!el || !el.checkVisibility() || el.closest("script,style")) continue;
    const text = t.nodeValue;
    const add = (kind, fact) => {
      const set = found[kind].get(fact) ?? new Set();
      set.add(el);
      found[kind].set(fact, set);
    };
    for (const m of text.matchAll(date))
      add(
        "date",
        `${m[3]}-${months.indexOf(m[1].slice(0, 3).toLowerCase()) + 1}-${Number(m[2])}`,
      );
    for (const m of text.matchAll(number))
      add("record number", `${m[1].toUpperCase().replace(/\./g, "")}${m[2]}`);
  }
  const rows = [];
  for (const [kind, facts] of Object.entries(found))
    for (const [fact, set] of facts)
      if (set.size >= 2) {
        rows.push({ kind, fact, places: set.size });
        break;
      }
  return rows;
}

/**
 * Rule 3, headline leading under 1.3 (Impeccable: "tight-leading"). A title that wraps to two lines
 * or more with a line height under 1.3 times its font size. Returns one row per selector.
 */
export function scanLeading(panelSelector) {
  const root = document.querySelector(panelSelector);
  if (!root) return [];
  const classesOf = (node) =>
    typeof node.className === "string"
      ? node.className.split(/\s+/).filter(Boolean).sort()
      : [];
  const keyOf = (node) =>
    `${node.tagName.toLowerCase()}${classesOf(node)
      .map((c) => `.${c}`)
      .join("")}`;
  const rows = new Map();
  for (const el of root.querySelectorAll(
    "h1,h2,h3,h4,h5,h6,[class*=headline],[class*=title],.heading,.lbig",
  )) {
    if (!el.checkVisibility() || !el.textContent.trim()) continue;
    const s = getComputedStyle(el);
    const size = parseFloat(s.fontSize);
    const line = Number.isFinite(parseFloat(s.lineHeight))
      ? parseFloat(s.lineHeight)
      : size * 1.2;
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set(
      [...range.getClientRects()]
        .filter((r) => r.width > 2)
        .map((r) => Math.round(r.top / 4)),
    );
    if (tops.size >= 2 && line / size < 1.3)
      rows.set(keyOf(el), { selector: keyOf(el) });
  }
  return [...rows.values()];
}

/**
 * Rule 4, a title over a picture it cannot be read against (Impeccable: "low-contrast", read on the
 * pixels behind a title). Finds each visible title with a picture under its box and marks it
 * `data-ui-look-title`; the caller hides the title's own text, photographs its box and measures
 * the pixels against the text's color. Returns the box, the color and the mark of each.
 */
export function scanTitles(panelSelector) {
  const root = document.querySelector(panelSelector);
  if (!root) return [];
  const classesOf = (node) =>
    typeof node.className === "string"
      ? node.className.split(/\s+/).filter(Boolean).sort()
      : [];
  const keyOf = (node) =>
    `${node.tagName.toLowerCase()}${classesOf(node)
      .map((c) => `.${c}`)
      .join("")}`;
  const rows = [];
  let mark = 0;
  for (const el of root.querySelectorAll(
    "h1,h2,h3,h4,h5,h6,[class*=headline],[class*=title],.heading,.lbig",
  )) {
    if (!el.checkVisibility() || !el.textContent.trim()) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.top < 0 || r.bottom > innerHeight) continue;
    // A picture under the title: an image, or a background picture, in the stack at its middle.
    const stack = document.elementsFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    const under = stack.some(
      (n) =>
        n !== el &&
        !el.contains(n) &&
        (n.tagName === "IMG" ||
          (getComputedStyle(n).backgroundImage.includes("url(") &&
            !n.contains(el))),
    );
    if (!under) continue;
    el.setAttribute("data-ui-look-title", String(mark));
    rows.push({
      selector: keyOf(el),
      mark,
      color: getComputedStyle(el).color,
      x: r.left,
      y: r.top,
      width: r.width,
      height: r.height,
    });
    mark += 1;
  }
  return rows;
}
