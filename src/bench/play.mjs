/* global document, fetch, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, Image, window, localStorage, requestAnimationFrame, MutationObserver, ResizeObserver, getComputedStyle, __RELEASE_VERSION__ */
// The game screen on the new core: one scene, the player card, the menus.
// Words on screen are record data, engine text and control names only.
const $ = (id) => document.getElementById(id);
let me;
let packet;
let talk;
let openTab;
let busy = false;
let seenResults = 0;

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
 */
function pageIn(box, pager) {
  box.scrollTo(0, 0);
  const [back, next] = pager.querySelectorAll("button");
  // Measure with every row showing; a page then hides the rows that are not its own.
  for (const hidden of box.querySelectorAll(".paged-out"))
    hidden.classList.remove("paged-out");
  const rows = [
    ...box.querySelectorAll(":scope > *:not(.flow), :scope > .flow > *"),
  ];
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
        if (tops[index] + kid.offsetHeight - top > box.clientHeight) {
          top = tops[index];
          stops.push(top);
        }
      });
    }
  }
  let at = 0;
  const go = (index) => {
    at = index;
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
  go(0);
}
/** Pages again whenever the box's contents change (a search narrowing a list, a redrawn ballot). */
function pageWhenChanged(box, pager) {
  new MutationObserver(() =>
    requestAnimationFrame(() => pageIn(box, pager)),
  ).observe(box, { childList: true, subtree: true });
  new ResizeObserver(() =>
    requestAnimationFrame(() => pageIn(box, pager)),
  ).observe(box);
}
const dollars = (minor) =>
  (minor / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
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
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
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
  const line = el(
    "div",
    { className: "row" },
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
function screenArtwork({ portraitUrl, backgroundUrl, name }) {
  const media = $("sheet-media");
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
function show(id, on) {
  $(id).hidden = !on;
}

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

/** The people in a picture; anyone but you can be clicked for their dossier. */
function drawPeople(people, onClick) {
  $("people").replaceChildren(
    ...shadowsOf(people),
    ...people.map((person) => {
      const f = person.figure;
      const bottom = f.clipBelowPercent ?? f.topPercent + f.heightPercent;
      const visible = Math.max(bottom - f.topPercent, 0.1);
      const img = el("img", { src: person.figureUrl, alt: person.name });
      img.style.height = `${(f.heightPercent / visible) * 100}%`;
      // A whole figure turns to face the room.
      if (f.mirrored) img.style.transform = "scaleX(-1)";
      const box = el("div", { className: "figure" }, img);
      box.dataset.person = person.personId ?? "";
      Object.assign(box.style, {
        left: `${f.leftPercent}%`,
        top: `${f.topPercent}%`,
        width: `${f.widthPercent}%`,
        height: `${visible}%`,
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
      return box;
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
    for (const node of document.querySelectorAll("#people .figure"))
      if (node.dataset.person === figure.id) node.classList.add("pointed");
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
  // Who is speaking: the anchor's lead-in on the news, then the President.
  const speakerCard = (anchor) => {
    $("opening-bust").style.backgroundImage =
      !anchor && speaker.figureUrl ? `url("${speaker.figureUrl}")` : "";
    $("opening-name").textContent = anchor
      ? (controls.opening?.news ?? "")
      : speaker.name;
    $("opening-role").textContent = anchor
      ? ""
      : [speaker.title, ...speaker.detail].filter(Boolean).join(" · ");
  };
  speakerCard(false);
  show("opening-box", true);
  $("game").classList.add("letterbox", "cinema");
  frames: for (const frame of opening.frames) {
    $("backdrop").src = frame.backdrop.url;
    drawPeople(frame.people);
    $("stage").classList.remove("cut");
    void $("stage").offsetWidth;
    $("stage").classList.add("cut");
    speakerCard(frame.speaker === "anchor");
    // Who the camera points out: a household as the frame opens, anyone the
    // address names on the line that names them.
    const figures = frame.pointOut ?? [];
    let camera = pointOut(figures.filter((row) => row.line === undefined));
    // A stage the President says nothing over shows without the speech box.
    show("opening-box", frame.lines.length > 0);
    // A click moves on to the next sentence; Skip ends the address. The
    // picture holds until the camera has passed everyone on it.
    for (const [at, line] of frame.lines.entries()) {
      $("opening-speech").textContent = line.text;
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

/** That night's news at home: on the table, picked up to read. */
function showNewsSurface(news) {
  const story = news?.stories?.[0];
  if (!story) return;
  $("news-surface-label").textContent = controls.opening?.news ?? "";
  $("news-surface-headline").textContent =
    story.headline ?? story.lede ?? story.broadcast[0]?.text ?? "";
  $("news-surface").onclick = () => {
    coachUsed("news-surface");
    openNewsReader(news);
  };
  // The paper stays on the table for the evening; living on clears it.
  show("news-surface", true);
}
function openNewsReader(news) {
  const [lead, ...rest] = news.stories;
  $("news-reader-headline").textContent =
    lead.headline ?? lead.lede ?? lead.broadcast[0]?.text ?? "";
  $("news-reader-body").replaceChildren(
    ...lead.broadcast.map((line) =>
      el("p", { className: "prose", textContent: line.text }),
    ),
    // The address itself, as the record quotes it.
    ...news.address.map((text) =>
      el("p", { className: "speech quote", textContent: text }),
    ),
  );
  $("news-reader-more").replaceChildren(
    ...rest.map((item) =>
      el("p", {
        className: "prose",
        textContent:
          item.headline ??
          item.lede ??
          item.broadcast.map((line) => line.text).join(" "),
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
  drawPeople(scene.people, showPerson);
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
/** A policy question by its name on the bill catalog, else its key's last part in words. */
const policyLabel = (question) =>
  controls.policyNames?.[question] ?? words(question);
const controlsReady = api("/api/controls").then((value) => {
  controls = value;
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
  const work = value.stop.work?.reasons?.[0];
  if (work)
    return `${words[work.boundary] ?? ""} · ${me.names?.[work.owner.organizationId] ?? ""}`;
  const module = value.stop.modules[0];
  return module ? (words[module.reasonKey] ?? words.moment ?? "") : "";
}

/** The newest line of the journal, bottom right. */
async function renderJournalNote() {
  const chapters = await api(
    `/api/journal?id=${encodeURIComponent(me.id)}`,
  ).catch(() => []);
  const line = chapters.at(-1)?.lines.at(-1)?.text ?? "";
  $("journal-line").textContent = line;
}
async function refresh() {
  await Promise.all([renderScene(), renderCard(), renderJournalNote()]);
  // When your character dies, carry on as someone connected to them.
  if (me.card && me.card.alive === false) {
    await openSheet("handoff");
    return;
  }
  // Election night: new results open their sheet.
  const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
  if (races.length > seenResults) {
    seenResults = races.length;
    // Seen where you watched the returns: the party if you ran, else the polls.
    const night = await api(
      `/api/results/scene?id=${encodeURIComponent(me.id)}`,
    );
    if (night) {
      $("backdrop").src = night.backdrop.url;
      drawPeople(night.people);
    }
    await openSheet("campaigns");
    return;
  }
  // A law that took effect: what changed in town.
  // A short notice on the card, not a screen taken over mid-play.
  if (newChanges(await changeCount()))
    $("card-why").textContent = controls.endedBy?.law ?? "";
  if (openTab) await openSheet(openTab);
}

async function act(path) {
  if (busy) return;
  busy = true;
  renderPacket();
  try {
    // Polls still open (the page reloaded at the polls): vote first.
    const polls = await api("/api/polling-place");
    if (polls) await atThePolls(polls);
    const result = await post(path);
    me.names = { ...me.names, ...result.names };
    busy = false;
    renderPacket(result.packet);
    if (result.pollingPlace) {
      // The day stopped at the polls: vote, then the day goes on.
      await atThePolls(result.pollingPlace);
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
function billBlock(item, buttons) {
  const words = voteWords();
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
    buttons.length ? el("div", { className: "acts" }, ...buttons) : "",
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
                    const b = el("button", {
                      className: "action",
                      type: "button",
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
                    const b = el("button", {
                      className: "action",
                      type: "button",
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
              const b = el("button", {
                className: "action",
                type: "button",
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
            const node = el("button", {
              className: "action",
              type: "button",
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
    show("news-surface", false);
    coachUsed(...COACH_ORDER);
    return act(`/api/advance?mode=${mode}`);
  });
// Laws enacted and laws taken effect so far: a new one of either opens What changed.
let seenChanges = { ahead: 0, took: 0 };
async function changeCount() {
  const { ahead, took } = await api(
    `/api/changes?id=${encodeURIComponent(me.id)}`,
  );
  return { ahead: ahead.length, took: took.length };
}
const newChanges = (now) =>
  now.took > seenChanges.took || now.ahead > seenChanges.ahead;
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
async function setWho(personId, name) {
  $("talk-name").textContent = name ?? "";
  $("talk-role").textContent = "";
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
  $("talk-role").textContent = [c.work?.title, c.work?.employer, c.relation]
    .filter(Boolean)
    .join(" · ");
}
/** The newest lines: yours, dim, then what was said back to you. */
function spokenLines(lines, speakerOf) {
  const lastMine = lines.findLastIndex((line) => line.speakerId === me.id);
  const theirs = lines.slice(lastMine + 1).slice(-3);
  return [
    ...(lastMine >= 0
      ? [
          el("li", {
            className: `said${lines[lastMine].act === "lie" ? " lying" : ""}`,
            textContent: lines[lastMine].text,
          }),
        ]
      : []),
    ...theirs.map((line) =>
      el("li", { className: "speech", textContent: speakerOf(line) }),
    ),
  ];
}
/** Numbered replies; a key press of the number says it. */
function replies(choices, onPick) {
  return choices.map((choice) => {
    const b = el("button", {
      type: "button",
      className: `reply${choice.lie ? " lying" : ""}`,
      // Filing is a control of its own, never worded like acknowledging a refusal.
      textContent:
        choice.control === "file"
          ? (controls.filing?.file ?? choice.text)
          : choice.text,
    });
    b.addEventListener("click", () => onPick(choice));
    return b;
  });
}
document.addEventListener("keydown", (event) => {
  const n = Number(event.key);
  if (
    !Number.isInteger(n) ||
    n < 1 ||
    $("game").classList.contains("sheet-open")
  )
    return;
  if (!$("talk-choices").offsetParent) return;
  $("talk-choices").children[n - 1]?.click();
});
function setScales({ available, on }) {
  $("talk-lie").disabled = !available;
  $("talk-lie").classList.toggle("on", Boolean(available && on));
}
function renderTalk(value) {
  if (value?.otherId !== talk?.otherId) lying = false;
  talk = value;
  show("talk", Boolean(value));
  if (!value) return;
  const other = value.lines.find((line) => line.speakerId === value.otherId);
  if (
    other?.speaker !== $("talk-name").textContent ||
    !$("talk-name").textContent
  )
    setWho(value.otherId, other?.speaker ?? me.names?.[value.otherId]);
  $("talk-lines").replaceChildren(
    ...spokenLines(value.lines, (line) => line.text),
  );
  // Lying, the false set stands in place of the true choices.
  const lies = value.lies ?? [];
  const choices = (lying && lies.length ? lies : value.choices).slice(0, 6);
  $("talk-choices").replaceChildren(
    ...replies(choices, (choice) => sayLine(choice.key)),
  );
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
$("talk-leave").addEventListener("click", async () => {
  if (filing) {
    await post("/api/filing/leave");
    filing = undefined;
    show("filing-overlay", false);
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
  $("talk-lines").replaceChildren(...spokenLines(lines, (line) => line.text));
  renderFilingOverlay(value);
  $("talk-choices").replaceChildren(
    ...replies(value.visit.choices.slice(0, 6), async (choice) => {
      // Filing carries the platform and party chosen on the overlay.
      const params = new URLSearchParams({ key: choice.key });
      if (choice.action.kind === "file") {
        for (const select of $("filing-platform").querySelectorAll("select"))
          if (select.value)
            params.append("stance", `${select.name}=${select.value}`);
        params.set("party", $("filing-party").value);
      }
      renderFiling(await post(`/api/filing/choose?${params}`));
    }),
  );
  // The filing's record once it is made: its status.
  if (value.result)
    $("talk-lines").append(
      el("li", {
        className: "speech",
        textContent: value.result.filing
          ? value.result.status
          : `${value.result.status} · ${(value.result.unmet ?? []).map((u) => u.rule).join(", ")}`,
      }),
    );
  setScales({ available: false });
}
/** The named office's rules from its records, with the platform and party to file under. */
function renderFilingOverlay(value) {
  const overlay = value?.overlay;
  show("filing-overlay", Boolean(overlay && !value.result));
  if (!overlay || $("filing-title").dataset.contest === overlay.contestId)
    return;
  $("filing-title").dataset.contest = overlay.contestId;
  $("filing-title").textContent = overlay.title;
  $("filing-checks").replaceChildren(
    row("Deadline", overlay.filingDeadline),
    ...overlay.checks.map((check) => {
      const line = row(
        check.rule,
        `${check.actual ?? ""}${check.required ? ` / ${check.required}` : ""}${check.metOn ? ` · ${check.metOn}` : ""}`,
      );
      if (!check.met) line.classList.add("unmet");
      return line;
    }),
  );
  $("filing-platform").replaceChildren(
    ...overlay.questions.map((question) =>
      el(
        "div",
        { className: "row" },
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
      `${m.name} · ${words.agreement} ${m.agreement === null ? "" : m.agreement.toFixed(2)}`,
    );
    // The tie's record, for the checks that read it.
    line.dataset.tieId = m.tieId;
    line.dataset.partyId = m.partyId;
    return [line];
  }
  return party.parties.map((p) => {
    const b = el("button", {
      type: "button",
      textContent: `${words.join} ${p.name}`,
    });
    b.addEventListener("click", async () => {
      await post(`/api/party/join?${new URLSearchParams({ partyId: p.id })}`);
      openSheet("politics");
    });
    return b;
  });
}

// ---- Campaigning (step 4): each act answered by the people it reaches ----
let campaignResult = "";
// The speech being built: the parts said and the four on offer, from the server.
let speechState = null;
function debatePanel(debate) {
  const words = controls.debate;
  const picks = debate.questions.map((question) => {
    const pick = el(
      "select",
      {},
      el("option", { value: "", textContent: words.pass }),
      el("option", { value: "1", textContent: words.for }),
      el("option", { value: "-1", textContent: words.against }),
    );
    return { question, pick };
  });
  return el(
    "div",
    { className: "row campaign" },
    el("b", { textContent: `${words.title} · ${debate.date}` }),
    ...picks.map(({ question, pick }) =>
      el("label", {}, ` ${policyLabel(question)} `, pick),
    ),
    el("button", {
      type: "button",
      textContent: words.answer,
      onclick: async () => {
        await post(
          `/api/campaign/debate?${new URLSearchParams({
            debateId: debate.id,
            answers: JSON.stringify(
              picks.map(({ question, pick }) => ({
                question,
                position: pick.value ? Number(pick.value) : null,
              })),
            ),
          })}`,
        );
        openSheet("campaigns");
      },
    }),
  );
}
function speechPanel(filing, venue) {
  const rebuild = () => openSheet("campaigns");
  if (!speechState)
    return el(
      "div",
      {},
      el("button", {
        type: "button",
        textContent: controls.speech.begin,
        onclick: async () => {
          speechState = await post("/api/campaign/speech/begin");
          rebuild();
        },
      }),
    );
  const said = speechState.picked.map((part) =>
    el("p", { className: "speech quote", textContent: part.text }),
  );
  if (speechState.done)
    return el(
      "div",
      {},
      ...said,
      el("label", { textContent: controls.speech.venue }, venue),
      el("button", {
        type: "button",
        textContent: controls.speech.give,
        onclick: async () => {
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
    );
  return el(
    "div",
    {},
    ...said,
    ...speechState.choices.map((choice) =>
      el("button", {
        type: "button",
        textContent: choice.text,
        onclick: async () => {
          speechState = await post(
            `/api/campaign/speech/pick?${new URLSearchParams({ key: choice.key })}`,
          );
          rebuild();
        },
      }),
    ),
  );
}
// The campaign day's choice each outing control takes.
const CAMPAIGN_OUTING_KIND = {
  doors: "canvass",
  event: "event",
  interview: "interview",
  calls: "raise-money",
};
async function campaignRows() {
  const v = await api(`/api/campaign?id=${encodeURIComponent(me.id)}`);
  const rows = [];
  for (const {
    filing,
    campaign,
    polls,
    outings,
    causes,
    debates,
  } of v.campaigns) {
    const goOut = async (outing) => {
      const result = await post(
        `/api/campaign/day?${new URLSearchParams({ filingId: filing.id, kind: CAMPAIGN_OUTING_KIND[outing] })}`,
      );
      campaignResult = [
        controls.campaignOutings[outing],
        result.doorsKnocked ? `${result.doorsKnocked} doors` : "",
        result.reached ? `${result.reached} reached` : "",
        result.raisedMinor ? dollars(result.raisedMinor) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      // The doors and the calls are seen where they happen, with the people reached.
      if (result.scene) {
        closeSheet();
        $("backdrop").src = result.scene.backdrop.url;
        drawPeople(result.scene.people);
        $("card-why").textContent = campaignResult;
        return;
      }
      openSheet("campaigns");
    };
    const act = async (kind, extra = {}) => {
      const result = await post(
        `/api/campaign/act?${new URLSearchParams({ filingId: filing.id, kind, ...extra })}`,
      );
      campaignResult =
        result.contacted !== undefined
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
      const b = el("button", { type: "button", textContent: label });
      b.addEventListener("click", () =>
        act(kind, typeof extra === "function" ? extra() : extra),
      );
      return b;
    };
    rows.push(
      el(
        "div",
        { className: "row campaign" },
        el("b", {
          textContent: `${filing.status} · ${filing.contestId.split(":").slice(-3).join(" ")}`,
        }),
        `${dollars(campaign.raisedMinor)} raised · ${dollars(campaign.spentMinor)} spent · ${campaign.volunteers} volunteers · ${campaign.doors} doors`,
        el(
          "div",
          {},
          ...(outings ?? []).map((choice) => {
            const b = el("button", {
              type: "button",
              textContent: `${controls.campaignOutings[choice.outing]} · ${choice.hours} ${controls.campaignOutings.hours}`,
              disabled: !choice.available,
            });
            b.addEventListener("click", () => goOut(choice.outing));
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
          button("Poll", "poll", { sampleSize: "50" }),
        ),
        speechPanel(filing, venue),
        // A debate the outlet invited the candidates to: one position (or a pass) on each question it asks.
        ...(debates ?? []).map((debate) => debatePanel(debate)),
        // What the race turns on: each candidate's acts and how the people reached came to feel.
        ...((causes ?? []).some((who) => who.acts.length)
          ? [el("b", { textContent: controls.campaignActs.title })]
          : []),
        ...(causes ?? [])
          .filter((who) => who.acts.length)
          .map((who) =>
            el("div", {
              className: "row",
              textContent: `${who.you ? "" : `${who.name} · `}${who.acts
                .map(
                  (a) =>
                    `${controls.campaignActs[a.act] ?? a.act} ${a.reached} · +${a.warmer} · −${a.cooler}`,
                )
                .join(" · ")}`,
            }),
          ),
        polls.length
          ? `Poll ${polls.at(-1).date}: ${polls.at(-1).contacted}`
          : "",
        campaignResult ? el("div", { textContent: campaignResult }) : "",
      ),
    );
  }
  return rows;
}

// ---- A big moment, staged when it stops the clock ----
async function showStory(momentId) {
  const story = await api(
    `/api/story?momentId=${encodeURIComponent(momentId)}`,
  );
  me.names = { ...me.names, ...story.names };
  $("backdrop").src = story.backdrop.url;
  drawPeople(story.people);
  show("talk", true);
  show("talk-who", false);
  $("talk-name").textContent = "";
  $("talk-lines").replaceChildren(
    ...story.narration.map((line) =>
      el("li", { className: "speech narration", textContent: line.text }),
    ),
  );
  $("talk-choices").replaceChildren(
    ...(story.talkToId
      ? replies([{ text: `Talk · ${story.names[story.talkToId] ?? ""}` }], () =>
          talkTo(story.talkToId, momentId),
        )
      : []),
  );
  setScales({ available: false });
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
function personArtwork(id, src, name = "") {
  const image = $(id);
  image.hidden = !src;
  image.alt = name;
  image.removeAttribute("src");
  image.onerror = () => {
    image.hidden = true;
    image.removeAttribute("src");
  };
  if (src) image.src = src;
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
  personArtwork(
    "person-figure",
    c.presentation?.portraitUrl !== undefined
      ? c.presentation.portraitUrl
      : (c.figureUrl ?? person.figureUrl),
    c.name,
  );
  personArtwork("person-background", c.presentation?.backgroundUrl);
  $("person-name").textContent = c.name;
  $("person-role").textContent = [
    c.relation,
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
          el(
            "section",
            { className: "dossier-detail" },
            el("h3", { className: "label", textContent: labels.work }),
            el("p", {
              className: "dossier-feature",
              textContent: c.work.title ?? "",
            }),
            el("p", { textContent: c.work.employer ?? "" }),
          ),
        ]
      : []),
    ...(c.placeName
      ? [
          el(
            "section",
            { className: "dossier-detail" },
            el("h3", { className: "label", textContent: labels.place }),
            el("p", { textContent: c.placeName }),
          ),
        ]
      : []),
    ...[
      c.tie &&
        row(
          c.tie.kind,
          c.tie.lastContactDate ? proseDate(c.tie.lastContactDate) : "",
        ),
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
  $("person-talk").textContent = labels.talk;
  for (const button of document.querySelectorAll("[data-person-label]"))
    button.textContent = labels[button.dataset.personLabel];
  $("person-talk").onclick = () => {
    closePerson();
    talkTo(person.personId);
  };
  show("person", true);
  $("game").classList.add("person-open");
  $("person-close").focus();
}
$("person-close").addEventListener("click", closePerson);
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
  drawPeople(v.people, showPerson);
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
      el(
        "div",
        { className: "row campaign", title: job.citation },
        el("b", { textContent: job.title }),
        ` ${dollars(job.annualMinor)} · ${job.weeklyHours} h · ${job.payer}`,
        job.lastPaid
          ? ` · ${job.lastPaid.on} ${dollars(job.lastPaid.amountMinor)}`
          : "",
        job.nextMeeting ? ` · ${job.nextMeeting}` : "",
      ),
    ),
    el("div", { className: "row campaign" }, ...toggles),
    // The outlet the next interview asks; left on the character's own, the widest reach.
    ...(v.outlets?.length
      ? [
          el(
            "label",
            { className: "row campaign" },
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
      el(
        "label",
        { className: "row campaign" },
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
          el(
            "div",
            { className: "row campaign" },
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
      el(
        "div",
        { className: "row campaign" },
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
      ? `${r.number} · ${r.status}${r.agendaDate ? ` · ${r.agendaDate}` : ""}${
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
    const draft = el("button", { type: "button", textContent: "Draft" });
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
      el(
        "div",
        { className: "row campaign" },
        el("b", { textContent: body.title }),
        body.members.map((m) => m.name).join(" · "),
        el("div", {}, pick, value, draft),
      ),
    );
  }
  for (const { bill, votes } of v.bills)
    rows.push(
      el(
        "div",
        { className: "row campaign" },
        el("b", { textContent: `${bill.number} · ${bill.status}` }),
        // The title's subjects name each section (record keys, then words).
        bill.provisions
          .map((p, at) => {
            const key = bill.title?.subjects[at]?.key ?? "";
            const name = key.startsWith("budget-line:")
              ? key.slice("budget-line:".length)
              : (p.series ?? (p.question && policyLabel(p.question)) ?? p.line);
            return `${name} ${p.value}`;
          })
          .join("; "),
        bill.costEstimate
          ? ` · ${bill.costEstimate.workersRaised} · ${dollars(bill.costEstimate.annualPayMinor)}`
          : "",
        votes.length
          ? el("div", {
              textContent: votes.map((x) => `${x.name} ${x.vote}`).join(" · "),
            })
          : "",
      ),
    );
  for (const left of v.incompatibilities ?? [])
    rows.push(
      el("div", {
        className: "row campaign",
        textContent: `${left.date} · ${left.left} → ${left.took} · ${left.law}`,
      }),
    );
  if (seatResult)
    rows.push(
      el("div", { className: "row campaign", textContent: seatResult }),
      ...seatText.map((line) =>
        el("div", { className: "row", textContent: line }),
      ),
    );
  return rows;
}

/** A record kind as words: "filing-deadline" reads "Filing deadline". */
const kindName = (kind) => {
  const name = kind.split(":").pop();
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
function menuPages(items, size = 5) {
  let at = 0;
  const box = el("div", { className: "record-pages" });
  const draw = () => {
    const back = el("button", {
      type: "button",
      textContent: controls.politics.back,
      disabled: at === 0,
    });
    const next = el("button", {
      type: "button",
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
    const people = [...records.values()];
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
      const b = el("button", { type: "button", textContent: text });
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
              figureUrl: me.scene?.people?.find((p) => p.personId === me.id)
                ?.figureUrl,
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
        node.className = `people-node${active ? "" : " dim"}${selected === p.personId ? " selected" : ""}`;
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
      for (const b of filters.querySelectorAll("[data-group]")) {
        b.classList.toggle("on", b.dataset.group === group);
        b.setAttribute("aria-pressed", String(b.dataset.group === group));
      }
    };
    for (const key of ["all", "family", "friends", "work", "politics"]) {
      const b = button(labels[key], () => {
        group = key;
        draw();
      });
      b.dataset.group = key;
      b.className = "tab";
      filters.append(b);
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
      const button = el("button", {
        type: "button",
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
    if (c.traits?.length)
      rows.push(
        recordSection(
          labels.traits,
          el(
            "ul",
            { className: "character-traits" },
            ...c.traits.map((trait) =>
              el(
                "li",
                {},
                el("span", {
                  className: "character-trait-label",
                  textContent: trait.label,
                }),
                el("strong", { textContent: trait.word }),
              ),
            ),
          ),
        ),
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
    return rows;
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
          el(
            "section",
            { className: "money-item" },
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
    const view = await api(`/api/jobs?id=${encodeURIComponent(me.id)}`);
    const job = me.card.job;
    const work = el(
      "section",
      { className: "work-overview" },
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
    if (view.offers.length)
      result.push(
        el("h3", { className: "work-heading", textContent: labels.offers }),
      );
    for (const offer of view.offers) {
      const card = el(
        "section",
        { className: "job-offer" },
        el("h3", { textContent: offer.title }),
        el("p", { textContent: offer.employer }),
        row(labels.pay, `${dollars(offer.hourlyMinor)} ${labels.hourly}`),
        row(labels.deadline, offer.deadline),
      );
      const status = el("p", { className: "offer-status", role: "status" });
      const actions = el("div", { className: "offer-actions" });
      for (const [answer, label] of [
        ["accept", labels.accept],
        ["decline", labels.decline],
      ]) {
        const button = el("button", { type: "button", textContent: label });
        button.onclick = async () => {
          for (const b of actions.children) b.disabled = true;
          try {
            const response = await post(
              `/api/jobs/answer?${new URLSearchParams({ offerId: offer.id, answer })}`,
            );
            await refresh();
            if (response.answered) await openSheet("jobs");
            else {
              status.textContent = labels.unavailable;
              actions.remove();
            }
          } catch {
            status.textContent = labels.failed;
            for (const b of actions.children) b.disabled = false;
          }
        };
        actions.append(button);
      }
      card.append(actions, status);
      result.push(card);
    }
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
    return chapters.map((c) =>
      el(
        "div",
        { className: "row narrative" },
        el("b", { textContent: c.title }),
        c.lines.map((l) => l.text).join(" "),
      ),
    );
  },
  async results() {
    const races = await api(`/api/results?id=${encodeURIComponent(me.id)}`);
    await controlsReady;
    const labels = controls.results;
    seenResults = races.length;
    const number = (n) => n.toLocaleString("en-US");
    return races.slice(0, 8).map((race) =>
      el(
        "div",
        { className: "row race" },
        el("b", {
          textContent: `${race.title} · ${race.date}${race.unopposed ? ` · ${labels.unopposed}` : ""}`,
        }),
        ...race.candidates.map((c) =>
          el("div", {
            className: c.name === race.winner ? "winner" : "",
            textContent: `${c.name}${c.party ? ` (${c.party})` : ""} · ${number(c.votes)}`,
          }),
        ),
        el(
          "div",
          {},
          el("b", { textContent: `${labels.turnout} ` }),
          `${number(race.namedTurnout)} / ${number(race.namedEligible)}`,
        ),
        el(
          "div",
          {},
          el("b", { textContent: `${labels.exitPoll} ` }),
          Object.entries(race.exitPoll)
            .map(([k, n]) => `${k} ${n}`)
            .join(" · "),
        ),
        race.places.length
          ? el(
              "div",
              {},
              el("b", { textContent: `${labels.wonIn} ` }),
              race.places
                .slice(0, 6)
                .map((p) => `${p.name} ${p.leader ?? ""} · ${number(p.cast)}`)
                .join(" · "),
            )
          : "",
        race.ballot
          ? el(
              "div",
              { className: "mine" },
              el("b", { textContent: `${labels.you} ` }),
              race.ballot.voted ? (race.ballot.choice ?? "") : labels.abstained,
            )
          : "",
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
    return [el("div", { className: "row map" }, svg), ...legend];
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
        const b = el("button", { type: "button", textContent: "Play" });
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
        const card = el("div", { className: "family-card" });
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
      content.append(
        el("h3", { textContent: `${gov.name} · ${latest.fiscalYear}` }),
        el("p", { className: "label", textContent: latest.adoptedOn }),
      );
      const summary = el("div", { className: "budget-summary" });
      for (const [label, value] of [
        [labels.revenue, total(latest.revenue)],
        [labels.spending, total(latest.spending)],
        [labels.balance, total(latest.revenue) - total(latest.spending)],
      ])
        summary.append(
          el(
            "div",
            {},
            el("span", { className: "label", textContent: label }),
            el("strong", {
              className: "record-total",
              textContent: dollars(value),
            }),
          ),
        );
      content.append(summary);
      const columns = el("div", { className: "budget-columns" });
      for (const [label, lines] of [
        [labels.revenue, latest.revenue],
        [labels.spending, latest.spending],
      ]) {
        const chart = comparison(
          lines.map((r) => ({ label: r.name ?? r.line, value: r.minor })),
          label,
          dollars,
        );
        const rows = [...chart.children];
        if (gov.youAreExecutive && label === labels.spending)
          rows.forEach((row, index) => {
            const record = lines[index];
            for (const [name, sign] of [
              [labels.decrease, -1],
              [labels.increase, 1],
            ]) {
              const b = el("button", {
                type: "button",
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
    select.addEventListener("change", draw);
    draw();
    return [select, content];
  },
  async calendar() {
    const { date, items } = await api(
      `/api/calendar?id=${encodeURIComponent(me.id)}`,
    );
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
      const b = el("button", { type: "button", textContent: label });
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
      const b = el("button", { type: "button", className: "skip-forward" });
      b.setAttribute("aria-label", name);
      b.append(svg);
      b.addEventListener("click", fn);
      return b;
    };
    const paging = (index, count, change) => {
      const back = button(labels.back, () => change(index - 1));
      const next = button(labels.next, () => change(index + 1));
      back.disabled = index === 0;
      next.disabled = (index + 1) * 3 >= count;
      return el("nav", { className: "calendar-paging" }, back, next);
    };
    const drawDetails = () => {
      const entries = byDate.get(selected) ?? [];
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
      if (selected > (packet?.at.date ?? date))
        details.append(
          skipForward(labels.advance, () => {
            closeSheet();
            act(`/api/advance?mode=calendar&date=${selected}`);
          }),
        );
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
        if (entries.length)
          cell.append(
            el("span", {
              className: "entry",
              textContent: "•",
              title: entries
                .map(
                  (i) => controls.policyNames?.[i.title] ?? slugWords(i.title),
                )
                .join("\n"),
            }),
          );
        grid.append(cell);
      }
      monthBox.replaceChildren(
        header,
        grid,
        button(labels.today, () => {
          month = new Date(`${date.slice(0, 7)}-01T12:00:00`);
          select(date);
        }),
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
    const economy = e.nation
      ? [
          row(
            `Nation · ${e.nation.month}`,
            `Unemployment ${pct(e.nation.unemploymentPct)} · Inflation ${pct(e.nation.inflationPct)} · Policy rate ${pct(e.nation.policyRatePct)} · Mortgage ${pct(e.nation.mortgage30Pct)}`,
          ),
          ...(e.region
            ? [
                row(
                  `Region · ${e.region.month ?? ""}`,
                  Object.entries(e.region)
                    .filter(([, v]) => typeof v === "number")
                    .slice(0, 4)
                    .map(([k, v]) => `${k} ${Number(v).toFixed(1)}`)
                    .join(" · "),
                ),
              ]
            : []),
          ...(e.jobs
            ? [
                row(
                  "Jobs here",
                  `${e.jobs.employed} employed · ${e.jobs.seekers} looking · ${e.jobs.openPositions} open`,
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
    const stories = [
      ...(opening?.news?.stories ?? []),
      ...rows.filter((r) => r.headline || r.lede),
    ].filter((s) => s.headline || s.lede);
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
    let recordPage = 0;
    const paper = el("section", { className: "paper" });
    const outletPicker = el("nav", { className: "outlet-picker" });
    const button = (label, fn) => {
      const b = el("button", { type: "button", textContent: label });
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
    const publicRecords = () => {
      const records = rows.filter((r) => !r.headline && !r.lede);
      const block = el(
        "section",
        { className: "paper-records" },
        el("h3", { textContent: labels.records }),
      );
      for (const record of records.slice(recordPage * 3, recordPage * 3 + 3))
        block.append(
          el(
            "article",
            {},
            el("span", {
              className: "label",
              textContent: dateWords(record.date),
            }),
            // An employer's layoff shows its jobs lost, sales and costs.
            el("h4", {
              textContent: record.staffing
                ? record.staffing.employer
                : kindName(record.kind),
            }),
            el("p", {
              textContent: record.staffing
                ? [
                    `${controls.staffingNews.jobsLost}: ${record.staffing.jobsLost}`,
                    ...(record.staffing.salesMinor !== undefined
                      ? [
                          `${controls.staffingNews.sales}: ${dollars(record.staffing.salesMinor)}`,
                        ]
                      : []),
                    ...(record.staffing.costsMinor !== undefined
                      ? [
                          `${controls.staffingNews.costs}: ${dollars(record.staffing.costsMinor)}`,
                        ]
                      : []),
                  ].join(" · ")
                : [
                    ...new Set(
                      Object.values(record.facts ?? {})
                        .filter((v) => typeof v === "string" && me.names?.[v])
                        .map((v) => me.names[v]),
                    ),
                  ].join(" · "),
            }),
          ),
        );
      if (records.length > 3) {
        const back = button(labels.previous, () => {
          recordPage--;
          draw();
        });
        back.disabled = recordPage === 0;
        const next = button(labels.next, () => {
          recordPage++;
          draw();
        });
        next.disabled = (recordPage + 1) * 3 >= records.length;
        block.append(el("nav", { className: "paper-pager" }, back, next));
      }
      return block;
    };
    const draw = () => {
      const outlet = outlets.get(chosen);
      const layout = ["broadsheet", "modern", "tabloid", "weekly"].includes(
        outlet.layout,
      )
        ? outlet.layout
        : "broadsheet";
      paper.className = `paper paper-${layout}`;
      const section = el("div", { className: "paper-stories" });
      outlet.stories.slice(page * 3, page * 3 + 3).forEach((story, index) => {
        const headline = button(story.headline ?? story.lede, () =>
          article(story),
        );
        headline.className = "story-headline";
        section.append(
          el(
            "article",
            { className: `paper-story${index === 0 ? " lead" : ""}` },
            ...imageFor(story),
            headline,
            ...(story.lede && story.headline
              ? [el("p", { className: "story-lede", textContent: story.lede })]
              : []),
          ),
        );
      });
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
        section,
      );
      if (outlet.stories.length > 3) {
        const back = button(labels.previous, () => {
          page--;
          draw();
        });
        back.disabled = page === 0;
        const next = button(labels.next, () => {
          page++;
          draw();
        });
        next.disabled = (page + 1) * 3 >= outlet.stories.length;
        paper.append(el("nav", { className: "paper-pager" }, back, next));
      }
      paper.append(publicRecords());
      for (const b of outletPicker.children) {
        b.classList.toggle("on", b.dataset.outlet === chosen);
        b.setAttribute("aria-pressed", String(b.dataset.outlet === chosen));
      }
    };
    if (outlets.size > 1)
      for (const [key, outlet] of outlets) {
        const b = button(outlet.name, () => {
          chosen = key;
          page = 0;
          draw();
        });
        b.dataset.outlet = key;
        b.className = "tab";
        outletPicker.append(b);
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
        el(
          "div",
          { className: "row narrative" },
          termLabel(policyLabel(law.series)),
          ` ${law.value === null ? "—" : amount(law.value, law.unit)}`,
          el(
            "div",
            {},
            ...law.levels
              .filter((level) => level.row)
              .map((level) =>
                el("div", {
                  textContent: `${controls.levels?.[level.level] ?? words(level.level)} · ${amount(level.row.value, level.row.unit)} · ${level.row.effectiveDate}${level.setAside ? ` · ${words(level.setAside)}` : ""}`,
                }),
              ),
            ...law.pending.map((row) =>
              el("div", {
                textContent: `${row.effectiveDate} → ${amount(row.value, row.unit)}`,
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
    seenChanges = { ahead: ahead.length, took: took.length };
    // Enacted, waiting for its date: the measure, what it sets, and when.
    const coming = ahead.map((law) =>
      el(
        "div",
        { className: "row narrative" },
        el("b", {
          textContent: `${law.date} · ${policyLabel(law.series)} · ${amount(law.value, law.unit)}`,
        }),
        `${law.measure} · ${law.jurisdiction}`,
      ),
    );
    return [
      ...coming,
      ...took.map((law) =>
        el(
          "div",
          { className: "row narrative" },
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
          const line = el(
            "details",
            { className: "row narrative", open: rows.length === 1 },
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
    const resume = el("button", {
      type: "button",
      textContent: labels.continue,
    });
    resume.addEventListener("click", closeSheet);
    actions.append(resume);
    if (skipOpening) {
      const skip = el("button", {
        type: "button",
        textContent: labels.skipOpening,
      });
      skip.addEventListener("click", () => {
        closeSheet();
        skipOpening?.();
      });
      actions.append(skip);
    }
    const quit = el("button", {
      type: "button",
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
    const counters = [
      ...new Set(government.contests.map((c) => c.filingOffice.filedWith)),
    ].map((name) => ({ name, filing: true }));
    const destinations = [...counters, ...places];
    let page = 0;
    const draw = () => {
      const found = destinations.filter((p) =>
        p.name.toLowerCase().includes(search.value.trim().toLowerCase()),
      );
      const cards = found.slice(page * 5, page * 5 + 5).map((p) => {
        const card = el("article", { className: "travel-place" });
        if (p.presentation?.imageUrl) {
          const image = el("img", {
            src: p.presentation.imageUrl,
            alt: "",
            className: "travel-image",
          });
          image.onerror = () => image.remove();
          card.append(image);
        }
        const info = el(
          "div",
          { className: "travel-info" },
          el("h3", { textContent: p.name }),
        );
        if (p.filing)
          info.append(
            el("span", { className: "label", textContent: labels.filing }),
          );
        else
          info.append(
            el("p", {
              textContent: [
                ...p.known.map((k) => k.name),
                ...p.actions.map((a) => controls.actions?.[a] ?? words(a)),
              ].join(" · "),
            }),
          );
        const go = el("button", { type: "button", textContent: labels.go });
        go.setAttribute("aria-label", `${labels.go}: ${p.name}`);
        go.onclick = () =>
          p.filing ? openFiling(p.name) : visit(p.organizationId);
        card.append(info, go);
        return card;
      });
      const back = el("button", {
        type: "button",
        textContent: labels.back,
        disabled: page === 0,
      });
      back.onclick = () => {
        page--;
        draw();
      };
      const next = el("button", {
        type: "button",
        textContent: labels.next,
        disabled: (page + 1) * 5 >= found.length,
      });
      next.onclick = () => {
        page++;
        draw();
      };
      content.replaceChildren(
        ...cards,
        ...(found.length > 5
          ? [el("nav", { className: "travel-pager" }, back, next)]
          : []),
      );
    };
    search.addEventListener("input", () => {
      page = 0;
      draw();
    });
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
    return [
      ...(await campaignRows()),
      ...v.filings.map((f) => row(words(f.status), f.filedWith)),
      ...(await sheets.results()),
    ];
  },
  async government() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const labels = controls.politics;
    const levelOf = (s) =>
      ["state", "federal"].includes(s.level) ? s.level : "local";
    let level = "local";
    let otherState = "";
    const picker = el("nav", { className: "government-picker" });
    const content = el("div", { className: "government-content" });
    // Another state's legislature: every sitting member, by chamber.
    const drawOtherState = async () => {
      const other = await api(
        `/api/government/state?${new URLSearchParams({ state: otherState })}`,
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
      statePick.hidden = level !== "state";
      if (level === "state" && otherState) {
        drawOtherState();
        for (const b of picker.querySelectorAll("button"))
          b.classList.toggle("on", b.dataset.level === level);
        return;
      }
      const offices = new Map();
      for (const s of v.seats.filter((s) => levelOf(s) === level)) {
        if (!offices.has(s.officeId)) offices.set(s.officeId, []);
        offices.get(s.officeId).push(s);
      }
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
                textContent: first.government ?? "",
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
              const line = row(name, s.holder?.party ?? "");
              // Years of service and how the holder won, from the term and the seat's elections.
              if (s.holder) {
                const won = s.elections.find(
                  (e) => e.termId === s.holder.termId,
                );
                const history = el("div", {
                  className: "row",
                  textContent: [
                    `${s.holder.serviceStart} – ${s.holder.endDate ?? ""}`,
                    s.holder.reached,
                    won ? `${won.date} ${Math.round(won.share * 100)}%` : null,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                });
                // The record the line reads, for the specs; never shown as text.
                history.dataset.term = s.holder.termId;
                if (won) history.dataset.election = won.termId;
                line.append(history);
              }
              if (s.holder?.personId) {
                const b = el("button", {
                  type: "button",
                  className: "member-name",
                  textContent: name,
                });
                b.addEventListener("click", () => {
                  closeSheet();
                  showPerson({ personId: s.holder.personId });
                });
                line.replaceChild(b, line.firstChild);
              }
              return line;
            });
            card.append(menuPages(members, 6));
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
        ),
      );
      for (const b of picker.children)
        b.classList.toggle("on", b.dataset.level === level);
    };
    for (const key of ["local", "state", "federal"]) {
      const b = el("button", {
        type: "button",
        className: "tab",
        textContent: controls.levels?.[key] ?? words(key),
      });
      b.dataset.level = key;
      b.addEventListener("click", () => {
        level = key;
        draw();
      });
      picker.append(b);
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
    // The key people the opening names: one list for both screens.
    const keyPeople = v.keyPeople.map((k) => {
      const line = row(k.officeTitle, k.name);
      // Play anyone: a resident officeholder can be taken over (bench only).
      if (k.resident && k.personId !== me.id) {
        const b = el("button", {
          type: "button",
          className: "dev-only",
          textContent: "Play",
        });
        b.addEventListener("click", () => playAs(k.personId));
        line.append(b);
      }
      return line;
    });
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
              const detail = el(
                "details",
                { className: "law-card" },
                el(
                  "summary",
                  {},
                  el("h3", { textContent: policyLabel(law.series) }),
                  el("strong", {
                    className: "law-value",
                    textContent: law.text ?? amount(law.value, law.unit),
                  }),
                ),
              );
              for (const level of law.levels.filter((l) => l.row))
                detail.append(
                  row(
                    controls.levels?.[level.level] ?? words(level.level),
                    `${amount(level.row.value, level.row.unit)} · ${level.row.effectiveDate}`,
                  ),
                );
              for (const pending of law.pending)
                detail.append(
                  row(
                    pending.effectiveDate,
                    amount(pending.value, pending.unit),
                  ),
                );
              for (const change of [...changes.took, ...changes.ahead].filter(
                (c) => c.series === law.series,
              ))
                detail.append(
                  row(
                    change.date,
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
  results: "Election night",
  budgets: "Budgets",
  family: "Family",
  travel: "Travel",
  options: "Options",
  guide: "Guide",
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
  ],
  people: ["people", "family"],
};
const groupOf = (tab) =>
  Object.entries(groups).find(([, tabs]) => tabs.includes(tab))?.[0] ?? tab;
async function openSheet(tab) {
  await controlsReady;
  if (tab === "politics") tab = "government";
  if (groupOf(tab) === "people") coachUsed("people-tab");
  openTab = tab;
  show("tip", false);
  const group = groupOf(tab);
  const holdsOffice =
    group === "politics" &&
    (await api(`/api/government?id=${encodeURIComponent(me.id)}`)).seats.some(
      (s) => s.holder?.personId === me.id,
    );
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === group);
  $("sheet-title").textContent = titles[group];
  $("sheet-tabs").replaceChildren(
    ...(groups[group] ?? [])
      .filter(
        (name) =>
          (name !== "results" || seenResults > 0) &&
          (name !== "office" || holdsOffice),
      )
      .map((name) => {
        const b = el("button", {
          type: "button",
          className: `tab${name === tab ? " on" : ""}`,
          textContent: titles[name],
        });
        b.addEventListener("click", () => openSheet(name));
        return b;
      }),
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
  show("sheet", true);
  show("menu", Boolean(me));
  $("game").classList.add("sheet-open");
}
pageWhenChanged($("sheet-body"), $("sheet-pager"));
pageWhenChanged($("ballot-races"), $("ballot-pager"));
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
  show("menu", false);
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
api("/api/title").then((title) => {
  if (!$("front").hidden) $("backdrop").src = title.backdrop.url;
  titleLife = title.life;
  $("front-continue").disabled = !titleLife;
  $("front-continue-life").textContent = titleLife
    ? `${titleLife.name}, ${titleLife.age} · ${titleLife.placeName}`
    : "";
});
// The build version, bottom right of the title (#4014).
void displayVersion().then((v) => ($("title-version").textContent = v));
// Not yet routes on the new core: said on the control itself.
for (const [id, key] of [
  ["front-watch", "watch"],
  ["front-saves", "saves"],
  ["front-patch-notes", "patchNotes"],
])
  $(id).title = controls.titleUnavailable?.[key] ?? "";
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
  seenChanges = await changeCount();
  show("front", false);
  for (const id of ["rings", "card", "journal-note"]) show(id, true);
  $("game").classList.add("in-play");
  if (life.packet) renderPacket(life.packet);
  await refresh();
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
$("dev-toggle").addEventListener("click", () =>
  document.body.classList.toggle("dev"),
);
// New game: Custom world (the world's settings, then the creator), Start a
// life (the creator) or New world (straight in, a random person and place).
const FRONT_PANELS = [
  "front-main",
  "front-new",
  "front-custom",
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
const proseDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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
  $("cr-derived-age").textContent =
    `${chosenAge() ?? ""} · ${setup.start ? proseDate(setup.start) : ""}`;
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
    b.classList.toggle("primary", on);
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

/** Opens the creator for Start a life or Custom world. */
async function openCreator(custom) {
  setup.custom = custom;
  if (!setup.seed) setup.seed = (await api("/api/seed")).seed;
  $("cr-route-name").textContent = $(
    custom ? "new-custom" : "new-start",
  ).textContent.trim();
  if (!$("cr-year").options.length) await randomBirthday();
  frontPanel("cr-character");
}
$("new-life").addEventListener("click", () => frontPanel("front-new"));
$("new-back").addEventListener("click", () => frontPanel("front-main"));
$("new-custom").addEventListener("click", () => frontPanel("front-custom"));
$("new-start").addEventListener("click", () => void openCreator(false));
$("new-world").addEventListener("click", () => startLife({}));
$("custom-back").addEventListener("click", () => frontPanel("front-new"));
$("custom-next").addEventListener("click", () => void openCreator(true));
$("cr-route").addEventListener("click", () => frontPanel("front-new"));
$("cr-character-back").addEventListener("click", () =>
  frontPanel(setup.custom ? "front-custom" : "front-new"),
);
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
        const b = el("button", {
          type: "button",
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
  $("cr-towns").replaceChildren(
    ...towns.map((t) => {
      const b = el(
        "button",
        { type: "button", className: "item" },
        el("b", { textContent: t.name }),
        ...(t.population
          ? [
              el("small", {
                textContent: `${count.format(t.population)} people`,
              }),
            ]
          : []),
      );
      b.addEventListener("click", () => {
        setup.town = t;
        void openLook();
      });
      return b;
    }),
  );
}
$("cr-town-search").addEventListener("input", () => void listTowns());

// Character appearance: the people engine's portrait and arrows.
function showLook(view) {
  setup.recipe = view.recipe;
  $("cr-portrait").src =
    `/api/portrait?recipe=${encodeURIComponent(JSON.stringify(view.recipe))}`;
  $("cr-rows").replaceChildren(
    ...view.rows.map((row) => {
      const arrow = (by, glyph) => {
        const b = el("button", {
          type: "button",
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
    custom: setup.custom,
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
const placeControls = ["new-world", "cr-begin"];

async function startLife({ custom = false, placeKey, person }) {
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
    // What was already law at the start isn't news; only what changes after.
    seenChanges = await changeCount();
    show("front", false);
    await playOpening();
    if (opening?.home) me.minuteOfDay = opening.home.minuteOfDay;
    // Home that evening (the server's rule for the opening day), with the
    // night's news to pick up, then the first choices pointed out.
    for (const id of ["rings", "card", "journal-note"]) show(id, true);
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
