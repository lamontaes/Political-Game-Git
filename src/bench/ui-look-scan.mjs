/* global document, getComputedStyle, window */
// The two scans of the menu look guard (owner, Nov 23: "a box around boxes ... explicitly
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
