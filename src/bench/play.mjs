/* global document, fetch, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, Image, window, localStorage, requestAnimationFrame, MutationObserver, ResizeObserver, getComputedStyle, __RELEASE_VERSION__ */
// The game screen on the new core: one scene, the player card, the menus.
// Words on screen are record data, engine text and control names only.
import { el } from "./ui/dom.mjs";
import { makeButton, mountPagers } from "./ui/button.mjs";
import { fillChoiceMenu } from "./ui/menu.mjs";
import {
  talkLine,
  talkReply,
  fillTalk,
  talkControls,
  addTalkLine,
  mountTalkKeys,
  mountSpeakers,
  sayInBox,
} from "./ui/talk-box.mjs";
import { showToast, hideToast } from "./ui/toast.mjs";
import { mountRail } from "./ui/rail.mjs";
import { makeTab, chooseTab } from "./ui/tab.mjs";
import { makeCard } from "./ui/card.mjs";
import { townRow } from "./ui/town-row.mjs";
import { debateCard, speechCard } from "./ui/campaign-acts.mjs";
import { listRow, personRow } from "./ui/list-row.mjs";
import { show, mountCloseButtons, mountPanelHeads } from "./ui/panel.mjs";
mountPanelHeads();
mountCloseButtons();
mountSpeakers();
mountPagers();
const $ = (id) => document.getElementById(id);
let me;
let packet;
let talk;
let openTab;
let busy = false;

async function api(path, method = "GET") {
  const response = await fetch(path, { method });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}
/** `v` and the release number: the bundler's define when built, else the server's. */
async function displayVersion() {
  const number =
    typeof __RELEASE_VERSION__ === "string"
      ? __RELEASE_VERSION__
      : (await api("/api/version")).version;
  return `v${number}`;
}
const post = (path) => api(path, "POST");
/**
 * Nothing inside a menu scrolls: what does not fit in `box` is split into pages, and the
 * pager's Back and Continue turn them. Columns flow sideways; a plain list pages at a row.
 *
 * A pager keeps its page when only the measure changes (paging itself resizes the box,
 * which must not throw the player back to the first page); new content starts at page 0.
 */
const pagerPage = new WeakMap();
function pageIn(box, pager, keepPage = false) {
  box.scrollTo(0, 0);
  const [back, next] = pager.querySelectorAll("button");
  // Measure with every row showing; a page then hides the rows that are not its own.
  for (const hidden of box.querySelectorAll(".paged-out"))
    hidden.classList.remove("paged-out");
  // A block taller than the box (a grid of cards, a long screen) would be one page of its own
  // and hide behind a Continue; its children are the rows instead, so page 0 shows the first of them.
  const rowsIn = (parent) =>
    [...parent.children].flatMap((kid) =>
      kid.classList.contains("flow") ||
      (kid.offsetHeight > box.clientHeight && kid.children.length > 1)
        ? rowsIn(kid)
        : [kid],
    );
  const rows = rowsIn(box);
  const tops = rows.map((row) => row.offsetTop);
  const stops = [0];
  let sideways = false;
  if (box.clientHeight > 0) {
    if (box.scrollWidth > box.clientWidth + 2) {
      sideways = true;
      const step =
        box.clientWidth + (parseFloat(getComputedStyle(box).columnGap) || 0);
      for (let x = step; x < box.scrollWidth - 2; x += step) stops.push(x);
    } else if (box.scrollHeight > box.clientHeight + 2) {
      let top = 0;
      rows.forEach((kid, index) => {
        // A row taller than the box starts no page of its own at the top: a second stop at
        // 0 would make page 0 empty and hide every row.
        if (
          tops[index] > top &&
          tops[index] + kid.offsetHeight - top > box.clientHeight
        ) {
          top = tops[index];
          stops.push(top);
        }
      });
    }
  }
  let at = keepPage ? (pagerPage.get(pager) ?? 0) : 0;
  const go = (index) => {
    at = index;
    pagerPage.set(pager, at);
    if (sideways) box.scrollTo(stops[at], 0);
    else {
      // A plain list shows one page of rows: the rest are out of the box, not scrolled past.
      const from = stops[at];
      const to = stops[at + 1] ?? Infinity;
      rows.forEach((row, index) =>
        row.classList.toggle(
          "paged-out",
          stops.length > 1 && (tops[index] < from || tops[index] >= to),
        ),
      );
      box.scrollTo(0, 0);
    }
    back.hidden = at === 0;
    next.hidden = at === stops.length - 1;
  };
  back.onclick = () => go(at - 1);
  next.onclick = () => go(at + 1);
  pager.hidden = stops.length === 1;
  go(Math.min(at, stops.length - 1));
}
/** Pages again whenever the box's contents change (a search narrowing a list, a redrawn ballot). */
function pageWhenChanged(box, pager) {
  new MutationObserver(() =>
    requestAnimationFrame(() => pageIn(box, pager)),
  ).observe(box, { childList: true, subtree: true });
  new ResizeObserver(() =>
    requestAnimationFrame(() => pageIn(box, pager, true)),
  ).observe(box);
}
const dollars = (minor) =>
  (minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
const compactWords = new Intl.NumberFormat("en-US", {
  notation: "compact",
  compactDisplay: "long",
  maximumFractionDigits: 1,
});
/**
 * A government's sum in a readable unit: "$5.2 trillion", or whole dollars
 * to three figures below a million ("$48,300", "$12").
 */
const roundedDollars = (minor) => {
  const whole = Math.round(Math.abs(minor / 100));
  const sign = minor < 0 && whole > 0 ? "−" : "";
  return whole >= 1e6
    ? `${sign}$${compactWords.format(whole)}`
    : `${sign}$${Math.round(Number(whole.toPrecision(3))).toLocaleString("en-US")}`;
};
/** The player card's date, and the time under it: the only place either appears. */
function setClock(at) {
  const day = new Date(`${at.date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(
    2000,
    0,
    1,
    Math.floor(at.minuteOfDay / 60),
    at.minuteOfDay % 60,
  ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  $("card-clock").replaceChildren(day, el("br"), time);
}
/** A figure cropped to head and shoulders (Kit 12's bust). */
function setBust(id, url) {
  $(id).style.backgroundImage = url ? `url("${url}")` : "";
}
// A record id as the bench stores it (person_<hex>, official:term:seat:...).
const RECORD_ID =
  /\b(?:[a-z][a-z-]*_[0-9a-f]{8,}|[a-z][a-z-]*(?::[A-Za-z0-9._@-]+){2,})\b/g;
/**
 * A value as a reader sees it: each record id replaced by the name the screen
 * knows for it. Null when the text names an id the screen has no name for, or
 * carries a missing value ("undefined", "NaN"), so nothing half-printed shows.
 */
function plain(value) {
  const text = String(value ?? "");
  if (/\b(?:undefined|NaN|null)\b/.test(text)) return null;
  let unnamed = false;
  const named = text.replace(RECORD_ID, (id) => {
    const name = me?.names?.[id];
    if (!name) unnamed = true;
    return name ?? id;
  });
  return unnamed ? null : named;
}
/** One labeled line; a value that can't be put in a reader's words hides the line. */
function row(label, value) {
  const text = plain(value);
  const line = listRow(
    "",
    {},
    termLabel(label),
    el("span", { className: "record-value", textContent: text ?? "" }),
  );
  if (text === null) line.hidden = true;
  return line;
}
/** Layout only: labels and content are supplied by the screen's record adapter. */
function recordSection(title, ...content) {
  return el(
    "section",
    { className: "record-section" },
    el("h3", { className: "label", textContent: title }),
    ...content,
  );
}
/** Optional artwork slots. No sample person, room, or fallback artwork. */
function screenArtwork({
  portraitUrl,
  backgroundUrl,
  name,
  into = $("sheet-media"),
}) {
  const media = into;
  media.replaceChildren();
  for (const [src, className, alt] of [
    [backgroundUrl, "screen-backdrop", ""],
    [portraitUrl, "screen-portrait", name],
  ]) {
    if (!src) continue;
    const img = el("img", { src, className, alt });
    img.addEventListener("error", () => img.remove(), { once: true });
    media.append(img);
  }
}

/**
 * The talk box keeps clear of the player card: when the centered box would
 * reach over the dock (a long status line widens the card), it stands above
 * the dock instead, so no reply sits under the card.
 */
function clearDock() {
  const game = $("game").getBoundingClientRect();
  const dock = $("dock").getBoundingClientRect();
  const width = Math.max(
    ...[...document.querySelectorAll("#game .chat")].map(
      (box) => box.offsetWidth,
    ),
  );
  const left = game.left + (game.width - width) / 2;
  $("game").style.setProperty(
    "--chat-bottom",
    left < dock.right + 8 ? `${Math.ceil(game.bottom - dock.top + 8)}px` : "",
  );
}
// A box shown or resized, or the card widened, sets it again.
const docking = new ResizeObserver(clearDock);
docking.observe($("dock"));
for (const box of document.querySelectorAll("#game .chat"))
  docking.observe(box);
window.addEventListener("resize", clearDock);

/** Soft contact shadows on the floor at each person's feet, under everyone. */
function shadowsOf(people) {
  return people
    .filter((person) => person.figure.shadow)
    .map(({ figure: { shadow: s } }) => {
      const node = el("div", { className: "shadow" });
      Object.assign(node.style, {
        left: `${s.leftPercent}%`,
        top: `${s.topPercent}%`,
        width: `${s.widthPercent}%`,
        height: `${s.heightPercent}%`,
      });
      return node;
    });
}

/**
 * What the painting has in front of a person (a desk, a chair back), laid
 * back over them: the picture's own pixels through the spot's mask, lined up
 * with the picture, so it is right in every light and weather.
 */
function occluderOf(o) {
  const node = el("div", { className: "occluder" });
  const along = (start, size) =>
    size >= 100 ? 0 : (start / (100 - size)) * 100;
  Object.assign(node.style, {
    left: `${o.leftPercent}%`,
    top: `${o.topPercent}%`,
    width: `${o.widthPercent}%`,
    height: `${o.heightPercent}%`,
    backgroundImage: `url("${$("backdrop").src}")`,
    backgroundSize: `${10000 / o.widthPercent}% ${10000 / o.heightPercent}%`,
    backgroundPosition: `${along(o.leftPercent, o.widthPercent)}% ${along(o.topPercent, o.heightPercent)}%`,
    maskImage: `url("${o.url}")`,
    webkitMaskImage: `url("${o.url}")`,
  });
  return node;
}

/** The people in a picture; anyone but you can be clicked for their dossier. */
function drawPeople(people, onClick) {
  $("people").replaceChildren(
    ...shadowsOf(people),
    ...people.flatMap((person) => {
      const f = person.figure;
      const img = el("img", { src: person.figureUrl, alt: person.name });
      // A whole figure turns to face the room.
      if (f.mirrored) img.style.transform = "scaleX(-1)";
      const box = el("div", { className: "figure" }, img);
      box.dataset.person = person.personId ?? "";
      Object.assign(box.style, {
        left: `${f.leftPercent}%`,
        top: `${f.topPercent}%`,
        width: `${f.widthPercent}%`,
        height: `${f.heightPercent}%`,
      });
      if (onClick && person.personId !== me?.id) {
        box.classList.add("talkable");
        box.tabIndex = 0;
        box.setAttribute("role", "button");
        box.setAttribute("aria-label", person.name);
        box.addEventListener("click", () => onClick(person));
        box.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onClick(person);
        });
      }
      return f.occluder ? [box, occluderOf(f.occluder)] : [box];
    }),
  );
}

// ---- The opening (owner, Oct 14, 2026) ----
// The President's address, full screen, sentence by sentence in the speech
// box, the picture cutting when what the sentence is about changes; then
// home that evening, where the night's news can be picked up, and the first
// controls pointed out. Every word is the director's opening story.
let skipOpening;
// The opening, fetched and its pictures loaded during loading.
let openingReady;
/** How long a spoken line stays up: a beat plus reading time. */
const lineMs = (text) => 1800 + text.length * 45;
/** How long the camera stays on each person it points out. */
const POINT_MS = 2400;
/** Wait, cut short by a click; resolves true when Skip ends the address. */
function holdOpening(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    skipOpening = () => {
      clearTimeout(timer);
      resolve(true);
    };
    $("opening-box").onclick = () => {
      clearTimeout(timer);
      resolve(false);
    };
  });
}
/** The camera passes the people on a stage, pointing each out by name and office. */
function pointOut(figures) {
  let timer;
  const step = (index) => {
    for (const node of document.querySelectorAll("#people .figure.pointed"))
      node.classList.remove("pointed");
    const figure = figures[index];
    show("opening-point", Boolean(figure));
    if (!figure) return;
    $("opening-point-name").textContent = figure.name;
    $("opening-point-role").textContent = [
      figure.relation,
      figure.post,
      figure.office,
      figure.state,
    ]
      .filter(Boolean)
      .join(" · ");
    const box = $("opening-point");
    box.style.animation = "none";
    void box.offsetWidth;
    box.style.animation = "";
    // Only the one person pointed out is lit.
    [...document.querySelectorAll("#people .figure")]
      .find((node) => node.dataset.person === figure.id)
      ?.classList.add("pointed");
    timer = setTimeout(() => step(index + 1), POINT_MS);
  };
  step(0);
  const endsAt = Date.now() + figures.length * POINT_MS;
  return {
    left: () => Math.max(0, endsAt - Date.now()),
    stop: () => {
      clearTimeout(timer);
      step(figures.length);
    },
  };
}
async function playOpening() {
  const opening =
    openingReady ?? (await api(`/api/opening?id=${encodeURIComponent(me.id)}`));
  openingReady = undefined;
  if (!opening?.frames?.length) return opening;
  const { speaker } = opening;
  // Who is speaking: the President, from the first frame.
  $("opening-bust").style.backgroundImage = speaker.figureUrl
    ? `url("${speaker.figureUrl}")`
    : "";
  $("opening-name").textContent = speaker.name;
  $("opening-role").textContent = [speaker.title, ...speaker.detail]
    .filter(Boolean)
    .join(" · ");
  show("opening-box", true);
  $("game").classList.add("letterbox", "cinema");
  frames: for (const frame of opening.frames) {
    $("backdrop").src = frame.backdrop.url;
    drawPeople(frame.people);
    $("stage").classList.remove("cut");
    void $("stage").offsetWidth;
    $("stage").classList.add("cut");
    // Who the camera points out: a household as the frame opens, anyone the
    // address names on the line that names them.
    const figures = frame.pointOut ?? [];
    let camera = pointOut(figures.filter((row) => row.line === undefined));
    // A stage the President says nothing over shows without the speech box.
    show("opening-box", frame.lines.length > 0);
    // A click moves on to the next sentence; Skip ends the address. The
    // picture holds until the camera has passed everyone on it.
    for (const [at, line] of frame.lines.entries()) {
      sayInBox("opening-speech", line.text);
      const named = figures.filter((row) => row.line === at);
      if (named.length) {
        camera.stop();
        camera = pointOut(named);
      }
      const hold = Math.max(lineMs(line.text), camera.left());
      if (await holdOpening(hold)) {
        camera.stop();
        break frames;
      }
    }
    const left = camera.left();
    const skipped = left > 0 && (await holdOpening(left));
    camera.stop();
    if (skipped) break;
  }
  skipOpening = undefined;
  $("opening-box").onclick = null;
  show("opening-box", false);
  $("game").classList.remove("letterbox", "cinema");
  return opening;
}

/**
 * That night's news at home, as a toast top right: it fades by itself after
 * controls.opening.newsToastSeconds, goes at once on its close, and the story
 * stays in News either way.
 */
/** A story's headline as every news surface says it: its headline, else its lede, else the newscast's first line. */
const storyHeadline = (story) =>
  story.headline ?? story.lede ?? story.broadcast?.[0]?.text ?? "";
function hideNewsToast() {
  hideToast($("news-surface"));
}
function showNewsSurface(news) {
  const story = news?.stories?.[0];
  if (!story) return;
  $("news-surface-label").textContent = controls.opening?.news ?? "";
  $("news-surface-headline").textContent = storyHeadline(story);
  $("news-surface-close").setAttribute(
    "aria-label",
    controls.opening?.closeNews ?? "",
  );
  $("news-surface-open").onclick = () => {
    coachUsed("news-surface");
    hideNewsToast();
    openNewsReader(news);
  };
  $("news-surface-close").onclick = () => {
    coachUsed("news-surface");
    hideNewsToast();
  };
  showToast($("news-surface"), controls.opening?.newsToastSeconds ?? 8, () =>
    coachUsed("news-surface"),
  );
}
function openNewsReader(news) {
  const [lead, ...rest] = news.stories;
  // The story opens as the paper's front page: its masthead and layout.
  const outlet = news.outlet ?? {
    name: controls.news.title,
    layout: "broadsheet",
  };
  $("news-reader-masthead").textContent = outlet.name ?? controls.news.title;
  $("news-reader-date").textContent = new Date(
    `${me.date}T12:00:00`,
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  $("news-reader").className = `panel paper paper-${
    ["broadsheet", "modern", "tabloid", "weekly"].includes(outlet.layout)
      ? outlet.layout
      : "broadsheet"
  }`;
  $("news-reader-headline").textContent = storyHeadline(lead);
  $("news-reader-body").replaceChildren(
    // A story the paper prints (lede, figures, one quote) reads as printed;
    // otherwise the broadcast, then the address as the record quotes it.
    ...(lead.paragraphs
      ? lead.paragraphs.map((text) =>
          el("p", { className: "prose", textContent: text }),
        )
      : [
          ...lead.broadcast.map((line) =>
            el("p", { className: "prose", textContent: line.text }),
          ),
          ...news.address.map((text) =>
            el("p", { className: "speech quote", textContent: text }),
          ),
        ]),
  );
  $("news-reader-more").replaceChildren(
    ...rest.map((item) =>
      el("p", {
        className: "prose",
        textContent: storyHeadline(item),
      }),
    ),
  );
  show("news-reader", true);
}
pageWhenChanged($("news-reader-body"), $("news-reader-pager"));
$("news-reader-close").addEventListener("click", () =>
  show("news-reader", false),
);

/**
 * The first choices, pointed out one at a time: the news, the people you
 * know, then living the day. Each glows until it is used; nothing to read.
 */
const COACH_ORDER = ["news-surface", "people-tab", "day"];
const coachDone = new Set();
const coachNode = (id) =>
  id === "people-tab"
    ? document.querySelector('#rings [data-tab="people"]')
    : $(id);
/** Glows the first choice not yet used; each clears however it is used. */
function coachRender() {
  for (const id of COACH_ORDER) coachNode(id)?.classList.remove("coach");
  const next = COACH_ORDER.find((id) => {
    const node = coachNode(id);
    return !coachDone.has(id) && node && !node.hidden;
  });
  if (next) coachNode(next).classList.add("coach");
}
function coachUsed(...ids) {
  for (const id of ids) coachDone.add(id);
  coachRender();
}
function coachFirstChoices() {
  coachDone.clear();
  coachRender();
}
// Escape opens only options and quit (M6 work order), the opening included.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("person").hidden) {
    closePerson();
    return;
  }
  if (openTab === "options") closeSheet();
  else if ($("front").hidden) openSheet("options");
});

async function renderScene() {
  const scene = await api(`/api/scene?id=${encodeURIComponent(me.id)}`);
  $("backdrop").src = scene.backdrop.url;
  // A person in the room is talked to by clicking them; their name in the talk
  // box opens their card (owner, Oct 27: the card has no Talk button).
  drawPeople(scene.people, (p) => talkTo(p.personId));
  me.scene = scene;
  // The look chosen in the creator is the player's own portrait.
  setBust(
    "card-bust",
    me.portrait
      ? `/api/portrait?id=${encodeURIComponent(me.id)}`
      : scene.people.find((p) => p.personId === me.id)?.figureUrl,
  );
}

async function renderCard() {
  const card = await api(`/api/card?id=${encodeURIComponent(me.id)}`);
  me.card = card;
  me.names = { ...me.names, [me.id]: card.name };
  $("card-name").textContent = card.name;
  $("card-place").textContent = me.placeName;
  setClock(packet?.at ?? { date: me.date, minuteOfDay: me.minuteOfDay ?? 0 });
}

// The Guide's search, kept so an underlined term opens straight to it.
let guideQuery = "";
// Each civic term and its one-line definition.
let guideTerms = new Map();
api("/api/guide?q=").then((rows) => {
  guideTerms = new Map(rows.map((row) => [row.term.toLowerCase(), row]));
});
// Terms the player marked as learned lose their underline (kept in the Guide).
const LEARNED_KEY = "ocd-learned-terms";
const learned = new Set(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(LEARNED_KEY) ?? "[]");
    } catch {
      return [];
    }
  })(),
);
let tipTerm;
function showTip(node, key) {
  const term = guideTerms.get(key);
  tipTerm = { node, key };
  $("tip-term").textContent = term.term;
  $("tip-short").textContent = term.short;
  show("tip", true);
  const box = node.getBoundingClientRect();
  const tip = $("tip");
  tip.style.left = `${Math.min(box.left, window.innerWidth - tip.offsetWidth - 16)}px`;
  tip.style.top =
    box.bottom + tip.offsetHeight + 12 < window.innerHeight
      ? `${box.bottom + 6}px`
      : `${box.top - tip.offsetHeight - 6}px`;
}
function hideTipSoon() {
  setTimeout(() => {
    if (!$("tip").matches(":hover") && !tipTerm?.node.matches(":hover"))
      show("tip", false);
  }, 250);
}
$("tip").addEventListener("mouseleave", hideTipSoon);
$("tip-learned").addEventListener("click", () => {
  if (!tipTerm) return;
  learned.add(tipTerm.key);
  try {
    localStorage.setItem(LEARNED_KEY, JSON.stringify([...learned]));
  } catch {
    // Without storage the underline returns next session.
  }
  for (const node of document.querySelectorAll(".term"))
    if (node.textContent.trim().toLowerCase() === tipTerm.key)
      node.classList.remove("term");
  show("tip", false);
});
/**
 * A label shown on screen, underlined when the whole label is a Guide term
 * (never a search through prose): hover shows its definition, and clicking
 * it opens the Guide there.
 */
function termLabel(text) {
  const key = String(text).trim().toLowerCase();
  if (!guideTerms.has(key)) return el("b", { textContent: text });
  const b = el("b", {
    className: learned.has(key) ? "" : "term",
    textContent: text,
  });
  b.addEventListener("mouseenter", () => {
    if (b.classList.contains("term")) showTip(b, key);
  });
  b.addEventListener("mouseleave", hideTipSoon);
  b.addEventListener("click", () => {
    show("tip", false);
    guideQuery = text;
    openSheet("guide");
  });
  return b;
}

let controls = {};
/** A slug or camelCase key as words: "snap-maximum" and "snapMaximum" read "Snap maximum". */
const words = (key) => {
  const text = String(key ?? "")
    .split(":")
    .pop()
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};
/** A title that is a bare slug reads as words; a name or a sentence stays as it is. */
const slugWords = (text) =>
  /^[a-z][a-z0-9-]*$/.test(text) ? words(text) : text;
// Money amounts are kept in cents; "minor/hour" reads as dollars an hour.
// A percent reads with its sign, any other unit in words.
const amount = (value, unit) => {
  if (unit?.startsWith("minor"))
    return `${dollars(Number(value))}${unit.includes("/") ? `/${unit.split("/")[1]}` : ""}`;
  if (unit?.startsWith("percent"))
    return `${value}%${unit.length > 7 ? ` ${unit.slice(8).replace(/-/g, " ")}` : ""}`;
  if (unit?.startsWith("USD/")) return `$${value}/${unit.slice(4)}`;
  return `${value ?? ""}${unit ? ` ${unit.replace(/-/g, " ")}` : ""}`;
};
/**
 * Who sets a level's rate: the level and the government its seats name
 * ("State · Texas"). A stand-in row from another series (a state's average
 * local sales tax where the town records none) says what it is instead.
 */
const lawLevelLabel = (law, level) =>
  [
    controls.levels?.[level.level] ?? words(level.level),
    level.row.series !== law.series
      ? `${words(level.row.series)}${level.row.estimate ? ` · ${words("estimate")}` : ""}`
      : level.government,
  ]
    .filter(Boolean)
    .join(" · ");
/** A law's later phase as a level row, with the government its level names. */
const pendingLevel = (law, row) => ({
  level: row.level,
  row,
  government: law.levels.find((l) => l.level === row.level)?.government,
});
/** A policy question by its name on the bill catalog, else its key's last part in words. */
const policyLabel = (question) =>
  controls.policyNames?.[question] ?? words(question);
const controlsReady = api("/api/controls").then((value) => {
  controls = value;
  // A dimmed title entry's reason is a control name from data, never typed here.
  for (const el of document.querySelectorAll("[data-label]"))
    el.textContent =
      el.dataset.label
        .split(".")
        .reduce((node, key) => node?.[key], controls) ?? "";
  $("week").textContent = controls.time?.week ?? "";
  return value;
});

function renderPacket(value) {
  packet = value ?? packet;
  const open = packet?.kind === "stop";
  $("day").disabled = $("week").disabled = busy || open;
  show("continue", packet?.kind === "stop");
  if (packet) setClock(packet.at);
  $("card-why").textContent = endedBy(packet);
}

/** What stopped the clock, from the stop's own records. */
function endedBy(value) {
  const words = controls.endedBy ?? {};
  if (value?.kind !== "stop") return "";
  const module = value.stop.modules[0];
  return module ? (words[module.reasonKey] ?? words.moment ?? "") : "";
}

/** The newest line of the journal, bottom right. */
let shownJournalLine = "";
$("journal-note-close").addEventListener("click", () =>
  hideToast($("journal-note")),
);
async function renderJournalNote() {
  const chapters = await api(
    `/api/journal?id=${encodeURIComponent(me.id)}`,
  ).catch(() => []);
  const line = chapters.at(-1)?.lines.at(-1)?.text ?? "";
  $("journal-line").textContent = line;
  // A new line is a toast: it holds, fades and goes, or goes at once on its close.
  if (!line) hideToast($("journal-note"));
  else if (line !== shownJournalLine)
    showToast($("journal-note"), controls.opening?.newsToastSeconds ?? 8);
  shownJournalLine = line;
}
async function refresh() {
  await Promise.all([
    renderScene(),
    renderCard(),
    renderJournalNote(),
    markNews(false),
  ]);
  // When your character dies, carry on as someone connected to them.
  if (me.card && me.card.alive === false) {
    await openSheet("handoff");
    return;
  }
  // Election night: the returns for the player's race, once.
  const night = await api(
    `/api/election-night?id=${encodeURIComponent(me.id)}`,
  );
  if (night) {
    await electionNight(night);
    return;
  }
  // No card notice that "a law took effect" (owner, Oct 27: "Why am I getting a
  // notification that a law took effect?"): a law that reaches the player is
  // told by its own scene and story, which say how.
  if (openTab) await openSheet(openTab);
}

async function act(path) {
  if (busy) return;
  busy = true;
  renderPacket();
  try {
    // Election morning still open (the page reloaded on it): the day first.
    const polls = await api("/api/polling-place");
    if (polls) await electionMorning(polls);
    else {
      const day = await api("/api/election-day");
      if (day?.away) await electionMorning(null);
    }
    const result = await post(path);
    me.names = { ...me.names, ...result.names };
    busy = false;
    renderPacket(result.packet);
    if (result.pollingPlace || result.candidateMorning) {
      // Election morning: canvass if you're running, then vote or stay home
      // (or, with no ballot here, go on with the day).
      await electionMorning(result.pollingPlace);
      busy = false;
      return act(path);
    }
    await refresh();
    // A meeting or the desk holds the clock: the scene, then the day goes on.
    const office = officeStop(result.packet);
    if (office) {
      if (office.reasonKey === "office-day.meeting") await inMeeting();
      else if (office.reasonKey === "office-day.desk") await atDesk();
      busy = false;
      return act(
        `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: result.packet.pauseId })}`,
      );
    }
    const moment = storyStop(result.packet);
    if (moment) await showStory(moment.recordId);
  } catch (error) {
    $("card-place").textContent = error.message;
  } finally {
    busy = false;
    renderPacket();
  }
}

// ---- The officeholder's day (OFFICE-LOCAL): the meeting and the desk ----
/** A stop the office-day engine holds: a meeting at its hour, or the desk in the morning. */
function officeStop(value) {
  return value?.kind === "stop"
    ? value.stop.modules.find((row) => row.moduleId === "core2-office-day-v1")
    : undefined;
}
const voteWords = () => controls.meeting ?? {};
/** One agenda item or desk bill: number, sponsor, terms, who spoke and how each member voted. */
function billBlock(item, buttons, onPaper) {
  const words = voteWords();
  const paperButton = () => {
    const open = makeButton({
      className: "action",
      textContent: controls.bill?.open ?? "",
    });
    open.addEventListener("click", () => onPaper(item.billId));
    return open;
  };
  return el(
    "div",
    { className: "race" },
    el("h3", {
      className: "heading",
      textContent: [item.title, item.number, item.sponsor]
        .filter(Boolean)
        .join(" · "),
    }),
    el("div", {
      textContent: item.provisions
        .map(
          (p) =>
            `${p.series ?? (p.question && policyLabel(p.question)) ?? p.line} ${p.value}`,
        )
        .join("; "),
    }),
    item.remarks.length
      ? el("div", {
          textContent: item.remarks
            .map(
              (r) =>
                `${r.name} · ${r.position > 0 ? (words.for ?? "") : (words.against ?? "")}`,
            )
            .join(" · "),
        })
      : "",
    item.votes.length
      ? el("div", {
          textContent: item.votes
            .map((v) => `${v.name} ${words[v.vote] ?? v.vote}`)
            .join(" · "),
        })
      : "",
    onPaper || buttons.length
      ? el(
          "div",
          { className: "acts" },
          ...(onPaper ? [paperButton()] : []),
          ...buttons,
        )
      : "",
  );
}
function inMeeting() {
  return new Promise((resolve) => {
    const words = voteWords();
    const draw = (scene) => {
      if (!scene) return finish();
      $("backdrop").src = scene.backdrop.url;
      drawPeople(scene.people);
      $("card-place").textContent = scene.title;
      $("meeting-items").replaceChildren(
        ...scene.items.map((item) =>
          billBlock(
            item,
            item.takenUp
              ? []
              : [
                  ...["for", "against"].map((position) => {
                    const b = makeButton({
                      className: "action",
                      textContent:
                        words[
                          position === "for" ? "speakFor" : "speakAgainst"
                        ] ?? position,
                    });
                    b.addEventListener("click", async () =>
                      draw(
                        await post(
                          `/api/meeting/speak?${new URLSearchParams({ meetingId: scene.id, billId: item.billId, position })}`,
                        ),
                      ),
                    );
                    return b;
                  }),
                  ...["yes", "no", "abstain", "own"].map((vote) => {
                    const b = makeButton({
                      className: "action",
                      textContent: words[vote] ?? vote,
                    });
                    b.addEventListener("click", async () =>
                      draw(
                        await post(
                          `/api/meeting/item?${new URLSearchParams({ meetingId: scene.id, billId: item.billId, vote })}`,
                        ),
                      ),
                    );
                    return b;
                  }),
                ],
            (billId) =>
              openBillPaper(
                billId,
                (...nodes) => $("meeting-items").replaceChildren(...nodes),
                () => api("/api/meeting").then(draw),
                controls.bill?.backMeeting,
              ),
          ),
        ),
      );
      $("meeting-adjourn").onclick = async () => {
        await post(
          `/api/meeting/adjourn?${new URLSearchParams({ meetingId: scene.id })}`,
        );
        finish();
      };
    };
    const finish = () => {
      show("meeting", false);
      $("game").classList.remove("cinema");
      resolve();
    };
    $("meeting-adjourn").textContent = words.adjourn ?? "";
    $("game").classList.add("cinema");
    show("meeting", true);
    api("/api/meeting").then(draw);
  });
}
function atDesk() {
  return new Promise((resolve) => {
    const words = controls.desk ?? {};
    const draw = (bills) => {
      if (!bills.length) return finish();
      $("desk-items").replaceChildren(
        ...bills.map((item) =>
          billBlock(
            item,
            ["sign", "veto", "own"].map((how) => {
              const b = makeButton({
                className: "action",
                textContent: words[how] ?? how,
              });
              b.addEventListener("click", async () =>
                draw(
                  await post(
                    `/api/desk?${new URLSearchParams({ billId: item.billId, how })}`,
                  ),
                ),
              );
              return b;
            }),
            (billId) =>
              openBillPaper(
                billId,
                (...nodes) => $("desk-items").replaceChildren(...nodes),
                () => api("/api/desk").then(draw),
                controls.bill?.backDesk,
              ),
          ),
        ),
      );
    };
    const finish = () => {
      show("desk", false);
      resolve();
    };
    show("desk", true);
    api("/api/desk").then(draw);
  });
}

// ---- Election morning (owner, Oct 26, 2026: going to vote is a choice) ----
// The narrator's morning from the election-day bank, a canvass for a
// candidate before the polls close, then Go vote (the ballot at the polls)
// or Stay home (no ballot cast). Buttons are control names.
function electionMorning(scene) {
  return new Promise((resolve) => {
    const labels = controls.electionDay ?? {};
    const say = (lines) =>
      $("election-day-lines").append(
        ...lines.map((line) =>
          el("p", { className: "prose", textContent: line.text }),
        ),
      );
    const buttons = (...rows) =>
      $("election-day-acts").replaceChildren(
        ...rows.map(([text, fn]) => {
          const node = makeButton({ className: "action", textContent: text });
          node.addEventListener("click", fn);
          return node;
        }),
      );
    const finish = () => {
      show("election-day", false);
      $("game").classList.remove("cinema");
      resolve();
    };
    const ask = (day) => {
      say(day.ask);
      if (day.away)
        return buttons([
          labels.go,
          async () => {
            await post("/api/election-day/done");
            finish();
          },
        ]);
      buttons(
        [
          labels.vote,
          async () => {
            show("election-day", false);
            await atThePolls(scene);
            finish();
          },
        ],
        [
          labels.stayHome,
          async () => {
            const left = await post("/api/polling-place/leave");
            if (left.line) {
              say([left.line]);
              buttons([labels.go, finish]);
            } else finish();
          },
        ],
      );
    };
    api("/api/election-day").then((day) => {
      if (!day)
        return (scene ? atThePolls(scene) : Promise.resolve()).then(resolve);
      if (scene) {
        $("backdrop").src = scene.backdrop.url;
        drawPeople(scene.people);
      }
      $("election-day-lines").replaceChildren();
      say(day.lines);
      if (day.canvass)
        buttons(
          [
            labels.canvass,
            async () => {
              const done = await post("/api/election-day/canvass");
              if (done.scene) {
                $("backdrop").src = done.scene.backdrop.url;
                drawPeople(done.scene.people);
              }
              if (done.line) say([done.line]);
              ask(day);
            },
          ],
          [labels.skipCanvass, () => ask(day)],
        );
      else ask(day);
      $("game").classList.add("cinema");
      show("election-day", true);
    });
  });
}

// ---- Election night (owner, Oct 26, 2026: its own pop-up) ----
// The returns for the player's race as each place reports, smallest first,
// with the running count; Next returns steps through them; the call ends it,
// with the governor races elsewhere that night. Numbers and names are the
// count's record data; the narrator's lines come from the election-day bank.
function electionNight(night) {
  return new Promise((resolve) => {
    const labels = controls.returns ?? {};
    if (night.scene) {
      $("backdrop").src = night.scene.backdrop.url;
      drawPeople(night.scene.people);
    }
    let at = 0;
    const draw = () => {
      const step = night.steps[at];
      const last = at === night.steps.length - 1;
      $("returns-title").textContent = night.title;
      $("returns-lines").replaceChildren(
        ...step.lines.map((line) =>
          el("p", { className: "prose", textContent: line.text }),
        ),
      );
      $("returns-count").replaceChildren(
        ...step.totals.map((entry) =>
          row(
            entry.name,
            `${entry.votes.toLocaleString("en-US")} ${entry.votes === 1 ? labels.vote : labels.votes}`,
          ),
        ),
        ...(last && night.nation.races.length
          ? [
              ...night.nation.lines.map((line) =>
                el("p", { className: "prose", textContent: line.text }),
              ),
              ...night.nation.races.map((race) =>
                row(
                  race.state,
                  `${race.winnerParty} · ${labels.marginBy} ${race.marginPoints} ${labels.points}`,
                ),
              ),
            ]
          : []),
      );
      $("returns-next").textContent = last ? labels.close : labels.next;
    };
    $("returns-next").onclick = async () => {
      if (at < night.steps.length - 1) {
        at += 1;
        draw();
        return;
      }
      await post(
        `/api/election-night/watched?${new URLSearchParams({ id: me.id, contestId: night.contestId })}`,
      );
      show("returns", false);
      $("game").classList.remove("cinema");
      resolve();
    };
    $("game").classList.add("cinema");
    draw();
    show("returns", true);
  });
}

// ---- Election day (owner, Oct 14, 2026: election day is a scene) ----
// The polling place's picture with the voter and the household members who
// may vote, and the ballot: each race as the elections engine lists it, each
// candidate by name and party. A click marks the race; Leave blank and Leave
// are control names. The voting engine counts what is marked.
function atThePolls(scene) {
  return new Promise((resolve) => {
    const draw = (value) => {
      scene = value;
      $("backdrop").src = scene.backdrop.url;
      drawPeople(scene.people);
      $("ballot-races").replaceChildren(
        ...scene.contests.map((contest) => {
          const mark = (candidateId) => async () => {
            const result = await post(
              `/api/polling-place/mark?${new URLSearchParams({
                contestId: contest.id,
                candidateId: candidateId ?? "",
              })}`,
            );
            if (result.pollingPlace) draw(result.pollingPlace);
            else finish();
          };
          const chosen = contest.marked;
          const button = (text, candidateId) => {
            const node = makeButton({
              className: "action",
              textContent: text,
            });
            if (chosen) {
              node.disabled = true;
              if (chosen.candidateId === candidateId)
                node.classList.add("primary");
            } else node.addEventListener("click", mark(candidateId));
            return node;
          };
          return el(
            "div",
            { className: "race" },
            el("h3", { className: "heading", textContent: contest.title }),
            el(
              "div",
              { className: "acts" },
              ...contest.candidates.map((candidate) =>
                button(
                  [candidate.name, candidate.party].filter(Boolean).join(" · "),
                  candidate.personId,
                ),
              ),
              button(controls.polling?.leaveBlank ?? "", null),
            ),
          );
        }),
      );
    };
    const finish = () => {
      show("ballot", false);
      $("game").classList.remove("cinema");
      resolve();
    };
    $("ballot-leave").textContent = controls.polling?.leave ?? "";
    $("ballot-leave").onclick = async () => {
      await post("/api/polling-place/leave");
      finish();
    };
    $("game").classList.add("cinema");
    draw(scene);
    show("ballot", true);
  });
}
// Day and Week run the world forward (owner, Oct 15, 2026); a calendar day
// runs it to that day. A scene the director fires stops any of them there.
for (const mode of ["day", "week"])
  $(mode).addEventListener("click", () => {
    // Living on puts the evening's paper away and ends the first-choice glow.
    hideNewsToast();
    coachUsed(...COACH_ORDER);
    return act(`/api/advance?mode=${mode}`);
  });
// Stories News held when it was last open: a dot on the rail's News icon until it is read.
let seenNews = 0;
async function newsCount() {
  const rows = await api(`/api/news?id=${encodeURIComponent(me.id)}`);
  // Every row News lists (its public records), the same rows its screen draws.
  return rows.length;
}
async function markNews(read) {
  const count = await newsCount();
  if (read) seenNews = count;
  document
    .querySelector('#rings [data-tab="news"]')
    ?.classList.toggle("unread", count > seenNews);
}
$("continue").addEventListener("click", () => {
  show("talk", false);
  return act(
    `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: packet.pauseId })}`,
  );
});

// ---- Conversation (lower third: portraits top left, scales upper right) ----
// The scales toggled on: the whole set of choices turns false, each a different move.
let lying = false;
/** Who you are talking to: their bust, name and what you know of their work. */
let talkPersonId;
async function setWho(personId, name) {
  talkPersonId = personId;
  $("talk-name").textContent = name ?? "";
  const staged = [...(me.scene?.people ?? []), ...(filing?.people ?? [])].find(
    (p) => p.personId === personId,
  );
  setBust("talk-bust", staged?.figureUrl);
  show("talk-who", Boolean(name));
  if (!personId) return;
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: personId })}`,
  ).catch(() => undefined);
  if (!c || $("talk-name").textContent !== (name ?? "")) return;
  if (!staged?.figureUrl) setBust("talk-bust", c.figureUrl);
}
/** The newest lines: yours, dim, then what was said back to you. */
function spokenLines(lines, speakerOf) {
  const lastMine = lines.findLastIndex((line) => line.speakerId === me.id);
  const theirs = lines.slice(lastMine + 1).slice(-3);
  return [
    // What was said before sits apart from the line being said now (owner, Oct 26).
    ...(lastMine >= 0
      ? [
          talkLine({
            kind: "history",
            who: $("card-name").textContent,
            text: lines[lastMine].text,
            lying: lines[lastMine].act === "lie",
          }),
        ]
      : []),
    ...theirs.map((line) => talkLine({ text: speakerOf(line) })),
  ];
}
/** Numbered replies; a key press of the number says it. */
function replies(choices, onPick) {
  return choices.map((choice) =>
    talkReply(
      choice,
      // Filing is a control of its own, never worded like acknowledging a refusal.
      choice.control === "file"
        ? (controls.filing?.file ?? choice.text)
        : choice.text,
      onPick,
    ),
  );
}
mountTalkKeys(() => $("game").classList.contains("sheet-open"));
function setScales({ available, on }) {
  $("talk-lie").disabled = !available;
  $("talk-lie").classList.toggle("on", Boolean(available && on));
}
function renderTalk(value) {
  if (value?.otherId !== talk?.otherId) lying = false;
  talk = value;
  show("talk", Boolean(value));
  gapButton.classList.remove("marked");
  if (!value) return;
  const other = value.lines.find((line) => line.speakerId === value.otherId);
  if (
    other?.speaker !== $("talk-name").textContent ||
    !$("talk-name").textContent
  )
    setWho(value.otherId, other?.speaker ?? me.names?.[value.otherId]);
  // Lying, the false set stands in place of the true choices.
  const lies = value.lies ?? [];
  const choices = (lying && lies.length ? lies : value.choices).slice(0, 6);
  talkControls({ silent: true, leave: true });
  fillTalk({
    lines: spokenLines(value.lines, (line) => line.text),
    replies: replies(choices, (choice) => sayLine(choice.key)),
  });
  // Dim when there is nothing false to say; tipped and red while lying.
  setScales({ available: lies.length > 0, on: lying });
}
async function sayLine(key) {
  lying = false;
  renderTalk(await post(`/api/talk/say?key=${encodeURIComponent(key)}`));
}
async function talkTo(otherId, momentId) {
  // The menu hides the conversation, so a conversation closes it first.
  closeSheet();
  lying = false;
  $("talk-name").textContent = "";
  // From a scene, the talk is about the scene's moment.
  const occasion = momentId ? `&momentId=${encodeURIComponent(momentId)}` : "";
  renderTalk(
    await post(
      `/api/talk/open?otherId=${encodeURIComponent(otherId)}${occasion}`,
    ),
  );
}
// Saying nothing is a smaller control beside the four replies (owner, Oct 14).
// A line that does not read right is marked where it is said; no time passes.
// Mark gap is a developer control: it joins the talk box only while dev
// mode is on, and is never in the player's markup.
const gapButton = makeButton({
  id: "talk-gap",
  className: "action small",
  textContent: "Mark gap",
});
gapButton.addEventListener("click", async () => {
  if (!talk) return;
  await post("/api/gap");
  gapButton.classList.add("marked");
});
$("talk-silent").addEventListener("click", async () => {
  if (!talk) return;
  lying = false;
  renderTalk(await post("/api/talk/silent"));
});
$("talk-lie").addEventListener("click", () => {
  if (!talk?.lies?.length) return;
  lying = !lying;
  renderTalk(talk);
});
// Continue, bottom left, when there is nothing to answer: the beat is over, and
// a stop that held the clock for it goes on.
$("talk-next").addEventListener("click", async () => {
  if (filing) {
    $("talk-leave").click();
    return;
  }
  if (talk) await post("/api/talk/leave");
  renderTalk(undefined);
  show("talk", false);
  if (!$("continue").hidden) $("continue").click();
});
$("talk-leave").addEventListener("click", async () => {
  if (filing) {
    await post("/api/filing/leave");
    filing = undefined;
    show("filing-overlay", false);
    $("game").classList.remove("filing-open");
    delete $("filing-title").dataset.contest;
    show("talk", false);
    await refresh();
    renderPacket();
    return;
  }
  await post("/api/talk/leave");
  renderTalk(undefined);
});

// ---- The filing office (step 3), a visit in the clerk's words ----
let filing;
function renderFiling(value) {
  filing = value;
  if (!value) return;
  $("backdrop").src = value.backdrop.url;
  drawPeople(value.people);
  show("talk", true);
  const clerkName = value.visit.clerkId
    ? value.names[value.visit.clerkId]
    : value.filedWith;
  if ($("talk-name").textContent !== clerkName)
    setWho(value.visit.clerkId, clerkName);
  const lines = value.visit.lines.map((line) => ({
    ...line,
    speakerId: line.speaker === "clerk" ? "clerk" : me.id,
  }));
  // At the counter you can walk out; silence there is not an answer.
  talkControls({ silent: false, leave: true });
  // The narrator sets the counter up before the clerk speaks (the opening call only).
  fillTalk({
    lines: [
      ...(lines.length <= 1
        ? (value.intro ?? []).map((line) =>
            el("li", { className: "speech narration", textContent: line.text }),
          )
        : []),
      ...spokenLines(lines, (line) => line.text),
    ],
  });
  renderFilingOverlay(value);
  // More races than the talk can hold open as a menu beside it, never as a long
  // numbered list in the talk box (owner, Oct 26).
  const races = value.visit.choices.filter((c) => c.action.kind === "pick");
  const asMenu = races.length > 4;
  const choose = async (choice) => {
    // Filing carries the platform and party chosen on the overlay.
    const params = new URLSearchParams({ key: choice.key });
    if (choice.action.kind === "file") {
      for (const select of $("filing-platform").querySelectorAll("select"))
        if (select.value)
          params.append("stance", `${select.name}=${select.value}`);
      params.set("party", $("filing-party").value);
    }
    renderFiling(await post(`/api/filing/choose?${params}`));
  };
  // Each race told apart before the pick: its seat, its election day and
  // who holds the seat now, from the contest's records.
  const counter = controls.filing;
  const factsOf = (choice) => {
    const seat = value.seats?.[choice.action.contestId];
    if (!seat) return "";
    return [
      ...(seat.seat ? [`${counter.seat} ${seat.seat}`] : []),
      proseDate(seat.electionDate),
      seat.holder ? `${counter.heldBy} ${seat.holder}` : counter.openSeat,
    ].join(" · ");
  };
  const choices = value.visit.choices
    .filter((c) => !(asMenu && c.action.kind === "pick"))
    .slice(0, 6);
  const buttons = replies(choices, choose);
  choices.forEach((choice, i) => {
    if (choice.action.kind !== "pick") return;
    buttons[i].append(
      el("small", { className: "reply-facts", textContent: factsOf(choice) }),
    );
  });
  if (asMenu) {
    fillChoiceMenu($("race-menu"), {
      title: counter.openRaces,
      rows: races.map((choice) => ({
        key: choice.key,
        label:
          value.visit.contests.find((c) => c.id === choice.action.contestId)
            ?.title ?? choice.text,
        facts: factsOf(choice),
      })),
      onPick: (key) => choose(races.find((c) => c.key === key)),
      paged: (items) => menuPages(items, 8),
    });
    buttons.unshift(
      makeButton({
        className: "reply",
        textContent: counter.chooseRace,
        onclick: () => show("race-menu", true),
      }),
    );
    if (!value.result && !value.overlay) show("race-menu", true);
  }
  if (!asMenu || value.overlay) show("race-menu", false);
  fillTalk({ replies: buttons });
  // The filing's record once it is made: its status, shown as the record's
  // label under the talk, not as words in the clerk's mouth.
  if (value.result)
    addTalkLine(
      talkLine({
        kind: "label",
        text: value.result.filing
          ? (controls.filing?.status?.[value.result.status] ??
            words(value.result.status))
          : `${controls.filing?.status?.[value.result.status] ?? words(value.result.status)} · ${(
              value.result.unmet ?? []
            )
              .map((u) => controls.filing?.rules?.[u.rule] ?? words(u.rule))
              .join(", ")}`,
      }),
    );
  setScales({ available: false });
}
/** The named office's rules from its records, with the platform and party to file under. */
function renderFilingOverlay(value) {
  const overlay = value?.overlay;
  const open = Boolean(overlay && !value.result);
  show("filing-overlay", open);
  // The news card sits where the overlay does; it waits until the counter closes.
  $("game").classList.toggle("filing-open", open);
  if (!overlay || $("filing-title").dataset.contest === overlay.contestId)
    return;
  $("filing-title").dataset.contest = overlay.contestId;
  $("filing-title").textContent = overlay.title;
  // Each rule by its control name; the filing deadline is one of the rules.
  const ruleNames = controls.filing?.rules ?? {};
  $("filing-checks").replaceChildren(
    ...overlay.checks.map((check) => {
      const line = row(
        ruleNames[check.rule] ?? words(check.rule),
        `${dateOrValue(check.actual ?? "")}${check.required ? ` / ${dateOrValue(check.required)}` : ""}${check.metOn ? ` · ${controls.filing?.metOn ?? ""} ${proseDate(check.metOn)}` : ""}`,
      );
      if (!check.met) line.classList.add("unmet");
      return line;
    }),
  );
  $("filing-platform").replaceChildren(
    ...overlay.questions.map((question) =>
      listRow(
        "",
        {},
        el("b", { textContent: policyLabel(question) }),
        el(
          "select",
          { name: question },
          el("option", { value: "", textContent: "—" }),
          el("option", { value: "1", textContent: "For" }),
          el("option", { value: "-1", textContent: "Against" }),
        ),
      ),
    ),
  );
  $("filing-party").replaceChildren(
    el("option", { value: "", textContent: "—" }),
    ...overlay.parties.map((name) =>
      el("option", {
        value: name,
        textContent: name,
        selected: name === overlay.party,
      }),
    ),
  );
}
async function openFiling(filedWith) {
  closeSheet();
  renderTalk(undefined);
  renderFiling(
    await post(`/api/filing/open?filedWith=${encodeURIComponent(filedWith)}`),
  );
}

// ---- Party: join one; the tie is read by filing and the party's loyalty ----
function partyRows(party) {
  const words = controls.party ?? {};
  if (party.member) {
    const m = party.member;
    const line = row(
      words.member,
      // How well their views fit the party's, in words: the first band the
      // record's agreement (-1 to 1) reaches.
      `${m.name} · ${words.agreement} ${m.agreement === null ? "" : ((words.fit ?? []).find((band) => m.agreement >= band.atLeast)?.label ?? "")}`,
    );
    // The tie's record, for the checks that read it.
    line.dataset.tieId = m.tieId;
    line.dataset.partyId = m.partyId;
    return [line];
  }
  return party.parties.map((p) => {
    const b = makeButton({
      textContent: `${words.join} ${p.name}`,
    });
    b.addEventListener("click", async () => {
      await post(`/api/party/join?${new URLSearchParams({ partyId: p.id })}`);
      openSheet("politics");
    });
    return b;
  });
}

/** The campaign record's count of volunteers, worded (one count for every line that shows it). */
function volunteerCount(n) {
  return n === 1
    ? controls.campaignVolunteers.one
    : controls.campaignVolunteers.other.replace("{n}", String(n));
}

// ---- Campaigning (step 4): each act answered by the people it reaches ----
let campaignResult = "";
// The speech being built: the parts said and the four on offer, from the server.
let speechState = null;
/**
 * The town's next local ballot: every city, township and county seat on it
 * with each filer by name, from the filing records, marked unopposed or
 * unfilled where that is what the records hold.
 */
async function localRacesBlock() {
  const { date, races } = await api("/api/government/local-races");
  const labels = controls.localRaces;
  const block = el(
    "div",
    { className: "row race local-races" },
    el("b", {
      textContent: date ? `${labels.title} · ${proseDate(date)}` : labels.title,
    }),
  );
  if (!races.length)
    block.append(
      el("div", { className: "label", textContent: labels.noBallot }),
    );
  for (const race of races) {
    const names = race.filers.map(
      (f) => `${f.name ?? ""}${f.party ? ` (${f.party})` : ""}`,
    );
    const mark = !race.filers.length
      ? labels.noFilers
      : race.filers.length === 1 && race.filingClosed
        ? labels.unopposed
        : null;
    const line = row(
      race.title,
      [
        names.join(", "),
        mark,
        race.filingClosed
          ? null
          : `${labels.filingCloses} ${proseDate(race.filingDeadline)}`,
      ]
        .filter(Boolean)
        .join(" · "),
    );
    line.classList.add("local-race");
    line.dataset.contest = race.contestId;
    block.append(line);
  }
  return block;
}
async function campaignRows() {
  const v = await api(`/api/campaign?id=${encodeURIComponent(me.id)}`);
  const rows = [];
  for (const {
    filing,
    contest,
    campaign,
    pollSample,
    outings,
    standing,
    debates,
  } of v.campaigns) {
    const goOut = async (outing, outletId) => {
      const kindOf = {
        doors: "canvass",
        calls: "raise-money",
        event: "event",
        interview: "interview",
      };
      const result = await post(
        `/api/campaign/day?${new URLSearchParams({ filingId: filing.id, kind: kindOf[outing], ...(outletId ? { outletId } : {}) })}`,
      );
      // The outing's hours moved the clock: the card shows the new time.
      if (result.packet) renderPacket(result.packet);
      campaignResult = [
        controls.campaignOutings[outing],
        result.doorsKnocked ? `${result.doorsKnocked} doors` : "",
        result.reached ? `${result.reached} reached` : "",
        result.raisedMinor ? dollars(result.raisedMinor) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      // Something that came up while out holds the clock: it is shown, as
      // after Day, so Continue never stands over an empty screen.
      const moment = storyStop(result.packet);
      // The doors and the calls are seen where they happen, with the people reached.
      if (result.scene || moment) closeSheet();
      if (result.scene) {
        $("backdrop").src = result.scene.backdrop.url;
        drawPeople(result.scene.people);
        $("card-why").textContent = campaignResult;
      }
      if (moment) await showStory(moment.recordId);
      if (!result.scene && !moment) openSheet("campaigns");
    };
    const act = async (kind, extra = {}) => {
      const result = await post(
        `/api/campaign/act?${new URLSearchParams({ filingId: filing.id, kind, ...extra })}`,
      );
      campaignResult =
        result.volunteers !== undefined
          ? controls.campaignVolunteers.asked
              .replace("{asked}", String(result.answers.length))
              .replace(
                "{yes}",
                String(result.answers.filter((a) => a.yes).length),
              )
              .replace("{volunteers}", volunteerCount(result.volunteers))
          : result.contacted !== undefined
            ? `${kind}: ${result.contacted} · ${Object.entries(result.answers)
                .map(([k, n]) => `${plain(k) ?? ""} ${n}`)
                .join(" · ")}`
            : result.reached !== undefined
              ? `${kind}: ${result.reached} · +${result.warmer} · −${result.cooler}`
              : `${kind}: ${result.answers.filter((a) => a.yes || a.givenMinor > 0).length} / ${result.answers.length}${result.answers.some((a) => a.givenMinor) ? ` · ${dollars(result.answers.reduce((t, a) => t + (a.givenMinor ?? 0), 0))}` : ""}`;
      // A speech is seen where it was given, with the people it reached.
      if (result.scene) {
        closeSheet();
        $("backdrop").src = result.scene.backdrop.url;
        drawPeople(result.scene.people);
        $("card-why").textContent = campaignResult;
        return;
      }
      openSheet("campaigns");
    };
    const venue = el(
      "select",
      {},
      ...(v.venues ?? []).map((place) =>
        el("option", {
          value: place,
          textContent: controls.venues?.[place] ?? place,
        }),
      ),
    );
    const button = (label, kind, extra) => {
      const b = makeButton({ textContent: label });
      b.addEventListener("click", () =>
        act(kind, typeof extra === "function" ? extra() : extra),
      );
      return b;
    };
    rows.push(
      listRow(
        "campaign",
        {},
        el("b", {
          textContent: [
            contest?.title,
            contest ? proseDate(contest.electionDate) : null,
            controls.filing?.status?.[filing.status] ?? words(filing.status),
          ]
            .filter(Boolean)
            .join(" · "),
        }),
        `${dollars(campaign.raisedMinor)} raised · ${dollars(campaign.spentMinor)} spent · ${volunteerCount(campaign.volunteers)} · ${campaign.doors} doors`,
        el(
          "div",
          {},
          ...(outings ?? []).map((choice) => {
            // A grayed outing says why, from the records.
            const why = choice.why
              ? (controls.campaignUnavailable[choice.why.key] ?? "")
                  .replace("{price}", dollars(choice.why.priceMinor ?? 0))
                  .replace("{cash}", dollars(choice.why.cashMinor ?? 0))
              : "";
            const b = makeButton({
              textContent: `${controls.campaignOutings[choice.outing]} · ${choice.hours} ${controls.campaignOutings.hours}${why ? ` · ${why}` : ""}`,
              disabled: !choice.available,
              title: why,
            });
            b.addEventListener("click", () =>
              goOut(choice.outing, choice.outletId),
            );
            return b;
          }),
        ),
        el(
          "div",
          {},
          button("Volunteers", "volunteer"),
          button("Donations", "donation"),
          button("Endorsements", "endorsement"),
          button("Ad", "ad", { amountMinor: "5000" }),
          button("Poll", "poll", { sampleSize: String(pollSample) }),
        ),
        // The player's own money into the campaign: the amount is theirs to set.
        (() => {
          const dollarsIn = el("input", {
            type: "number",
            min: "0",
            step: "1",
            value: "0",
            ariaLabel: controls.campaignContribute.dollars,
          });
          const give = makeButton({
            textContent: controls.campaignContribute.give,
          });
          give.addEventListener("click", () =>
            act("contribute", {
              amountMinor: String(Math.round(Number(dollarsIn.value) * 100)),
            }),
          );
          return el("div", {}, dollarsIn, give);
        })(),
        speechCard({
          words: controls.speech,
          state: speechState,
          venue,
          onBegin: async () => {
            speechState = await post("/api/campaign/speech/begin");
            openSheet("campaigns");
          },
          onPick: async (choice) => {
            speechState = await post(
              `/api/campaign/speech/pick?${new URLSearchParams({ key: choice.key })}`,
            );
            openSheet("campaigns");
          },
          onGive: async () => {
            const result = await post(
              `/api/campaign/speech/give?${new URLSearchParams({ filingId: filing.id, venue: venue.value })}`,
            );
            speechState = null;
            campaignResult = `${result.reached} · +${result.warmer} · −${result.cooler} · ${result.retold} ${controls.speech.retold}`;
            // A speech is seen where it was given, with the people it reached.
            closeSheet();
            $("backdrop").src = result.scene.backdrop.url;
            drawPeople(result.scene.people);
            $("card-why").textContent = campaignResult;
          },
        }),
        // A debate the outlet invited the candidates to: one position (or a pass) on each question it asks.
        ...(debates ?? []).map((debate) =>
          debateCard({
            words: controls.debate,
            debate,
            questionLabel: policyLabel,
            onAnswer: async (answers) => {
              await post(
                `/api/campaign/debate?${new URLSearchParams({
                  debateId: debate.id,
                  answers: JSON.stringify(answers),
                })}`,
              );
              openSheet("campaigns");
            },
          }),
        ),
        // Where the race stands, in plain sentences from the English engine.
        el("b", { textContent: controls.raceStanding.title }),
        ...(standing ?? []).map((line) =>
          el("div", { className: "row", textContent: line }),
        ),
        campaignResult ? el("div", { textContent: campaignResult }) : "",
      ),
    );
  }
  return rows;
}

// ---- A big moment, staged when it stops the clock ----
// The grading view (/play?held=1): a scene may say lines still held until the
// owner grades them, each marked, with the record that fired it.
const HELD_VIEW =
  new URLSearchParams(window.location.search).get("held") === "1";
/** Why a scene is happening: its cause record and the facts it may say, by record. */
function whyRows(why) {
  return [
    `${why.cause.kind} · ${why.cause.date} · ${why.cause.id}`,
    ...why.facts.map(
      (row) => `${row.key}: ${row.text} (${row.recordIds.join(", ")})`,
    ),
  ].map((text) => el("li", { className: "why", textContent: text }));
}
async function showStory(momentId) {
  const story = await api(
    `/api/story?momentId=${encodeURIComponent(momentId)}${HELD_VIEW ? "&held=1" : ""}`,
  );
  me.names = { ...me.names, ...story.names };
  $("backdrop").src = story.backdrop.url;
  drawPeople(story.people);
  show("talk", true);
  show("talk-who", false);
  $("talk-name").textContent = "";
  // A scene with a purpose is its own exchange; any other opens a talk.
  const withId = story.talk?.askerId ?? story.talkToId;
  // Whether to talk to them is the player's; the narrator alone is a Continue.
  talkControls({ silent: false, leave: Boolean(withId) });
  fillTalk({
    lines: [
      ...story.narration.map((line) =>
        talkLine({
          kind: "speech narration",
          text: line.text,
          held: line.held,
        }),
      ),
      ...(HELD_VIEW && story.talk ? whyRows(story.talk.why) : []),
    ],
    replies: withId
      ? replies([{ text: `Talk · ${story.names[withId] ?? ""}` }], () =>
          story.talk ? playExchange(story) : talkTo(withId, momentId),
        )
      : [],
  });
  setScales({ available: false });
}
/** A scene with a purpose, tapped through: each reply leads to its own branch, to the close. */
function playExchange(story) {
  const { talk } = story;
  setWho(talk.askerId, story.names[talk.askerId]);
  const said = [...talk.opening];
  const lineOf = (line) =>
    talkLine({
      kind: line.role === "asked" ? "history" : "speech",
      who: line.role === "asked" ? $("card-name").textContent : undefined,
      text: line.text,
      held: line.held,
    });
  // The path is the index of each reply chosen, from the first.
  // The asker follows up: no walking away mid-exchange, no silence as a reply.
  talkControls({ silent: false, leave: false });
  const play = (node, path) => {
    said.push(...node.lines, ...(node.end?.close ? [node.end.close] : []));
    fillTalk({ lines: said.slice(-4).map(lineOf) });
    fillTalk({
      replies: replies(
        node.replies.map((reply, index) => ({
          text: reply.line.text,
          held: reply.line.held,
          reply,
          index,
        })),
        ({ reply, index }) => {
          const chosen = [...path, index];
          // The reply is the player's: the game keeps it (purpose-scene.ts
          // replyInScene).
          const kept = api(
            `/api/story/reply?momentId=${encodeURIComponent(story.momentId)}&typeKey=${encodeURIComponent(talk.typeKey)}&path=${chosen.join(".")}${HELD_VIEW ? "&held=1" : ""}`,
            "POST",
          );
          said.push(reply.line);
          if (reply.next) play(reply.next, chosen);
          else {
            fillTalk({ lines: said.slice(-4).map(lineOf), replies: [] });
            // A moment that staged another scene plays it next.
            kept.then(() => nextScene(story));
          }
        },
      ),
    });
  };
  play(talk.tree, []);
}
/** The moment's next staged scene with a purpose, once one ends; none, and the talk stays closed. */
async function nextScene(story) {
  const next = await api(
    `/api/story?momentId=${encodeURIComponent(story.momentId)}${HELD_VIEW ? "&held=1" : ""}`,
  );
  if (next.talk && next.talk.typeKey !== story.talk.typeKey)
    showStory(story.momentId);
}
function storyStop(value) {
  return value?.kind === "stop"
    ? value.stop.modules.find(
        (row) =>
          row.kind === "interrupt" && row.moduleId === "p13-story-director",
      )
    : undefined;
}

// ---- The person card: only what you could know about them ----
let personRequest = 0;
let personOpener;
function closePerson() {
  personRequest++;
  show("person", false);
  $("game").classList.remove("person-open");
  personOpener?.focus();
}
async function showPerson(person) {
  const request = ++personRequest;
  const opener = document.activeElement;
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: person.personId })}`,
  );
  await controlsReady;
  if (request !== personRequest) return;
  personOpener = opener;
  closeSheet();
  const labels = controls.person;
  // Only this person's supplied artwork. Null deliberately leaves a clear slot.
  screenArtwork({
    portraitUrl:
      c.presentation?.portraitUrl !== undefined
        ? c.presentation.portraitUrl
        : (c.figureUrl ?? person.figureUrl),
    backgroundUrl: c.presentation?.backgroundUrl,
    name: c.name,
    into: $("person-media"),
  });
  $("person-name").textContent = c.name;
  $("person-role").textContent = [
    c.relation && c.relation.charAt(0).toUpperCase() + c.relation.slice(1),
    c.age !== null && c.age !== undefined ? `${labels.age} ${c.age}` : null,
  ]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(" · ");
  // What the public knows of a figure (the past module's public tier): read
  // from the record, shown beside the tie if there is one.
  const known = c.publicKnowledge;
  const stance = voteWords();
  $("person-facts").replaceChildren(
    ...(c.work
      ? [
          recordSection(
            labels.work,
            el("p", {
              className: "record-feature",
              textContent: c.work.title ?? "",
            }),
            el("p", { textContent: c.work.employer ?? "" }),
          ),
        ]
      : []),
    ...(c.school
      ? [recordSection(labels.school, el("p", { textContent: c.school.name }))]
      : []),
    ...(c.placeName
      ? [recordSection(labels.place, el("p", { textContent: c.placeName }))]
      : []),
    // An officeholder's colleagues in office, closest first, from their ties.
    ...(c.colleagues
      ? [
          recordSection(
            labels.knows,
            ...(c.colleagues.length
              ? c.colleagues.map((k) => {
                  const line = row(
                    k.name,
                    `${k.office} · ${k.level < 0 ? labels.rival : (labels.tieWords?.[k.kind] ?? "")}`,
                  );
                  line.dataset.tie = k.recordId;
                  return line;
                })
              : [el("p", { textContent: labels.noColleagues })]),
          ),
        ]
      : []),
    ...[
      // No "Last talked" (owner, Oct 27, 5 PM: never shown).
      ...(known
        ? [
            row("party", known.party),
            row("since", known.serviceStart),
            row("votes", known.votesOnRecord),
            row("sponsored", known.lawsSponsored),
            row("signed", known.lawsSigned),
            ...known.positions.map((p) =>
              row(
                policyLabel(p.question),
                p.position > 0 ? (stance.for ?? "") : (stance.against ?? ""),
              ),
            ),
          ]
        : []),
    ].filter(Boolean),
  );
  for (const button of document.querySelectorAll("[data-person-label]"))
    button.textContent = labels[button.dataset.personLabel];
  show("person", true);
  $("game").classList.add("person-open");
  $("person-close").focus();
}
$("person-close").addEventListener("click", closePerson);
// The name over a talk opens that person's card, by pointer or key.
$("talk-name").setAttribute("role", "button");
$("talk-name").tabIndex = 0;
$("talk-name").addEventListener("click", () => {
  if (talkPersonId && talkPersonId !== me?.id)
    showPerson({ personId: talkPersonId });
});
$("talk-name").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  $("talk-name").click();
});
pageWhenChanged($("person-facts"), $("person-pager"));
window.addEventListener("resize", () => {
  if (!$("person").hidden) pageIn($("person-facts"), $("person-pager"));
});

// ---- Go to a place in town: its picture now, and whoever works there ----
async function visit(organizationId) {
  closeSheet();
  renderTalk(undefined);
  const v = await post(
    `/api/goto/visit?org=${encodeURIComponent(organizationId)}`,
  );
  me.names = { ...me.names, ...v.names };
  $("backdrop").src = v.backdrop.url;
  drawPeople(v.people, (p) => talkTo(p.personId));
  $("card-place").textContent = v.name;
}

// ---- Play someone else: the one you leave finishes their day ----
async function playAs(personId) {
  const value = await post(`/api/play?id=${encodeURIComponent(personId)}`);
  me.id = value.personId;
  closeSheet();
  renderTalk(undefined);
  renderPacket(value.packet);
  await refresh();
}

// ---- The seat as a job, and what stops you (OFFICE-LOCAL) ----
async function officeRows() {
  const v = await api(`/api/office?id=${encodeURIComponent(me.id)}`);
  if (!v.jobs.length) return [];
  const words = controls.officeStops ?? {};
  const toggles = v.stops.map((stop) => {
    const box = el("input", { type: "checkbox", checked: stop.on });
    box.addEventListener("change", async () => {
      await post(
        `/api/office/stops?${new URLSearchParams({ kind: stop.kind, on: String(box.checked) })}`,
      );
    });
    return el("label", {}, box, ` ${words[stop.kind] ?? stop.kind} `);
  });
  return [
    ...v.jobs.map((job) =>
      listRow(
        "campaign",
        { title: job.citation },
        el("b", { textContent: job.title }),
        ` ${dollars(job.annualMinor)} · ${job.weeklyHours} h · ${job.payer}`,
        job.lastPaid
          ? ` · ${job.lastPaid.on} ${dollars(job.lastPaid.amountMinor)}`
          : "",
        job.nextMeeting ? ` · ${job.nextMeeting}` : "",
      ),
    ),
    listRow("campaign", {}, ...toggles),
    // The outlet the next interview asks; left on the character's own, the widest reach.
    ...(v.outlets?.length
      ? [
          listRow(
            "campaign",
            { as: "label" },
            `${words.interviewOutlet ?? ""} `,
            (() => {
              const pick = el(
                "select",
                {},
                el("option", { value: "", textContent: words.ownChoice ?? "" }),
                ...v.outlets.map((o) =>
                  el("option", {
                    value: o.id,
                    disabled: o.hadThem,
                    textContent: `${o.name} · ${o.reach}`,
                  }),
                ),
              );
              pick.addEventListener("change", async () => {
                if (pick.value)
                  await post(
                    `/api/office/interview-outlet?${new URLSearchParams({ outletId: pick.value })}`,
                  );
              });
              return pick;
            })(),
          ),
        ]
      : []),
    // An open town post you appoint: the people it could go to, best first; left on the official's own choice, the first stands.
    ...(v.heads ?? []).map((head) =>
      listRow(
        "campaign",
        { as: "label" },
        `${head.title} · ${words.nameHeadPick ?? ""} `,
        (() => {
          const pick = el(
            "select",
            {},
            el("option", { value: "", textContent: words.ownChoice ?? "" }),
            ...head.candidates.map((c) =>
              el("option", {
                value: c.id,
                textContent: c.job ? `${c.name} · ${c.job}` : c.name,
              }),
            ),
          );
          pick.addEventListener("change", async () => {
            if (pick.value)
              await post(
                `/api/office/name-head-pick?${new URLSearchParams({ post: head.post, nomineeId: pick.value })}`,
              );
          });
          return pick;
        })(),
      ),
    ),
    // The budget you may send now: the change to each line, in steps of its amount.
    ...(v.budget
      ? [
          listRow(
            "campaign",
            {},
            el("b", { textContent: controls.budgetEditor.title }),
            ...v.budget.lines.map((row) => {
              const pick = el(
                "select",
                {},
                ...[-20, -10, 0, 10, 20].map((pct) => {
                  const minor = Math.round((row.amountMinor * pct) / 100);
                  return el("option", {
                    value: String(minor),
                    selected: row.changeMinor === minor,
                    textContent: controls.budgetEditor[String(pct)],
                  });
                }),
              );
              pick.addEventListener("change", async () => {
                await post(
                  `/api/office/budget-line?${new URLSearchParams({ line: row.line, changeMinor: pick.value })}`,
                );
              });
              return el(
                "label",
                {},
                ` ${row.name} ${dollars(row.amountMinor)} `,
                pick,
              );
            }),
          ),
        ]
      : []),
    // The deal to offer each colleague who votes on a bill of yours when you talk to them.
    ...(v.deals ?? []).map((bill) =>
      listRow(
        "campaign",
        {},
        el("b", { textContent: `${bill.number} · ${controls.deals.title}` }),
        ...bill.colleagues.map((colleague) => {
          const pick = el(
            "select",
            {},
            ...["none", "favor", "back-their-item"].map((deal) =>
              el("option", {
                value: deal,
                textContent: controls.deals[deal],
                selected: (colleague.deal ?? "none") === deal,
              }),
            ),
          );
          pick.addEventListener("change", async () => {
            await post(
              `/api/office/deal?${new URLSearchParams({ memberId: colleague.key, deal: pick.value })}`,
            );
          });
          return el("label", {}, ` ${colleague.name} `, pick);
        }),
      ),
    ),
    ...v.acts.map((a) =>
      row(
        `${a.date} · ${controls.actions?.[a.kind] ?? a.kind}`,
        `${a.detail}${a.how === "own-choice" ? ` · ${words.ownChoice ?? ""}` : ""}`,
      ),
    ),
  ];
}

// ---- The bill on paper: one document, every section clickable ----
/** The simulation's estimate beside a clicked section, every figure a record
 * the server read: the statute it amends with the values before and after,
 * the budget line and its amount, and the bill's own cost estimate. */
function billEstimateRows(paper, section) {
  const words = controls.bill ?? {};
  const est = section.estimate;
  const rows = [
    el("p", {
      className: "prose",
      textContent: section.text ?? paper.title,
    }),
  ];
  const webCite =
    typeof est.statute === "string" && /^https?:\/\//.test(est.statute);
  if (est.statute && !webCite)
    rows.push(
      el("div", { textContent: `${words.amends ?? ""} ${est.statute}` }),
    );
  // A question answered yes or no has no numeric scale: its clause says
  // what it does, so bare 0/1 values stay off the screen.
  const scaled = est.beforeUnit != null || est.afterUnit != null;
  const before =
    scaled && est.beforeValue != null
      ? amount(est.beforeValue, est.beforeUnit)
      : null;
  const after =
    scaled && est.afterValue != null
      ? amount(est.afterValue, est.afterUnit)
      : null;
  if (before && after && !est.statute)
    rows.push(el("div", { textContent: `${before} → ${after}` }));
  else if (before && after)
    rows.push(
      el("div", {
        textContent: webCite
          ? `${words.amends ?? ""} ${words.lawInForce ?? ""}: ${words.from ?? ""} ${before} ${words.to ?? ""} ${after}`
          : `${before} ${words.from ?? ""} ${after}`,
      }),
    );
  else if (after)
    rows.push(el("div", { textContent: `${words.to ?? ""} ${after}` }));
  if (est.line)
    rows.push(
      el("div", {
        textContent: [
          `${words.line ?? ""}: ${policyLabel(`budget-line:${est.line}`)}`,
          est.lineAmountMinor != null ? dollars(est.lineAmountMinor) : null,
          est.ofMinor != null
            ? `${words.from ?? ""} ${dollars(est.ofMinor)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }),
    );
  rows.push(
    el("div", {
      textContent: [
        paper.estimate.workers > 0
          ? `${paper.estimate.workers} ${words.workers ?? ""}`
          : null,
        paper.estimate.payMinor > 0 ? dollars(paper.estimate.payMinor) : null,
        paper.estimate.note,
      ]
        .filter(Boolean)
        .join(" · "),
    }),
  );
  return rows;
}
/**
 * Open a bill as one paper document: designation, title, sponsor, each
 * section in plain words, the floor date and whip, and the vote and signature
 * records when the body has made them. Clicking a section shows its estimate
 * beside it. `show` draws the nodes, `back` returns to the rows.
 */
async function openBillPaper(billId, show, back, backLabel) {
  const paper = await api(`/api/bill?billId=${encodeURIComponent(billId)}`);
  const words = controls.bill ?? {};
  const floor = controls.floor ?? {};
  const meet = controls.meeting ?? {};
  const backButton = makeButton({
    className: "action",
    textContent: backLabel ?? words.back ?? "",
  });
  backButton.addEventListener("click", back);
  const aside = makeCard(
    "bill-estimate",
    {},
    el("b", { textContent: words.estimate ?? "" }),
    ...billEstimateRows(paper, paper.sections[0] ?? { estimate: {} }),
  );
  const doc = el(
    "div",
    { className: "bill-doc" },
    el("h2", { className: "heading", textContent: paper.spoken }),
    el("p", { className: "prose", textContent: paper.title }),
    el("div", {
      textContent: `${words.sponsor ?? ""} ${paper.sponsor}`,
    }),
    el("b", { textContent: words.sections ?? "" }),
    ...paper.sections.map((section) => {
      const open = makeButton({
        className: "action bill-section",
        textContent: section.text ?? paper.title,
      });
      open.addEventListener("click", () =>
        aside.replaceChildren(
          el("b", { textContent: words.estimate ?? "" }),
          ...billEstimateRows(paper, section),
        ),
      );
      return open;
    }),
    ...(paper.effective ? [el("div", { textContent: paper.effective })] : []),
    ...(paper.floorDate
      ? [
          el("div", {
            textContent: `${floor.takenUp ?? ""} ${proseDate(paper.floorDate)}`,
          }),
        ]
      : []),
    ...paper.whip.map((count) =>
      el("div", {
        textContent: `${count.chamber}: ${count.yes} ${floor.for ?? ""}, ${count.no} ${floor.against ?? ""}, ${count.undecided} ${floor.undecided ?? ""}`,
      }),
    ),
    ...(paper.votes.length
      ? [
          el("div", {
            textContent: `${floor.voted ?? ""}: ${paper.votes.filter((x) => x.vote === "yes").length} ${floor.yes ?? ""}, ${paper.votes.filter((x) => x.vote === "no").length} ${floor.no ?? ""}`,
          }),
          el("div", {
            textContent: paper.votes
              .map((x) => `${x.name} · ${meet[x.vote] ?? x.vote}`)
              .join(" · "),
          }),
        ]
      : []),
    ...(paper.decision
      ? [
          el("div", {
            textContent: `${words.decided ?? ""}: ${floor.status?.[paper.decision.status] ?? ""}${paper.decision.passedOn ? ` · ${proseDate(paper.decision.passedOn)}` : ""}`,
          }),
        ]
      : []),
  );
  show(backButton, el("div", { className: "bill-paper" }, doc, aside));
}

// ---- From your seat (steps 6 to 9): draft; the vote is at the meeting ----
// Asking colleagues and the vote itself are acts in the day and the meeting
// scene (OFFICE-LOCAL); the seat drafts, and a drafted bill goes on the
// body's next agenda.
let seatResult = "";
let seatText = [];
async function seatRows() {
  const v = await api(`/api/seat?id=${encodeURIComponent(me.id)}`);
  const rows = [...(await officeRows())];
  const act = async (params) => {
    const r = await post(`/api/seat/act?${new URLSearchParams(params)}`);
    seatText = r.text ?? [];
    seatResult = r.number
      ? `${r.number} · ${controls.floor.status[r.status] ?? ""}${r.floorDate ? ` · ${controls.floor.takenUp} ${proseDate(r.floorDate)}` : ""}${
          r.authority?.some((a) => !a.allowed)
            ? ` · ${r.authority
                .filter((a) => !a.allowed)
                .map((a) => controls.authority?.[a.reason] ?? "")
                .join("; ")}`
            : ""
        }`
      : "";
    openSheet("office");
  };
  for (const body of v.bodies) {
    for (const m of body.members) me.names = { ...me.names, [m.key]: m.name };
    const pick = el(
      "select",
      {},
      // Every law area, one group each: its policies and budget lines.
      ...(body.menus ?? []).map((menu) =>
        el(
          "optgroup",
          { label: menu.name },
          ...menu.items.map((item) => {
            const option = el("option", {
              value: item.series
                ? `series:${item.series}`
                : item.question
                  ? `question:${item.question}`
                  : `line:${item.line}`,
              textContent: `${
                item.series
                  ? policyLabel(item.series)
                  : item.question
                    ? policyLabel(item.question)
                    : item.name
              }${
                item.inForce != null
                  ? ` · ${item.series ? amount(item.inForce, item.unit) : item.inForce}`
                  : ""
              }${item.allowed === false ? ` · ${controls.authority?.[item.reason] ?? ""}` : ""}`,
            });
            // Money is typed in dollars and kept in cents.
            if (item.unit?.startsWith("minor")) option.dataset.cents = "1";
            if (item.line) option.dataset.cents = "1";
            return option;
          }),
        ),
      ),
    );
    const value = el("input", {
      type: "number",
      value: "0",
      style: "width: 90px",
    });
    const draft = makeButton({ textContent: "Draft" });
    draft.addEventListener("click", () => {
      const [kind, key] = [
        pick.value.slice(0, pick.value.indexOf(":")),
        pick.value.slice(pick.value.indexOf(":") + 1),
      ];
      const cents = pick.selectedOptions[0]?.dataset.cents === "1";
      act({
        kind: "draft",
        officeId: body.officeId,
        ...(kind === "series"
          ? { series: key }
          : kind === "line"
            ? { line: key }
            : { question: key }),
        value: cents
          ? String(Math.round(Number(value.value) * 100))
          : value.value,
      });
    });
    rows.push(
      listRow(
        "campaign",
        {},
        el("b", { textContent: body.title }),
        body.members.map((m) => m.name).join(" · "),
        el("div", {}, pick, value, draft),
      ),
    );
  }
  const floor = controls.floor;
  for (const { bill, votes, floorDate, whip } of v.bills)
    rows.push(
      listRow(
        "campaign",
        {},
        el("b", {
          textContent: `${bill.number} · ${floor.status[bill.status] ?? ""}`,
        }),
        // The floor: the day it is taken up, each chamber's count the day
        // before, and how the vote came out.
        ...(floorDate
          ? [
              el("div", {
                className: "floor-date",
                textContent: `${floor.takenUp} ${proseDate(floorDate)}`,
              }),
            ]
          : []),
        ...(bill.status === "drafted"
          ? whip.map((count) =>
              el("div", {
                className: "floor-whip",
                textContent: `${count.chamber}: ${count.yes} ${floor.for}, ${count.no} ${floor.against}, ${count.undecided} ${floor.undecided}`,
              }),
            )
          : []),
        ...(votes.length
          ? [
              el("div", {
                className: "floor-result",
                textContent: `${floor.voted}: ${votes.filter((x) => x.vote === "yes").length} ${floor.yes}, ${votes.filter((x) => x.vote === "no").length} ${floor.no}`,
              }),
            ]
          : []),
        // The paper holds the sections, the estimate and the votes: the row
        // opens it instead of repeating them.
        (() => {
          const open = makeButton({
            className: "action",
            textContent: controls.bill?.open ?? "",
          });
          open.addEventListener("click", () =>
            openBillPaper(
              bill.id,
              (...nodes) => $("sheet-body").replaceChildren(...nodes),
              () => openSheet("office"),
            ),
          );
          return open;
        })(),
      ),
    );
  for (const left of v.incompatibilities ?? [])
    rows.push(
      listRow("campaign", {
        textContent: `${left.date} · ${left.left} → ${left.took} · ${left.law}`,
      }),
    );
  if (seatResult)
    rows.push(
      listRow("campaign", { textContent: seatResult }),
      ...seatText.map((line) => listRow("", { textContent: line })),
    );
  return rows;
}

/** The Kit 13 calendar icon a kind of dated record is drawn with. */
const dayIcon = (kind) =>
  ({
    birthday: "birthday",
    "filing-opens": "deadline",
    "filing-deadline": "deadline",
    primary: "election",
    election: "election",
  })[kind] ?? "meeting";

/** A record kind as words: "filing-deadline" reads "Filing deadline". */
const kindName = (kind) => {
  const name = kind.split(/[:.]/).pop();
  return `${name.charAt(0).toUpperCase()}${name.slice(1).replace(/-/g, " ")}`;
};

/** The player's own picture: the look chosen in the creator, else their figure in the room. */
function portraitUrl() {
  return me.portrait
    ? `/api/portrait?id=${encodeURIComponent(me.id)}`
    : me.scene?.people.find((p) => p.personId === me.id)?.figureUrl;
}
/** A record image has no substitute when its producer has not supplied one. */
function recordImage(url, className) {
  const image = el("img", { src: url, alt: "", className });
  image.addEventListener("error", () => image.remove());
  return image;
}
/** Small pages keep all records reachable without scrolling a menu. */
function menuPages(items, size = 5, start = 0) {
  let at = Math.floor(Math.max(0, start) / size);
  const box = el("div", { className: "record-pages" });
  const draw = () => {
    const back = makeButton({
      textContent: controls.politics.back,
      disabled: at === 0,
    });
    const next = makeButton({
      textContent: controls.politics.next,
      disabled: (at + 1) * size >= items.length,
    });
    back.onclick = () => {
      at--;
      draw();
    };
    next.onclick = () => {
      at++;
      draw();
    };
    box.replaceChildren(
      ...items.slice(at * size, at * size + size),
      ...(items.length > size
        ? [el("nav", { className: "record-pager" }, back, next)]
        : []),
    );
  };
  draw();
  return box;
}
/** Bars compare actual record amounts; no invented historical series. */
function comparison(items, label, format = (value) => String(value)) {
  const max = Math.max(0, ...items.map((i) => Math.abs(i.value)));
  return el(
    "div",
    { className: "record-chart", role: "img", ariaLabel: label },
    ...items.map((item) => {
      const bar = el("span", { className: "record-bar" });
      bar.style.width = `${max ? (Math.abs(item.value) / max) * 100 : 0}%`;
      return el(
        "div",
        { className: "record-chart-line" },
        el("span", { textContent: item.label }),
        el("div", { className: "record-track" }, bar),
        el("strong", { textContent: format(item.value) }),
      );
    }),
  );
}

// ---- Menus ----
const sheets = {
  async people() {
    const labels = controls.people;
    const records = new Map();
    const household = new Set(
      (me.card.home?.members ?? []).map((p) => p.personId),
    );
    for (const person of [
      ...(me.card.home?.members ?? []),
      ...(me.scene?.people ?? []),
      ...me.card.ties,
    ]) {
      if (person.personId === me.id) continue;
      const prior = records.get(person.personId) ?? {};
      records.set(person.personId, {
        ...prior,
        ...person,
        groups: [
          ...new Set([
            ...(prior.groups ?? []),
            ...(person.groups ?? []),
            ...(person.kind === "family" ||
            person.relation ||
            household.has(person.personId)
              ? ["family"]
              : []),
            ...(person.kind === "coworker" ? ["work"] : []),
            ...(["friend", "politics"].includes(person.kind)
              ? [person.kind === "friend" ? "friends" : "politics"]
              : []),
          ]),
        ],
      });
    }
    // Who joined or left the player's five closest this year, each with the
    // record that changed the tie; one who left and is no longer among the
    // card's ties is still drawn, marked.
    const circle = me.card.circle ?? { joined: [], left: [] };
    const dateText = (iso) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    const change = new Map([
      ...circle.joined.map((c) => [c.personId, { ...c, mark: "joined" }]),
      ...circle.left.map((c) => [c.personId, { ...c, mark: "left" }]),
    ]);
    for (const c of circle.left)
      if (!records.has(c.personId))
        records.set(c.personId, {
          personId: c.personId,
          name: c.name,
          groups: [],
        });
    // Changed ties first, so the first page shows them.
    const people = [...records.values()].sort(
      (a, b) => Number(change.has(b.personId)) - Number(change.has(a.personId)),
    );
    let group = "all";
    let selected;
    let page = 0;
    let listMode = false;
    const search = el("input", {
      type: "search",
      placeholder: labels.search,
      className: "people-search",
    });
    search.setAttribute("aria-label", labels.search);
    const filters = el("nav", { className: "people-filters" });
    const canvas = el("div", { className: "relationship-web" });
    const detail = el("div", { className: "people-selection" });
    const pager = el("nav", { className: "people-pager" });
    const button = (text, fn) => {
      const b = makeButton({ textContent: text });
      b.addEventListener("click", fn);
      return b;
    };
    const portrait = (p) => {
      const url = p.presentation?.portraitUrl ?? p.figureUrl;
      if (!url)
        return el("span", {
          className: "people-initial",
          textContent: p.name
            .split(/\s+/)
            .map((s) => s[0])
            .slice(0, 2)
            .join(""),
        });
      const image = el("img", { src: url, alt: "" });
      image.addEventListener("error", () => image.remove());
      return image;
    };
    const draw = () => {
      const found = people.filter((p) =>
        p.name.toLowerCase().includes(search.value.trim().toLowerCase()),
      );
      page = Math.min(page, Math.max(0, Math.ceil(found.length / 8) - 1));
      const shown = found.slice(page * 8, page * 8 + 8);
      canvas.replaceChildren();
      canvas.classList.toggle("people-list", listMode);
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
            portrait({
              name: me.card.name,
              // The saved look, as the card and Who you are read it: not whatever room's figure.
              figureUrl: portraitUrl(),
            }),
            el("b", { textContent: me.card.name }),
          ),
        );
      }
      shown.forEach((p, i) => {
        const angle =
          (i / Math.max(shown.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 37,
          y = 50 + Math.sin(angle) * 36;
        const active = group === "all" || p.groups.includes(group);
        const kind = household.has(p.personId)
          ? "household"
          : (p.groups[0] ?? "other");
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
        const changed = change.get(p.personId);
        node.className = `people-node${active ? "" : " dim"}${selected === p.personId ? " selected" : ""}${changed ? ` circle-${changed.mark}` : ""}`;
        node.setAttribute("aria-pressed", String(selected === p.personId));
        node.setAttribute("aria-label", p.name);
        node.style.left = `${x}%`;
        node.style.top = `${y}%`;
        node.append(
          portrait(p),
          el("b", { textContent: p.name }),
          el("span", { textContent: p.relation ?? "" }),
        );
        if (changed)
          node.append(
            el("em", {
              className: "circle-mark",
              textContent:
                changed.mark === "joined" ? labels.joined : labels.left,
            }),
          );
        canvas.append(node);
      });
      const person = people.find((p) => p.personId === selected);
      detail.replaceChildren();
      // Nothing changed in the five closest this year: said, never an empty box.
      if (!change.size)
        detail.append(
          el("span", {
            className: "circle-none",
            textContent: labels.noChange,
          }),
        );
      if (person) {
        const changed = change.get(person.personId);
        detail.append(
          el("span", {
            textContent: [person.name, person.relation]
              .filter(Boolean)
              .join(" · "),
          }),
          ...(changed
            ? [
                el("span", {
                  className: "circle-why",
                  textContent: [
                    changed.mark === "joined" ? labels.joined : labels.left,
                    labels.causes?.[changed.cause] ?? words(changed.cause),
                    dateText(changed.date),
                  ].join(" · "),
                }),
              ]
            : []),
          button(labels.card, () => {
            closeSheet();
            showPerson(person);
          }),
        );
        if (
          (me.scene?.people ?? []).some((p) => p.personId === person.personId)
        )
          detail.append(
            button(labels.talk, () => {
              closeSheet();
              talkTo(person.personId);
            }),
          );
      }
      const back = button(labels.back, () => {
        page--;
        draw();
      });
      back.disabled = page === 0;
      const next = button(labels.next, () => {
        page++;
        draw();
      });
      next.disabled = (page + 1) * 8 >= found.length;
      pager.replaceChildren(...(found.length > 8 ? [back, next] : []));
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
      page = 0;
      draw();
    });
    const key = el(
      "div",
      { className: "people-key" },
      ...["family", "household", "work", "politics", "other"].map((k) =>
        el("span", { className: k, textContent: labels[k] }),
      ),
    );
    draw();
    return [
      el("div", { className: "people-toolbar" }, search, mode),
      filters,
      canvas,
      detail,
      key,
      pager,
    ];
  },
  async who() {
    const c = me.card;
    const labels = controls.who ?? {};
    const born = new Date(`${c.birthDate}T12:00:00Z`).toLocaleDateString(
      "en-US",
      { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" },
    );
    const personLink = (member) => {
      const button = makeButton({
        className: "character-person",
        textContent: member.name,
      });
      button.addEventListener("click", () => {
        closeSheet();
        showPerson(member);
      });
      return el(
        "li",
        {},
        button,
        el("span", {
          className: "character-relation",
          textContent: member.relation ?? "",
        }),
      );
    };
    const rows = [
      el(
        "header",
        { className: "character-heading" },
        el("h2", { className: "name", textContent: c.name }),
        el("p", {
          className: "character-meta",
          textContent: `${labels.age} ${c.age} · ${labels.born} ${born}`,
        }),
      ),
    ];
    // What you're like, in plain sentences, never the traits' names (owner, Oct 27).
    if (c.sketch)
      rows.push(
        el("p", {
          className: "character-sketch narrative",
          textContent: c.sketch,
        }),
      );
    rows.push(
      recordSection(
        c.age < 18 ? labels.householdHome : labels.home,
        el("p", { textContent: c.home?.placeName ?? me.placeName }),
        el(
          "ul",
          { className: "character-household" },
          ...(c.home?.members ?? []).map(personLink),
        ),
      ),
    );
    if (c.job)
      rows.push(
        recordSection(
          labels.work,
          el("p", { className: "character-feature", textContent: c.job.title }),
          el("p", { textContent: c.job.employer ?? "" }),
        ),
      );
    if (c.schools?.length)
      rows.push(
        recordSection(
          labels.school,
          ...[...c.schools]
            .reverse()
            .map((school) => el("p", { textContent: school.name })),
        ),
      );
    const views =
      c.views ??
      (c.view && controls.leanWords?.[c.view]
        ? [{ label: labels.views, text: controls.leanWords[c.view] }]
        : []);
    if (views.length)
      rows.push(
        recordSection(
          labels.views,
          el(
            "div",
            { className: "character-views" },
            ...views.map((view) =>
              el(
                "article",
                {},
                view.label !== labels.views
                  ? el("h4", { textContent: view.label })
                  : "",
                el("p", { className: "narrative", textContent: view.text }),
              ),
            ),
          ),
        ),
      );
    rows.push(
      el(
        "div",
        { className: "character-money" },
        el("span", { className: "label", textContent: labels.money }),
        el("strong", { textContent: dollars(c.liquidMinor) }),
      ),
    );
    // The record sections side by side under the name and the sketch, so the
    // screen reads as a character sheet, not a column down one side.
    const [heading, ...rest] = rows;
    const sketch = rest[0]?.classList?.contains("character-sketch")
      ? rest.shift()
      : null;
    return [
      heading,
      ...(sketch ? [sketch] : []),
      el("div", { className: "character-grid" }, ...rest),
    ];
  },
  async money() {
    const [budget, bank] = await Promise.all([
      api(`/api/budget?id=${encodeURIComponent(me.id)}`),
      api(`/api/bank?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.money;
    const finances = me.card.finances ?? {};
    const root = el("div", { className: "money-layout" });
    const cash = el(
      "section",
      { className: "money-cash" },
      el("span", { className: "label", textContent: labels.cash }),
      el("strong", {
        className: "cash-total",
        textContent: dollars(me.card.liquidMinor),
      }),
    );
    root.append(cash);
    const history = (finances.balances ?? []).slice(-6);
    if (history.length) {
      const max = Math.max(1, ...history.map((r) => Math.abs(r.minor)));
      const chart = el(
        "section",
        { className: "money-history" },
        el("h3", { textContent: labels.history }),
      );
      const bars = el("div", { className: "balance-bars" });
      for (const record of history) {
        const bar = el("div", { className: "balance-bar" });
        bar.style.height = `${(Math.abs(record.minor) / max) * 130}px`;
        bars.append(
          el(
            "div",
            { className: "balance-column" },
            el("span", { textContent: dollars(record.minor) }),
            bar,
            el("span", { textContent: record.month }),
          ),
        );
      }
      chart.append(bars);
      root.append(chart);
    }
    const spending = (finances.spending ?? []).filter((r) => r.minor > 0);
    if (spending.length) {
      const total = spending.reduce((n, r) => n + r.minor, 0);
      const colors = ["#d6bd84", "#819bad", "#ba8068", "#998c70", "#b6b29d"];
      let offset = 0;
      const stops = spending.map((r, i) => {
        const start = offset;
        offset += (r.minor / total) * 100;
        return `${colors[i % colors.length]} ${start}% ${offset}%`;
      });
      const donut = el("div", {
        className: "money-donut",
        role: "img",
        ariaLabel: labels.spending,
      });
      donut.style.background = `conic-gradient(${stops.join(",")})`;
      const details = el(
        "div",
        {},
        ...spending.map((r) => row(r.label, dollars(r.minor))),
      );
      root.append(
        el(
          "section",
          { className: "money-spending" },
          el("h3", { textContent: labels.spending }),
          donut,
          details,
        ),
      );
    }
    const dwelling = me.card.dwelling;
    if (dwelling) {
      const home = el(
        "section",
        { className: "money-home" },
        el("h3", {
          textContent: me.card.age < 18 ? labels.householdHome : labels.home,
        }),
        el("p", { textContent: words(dwelling.kind ?? "") }),
      );
      const url = dwelling.presentation?.imageUrl;
      if (url) {
        const image = el("img", {
          src: url,
          alt: "",
          className: "property-image",
        });
        image.onerror = () => image.remove();
        home.prepend(image);
      }
      home.append(
        row(
          labels.tenure,
          dwelling.tenure === "own" ? labels.owned : labels.rented,
        ),
      );
      if (dwelling.valueMinor !== undefined)
        home.append(row(labels.value, dollars(dwelling.valueMinor)));
      if (dwelling.rentMinor !== undefined)
        home.append(
          row(labels.rent, `${dollars(dwelling.rentMinor)} ${labels.monthly}`),
        );
      root.append(home);
    }
    if (bank?.month)
      root.append(
        el(
          "section",
          { className: "money-month" },
          el("h3", { textContent: `${labels.lastMonth} · ${bank.month.date}` }),
          row(labels.monthHousing, dollars(bank.month.housingMinor)),
          row(labels.monthEveryday, dollars(bank.month.everydayMinor)),
          row(labels.monthPaid, dollars(bank.month.paidMinor)),
          row(labels.monthUnpaid, dollars(bank.month.unpaidMinor)),
          ...(bank.loanPayments?.length
            ? [
                el("h3", { textContent: labels.loanPayments }),
                ...bank.loanPayments.map((payment) =>
                  row(
                    payment.date,
                    `${dollars(payment.paidMinor)} ${labels.loanPaid} · ${dollars(payment.dueMinor)} ${labels.loanDue}`,
                  ),
                ),
              ]
            : []),
        ),
      );
    if (bank)
      root.append(
        el(
          "section",
          { className: "money-bank" },
          ...[
            row("Bank", bank.name),
            row(
              "Household savings",
              `${dollars(bank.savingsMinor)} · ${bank.savingsDate}`,
            ),
            ...(bank.books
              ? [
                  row("Bank books", bank.books.date),
                  row("Bank cash", dollars(bank.books.cashMinor)),
                  row("Business loans", dollars(bank.books.businessLoansMinor)),
                  row(
                    "Household loans",
                    dollars(bank.books.householdLoansMinor),
                  ),
                  row("Mortgages", dollars(bank.books.mortgagesMinor)),
                  row("Total assets", dollars(bank.books.assetsMinor)),
                  row("Deposits owed", dollars(bank.books.depositsMinor)),
                  row(
                    "Mortgage funding",
                    dollars(bank.books.mortgageFundingMinor),
                  ),
                  row("Bank equity", dollars(bank.books.equityMinor)),
                  row(
                    "Liabilities and equity",
                    dollars(bank.books.liabilitiesAndEquityMinor),
                  ),
                ]
              : []),
          ],
        ),
      );
    const deductions = Object.entries(budget.withholding?.byLine ?? {});
    if (deductions.length)
      root.append(
        el(
          "section",
          { className: "money-deductions" },
          el("h3", { textContent: labels.deductions }),
          ...deductions.map(([name, value]) =>
            row(words(name), dollars(value)),
          ),
        ),
      );
    for (const [key, label] of [
      ["assets", labels.assets],
      ["debts", labels.debts],
    ])
      for (const item of finances[key] ?? [])
        root.append(
          makeCard(
            "money-item",
            { as: "section" },
            el("span", { className: "label", textContent: label }),
            el("h3", { textContent: item.name }),
            el("strong", { textContent: dollars(item.minor) }),
          ),
        );
    return [...root.children].map((node) => {
      node.classList.add("money-section");
      return node;
    });
  },
  async jobs() {
    const labels = controls.jobs;
    const job = me.card.job;
    const work = makeCard(
      "work-overview",
      { as: "section" },
      el("h3", { textContent: labels.work }),
    );
    if (job) {
      if (job.presentation?.imageUrl) {
        const image = el("img", {
          src: job.presentation.imageUrl,
          alt: "",
          className: "workplace-image",
        });
        image.onerror = () => image.remove();
        work.append(image);
      }
      work.append(
        el("h2", { textContent: job.title }),
        el("p", {
          className: "work-employer",
          textContent: job.employer ?? "",
        }),
        el(
          "div",
          { className: "work-stats" },
          el(
            "div",
            {},
            el("span", { className: "label", textContent: labels.pay }),
            el("strong", {
              textContent: `${dollars(job.wageDailyMinor)} ${labels.daily}`,
            }),
          ),
          el(
            "div",
            {},
            el("span", { className: "label", textContent: labels.hours }),
            el("strong", {
              textContent: `${job.hoursDaily.toFixed(1)} ${labels.daily}`,
            }),
          ),
        ),
      );
    } else
      work.append(
        el("p", { className: "work-empty", textContent: labels.noJob }),
      );
    const result = [work];
    const schools = [...(me.card.schools ?? [])].reverse();
    const education = el(
      "section",
      { className: "study-overview" },
      el("h3", { textContent: labels.study }),
    );
    education.append(
      ...schools.map((s) =>
        el(
          "article",
          { className: "school-record" },
          el("span", { className: "label", textContent: s.date.slice(0, 4) }),
          el("h4", { textContent: s.name }),
        ),
      ),
    );
    result.push(education);
    return result;
  },
  async journal() {
    const chapters = await api(`/api/journal?id=${encodeURIComponent(me.id)}`);
    // A chapter's title heads it only when there is more than one chapter: a
    // lone title over the only story restates the screen (principles rule 3).
    return chapters.map((c) =>
      listRow(
        "narrative",
        {},
        ...(chapters.length > 1 ? [el("b", { textContent: c.title })] : []),
        c.lines.map((l) => l.text).join(" "),
      ),
    );
  },
  async map() {
    const m = await api("/api/map");
    if (!m) return [];
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const [x0, y0, x1, y1] = m.bbox;
    svg.setAttribute("viewBox", `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
    svg.setAttribute("class", "gov-map");
    const shape = (d, cls, title) => {
      const el2 = document.createElementNS(ns, "path");
      el2.setAttribute("d", d);
      el2.setAttribute("class", cls);
      if (title) {
        const t = document.createElementNS(ns, "title");
        t.textContent = title;
        el2.append(t);
      }
      svg.append(el2);
    };
    if (m.state) shape(m.state.d, "state");
    for (const c of m.counties) shape(c.d, "county", c.name);
    const legend = [];
    for (const [layer, district] of Object.entries(m.yours)) {
      if (!district?.d) continue;
      shape(
        district.d,
        `yours ${layer}`,
        `${district.name}: ${district.holders.join(", ")}`,
      );
      legend.push(row(district.name, district.holders.join(" · ")));
    }
    return [listRow("map", {}, svg), ...legend];
  },
  async handoff() {
    const people = [
      ...(me.card.home?.members ?? []).map((m) => ({
        id: m.personId,
        name: m.name,
        why: m.relation ?? "home",
        alive: m.alive,
      })),
      ...me.card.ties.map((t) => ({
        id: t.personId,
        name: t.name,
        why: t.relation ?? t.kind,
        alive: t.alive,
      })),
    ]
      // Only the living can be carried on as.
      .filter((p) => p.alive !== false)
      .filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
    return [
      row(me.card.name, "†"),
      ...people.map((p) => {
        const line = row(p.name, `${p.why} `);
        const b = makeButton({ textContent: "Play" });
        b.addEventListener("click", () => playAs(p.id));
        line.append(b);
        return line;
      }),
    ];
  },
  async family() {
    const members = await api(`/api/family?id=${encodeURIComponent(me.id)}`);
    return members
      .filter((m) => m.name)
      .map((m) => {
        const card = makeCard("family-card", {});
        if (m.backdrop) {
          const pic = el(
            "div",
            { className: "family-pic" },
            el("img", { src: m.backdrop, alt: "" }),
          );
          if (m.figureUrl)
            pic.append(
              el("img", {
                className: "family-figure",
                src: m.figureUrl,
                alt: m.name,
              }),
            );
          card.append(pic);
        }
        card.append(
          el("b", { textContent: m.name }),
          el("div", {
            textContent: `${m.relation ? `${m.relation} · ` : ""}${m.age}${m.alive === false ? " · †" : ""}`,
          }),
          el("div", { textContent: m.place ? `${m.place} · ${m.doing}` : "" }),
        );
        return card;
      });
  },
  async budgets() {
    const view = await api(`/api/budget?id=${encodeURIComponent(me.id)}`);
    const labels = controls.politics;
    const select = el("select");
    select.setAttribute("aria-label", labels.budget);
    for (const gov of view.governments)
      select.append(el("option", { value: gov.id, textContent: gov.name }));
    const content = el("section", { className: "budget-content" });
    const draw = () => {
      const gov = view.governments.find((g) => g.id === select.value);
      content.replaceChildren();
      if (!gov?.latest) return;
      const latest = gov.latest;
      const total = (lines) => lines.reduce((sum, r) => sum + r.minor, 0);
      // What the treasury actually took in and paid out, from its journal,
      // beside the plan: a treasury gone wrong shows here.
      const books = gov.books;
      content.append(
        el("h3", { textContent: `${gov.name} · ${latest.fiscalYear}` }),
        el("p", {
          className: "label",
          textContent: [
            `${labels.adopted} ${proseDate(latest.adoptedOn)}`,
            books
              ? `${labels.booksSince} ${proseDate(books.since)}`
              : labels.noBooks,
          ].join(" · "),
        }),
      );
      const summary = el("div", {
        className: `budget-summary${books ? " with-books" : ""}`,
      });
      for (const [label, value] of [
        [labels.revenue, total(latest.revenue)],
        [labels.spending, total(latest.spending)],
        [labels.balance, total(latest.revenue) - total(latest.spending)],
        ...(books
          ? [
              [labels.takenIn, books.takenInMinor],
              [labels.paidOut, books.paidOutMinor],
              [labels.cashOnHand, books.cashMinor],
            ]
          : []),
      ])
        summary.append(
          el(
            "div",
            {},
            el("span", { className: "label", textContent: label }),
            el("strong", {
              className: "record-total",
              textContent: roundedDollars(value),
            }),
          ),
        );
      content.append(summary);
      if (books && books.paidOutMinor > total(latest.spending))
        content.append(
          el("p", {
            className: "budget-warning",
            textContent: labels.overBudget,
          }),
        );
      const columns = el("div", { className: "budget-columns" });
      for (const [label, lines] of [
        [labels.revenue, latest.revenue],
        [labels.spending, latest.spending],
      ]) {
        const chart = comparison(
          lines.map((r) => ({ label: r.name ?? r.line, value: r.minor })),
          label,
          roundedDollars,
        );
        const rows = [...chart.children];
        if (gov.youAreExecutive && label === labels.spending)
          rows.forEach((row, index) => {
            const record = lines[index];
            for (const [name, sign] of [
              [labels.decrease, -1],
              [labels.increase, 1],
            ]) {
              const b = makeButton({
                textContent: sign > 0 ? "+" : "−",
                title: name,
              });
              b.setAttribute(
                "aria-label",
                `${name} ${record.name ?? record.line}`,
              );
              b.onclick = async () => {
                b.disabled = true;
                try {
                  await post(
                    `/api/budget/priority?${new URLSearchParams({ governmentId: gov.id, line: record.line, change: String((gov.priorities?.changes?.[record.line] ?? 0) + sign * 10_000_000) })}`,
                  );
                  await openSheet("budgets");
                } finally {
                  b.disabled = false;
                }
              };
              row.append(b);
            }
          });
        columns.append(
          el(
            "section",
            {},
            el("h3", { textContent: label }),
            menuPages(rows, 6),
          ),
        );
      }
      content.append(columns);
    };
    // The town's own books open first; a place with no city government opens
    // on the county's, the local government that serves it.
    const local = ["city", "county"].map((level) =>
      view.governments.find((g) => g.level === level && g.latest),
    );
    const town = local.find(Boolean);
    if (town) select.value = town.id;
    select.addEventListener("change", draw);
    draw();
    return [select, content];
  },
  async calendar() {
    const { date: recordDate, items } = await api(
      `/api/calendar?id=${encodeURIComponent(me.id)}`,
    );
    // Today is the day the player's clock names, which the calendar opens on.
    const date = packet?.at.date ?? recordDate;
    const labels = controls.calendar;
    const byDate = new Map();
    for (const item of items)
      byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
    const dateWords = (iso) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    const event = (item) =>
      el(
        "article",
        { className: "calendar-event" },
        el("span", { className: "label", textContent: kindName(item.kind) }),
        el("p", {
          textContent:
            controls.policyNames?.[item.title] ?? slugWords(item.title),
        }),
      );
    let month = new Date(`${date.slice(0, 7)}-01T12:00:00`);
    let selected = date;
    let upcomingPage = 0;
    let dayPage = 0;
    const root = el("div", { className: "calendar-layout" });
    const monthBox = el("section", { className: "calendar-month" });
    const details = el("section", { className: "calendar-details" });
    const upcoming = el("section", { className: "calendar-upcoming" });
    const button = (label, fn) => {
      const b = makeButton({ textContent: label });
      b.addEventListener("click", fn);
      return b;
    };
    // Skip-forward icon, no label text: the control's name is its aria-label.
    const skipForward = (name, fn) => {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("aria-hidden", "true");
      for (const d of ["M5 5l9 7-9 7z", "M14 5l9 7-9 7z"]) {
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", d);
        svg.append(path);
      }
      const b = makeButton({ className: "skip-forward" });
      b.setAttribute("aria-label", name);
      b.append(svg);
      b.addEventListener("click", fn);
      return b;
    };
    const skipControl = () =>
      skipForward(labels.advance, () => {
        closeSheet();
        act(`/api/advance?mode=calendar&date=${selected}`);
      });
    const paging = (index, count, change) => {
      const back = button(labels.back, () => change(index - 1));
      const next = button(labels.next, () => change(index + 1));
      back.disabled = index === 0;
      next.disabled = (index + 1) * 3 >= count;
      return el("nav", { className: "calendar-paging" }, back, next);
    };
    // The day panel opens only for a day that has something.
    const drawDetails = () => {
      const entries = byDate.get(selected) ?? [];
      root.classList.toggle("has-day", entries.length > 0);
      details.hidden = !entries.length;
      if (!entries.length) {
        details.replaceChildren();
        return;
      }
      details.replaceChildren(
        el("h3", { textContent: dateWords(selected) }),
        ...entries.slice(dayPage * 3, dayPage * 3 + 3).map(event),
      );
      if (entries.length > 3)
        details.append(
          paging(dayPage, entries.length, (page) => {
            dayPage = page;
            drawDetails();
          }),
        );
      if (selected > date) details.append(skipControl());
    };
    const select = (iso) => {
      selected = iso;
      dayPage = 0;
      drawMonth();
      drawDetails();
    };
    const drawMonth = () => {
      const move = (delta) => {
        month = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
        drawMonth();
      };
      const header = el(
        "nav",
        { className: "calendar-heading" },
        button(labels.previousMonth, () => move(-1)),
        el("h3", {
          textContent: month.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
        }),
        button(labels.nextMonth, () => move(1)),
      );
      const grid = el("div", { className: "month" });
      for (const weekday of labels.weekdays)
        grid.append(el("span", { className: "weekday", textContent: weekday }));
      for (let i = 0; i < month.getDay(); i++) grid.append(el("span"));
      const days = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0,
      ).getDate();
      for (let day = 1; day <= days; day++) {
        const iso = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const entries = byDate.get(iso) ?? [];
        const cell = button(String(day), () => select(iso));
        cell.className = `day${iso === date ? " today" : ""}${iso === selected ? " selected" : ""}`;
        cell.dataset.date = iso;
        cell.setAttribute("aria-label", dateWords(iso));
        cell.setAttribute("aria-pressed", String(iso === selected));
        if (iso === date) cell.setAttribute("aria-current", "date");
        // One small Kit 13 icon per kind of thing on the day.
        if (entries.length)
          cell.append(
            el(
              "span",
              {
                className: "entry",
                title: entries
                  .map(
                    (i) =>
                      controls.policyNames?.[i.title] ?? slugWords(i.title),
                  )
                  .join("\n"),
              },
              ...[...new Set(entries.map((i) => dayIcon(i.kind)))].map((icon) =>
                el("img", {
                  src: `/ui/kit13/calendar-${icon}.png`,
                  alt: "",
                  className: "day-icon",
                }),
              ),
            ),
          );
        grid.append(cell);
      }
      monthBox.replaceChildren(
        header,
        grid,
        el(
          "div",
          { className: "calendar-month-foot" },
          button(labels.today, () => {
            month = new Date(`${date.slice(0, 7)}-01T12:00:00`);
            select(date);
          }),
          // A day with nothing on it has no panel, so its date and the skip sit here.
          ...(selected > date && !byDate.has(selected)
            ? [
                el("span", {
                  className: "calendar-day-date",
                  textContent: dateWords(selected),
                }),
                skipControl(),
              ]
            : []),
        ),
      );
    };
    const next = items
      .filter((i) => i.date >= date)
      .toSorted((a, b) => a.date.localeCompare(b.date));
    const drawUpcoming = () => {
      upcoming.replaceChildren(
        el("h3", { textContent: labels.upcoming }),
        ...next.slice(upcomingPage * 3, upcomingPage * 3 + 3).map((item) => {
          const b = button(dateWords(item.date), () => {
            month = new Date(`${item.date.slice(0, 7)}-01T12:00:00`);
            select(item.date);
          });
          return el("div", {}, b, event(item));
        }),
      );
      if (next.length > 3)
        upcoming.append(
          paging(upcomingPage, next.length, (page) => {
            upcomingPage = page;
            drawUpcoming();
          }),
        );
    };
    drawMonth();
    drawDetails();
    drawUpcoming();
    root.append(monthBox, details, upcoming);
    return [root];
  },
  async news() {
    // The nation, region and job numbers above the paper, from the economy's records.
    const e = await api(`/api/economy?id=${encodeURIComponent(me.id)}`);
    const pct = (value) => (value === undefined ? "" : `${value.toFixed(1)}%`);
    const econ = controls.news?.economy ?? {};
    // A month of record ("2025-01") as a reader says it: January 2025.
    const monthWords = (month) =>
      /^\d{4}-\d{2}$/.test(String(month))
        ? new Date(`${month}-15T12:00:00Z`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })
        : "";
    // A region's series by its control name and unit; a series with no
    // control name is not shown.
    const count = new Intl.NumberFormat("en-US");
    const value = (unit, v) =>
      unit === "percent"
        ? `${v.toFixed(1)}%`
        : unit === "thousands"
          ? count.format(Math.round(v * 1000))
          : unit === "dollars"
            ? dollars(Math.round(v * 100))
            : v.toFixed(1);
    const economy = e.nation
      ? [
          row(
            `${econ.nation} · ${monthWords(e.nation.month)}`,
            `${econ.unemployment} ${pct(e.nation.unemploymentPct)} · ${econ.inflation} ${pct(e.nation.inflationPct)} · ${econ.policyRate} ${pct(e.nation.policyRatePct)} · ${econ.mortgage} ${pct(e.nation.mortgage30Pct)}`,
          ),
          ...(e.region
            ? [
                // The region's rate under the area it covers, beside the nation's.
                row(
                  `${e.region.name ? e.region.name.replace(/^./, (c) => c.toUpperCase()) : econ.region} · ${monthWords(e.region.month)}`,
                  Object.entries(e.region)
                    .filter(
                      ([k, v]) => typeof v === "number" && econ.series?.[k],
                    )
                    .map(
                      ([k, v]) =>
                        `${econ.series[k].label} ${value(econ.series[k].unit, v)}`,
                    )
                    .join(" · "),
                ),
              ]
            : []),
          ...(e.jobs
            ? [
                row(
                  econ.jobsHere,
                  `${e.jobs.employed} ${econ.employed} · ${e.jobs.seekers} ${econ.looking} · ${e.jobs.openPositions} ${econ.open}`,
                ),
              ]
            : []),
        ]
      : [];
    const [rows, opening] = await Promise.all([
      api(`/api/news?id=${encodeURIComponent(me.id)}`),
      api(`/api/opening?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.news;
    // One feed: the night's lead story the toast showed first, then what you heard,
    // newest first. News and the toast read the same stories through storyHeadline.
    const stories = [
      ...(opening?.news?.stories ?? []),
      ...rows.filter((r) => r.headline || r.lede),
    ].filter(storyHeadline);
    const outlets = new Map();
    for (const story of stories) {
      const outlet = story.outlet ??
        opening?.news?.outlet ?? {
          id: "news",
          name: labels.title,
          layout: "broadsheet",
        };
      const key = outlet.id ?? outlet.name;
      if (!outlets.has(key)) outlets.set(key, { ...outlet, stories: [] });
      outlets.get(key).stories.push(story);
    }
    if (!outlets.size)
      outlets.set("news", {
        name: labels.title,
        layout: "broadsheet",
        stories: [],
      });
    let chosen = outlets.keys().next().value;
    let page = 0;
    const paper = el("section", { className: "paper" });
    const outletPicker = el("nav", { className: "outlet-picker" });
    const button = (label, fn) => {
      const b = makeButton({ textContent: label });
      b.onclick = fn;
      return b;
    };
    const dateWords = (iso) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    const imageFor = (story) => {
      const url = story.presentation?.imageUrl ?? story.imageUrl;
      if (!url) return [];
      const image = el("img", {
        className: "story-image",
        src: url,
        alt: story.presentation?.imageAlt ?? "",
      });
      image.onerror = () => image.remove();
      return [image];
    };
    const article = (story) => {
      let articlePage = 0;
      const text =
        story.paragraphs ??
        story.broadcast?.map((line) => line.text) ??
        [story.lede].filter(Boolean);
      const chunks = text.flatMap((paragraph) => {
        const tokens = paragraph.split(/\s+/);
        const result = [];
        for (let i = 0; i < tokens.length; i += 100)
          result.push(tokens.slice(i, i + 100).join(" "));
        return result;
      });
      const drawArticle = () => {
        const back = button(labels.back, draw);
        const body = el(
          "div",
          { className: "article-body" },
          ...chunks
            .slice(articlePage * 2, articlePage * 2 + 2)
            .map((text) => el("p", { textContent: text })),
        );
        const prev = button(labels.previous, () => {
          articlePage--;
          drawArticle();
        });
        prev.disabled = articlePage === 0;
        const next = button(labels.next, () => {
          articlePage++;
          drawArticle();
        });
        next.disabled = (articlePage + 1) * 2 >= chunks.length;
        paper.replaceChildren(
          back,
          el("h2", {
            className: "article-title",
            textContent: story.headline ?? story.lede,
          }),
          body,
          ...(chunks.length > 2
            ? [el("nav", { className: "paper-pager" }, prev, next)]
            : []),
        );
      };
      drawArticle();
    };
    const draw = () => {
      const outlet = outlets.get(chosen);
      const layout = ["broadsheet", "modern", "tabloid", "weekly"].includes(
        outlet.layout,
      )
        ? outlet.layout
        : "broadsheet";
      paper.className = `paper paper-${layout}`;
      // A front page (owner, Oct 27: "News is a newspaper with story text"):
      // the lead story with its text, the next stories with theirs beside it,
      // and stories with only a headline as briefs. Every word is the English
      // engine's; record rows with kinds and series names are not printed.
      // Print takes the story's written paragraphs, else its lede; a
      // newscast's spoken lines (greetings, hand-offs) are not print.
      const told = (story) =>
        story.paragraphs ?? (story.lede && story.headline ? [story.lede] : []);
      const pageStories = outlet.stories.slice(page * 6, page * 6 + 6);
      const [lead, ...rest] = pageStories;
      const withText = rest.filter((story) => told(story).length);
      const briefs = rest.filter((story) => !told(story).length);
      const storyBlock = (story, className, paragraphs) => {
        const headline = button(storyHeadline(story), () => article(story));
        headline.className = "story-headline";
        return el(
          "article",
          { className: `paper-story ${className}` },
          ...(className === "lead" ? imageFor(story) : []),
          headline,
          ...told(story)
            .slice(0, paragraphs)
            .map((text, at) =>
              el("p", {
                className: at === 0 ? "story-lede" : "story-text",
                textContent: text,
              }),
            ),
        );
      };
      paper.replaceChildren(
        el(
          "header",
          { className: "paper-masthead" },
          el("h2", { textContent: outlet.name ?? labels.title }),
          el("span", {
            className: "paper-date",
            textContent: dateWords(me.date),
          }),
        ),
        el(
          "div",
          { className: "paper-stories" },
          ...(lead ? [storyBlock(lead, "lead", 4)] : []),
          el(
            "div",
            { className: "paper-column" },
            ...withText.map((story) => storyBlock(story, "second", 2)),
            ...briefs.map((story) => storyBlock(story, "brief", 0)),
          ),
        ),
      );
      if (outlet.stories.length > 6) {
        const back = button(labels.previous, () => {
          page--;
          draw();
        });
        back.disabled = page === 0;
        const next = button(labels.next, () => {
          page++;
          draw();
        });
        next.disabled = (page + 1) * 6 >= outlet.stories.length;
        paper.append(el("nav", { className: "paper-pager" }, back, next));
      }
      chooseTab(outletPicker, "outlet", chosen);
    };
    if (outlets.size > 1)
      for (const [key, outlet] of outlets) {
        outletPicker.append(
          makeTab({
            key,
            attr: "outlet",
            label: outlet.name,
            onSelect: () => {
              chosen = key;
              page = 0;
              draw();
            },
          }),
        );
      }
    draw();
    return [...economy, outletPicker, paper];
  },
  async law() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    // What the law in force puts on your own record.
    const yours = me.card.lawEffects
      .filter((e) => !e.endedOn)
      .map((e) => row(policyLabel(e.question), `${e.what} · ${e.since}`));
    return [
      ...yours,
      ...v.law.map((law) =>
        listRow(
          "narrative",
          {},
          termLabel(policyLabel(law.series)),
          ` ${law.value === null ? "—" : amount(law.value, law.unit)}`,
          el(
            "div",
            {},
            ...law.levels
              .filter((level) => level.row)
              .map((level) =>
                el("div", {
                  textContent: `${lawLevelLabel(law, level)} · ${amount(level.row.value, level.row.unit)} · ${level.row.effectiveDate}${level.setAside ? ` · ${words(level.setAside)}` : ""}`,
                }),
              ),
            ...law.pending.map((row) =>
              el("div", {
                textContent: `${lawLevelLabel(law, pendingLevel(law, row))} · ${row.effectiveDate} → ${amount(row.value, row.unit)}`,
              }),
            ),
          ),
        ),
      ),
    ];
  },
  async changes() {
    const { ahead, took } = await api(
      `/api/changes?id=${encodeURIComponent(me.id)}`,
    );
    // Enacted, waiting for its date: the measure, what it sets, and when.
    const coming = ahead.map((law) =>
      listRow(
        "narrative",
        {},
        el("b", {
          textContent: `${law.date} · ${policyLabel(law.series)} · ${amount(law.value, law.unit)}`,
        }),
        `${law.measure} · ${law.jurisdiction}`,
      ),
    );
    return [
      ...coming,
      ...took.map((law) =>
        listRow(
          "narrative",
          {},
          el("b", {
            textContent: `${law.date} · ${policyLabel(law.series)} · ${law.was !== null ? `${amount(law.was, law.unit)} → ` : ""}${amount(law.value, law.unit)}`,
          }),
          [
            `${law.jurisdiction} · ${law.reached}`,
            ...(law.you ? [`${me.card?.name ?? ""}: ${law.you}`] : []),
            ...law.names.map((n) => `${n.name}: ${n.what}`),
          ].join(" · "),
        ),
      ),
    ];
  },
  /**
   * Politics' own guide: what each tab is for, a page each, then how a
   * player could run here, from the filing records: the race, the office
   * that takes filings, and the dates.
   */
  async politicsGuide() {
    const labels = controls.politics.guide;
    const [government, terms] = await Promise.all([
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
      api(`/api/guide?q=${encodeURIComponent("filing deadline")}`),
    ]);
    const deadlineTerm = terms.find((t) => t.key === "filing-deadline");
    const row = (label, value) =>
      el(
        "div",
        { className: "guide-fact" },
        el("span", { className: "label", textContent: label }),
        el("strong", { textContent: value }),
      );
    const page = (heading, ...body) =>
      el(
        "section",
        { className: "politics-guide-page" },
        el("h3", { textContent: heading }),
        ...body,
      );
    const pages = ["government", "issues", "parties", "campaigns"].map((tab) =>
      page(titles[tab], el("p", { textContent: labels[tab] })),
    );
    const next = government.nextFiling;
    pages.push(
      page(
        labels.runHere,
        ...(next
          ? [
              row(labels.race, next.title),
              row(
                labels.filesWith,
                next.filedWith.replace(
                  /\s*\(counter: ([^)]*)\)/g,
                  `, ${labels.atTheDeskOf} $1`,
                ),
              ),
              row(labels.filingOpens, proseDate(next.filingOpens)),
              row(labels.filingDeadline, proseDate(next.filingDeadline)),
              ...(deadlineTerm
                ? [
                    el("p", {
                      className: "small",
                      textContent: deadlineTerm.short,
                    }),
                  ]
                : []),
              ...(next.primaryDate
                ? [row(labels.primary, proseDate(next.primaryDate))]
                : []),
              row(labels.election, proseDate(next.electionDate)),
              ...(next.estimated
                ? [
                    el("p", {
                      className: "small",
                      textContent: labels.estimated,
                    }),
                  ]
                : []),
            ]
          : [el("p", { textContent: labels.noRace })]),
      ),
    );
    let at = 0;
    const box = el("div", { className: "politics-guide" });
    const draw = () => {
      const back = el("button", {
        type: "button",
        textContent: controls.politics.back,
        disabled: at === 0,
      });
      const forward = el("button", {
        type: "button",
        textContent: controls.politics.next,
        disabled: at === pages.length - 1,
      });
      back.onclick = () => {
        at--;
        draw();
      };
      forward.onclick = () => {
        at++;
        draw();
      };
      box.replaceChildren(
        pages[at],
        el("nav", { className: "record-pager" }, back, forward),
      );
    };
    draw();
    return [box];
  },
  async guide() {
    const search = el("input", {
      type: "search",
      value: guideQuery,
      placeholder: "Search",
    });
    const list = el("div", { className: "flow" });
    const fill = async () => {
      guideQuery = search.value;
      const rows = await api(
        `/api/guide?q=${encodeURIComponent(search.value)}`,
      );
      list.replaceChildren(
        ...rows.map((t) => {
          const line = listRow(
            "narrative",
            { as: "details", open: rows.length === 1 },
            el("summary", {}, el("b", { textContent: t.term }), ` ${t.short}`),
            el("p", { textContent: t.explanation }),
          );
          if (t.contextNote)
            line.append(el("p", { textContent: t.contextNote }));
          return line;
        }),
      );
    };
    search.addEventListener("input", fill);
    await fill();
    return [search, list];
  },
  async options() {
    await controlsReady;
    const labels = controls.options;
    const rows = [
      el(
        "div",
        { className: "option-setting" },
        el("span", { textContent: labels.version }),
        el("span", { textContent: await displayVersion() }),
      ),
    ];
    if (document.fullscreenEnabled) {
      const fullScreen = el("input", {
        type: "checkbox",
        checked: Boolean(document.fullscreenElement),
      });
      fullScreen.dataset.testid = "options-fullscreen";
      const status = el("p", { role: "status", className: "option-status" });
      fullScreen.addEventListener("change", async () => {
        fullScreen.disabled = true;
        status.textContent = "";
        try {
          if (fullScreen.checked)
            await document.documentElement.requestFullscreen();
          else await document.exitFullscreen();
        } catch {
          status.textContent = labels.fullScreenUnavailable;
        } finally {
          fullScreen.checked = Boolean(document.fullscreenElement);
          fullScreen.disabled = false;
        }
      });
      rows.push(
        el(
          "label",
          { className: "option-setting" },
          el("span", { textContent: labels.fullScreen }),
          fullScreen,
        ),
        status,
      );
    }
    const actions = el("div", { className: "acts options-actions" });
    const resume = makeButton({
      textContent: labels.continue,
    });
    resume.addEventListener("click", closeSheet);
    actions.append(resume);
    if (skipOpening) {
      const skip = makeButton({
        textContent: labels.skipOpening,
      });
      skip.addEventListener("click", () => {
        closeSheet();
        skipOpening?.();
      });
      actions.append(skip);
    }
    const guide = makeButton({ textContent: labels.guide });
    guide.addEventListener("click", () => openSheet("guide"));
    actions.append(guide);
    // Dev mode, for a developer's session only.
    const dev = makeButton({
      className: "dev-only",
      textContent: labels.devMode,
    });
    dev.addEventListener("click", () => window.open("/dev"));
    actions.append(dev);
    const quit = makeButton({
      textContent: labels.quitToTitle,
    });
    quit.dataset.testid = "quit-to-title";
    quit.addEventListener("click", () => window.location.reload());
    actions.append(quit);
    rows.push(actions);
    return rows;
  },
  async travel() {
    const [places, government] = await Promise.all([
      api(`/api/goto?id=${encodeURIComponent(me.id)}`),
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.travel;
    const search = el("input", { type: "search", placeholder: labels.search });
    search.setAttribute("aria-label", labels.search);
    const content = el("div", { className: "travel-destinations" });
    // The offices that take your filings: one card each, naming the races.
    const byOffice = new Map();
    for (const c of government.contests) {
      const filedWith = c.filingOffice.filedWith;
      const name = filedWith.replace(/\s*\([^)]*\)/g, "");
      if (!byOffice.has(name))
        byOffice.set(name, { name, filedWith, titles: [], filing: true });
      byOffice.get(name).titles.push(c.contest.title);
    }
    const counters = await Promise.all(
      [...byOffice.values()].map(async (office) => ({
        ...office,
        titles: [...new Set(office.titles)],
        presentation: {
          imageUrl: (
            await api(
              `/api/goto/counter-picture?filedWith=${encodeURIComponent(office.filedWith)}`,
            )
          ).url,
        },
      })),
    );
    const destinations = [...counters, ...places];
    // Why each card is listed, from the record that qualified it.
    // Three offices named, the rest counted, so a card stays a card.
    const someTitles = (titles) =>
      titles.length > 3
        ? `${titles.slice(0, 3).join(", ")} ${labels.andOthers.replace("{n}", titles.length - 3)}`
        : titles.join(", ");
    const reasonLine = (p) =>
      p.filing
        ? `${labels.reasons.filing} ${someTitles(p.titles)}`
        : [
            ...p.reasons.map((r) =>
              r.kind === "known"
                ? `${p.known.find((k) => k.personId === r.recordId)?.name} ${labels.reasons.known}`
                : r.kind === "action"
                  ? `${labels.reasons.action} ${(controls.actions?.[r.recordId] ?? words(r.recordId)).toLowerCase()}`
                  : labels.reasons[r.kind],
            ),
          ].join(" · ");
    // Open while someone works there now, by their own hours; else closed.
    const hereLine = (p) =>
      p.filing
        ? labels.filing
        : p.presentCount
          ? `${labels.open} · ${p.presentNames.join(", ")}${p.presentCount > p.presentNames.length ? ` ${labels.andOthers.replace("{n}", p.presentCount - p.presentNames.length)}` : ""}`
          : labels.closed;
    const draw = () => {
      const found = destinations.filter((p) =>
        p.name.toLowerCase().includes(search.value.trim().toLowerCase()),
      );
      const cards = found.map((p) => {
        const go = () =>
          p.filing ? openFiling(p.filedWith) : visit(p.organizationId);
        const card = makeCard("travel-place", { as: "button" });
        card.type = "button";
        card.setAttribute("aria-label", `${labels.go}: ${p.name}`);
        if (p.presentation?.imageUrl) {
          const image = el("img", {
            src: p.presentation.imageUrl,
            alt: "",
            className: "travel-image",
          });
          image.onerror = () => image.remove();
          card.append(image);
        }
        // The record behind the reason, for the specs; never shown as text.
        card.dataset.reason = (
          p.filing
            ? [p.filedWith]
            : p.reasons.length
              ? p.reasons.map((r) => r.recordId)
              : [p.organizationId]
        ).join(" ");
        card.append(
          el(
            "div",
            { className: "travel-info" },
            el("h3", { textContent: p.name }),
            el("p", { className: "travel-here", textContent: hereLine(p) }),
            ...(reasonLine(p)
              ? [
                  el("p", {
                    className: "travel-reason",
                    textContent: reasonLine(p),
                  }),
                ]
              : []),
          ),
        );
        card.onclick = go;
        return card;
      });
      content.replaceChildren(...cards);
    };
    search.addEventListener("input", draw);
    draw();
    return [search, content];
  },
  async politics() {
    return sheets.government();
  },
  async office() {
    return seatRows();
  },
  async campaigns() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    // A filing whose race has been decided reads as won or lost.
    const decided = new Map(
      (await api(`/api/results?id=${encodeURIComponent(me.id)}`))
        .filter((race) => race.mine)
        .map((race) => [race.contestId, race.mine.won]),
    );
    const labels = controls.results;
    return [
      ...(await campaignRows()),
      await localRacesBlock(),
      ...v.filings.map((f) =>
        row(
          decided.has(f.contestId)
            ? decided.get(f.contestId)
              ? labels.won
              : labels.lost
            : words(f.status),
          f.filedWith,
        ),
      ),
    ];
  },
  async government() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const labels = controls.politics;
    const levelOf = (s) =>
      ["state", "federal"].includes(s.level) ? s.level : "local";
    // The race you ran in opens first: its level, its office, its seat.
    const race = v.ownRace;
    let level = race ? levelOf(race) : "local";
    let otherState = "";
    const picker = el("nav", { className: "government-picker" });
    const content = el("div", { className: "government-content" });
    // Another state's members at this level, its legislature or its members
    // of Congress: every sitting member, by chamber.
    const drawOtherState = async () => {
      const other = await api(
        `/api/government/state?${new URLSearchParams({ state: otherState, level })}`,
      );
      const chambers = new Map();
      for (const s of other.legislators) {
        if (!chambers.has(s.officeId)) chambers.set(s.officeId, []);
        chambers.get(s.officeId).push(s);
      }
      content.replaceChildren(
        menuPages(
          [...chambers.values()].map((seats) =>
            el(
              "section",
              { className: "government-body" },
              el("h3", { textContent: seats[0].title }),
              el("p", {
                className: "government-place",
                textContent: seats[0].government ?? "",
              }),
              menuPages(
                seats.map((s) =>
                  row(
                    s.holder
                      ? `${s.holder.givenName} ${s.holder.familyName}`
                      : labels.vacant,
                    s.holder?.party ?? "",
                  ),
                ),
                6,
              ),
            ),
          ),
          1,
        ),
      );
    };
    const statePick = el("select", { className: "government-state" });
    const draw = () => {
      statePick.hidden = level === "local";
      if (level !== "local" && otherState) {
        drawOtherState();
        chooseTab(picker, "level", level);
        return;
      }
      const offices = new Map();
      for (const s of v.seats.filter((s) => levelOf(s) === level)) {
        if (!offices.has(s.officeId)) offices.set(s.officeId, []);
        offices.get(s.officeId).push(s);
      }
      const raceOffice = [...offices.values()].findIndex((seats) =>
        seats.some((s) => s.seatId === race?.seatId),
      );
      content.replaceChildren(
        menuPages(
          [...offices.values()].map((seats) => {
            const first = seats[0];
            const parties = new Map();
            for (const s of seats)
              if (s.holder?.party)
                parties.set(
                  s.holder.party,
                  (parties.get(s.holder.party) ?? 0) + 1,
                );
            const card = el(
              "section",
              { className: "government-body" },
              el("h3", { textContent: first.title }),
              el("p", {
                className: "government-place",
                textContent: first.body ?? first.government ?? "",
              }),
            );
            if (first.presentation?.chamberUrl)
              card.append(
                recordImage(
                  first.presentation.chamberUrl,
                  "government-chamber",
                ),
              );
            if (parties.size)
              card.append(
                comparison(
                  [...parties].map(([label, value]) => ({ label, value })),
                  labels.seats,
                ),
              );
            const members = seats.map((s) => {
              const name = s.holder
                ? `${s.holder.givenName} ${s.holder.familyName}`
                : labels.vacant;
              const line = s.holder?.personId
                ? personRow({
                    name,
                    party: s.holder.party,
                    onOpen: () => {
                      closeSheet();
                      showPerson({ personId: s.holder.personId });
                    },
                  })
                : row(name, s.holder?.party ?? "");
              // Years of service and how the holder won, from the term and the seat's elections.
              if (s.holder) {
                const won = s.elections.find(
                  (e) => e.termId === s.holder.termId,
                );
                // The term as a voter would say it: when it ends, and how the
                // holder won it where the world ran the race.
                const monthYear = (iso) =>
                  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  });
                const history = el("span", {
                  className: "person-row-note",
                  textContent: [
                    won
                      ? labels.electedWith
                          .replace("{date}", monthYear(won.date))
                          .replace("{share}", `${Math.round(won.share * 100)}%`)
                      : null,
                    s.holder.endDate
                      ? labels.termEnds.replace(
                          "{date}",
                          monthYear(s.holder.endDate),
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(". "),
                });
                // The record the line reads, for the specs; never shown as text.
                history.dataset.term = s.holder.termId;
                if (won) history.dataset.election = won.termId;
                if (history.textContent) line.append(history);
              }
              // Elected and not yet seated: who won the seat, and when they take office.
              if (s.elect) {
                const elect = listRow("elect", {
                  textContent: `${labels.elected} ${s.elect.name} · ${labels.takesOffice} ${proseDate(s.elect.takesOffice)}`,
                });
                elect.dataset.contest = s.elect.contestId;
                line.append(elect);
              }
              // Your race for this seat: won or lost, and the votes each side got.
              if (race && s.seatId === race.seatId) {
                const result = controls.results;
                const own = listRow("own-race", {
                  textContent: [
                    result.yourRace,
                    race.won ? result.won : result.lost,
                    `${result.you} ${race.votes.toLocaleString("en-US")}`,
                    race.rival
                      ? `${race.rival.name} ${race.rival.votes.toLocaleString("en-US")}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                });
                own.dataset.contest = race.contestId;
                own.dataset.record = race.recordId;
                line.append(own);
              }
              return line;
            });
            card.append(
              menuPages(
                members,
                6,
                seats.findIndex((s) => s.seatId === race?.seatId),
              ),
            );
            // Future public view records can supply these without changing the layout.
            for (const vote of first.votes ?? [])
              card.append(
                el("h4", { textContent: vote.title }),
                comparison(
                  [
                    { label: labels.yes, value: vote.yes },
                    { label: labels.no, value: vote.no },
                  ],
                  labels.votes,
                ),
              );
            for (const item of first.agenda ?? [])
              card.append(row(item.date, item.title));
            return card;
          }),
          1,
          raceOffice,
        ),
      );
      chooseTab(picker, "level", level);
    };
    for (const key of ["local", "state", "federal"]) {
      picker.append(
        makeTab({
          key,
          attr: "level",
          label: controls.levels?.[key] ?? words(key),
          onSelect: () => {
            level = key;
            draw();
          },
        }),
      );
    }
    // Which state's legislature the State view shows: the player's own, or any other.
    const { states } = await api(`/api/government/state?state=`);
    statePick.append(
      el("option", { value: "", textContent: labels.ownState }),
      ...states.map((st) =>
        el("option", { value: st.key, textContent: st.name }),
      ),
    );
    statePick.setAttribute("aria-label", labels.stateFilter);
    statePick.addEventListener("change", () => {
      otherState = statePick.value;
      draw();
    });
    picker.append(statePick);
    draw();
    // The key people: the player's own members first, then the President,
    // the Vice President and each chamber's leader by post and chamber (a
    // leader from another state names the state they serve). Every other
    // member is behind the State and Federal filters.
    const keyLine = (k) => {
      const line =
        k.post && !k.own
          ? row(`${words(k.post)}, ${k.chamber ?? k.officeTitle}`, k.name)
          : row(k.officeTitle, k.name);
      for (const text of [k.own && k.post ? words(k.post) : null, k.stateName])
        if (text)
          line.append(el("span", { className: "label", textContent: text }));
      // The President and Vice President a territory's voters do not choose.
      if (k.chosenByHere === false)
        line.append(
          el("span", {
            className: "label",
            textContent: controls.politics.notChosenHere,
          }),
        );
      // Play anyone: a resident officeholder can be taken over (bench only).
      if (k.resident && k.personId !== me.id) {
        const b = makeButton({
          className: "dev-only",
          textContent: "Play",
        });
        b.addEventListener("click", () => playAs(k.personId));
        line.append(b);
      }
      return line;
    };
    const own = v.keyPeople.filter((k) => k.own);
    const leaders = v.keyPeople.filter((k) => !k.own);
    // Each group stays in one column with its heading.
    const keyPeople = [
      [labels.yourMembers, own],
      [labels.leaders, leaders],
    ]
      .filter(([, rows]) => rows.length)
      .map(([title, rows]) =>
        el(
          "section",
          { className: "key-people" },
          el("h3", { textContent: title }),
          ...rows.map(keyLine),
        ),
      );
    // The party the player belongs to, with the tie's record and how their
    // views fit it; the parties they could join otherwise. Never joined: files
    // unaffiliated.
    const party = v.party ? partyRows(v.party) : [];
    return [picker, content, ...party, ...keyPeople];
  },
  async parties() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const groups = new Map();
    for (const seat of v.seats)
      if (seat.holder?.party)
        groups.set(seat.holder.party, [
          ...(groups.get(seat.holder.party) ?? []),
          seat,
        ]);
    return [...groups].map(([party, seats]) =>
      el(
        "section",
        { className: "party-section" },
        el("h3", { textContent: party }),
        el("strong", {
          className: "record-total",
          textContent: String(seats.length),
        }),
        el("span", {
          className: "label",
          textContent: controls.politics.seats,
        }),
        menuPages(
          seats.map((s) =>
            row(`${s.holder.givenName} ${s.holder.familyName}`, s.title),
          ),
          6,
        ),
      ),
    );
  },
  async issues() {
    const [v, changes] = await Promise.all([
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
      api(`/api/changes?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.politics;
    const search = el("input", {
      type: "search",
      placeholder: labels.searchIssues,
    });
    search.setAttribute("aria-label", labels.searchIssues);
    const list = el("div", { className: "issues-content" });
    // A policy question's law reads yes or no; every other law, its amount.
    const lawText = (law, value, unit) =>
      law.yesNo ? (value ? labels.yes : labels.no) : amount(value, unit);
    const dateWords = (iso) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    const draw = () =>
      list.replaceChildren(
        menuPages(
          v.law
            .filter((l) =>
              policyLabel(l.series)
                .toLowerCase()
                .includes(search.value.toLowerCase()),
            )
            .map((law) => {
              const detail = makeCard(
                "law-card",
                { as: "details" },
                el(
                  "summary",
                  {},
                  el("h3", { textContent: policyLabel(law.series) }),
                  el("strong", {
                    className: "law-value",
                    textContent: law.text ?? lawText(law, law.value, law.unit),
                  }),
                ),
              );
              // A level's law and when it took effect; a starting answer to a
              // question names its statute instead, as its research did not
              // record the day it took effect.
              for (const level of law.levels.filter((l) => l.row))
                detail.append(
                  row(
                    lawLevelLabel(law, level),
                    [
                      lawText(law, level.row.value, level.row.unit),
                      !law.yesNo || level.row.terms?.enactedBy
                        ? dateWords(level.row.effectiveDate)
                        : level.row.terms?.cite,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  ),
                );
              for (const pending of law.pending)
                detail.append(
                  row(
                    `${lawLevelLabel(law, pendingLevel(law, pending))} · ${dateWords(pending.effectiveDate)}`,
                    lawText(law, pending.value, pending.unit),
                  ),
                );
              for (const change of [...changes.took, ...changes.ahead].filter(
                (c) => c.series === law.series,
              ))
                detail.append(
                  row(
                    dateWords(change.date),
                    [change.measure, change.jurisdiction, change.what]
                      .filter(Boolean)
                      .join(" · "),
                  ),
                );
              for (const vote of law.votes ?? [])
                detail.append(row(vote.name, vote.vote));
              return detail;
            }),
          4,
        ),
      );
    search.addEventListener("input", draw);
    draw();
    return [search, list];
  },
};
const titles = {
  people: "People",
  who: "Who you are",
  money: "Money and property",
  jobs: "Jobs and study",
  journal: "Journal",
  politics: "Politics",
  government: "Government",
  office: "Your office",
  campaigns: "Campaigns",
  parties: "Parties",
  issues: "Issues",
  calendar: "Calendar",
  budgets: "Budgets",
  family: "Family",
  travel: "Travel",
  options: "Options",
  guide: "Guide",
  politicsGuide: "Guide",
  changes: "What changed",
  law: "Law here",
  handoff: "Carry on as",
  map: "Map",
  news: "News",
};
// Screens shown as tabs across the top of one menu screen.
const groups = {
  politics: [
    "government",
    "office",
    "campaigns",
    "parties",
    "issues",
    "budgets",
    "politicsGuide",
  ],
  people: ["people", "family"],
  who: ["who", "jobs"],
};
const groupOf = (tab) =>
  Object.entries(groups).find(([, tabs]) => tabs.includes(tab))?.[0] ?? tab;
async function openSheet(tab) {
  await controlsReady;
  if (tab === "politics") tab = "government";
  if (groupOf(tab) === "people") coachUsed("people-tab");
  openTab = tab;
  if (tab === "news") markNews(true);
  show("tip", false);
  const group = groupOf(tab);
  const politics =
    group === "politics"
      ? await api(`/api/government?id=${encodeURIComponent(me.id)}`)
      : { seats: [], filings: [], ofVotingAge: false };
  const holdsOffice = politics.seats.some((s) => s.holder?.personId === me.id);
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === group);
  $("sheet-title").textContent = titles[group];
  $("sheet-tabs").replaceChildren(
    ...(groups[group] ?? [])
      .filter(
        (name) =>
          (name !== "office" || holdsOffice) &&
          // Budgets wait until they are the player's business: an office, a
          // filing, or the age to vote.
          (name !== "budgets" ||
            holdsOffice ||
            politics.filings.length > 0 ||
            politics.ofVotingAge),
      )
      .map((name) =>
        makeTab({
          key: name,
          label: titles[name],
          active: name === tab,
          onSelect: () => openSheet(name),
        }),
      ),
  );
  const body = await sheets[tab]();
  // A slower, earlier request must not reopen a sheet closed meanwhile.
  if (openTab !== tab) return;
  $("sheet").classList.toggle("options-sheet", tab === "options");
  const character = tab === "who";
  $("sheet").classList.toggle("character-sheet", character);
  $("sheet-media").hidden = !character;
  screenArtwork(
    character
      ? {
          portraitUrl:
            me.card.presentation?.portraitUrl !== undefined
              ? me.card.presentation.portraitUrl
              : portraitUrl(),
          backgroundUrl: me.card.presentation?.backgroundUrl,
          name: me.card.name,
        }
      : {},
  );
  $("sheet-body").replaceChildren(...body);
  $("sheet-body").classList.toggle(
    "cols",
    tab !== "who" && tab !== "calendar" && body.length > 12,
  );
  // A screen is as tall as what it holds (owner, Oct 27: "so much dead space");
  // the calendar, the people web and two-column readers fill the window.
  $("sheet").classList.toggle(
    "fits",
    !["calendar", "people", "family", "map", "who"].includes(tab) &&
      !$("sheet-body").classList.contains("cols"),
  );
  show("sheet", true);
  $("game").classList.add("sheet-open");
}
pageWhenChanged($("sheet-body"), $("sheet-pager"));
pageWhenChanged($("ballot-races"), $("ballot-pager"));
// The rail over the player card: a column of round icons, News among them; it is
// the one menu. The player's portrait opens Who you are (owner, Oct 20 and 27).
mountRail(
  $("rings"),
  ["journal", "calendar", "money", "politics", "news", "people", "travel"],
  titles,
);
// The portrait is the way to Who you are: named from the screen's title, and a
// key opens it as a click does.
$("card-bust").title = titles.who;
$("card-bust").setAttribute("aria-label", titles.who);
$("card-bust").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  $("card-bust").click();
});
for (const b of document.querySelectorAll("[data-tab]"))
  b.addEventListener("click", () =>
    groupOf(openTab) === b.dataset.tab && b.classList.contains("ring")
      ? closeSheet()
      : openSheet(b.dataset.tab),
  );
function closeSheet() {
  openTab = undefined;
  show("tip", false);
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.remove("active");
  show("sheet", false);
  $("game").classList.remove("sheet-open");
}
$("sheet-close").addEventListener("click", closeSheet);
document.addEventListener("fullscreenchange", () => {
  const checkbox = document.querySelector('[data-testid="options-fullscreen"]');
  if (checkbox) checkbox.checked = Boolean(document.fullscreenElement);
});

// ---- New life ----
// The title screen: a national scene or event, full window, that moves on with
// each visit (owner, Oct 8 and Oct 14). Continue resumes the life in progress.
let titleLife = null;
// The painting drifts by CSS while the title is open; every few seconds the
// next scene of the day's rotation fades in over it.
function rotateTitle(scenes, seconds) {
  let at = 0;
  const next = $("backdrop-next");
  setInterval(() => {
    if ($("front").hidden) return;
    at = (at + 1) % scenes.length;
    next.src = scenes[at].backdrop.url;
    next.onload = () => {
      next.onload = null;
      next.classList.add("fading");
      setTimeout(() => {
        if ($("front").hidden) return next.classList.remove("fading");
        const back = $("backdrop");
        back.src = next.src;
        back.style.animation = "none";
        void back.offsetWidth;
        back.style.animation = "";
        next.classList.remove("fading");
      }, 3100);
    };
  }, seconds * 1000);
}
api("/api/title").then((title) => {
  if (!$("front").hidden) $("backdrop").src = title.backdrop.url;
  if (title.scenes?.length > 1) rotateTitle(title.scenes, title.rotateSeconds);
  titleLife = title.life;
  $("front-continue").disabled = !titleLife;
  $("front-continue-life").textContent = titleLife
    ? `${titleLife.name}, ${titleLife.age} · ${titleLife.placeName}`
    : "";
  // The life's own face: the look the creator saved, as every other view of the player reads it.
  setBust(
    "front-continue-bust",
    titleLife?.portrait
      ? `/api/portrait?id=${encodeURIComponent(titleLife.personId)}`
      : "",
  );
});
// The build version, bottom right of the title (#4014).
void displayVersion().then((v) => ($("title-version").textContent = v));
$("front-continue").addEventListener("click", async () => {
  const life = titleLife;
  if (!life) return;
  me = {
    id: life.personId,
    placeName: life.placeName,
    date: life.date,
    minuteOfDay: life.minuteOfDay,
    names: {},
    portrait: life.portrait,
  };
  show("front", false);
  for (const id of ["rings", "card"]) show(id, true);
  $("game").classList.add("in-play");
  if (life.packet) renderPacket(life.packet);
  await refresh();
  // Still the opening evening: the night's paper is back on the table, read
  // from the kept opening, until living on clears it.
  const opening = await api(
    `/api/opening?id=${encodeURIComponent(life.personId)}`,
  );
  if (opening?.home?.date === life.date) showNewsSurface(opening.news);
});
// The desktop window closes (and the app quits); a browser tab has no Quit.
if (window.location.protocol === "app:") {
  show("front-quit", true);
  $("front-quit").addEventListener("click", () => window.close());
}
// The seed draws a world; Random draws a new one (Oct 13 front).
const drawSeed = () =>
  api("/api/seed").then((value) => {
    $("seed").value = value.seed;
    $("date").value = value.date;
  });
void drawSeed();
$("seed-random").addEventListener("click", () => void drawSeed());
/** What the player changed from real data; nothing means a real world. */
function worldSettings() {
  const read = (id) => {
    const text = $(id).value.trim();
    return text === "" ? undefined : Number(text);
  };
  const economy = Object.fromEntries(
    [
      ["wages", read("set-wages")],
      ["householdCash", read("set-cash")],
      ["outsideDemand", read("set-demand")],
    ].filter(([, v]) => v !== undefined),
  );
  const politics = Object.fromEntries(
    [
      ["leanShift", read("set-lean")],
      ["turnout", read("set-turnout")],
    ].filter(([, v]) => v !== undefined),
  );
  const settings = {
    ...(read("set-population") !== undefined
      ? { population: read("set-population") }
      : {}),
    ...(Object.keys(economy).length ? { economy } : {}),
    ...(Object.keys(politics).length ? { politics } : {}),
  };
  return Object.keys(settings).length ? settings : undefined;
}
$("front-options").addEventListener("click", () => openSheet("options"));
// The bench's developer controls sit behind one faint ring, off by default.
$("dev-toggle").addEventListener("click", () => {
  const dev = document.body.classList.toggle("dev");
  if (dev) $("talk-silent").before(gapButton);
  else gapButton.remove();
});
// New game: Custom world (the world's settings, then the creator), Start a
// life (the creator) or New world (straight in, a random person and place).
const FRONT_PANELS = [
  "front-main",
  "front-new",
  "front-advanced",
  "front-pick",
  "cr-character",
  "cr-place",
  "cr-look",
];
function frontPanel(name) {
  for (const id of FRONT_PANELS) show(id, id === name);
  // The loading card (no panel) sits in the top-left corner (owner, Oct 14).
  $("front").classList.toggle("loading", name === null);
}
// What the creator has chosen so far (the Oct 12 SetupScreen's setup).
const setup = {
  custom: false,
  seed: "",
  gender: null,
  nameDraws: 0,
  birthdayDraws: 0,
  appearanceDraws: 0,
  state: null,
  town: null,
  recipe: null,
  initial: null,
  previous: [],
};
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(Date.UTC(2000, i, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  }),
);
/** A record value as the player reads it: an ISO date in words, else as kept. */
function dateOrValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? proseDate(value) : value;
}
function proseDate(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
const genderName = (g) =>
  document.querySelector(`[data-gender="${g}"]`)?.textContent ?? "";
$("cr-month").replaceChildren(
  ...MONTHS.map((name, i) =>
    el("option", { value: String(i + 1), textContent: name }),
  ),
);
function fillDays() {
  const month = Number($("cr-month").value);
  const length = new Date(Date.UTC(2001, month, 0)).getUTCDate();
  const keep = Number($("cr-day").value) || 1;
  $("cr-day").replaceChildren(
    ...Array.from({ length }, (_, i) =>
      el("option", { value: String(i + 1), textContent: String(i + 1) }),
    ),
  );
  $("cr-day").value = String(Math.min(keep, length));
}
async function fillYears(keepYear) {
  const { start, years } = await api(
    `/api/creator/years?month=${$("cr-month").value}&day=${$("cr-day").value}`,
  );
  setup.start = start;
  const want = keepYear ?? Number($("cr-year").value);
  $("cr-year").replaceChildren(
    ...years.map((row) =>
      el("option", { value: String(row.year), textContent: row.label }),
    ),
  );
  const nearest = years.reduce(
    (best, row) =>
      Math.abs(row.year - want) < Math.abs(best.year - want) ? row : best,
    years[0],
  );
  $("cr-year").value = String(nearest.year);
  derivedAge();
}
function chosenAge() {
  return /\(age (\d+)\)/.exec(
    $("cr-year").selectedOptions[0]?.textContent ?? "",
  )?.[1];
}
function derivedAge() {
  const age = chosenAge();
  $("cr-derived-age").textContent =
    age && setup.start
      ? (controls.creator?.ageLine ?? "")
          .replace("{age}", age)
          .replace("{date}", proseDate(setup.start))
      : "";
}
$("cr-month").addEventListener("change", async () => {
  fillDays();
  await fillYears();
});
$("cr-day").addEventListener("change", () => fillYears());
$("cr-year").addEventListener("change", derivedAge);
function pickGender(g) {
  setup.gender = g;
  for (const b of document.querySelectorAll("[data-gender]")) {
    const on = b.dataset.gender === g;
    b.setAttribute("aria-pressed", String(on));
  }
}
for (const b of document.querySelectorAll("[data-gender]"))
  b.addEventListener("click", () => pickGender(b.dataset.gender));
$("cr-random-name").addEventListener("click", async () => {
  setup.nameDraws++;
  const name = await api(
    `/api/creator/name?${new URLSearchParams({ seed: setup.seed, draw: setup.nameDraws, gender: setup.gender ?? "" })}`,
  );
  $("cr-given").value = name.givenName;
  $("cr-family").value = name.familyName;
});
async function randomBirthday() {
  setup.birthdayDraws++;
  const b = await api(
    `/api/creator/birthday?${new URLSearchParams({ seed: setup.seed, draw: setup.birthdayDraws })}`,
  );
  $("cr-month").value = String(b.month);
  fillDays();
  $("cr-day").value = String(b.day);
  await fillYears(b.year);
}
$("cr-random-birthday").addEventListener("click", () => void randomBirthday());

/** Opens the creator for Start a life. */
async function openCreator() {
  // The seed Advanced holds, drawn when the page loads, draws the world.
  setup.seed = $("seed").value || (await api("/api/seed")).seed;
  $("cr-route-name").textContent = $("new-start").textContent.trim();
  if (!$("cr-year").options.length) await randomBirthday();
  frontPanel("cr-character");
}
$("new-life").addEventListener("click", () => frontPanel("front-new"));
$("new-back").addEventListener("click", () => frontPanel("front-main"));
$("new-advanced").addEventListener("click", () => frontPanel("front-advanced"));
$("new-start").addEventListener("click", () => void openCreator());
$("new-world").addEventListener("click", () => startLife({ custom: true }));
$("advanced-back").addEventListener("click", () => frontPanel("front-new"));
$("advanced-build").addEventListener(
  "click",
  () => void startLife({ custom: true, pick: true }),
);
$("pick-back").addEventListener("click", () => frontPanel("front-advanced"));
$("cr-route").addEventListener("click", () => frontPanel("front-new"));
$("cr-character-back").addEventListener("click", () => frontPanel("front-new"));
$("cr-character-next").addEventListener("click", () => {
  const given = $("cr-given").value.trim();
  const family = $("cr-family").value.trim();
  if (!setup.gender || !given || !family) {
    $("front-status").textContent = !setup.gender
      ? $("cr-character").querySelector("legend").textContent
      : $("cr-random-name").textContent;
    return;
  }
  $("front-status").textContent = "";
  $("cr-summary-name").textContent = `${given} ${family}`;
  $("cr-summary-age").textContent =
    `Age ${chosenAge()} · ${genderName(setup.gender)}`;
  const pad = (n) => String(n).padStart(2, "0");
  $("cr-summary-born").textContent =
    `Born ${proseDate(`${$("cr-year").value}-${pad($("cr-month").value)}-${pad($("cr-day").value)}`)}`;
  frontPanel("cr-place");
  void showStates();
});
$("cr-summary").addEventListener("click", () => frontPanel("cr-character"));
$("cr-place-back").addEventListener("click", () => frontPanel("cr-character"));

// Where are you from: a state, then a city or town with its population.
let states = [];
async function showStates() {
  if (!states.length) states = await api("/api/creator/states");
  const show2 = !setup.state;
  show("cr-state-pick", show2);
  show("cr-town-pick", !show2);
  if (show2) listStates();
  else void listTowns();
}
function listStates() {
  const q = $("cr-state-search").value.trim().toLowerCase();
  $("cr-states").replaceChildren(
    ...states
      .filter((s) => s.name.toLowerCase().includes(q))
      .map((s) => {
        const b = makeButton({
          className: "item",
          textContent: s.name,
        });
        b.dataset.testid = `state-${s.key}`;
        b.addEventListener("click", () => {
          setup.state = s;
          $("cr-state-name").textContent = s.name;
          $("cr-town-search").value = "";
          void showStates();
        });
        return b;
      }),
  );
}
$("cr-state-search").addEventListener("input", listStates);
$("cr-state").addEventListener("click", () => {
  setup.state = null;
  setup.town = null;
  void showStates();
});
let townAsk = 0;
async function listTowns() {
  const ask = ++townAsk;
  const towns = await api(
    `/api/creator/towns?${new URLSearchParams({ state: setup.state.key, q: $("cr-town-search").value })}`,
  );
  if (ask !== townAsk) return;
  const count = new Intl.NumberFormat("en-US");
  const words = controls.creator ?? {};
  $("cr-towns").replaceChildren(
    ...towns.map((t) =>
      townRow(
        t,
        words,
        (n) => count.format(n),
        (town) => {
          setup.town = town;
          void openLook();
        },
      ),
    ),
  );
}
$("cr-town-search").addEventListener("input", () => void listTowns());

// A row of color swatches: each a button named for its color, the chosen one marked.
function swatchRow(row) {
  const buttons = row.swatches.map((swatch) => {
    const b = makeButton({
      className: "swatch-button",
      style: `background:${swatch.color}`,
    });
    b.setAttribute("aria-label", `${row.label}: ${swatch.label}`);
    b.setAttribute("aria-pressed", String(swatch.chosen));
    b.title = swatch.label;
    b.dataset.swatch = swatch.id;
    b.addEventListener("click", () => void pickColor(row.id, swatch.id));
    return b;
  });
  const line = el(
    "div",
    { className: "look-row swatch-row" },
    el("span", { className: "label", textContent: row.label }),
    el("span", { className: "swatches" }, ...buttons),
    el("span", { className: "look-value", textContent: row.value }),
  );
  line.dataset.testid = `engine-appearance-${row.id}`;
  return line;
}
async function pickColor(row, value) {
  const view = await post(
    `/api/creator/appearance?${lookQuery({ recipe: JSON.stringify(setup.recipe), row, value })}`,
  );
  setup.previous = [...setup.previous, setup.recipe].slice(-20);
  showLook(view);
}

// Character appearance: the people engine's portrait and arrows.
function showLook(view) {
  setup.recipe = view.recipe;
  $("cr-portrait").src =
    `/api/portrait?recipe=${encodeURIComponent(JSON.stringify(view.recipe))}`;
  $("cr-rows").replaceChildren(
    ...view.rows.map((row) => {
      if (row.swatches) return swatchRow(row);
      const arrow = (by, glyph) => {
        const b = makeButton({
          className: "action small",
          textContent: glyph,
        });
        b.setAttribute(
          "aria-label",
          `${by < 0 ? "Previous" : "Next"} ${row.label.toLowerCase()}`,
        );
        b.addEventListener("click", () => void moveLook(row.id, by));
        return b;
      };
      const value = el("span", { className: "look-value" });
      if (row.swatch)
        value.append(
          Object.assign(el("i", { className: "swatch" }), {
            style: `background:${row.swatch}`,
          }),
        );
      value.append(row.value);
      const line = el(
        "div",
        { className: "look-row" },
        el("span", { className: "label", textContent: row.label }),
        arrow(-1, "‹"),
        value,
        arrow(1, "›"),
      );
      line.dataset.testid = `engine-appearance-${row.id}`;
      return line;
    }),
  );
  $("cr-reset").disabled =
    JSON.stringify(setup.recipe) === JSON.stringify(setup.initial);
  $("cr-undo").disabled = setup.previous.length === 0;
}
const lookQuery = (extra) =>
  new URLSearchParams({
    seed: setup.seed,
    gender: setup.gender,
    draw: setup.appearanceDraws,
    ...extra,
  });
async function openLook() {
  if (!setup.recipe || setup.lookGender !== setup.gender) {
    setup.lookGender = setup.gender;
    setup.previous = [];
    const view = await api(`/api/creator/appearance?${lookQuery({})}`);
    setup.initial = view.recipe;
    showLook(view);
  } else
    showLook(
      await api(
        `/api/creator/appearance?${lookQuery({ recipe: JSON.stringify(setup.recipe) })}`,
      ),
    );
  frontPanel("cr-look");
}
async function moveLook(row, by) {
  const view = await post(
    `/api/creator/appearance?${lookQuery({ recipe: JSON.stringify(setup.recipe), row, by })}`,
  );
  setup.previous = [...setup.previous, setup.recipe].slice(-20);
  showLook(view);
}
async function setLook(recipe, keepHistory) {
  if (keepHistory)
    setup.previous = [...setup.previous, setup.recipe].slice(-20);
  showLook(
    await api(
      `/api/creator/appearance?${lookQuery({ recipe: JSON.stringify(recipe) })}`,
    ),
  );
}
$("cr-randomize").addEventListener("click", async () => {
  setup.appearanceDraws++;
  const view = await api(`/api/creator/appearance?${lookQuery({})}`);
  await setLook(view.recipe, true);
});
$("cr-reset").addEventListener(
  "click",
  () => void setLook(setup.initial, true),
);
$("cr-undo").addEventListener("click", () => {
  const last = setup.previous.pop();
  if (last) void setLook(last, false);
});
$("cr-look-back").addEventListener("click", () => {
  frontPanel("cr-place");
  void showStates();
});
$("cr-begin").addEventListener("click", () =>
  startLife({
    placeKey: setup.town.key,
    person: {
      givenName: $("cr-given").value.trim(),
      familyName: $("cr-family").value.trim(),
      gender: setup.gender,
      birthYear: Number($("cr-year").value),
      birthMonth: Number($("cr-month").value),
      birthDay: Number($("cr-day").value),
      recipe: setup.recipe,
    },
  }),
);
const placeControls = ["new-world", "advanced-build", "cr-begin"];

/** Advanced start: everyone who holds an office in the built world, to play as. */
async function offerPlayAs(life) {
  const holders = await api("/api/advanced/officeholders");
  const labels = controls.advanced;
  const list = $("pick-list");
  const draw = () => {
    const found = holders.filter((h) =>
      `${h.name} ${h.title} ${h.government}`
        .toLowerCase()
        .includes($("pick-search").value.trim().toLowerCase()),
    );
    list.replaceChildren(
      ...found.slice(0, 60).map((h) => {
        const b = makeButton({
          textContent: `${h.name} · ${h.title}${h.government ? `, ${h.government.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())}` : ""}${h.party ? ` · ${h.party}` : ""}`,
        });
        b.dataset.record = h.termId;
        b.addEventListener("click", () => void enterAs(life, h.personId));
        return b;
      }),
      ...(found.length === 0
        ? [el("p", { className: "label", textContent: labels.none })]
        : []),
    );
  };
  $("pick-search").oninput = draw;
  draw();
  show("front-status", false);
  document.querySelector("#front .progress").hidden = true;
  frontPanel("front-pick");
  for (const id of placeControls) $(id).disabled = false;
}

/** Steps into one officeholder from today, with no opening address. */
async function enterAs(life, personId) {
  frontPanel(null);
  const value = await post(`/api/play?id=${encodeURIComponent(personId)}`);
  me = {
    id: value.personId,
    placeName: life.placeName,
    date: life.date,
    names: life.names,
    portrait: false,
  };
  show("front", false);
  for (const id of ["rings", "card"]) show(id, true);
  $("game").classList.add("in-play");
  renderPacket(value.packet);
  await refresh();
}

async function startLife({ custom = false, pick = false, placeKey, person }) {
  for (const id of placeControls) $(id).disabled = true;
  // The loading card: the panel holds only the progress over the scene.
  frontPanel(null);
  show("front-status", true);
  document.querySelector("#front .progress").hidden = false;
  try {
    const settings = custom ? worldSettings() : undefined;
    // Outside Custom world, a fresh seed draws the world.
    const seed = custom
      ? $("seed").value
      : setup.seed || (await api("/api/seed")).seed;
    // Real progress through every step, from the server's build.
    const bar = document.querySelector("#front .progress span");
    bar.classList.add("steady");
    const STEPS = [
      "people",
      "past",
      "economy",
      "core",
      "government",
      "opening",
    ];
    // A poll still in flight when the build ends leaves the line alone.
    let built = false;
    const poll = setInterval(async () => {
      const p = await api("/api/newlife/progress").catch(() => undefined);
      if (!p || built) return;
      const at =
        p.stage === "done" ? STEPS.length : Math.max(STEPS.indexOf(p.stage), 0);
      const within = p.total ? p.done / p.total : 0;
      bar.style.width = `${Math.round(((at + within) / (STEPS.length + 1)) * 100)}%`;
      $("front-status").textContent =
        `${controls.loading?.[p.stage] ?? ""}${p.total ? ` ${p.done} / ${p.total}` : ""}`;
    }, 400);
    let life;
    try {
      life = await post(
        `/api/newlife?${new URLSearchParams({ seed, date: $("date").value, ...(placeKey ? { placeKey } : {}), ...(person ? { person: JSON.stringify(person) } : {}), ...(settings ? { settings: JSON.stringify(settings) } : {}) })}`,
      );
    } finally {
      clearInterval(poll);
      built = true;
    }
    // Advanced: the world is built; choose whom to play, with no address.
    if (pick) {
      await offerPlayAs(life);
      return;
    }
    // Every picture the opening shows is loaded before it plays.
    const opening = await api(
      `/api/opening?id=${encodeURIComponent(life.personId)}`,
    );
    const urls = [
      ...new Set(
        (opening?.frames ?? []).flatMap((frame) => [
          frame.backdrop.url,
          ...frame.people.map((person) => person.figureUrl),
        ]),
      ),
    ];
    let loaded = 0;
    await Promise.all(
      urls.map(
        (src) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => {
              loaded++;
              bar.style.width = `${Math.round(((STEPS.length + loaded / urls.length) / (STEPS.length + 1)) * 100)}%`;
              $("front-status").textContent =
                `${controls.loading?.pictures ?? ""} ${loaded} / ${urls.length}`;
              resolve();
            };
            img.src = src;
          }),
      ),
    );
    openingReady = opening;
    me = {
      id: life.personId,
      placeName: life.placeName,
      date: life.date,
      names: life.names,
      portrait: Boolean(person?.recipe),
    };
    show("front", false);
    await playOpening();
    if (opening?.home) me.minuteOfDay = opening.home.minuteOfDay;
    // Home that evening (the server's rule for the opening day), with the
    // night's news to pick up, then the first choices pointed out.
    for (const id of ["rings", "card"]) show(id, true);
    $("game").classList.add("in-play");
    renderPacket(life.packet);
    await refresh();
    showNewsSurface(opening?.news);
    coachFirstChoices();
  } catch (error) {
    $("front-status").textContent = error.message;
    for (const id of placeControls) $(id).disabled = false;
    frontPanel(person ? "cr-look" : "front-new");
  } finally {
    document.querySelector("#front .progress").hidden = true;
  }
}
