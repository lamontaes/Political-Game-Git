/* global document */
// The people web: the menu type of People. You at the center, the people you know in a
// ring around you (a round headshot each, its ring and line colored by kind), lines
// between people who share your home; a list of face cards instead of the web, paged;
// filters by kind and a search. Never a mark for how close anyone is (owner, Oct 29).
// The screen hands it the people with their kinds, you, the labels, and what opening a
// card and starting a talk do.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { makeTab, chooseTab } from "./tab.mjs";
import { headshot } from "./headshot.mjs";
import { memberCard } from "./member-card.mjs";
import { pager } from "./pager.mjs";

/** The People sheet's nodes. */
export function peopleWeb({
  people,
  household,
  self,
  inRoom,
  labels,
  pageWords,
  onCard,
  onTalk,
}) {
  let group = "all";
  let selected;
  let listMode = false;
  const search = el("input", {
    type: "search",
    placeholder: labels.search,
    className: "people-search",
  });
  search.setAttribute("aria-label", labels.search);
  const filters = el("nav", { className: "tab-rail people-filters" });
  const canvas = el("div", { className: "relationship-web" });
  const detail = el("div", { className: "people-selection" });
  const button = (text, fn) => {
    const b = makeButton({ textContent: text });
    b.addEventListener("click", fn);
    return b;
  };
  const portrait = (p) => {
    // A headshot: the person's own figure, cropped round to their head
    // (no box; owner, Oct 28).
    if (p.face) return headshot(p.face);
    const url = p.presentation?.portraitUrl ?? p.figureUrl;
    // No figure yet (a child: the pack paints adults only): an empty ring,
    // never initials (owner, Oct 28), as every list row draws it.
    if (!url) return el("span", { className: "headshot" });
    const image = el("img", { src: url, alt: "" });
    image.addEventListener("error", () => image.remove());
    return image;
  };
  // A person's kind, for their line and the ring around their face.
  const kindOf = (p) =>
    household.has(p.personId)
      ? "household"
      : p.groups.includes("family")
        ? "family"
        : (p.groups[0] ?? "other");
  const draw = () => {
    const found = people.filter((p) =>
      p.name.toLowerCase().includes(search.value.trim().toLowerCase()),
    );
    // The web draws the first eight; the list holds everyone as face cards,
    // paged inside its box, never a scroll.
    const shown = listMode ? [] : found.slice(0, 8);
    canvas.replaceChildren();
    canvas.classList.toggle("people-list", listMode);
    if (listMode)
      canvas.append(
        pager({
          items: found,
          render: (p) => {
            const card = memberCard({
              name: p.name,
              line: p.relation ?? "",
              face: p.face,
              onOpen: () => {
                selected = p.personId;
                draw();
              },
            });
            card.classList.add(kindOf(p));
            if (selected === p.personId) card.classList.add("on");
            return card;
          },
          rows: 4,
          columns: 3,
          rowHeight: 64,
          gap: 8,
          words: pageWords,
        }),
      );
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.classList.add("people-lines");
    if (!listMode) {
      canvas.append(
        svg,
        el(
          "div",
          { className: "people-center" },
          portrait(self),
          el("b", { textContent: self.name }),
        ),
      );
    }
    // People who share your home share a line with each other, as the
    // household record ties them.
    const at = (i) => {
      const angle = (i / Math.max(shown.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [50 + Math.cos(angle) * 37, 50 + Math.sin(angle) * 36];
    };
    if (!listMode)
      shown.forEach((a, i) =>
        shown.forEach((b, j) => {
          if (
            j <= i ||
            !household.has(a.personId) ||
            !household.has(b.personId)
          )
            return;
          const line = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line",
          );
          const [x1, y1] = at(i);
          const [x2, y2] = at(j);
          for (const [key, value] of Object.entries({
            x1,
            y1,
            x2,
            y2,
            class: "people-edge household between",
          }))
            line.setAttribute(key, value);
          svg.append(line);
        }),
      );
    shown.forEach((p, i) => {
      const [x, y] = at(i);
      const active = group === "all" || p.groups.includes(group);
      const kind = kindOf(p);
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      for (const [key, value] of Object.entries({
        x1: 50,
        y1: 50,
        x2: x,
        y2: y,
        class: `people-edge ${kind}${active ? "" : " dim"}${selected === p.personId ? " selected" : ""}`,
      }))
        line.setAttribute(key, value);
      svg.append(line);
      const node = button("", () => {
        selected = p.personId;
        draw();
      });
      // The face's ring takes its kind's color; names sit on the far side
      // of the face from you, so no line runs through them.
      node.className = `people-node ${kind}${y < 50 ? " above" : ""}${active ? "" : " dim"}${selected === p.personId ? " selected" : ""}`;
      node.setAttribute("aria-pressed", String(selected === p.personId));
      node.setAttribute("aria-label", p.name);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.append(
        portrait(p),
        el("b", { textContent: p.name }),
        el("span", { textContent: p.relation ?? "" }),
      );
      canvas.append(node);
    });
    const person = people.find((p) => p.personId === selected);
    detail.replaceChildren();
    if (person) {
      detail.append(
        el("span", {
          textContent: [person.name, person.relation]
            .filter(Boolean)
            .join(" · "),
        }),
        button(labels.card, () => onCard(person)),
      );
      if (inRoom.has(person.personId))
        detail.append(button(labels.talk, () => onTalk(person)));
    }
    chooseTab(filters, "group", group);
  };
  for (const key of ["all", "family", "friends", "work", "politics"]) {
    filters.append(
      makeTab({
        key,
        attr: "group",
        label: labels[key],
        onSelect: () => {
          group = key;
          draw();
        },
      }),
    );
  }
  const mode = button(labels.list, () => {
    listMode = !listMode;
    mode.textContent = listMode ? labels.web : labels.list;
    draw();
  });
  search.addEventListener("input", () => {
    draw();
  });
  const key = el(
    "div",
    { className: "people-key" },
    ...["family", "household", "friends", "work", "politics", "other"].map(
      (k) => el("span", { className: k, textContent: labels[k] }),
    ),
  );
  draw();
  return [
    el("div", { className: "people-toolbar" }, search, mode),
    filters,
    canvas,
    detail,
    key,
  ];
}
