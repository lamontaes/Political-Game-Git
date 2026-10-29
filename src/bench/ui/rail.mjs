import { makeButton } from "./button.mjs";

// The rail's icons are Kit 13 line art on a 24-unit grid; the names are the screens' own
// titles, shown on hover and read by a screen reader.
const ICONS = {
  who: [
    '<circle cx="12" cy="8" r="3.6" />',
    '<path d="M4.5 20c.6-4.2 3.5-6.6 7.5-6.6s6.9 2.4 7.5 6.6z" />',
  ],
  journal: ['<path d="M4 5h16v11H9l-5 4z" />'],
  calendar: [
    '<rect x="3.5" y="5" width="17" height="15" rx="1.2" />',
    '<path d="M3.5 9.5h17M8 3v4M16 3v4M7.5 13h.01M12 13h.01M16.5 13h.01M7.5 16.5h.01M12 16.5h.01M16.5 16.5h.01" />',
  ],
  money: [
    '<ellipse cx="12" cy="6.5" rx="6" ry="2.6" />',
    '<path d="M6 6.5v3.6c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V6.5M6 10.1v3.6c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-3.6M6 13.7v3.6c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-3.6" />',
  ],
  politics: [
    '<path d="M12 4.2v14.8M8 19h8M4.6 6.8h14.8" />',
    '<path d="M4.6 6.8l-2.3 5.1h4.6zM19.4 6.8l-2.3 5.1h4.6z" />',
  ],
  news: [
    '<path d="M5 5h12v14H6.5A1.5 1.5 0 0 1 5 17.5zM17 9h2.5v8.5a1.5 1.5 0 0 1-3 0M8 9h6M8 12h6M8 15h6" />',
  ],
  people: [
    '<circle cx="12" cy="7.5" r="3.2" />',
    '<circle cx="5.8" cy="9.5" r="2.3" />',
    '<circle cx="18.2" cy="9.5" r="2.3" />',
    '<path d="M6.5 19c.5-3.6 2.6-5.4 5.5-5.4s5 1.8 5.5 5.4zM1.8 17c.3-2.4 1.7-3.8 4-4M22.2 17c-.3-2.4-1.7-3.8-4-4" />',
  ],
  travel: [
    '<path d="M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2zM8.5 4.5v13M15.5 6.5v13" />',
  ],
  // The Guide: an open book, its own entry on the rail (owner, Oct 28, point 23).
  guide: [
    '<path d="M12 7c-1.7-1.5-4-2.2-7-2.2v13c3 0 5.3.7 7 2.2 1.7-1.5 4-2.2 7-2.2v-13c-3 0-5.3.7-7 2.2zM12 7v13" />',
  ],
};

/**
 * The one rail part: a straight column of round icons, one per screen, in this order,
 * each opening its screen through `data-tab` the way a Menu entry does (MOCKS:24).
 * `titles` names each key.
 */
export function mountRail(host, keys, titles) {
  host.replaceChildren(
    ...keys.map((key) => {
      const ring = makeButton({ className: "ring" });
      ring.dataset.tab = key;
      ring.title = titles[key];
      ring.setAttribute("aria-label", titles[key]);
      ring.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[key].join("")}</svg>`;
      return ring;
    }),
  );
}
