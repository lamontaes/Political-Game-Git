/* global document, fetch, URLSearchParams, setTimeout, setInterval, clearInterval, window, localStorage, ResizeObserver, Image */
// The game screen on the new core: one scene, the player card, the menus.
// Words on screen are record data, engine text and control names only.
import { makeButton, buttonRow, buttonTray } from "./ui/button.mjs";
import { face as drawFace } from "./ui/face.mjs";
import {
  talkLine,
  transcript,
  talkReply,
  fillTalk,
  talkControls,
  mountTalkKeys,
  mountSpeakers,
} from "./ui/talk-box.mjs";
import { showToast, hideToast } from "./ui/toast.mjs";
import { mountRail } from "./ui/rail.mjs";
import { chamberHeader } from "./ui/chamber.mjs";
import { personCard } from "./ui/person-card.mjs";
import { dateList } from "./ui/date-list.mjs";
import { pager } from "./ui/pager.mjs";
import {
  ALL,
  filterLaws,
  issueFilterScreen,
  levelChoices,
} from "./ui/issue-filter.mjs";
import { splitScreen } from "./ui/split-screen.mjs";
import { tabBar, chooseTab } from "./ui/tab.mjs";
import { plate } from "./ui/plate.mjs";
import { townRow } from "./ui/town-row.mjs";
import { debateCard, speechCard } from "./ui/campaign-acts.mjs";
import { devBribePanel } from "./ui/dev-bribe.mjs";
import { devBillsPanel, devPanelsRow } from "./ui/dev-bills.mjs";
import { devBillCard } from "./ui/dev-bill-card.mjs";
import { traceBox } from "./ui/dev-trace-box.mjs";
import { devTraceVote } from "./ui/dev-trace-vote.mjs";
import { devRecordsSection } from "./ui/dev-records.mjs";
import { devPersonSection } from "./ui/dev-person.mjs";
import { devMemorySection } from "./ui/dev-memory.mjs";
import { devWatchSections } from "./ui/dev-watch.mjs";
import { devScenePanel } from "./ui/dev-scene.mjs";
import { devCampaignPanel } from "./ui/dev-campaign.mjs";
import { devRunPanel } from "./ui/dev-run.mjs";
import {
  devModeOn,
  onDevMode,
  restoreDevMode,
  setDevMode,
} from "./ui/dev-setting.mjs";
import {
  colorBlindOn,
  restoreColorBlind,
  setColorBlind,
} from "./ui/palette-setting.mjs";
import { listRow, factRow, noteLine } from "./ui/list-row.mjs";
import { picture as pictureFrame } from "./ui/picture.mjs";
import { select, optionsOf, numberBox, statusLine } from "./ui/fields.mjs";
import { lookRow } from "./ui/look-row.mjs";
import { fitUiScale, uiScale, viewHeight, viewWidth } from "./ui/dom.mjs";
import { termWord } from "./ui/term.mjs";
import { watchTerms } from "./ui/term-mark.mjs";
import { recordScreen } from "./ui/screen.mjs";
import { clockLines } from "./ui/room.mjs";
import { bustStrip } from "./ui/bust-strip.mjs";
import { calendarScreen } from "./ui/calendar.mjs";
import {
  dateWords,
  monthWords,
  timeWords,
  moneyWords,
  MONTH_NAMES,
} from "../english/plain-words.mjs";
/** A government's sum in a readable unit ("$5.2 trillion", "$48,300"). */
const roundedMoney = (minor) => moneyWords(minor, { rounded: true });
// A views label (the views engine's key, "veryLiberal") in the player's words (controls.leanWords).
const leanWord = (label) =>
  controls.leanWords?.[label === "not-sure" ? "notSure" : label] ?? "";
import { newsBoard } from "./ui/news-board.mjs";
import { openingTab } from "./ui/news-open.mjs";
import { peopleScreen } from "./ui/people-screen.mjs";
import { ballotPaper } from "./ui/ballot-paper.mjs";
import { electionNight as electionNightScreen } from "./ui/election-night.mjs";
import { rosterScreen } from "./ui/roster-screen.mjs";
import { guideScreen } from "./ui/guide-screen.mjs";
import { travelScreen } from "./ui/travel-screen.mjs";
import { billPaper } from "./ui/bill-paper.mjs";
import { billFigures } from "./ui/bill-figures.mjs";
import { trendLine } from "./ui/trend-line.mjs";
import { billStageSections } from "./ui/bill-stage.mjs";
import { meetingItem } from "./ui/meeting-item.mjs";
import { draftCard } from "./ui/draft-card.mjs";
import { line, prose, heading, labeled, smallText } from "./ui/text.mjs";
import {
  engraveMasthead,
  readerBody,
  readerMore,
  sameFor,
} from "./ui/newspaper.mjs";
import { show, mountCloseButtons, mountPanelHeads } from "./ui/panel.mjs";
import {
  stripScreen,
  stripSection,
  perkList,
  introText,
  lifeStory,
  peopleSentence,
  nameLink,
  dotRows,
  stripBoard,
  typedRow,
  departmentRow,
  journalScreen,
  moneyBoard,
  settingRow,
  quitButton,
  optionsBoard,
  patchNotesScreen,
  seatNumbers,
  voteRows,
  moneyFigure,
  deskBill,
  deskTitle,
  deskList,
  rosterTitle,
  rosterCols,
  rosterSide,
} from "./ui/strips.mjs";
import { playAsList, playAsDetail } from "./ui/play-as.mjs";
mountPanelHeads();
mountCloseButtons();
mountSpeakers();
const $ = (id) => document.getElementById(id);
let me;
let packet;
/** The News tab the player last chose, kept while the game is open. */
let newsTab = null;
// The tab order News first opened with, kept while the game is open, and
// whose life they are (another life starts its own).
let newsOrder = [];
let newsFor = null;
// The stories whose outlet page News has shown: read (ui/news-open.mjs).
let newsSeen = new Set();
// The tab on screen while News stays open: a redraw keeps it (closed or left, it clears).
let newsShowing = null;
// The game's date is the clock's, the packet's; me.date is only the day the
// screen loaded (P15, C10: the News kept the opening day).
const today = () => packet?.at?.date ?? me.date;
let talk;
let openTab;
let busy = false;

async function api(path, method = "GET") {
  const response = await fetch(path, { method });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}
const post = (path) => api(path, "POST");
/** The player card's date, and the time under it: the only place either appears. */
function setClock(at) {
  $("card-clock").replaceChildren(
    ...clockLines(
      dateWords(at.date, { weekday: true }),
      timeWords(at.minuteOfDay),
    ),
  );
}
/** A bust: the person's round headshot (the People map's), or nothing. */
function setFace(id, face) {
  $(id).replaceChildren(...(face ? [drawFace(face)] : []));
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
  return factRow(termLabel(label), plain(value));
}

/**
 * The talk box keeps clear of the player card: when the centered box would
 * reach over the dock (a long status line widens the card), it stands above
 * the dock instead, so no reply sits under the card.
 */
function clearDock() {
  // Measured in the real window, placed in the scaled one.
  const k = uiScale();
  const game = $("game").getBoundingClientRect();
  const dock = $("dock").getBoundingClientRect();
  const width = Math.max(
    ...[...document.querySelectorAll("#game .chat")].map(
      (box) => box.offsetWidth,
    ),
  );
  const left = game.left / k + (game.width / k - width) / 2;
  $("game").style.setProperty(
    "--chat-bottom",
    left < dock.right / k + 8
      ? `${Math.ceil((game.bottom - dock.top) / k + 8)}px`
      : "",
  );
}
// A box shown or resized, or the card widened, sets it again.
const docking = new ResizeObserver(clearDock);
docking.observe($("dock"));
for (const box of document.querySelectorAll("#game .chat"))
  docking.observe(box);
window.addEventListener("resize", clearDock);

/** How many people stand on the talk box's strip at most (the owner's sizes: one, two and four). */
const TALK_STRIP_PEOPLE = 4;
/** Who is in the room now: the people the strip names, how many more, and what a click on one does. */
let here = { people: [], more: 0 };
/**
 * Who is here, along the foot of the room (ui/bust-strip.mjs): a room is its
 * painting, and the people in it are a strip of busts. `scene` is anything
 * with `people` and `more` (a scene, a visit, a story beat); none clears it.
 * `onClick` makes each person with something to say a way into a talk.
 */
function drawHere(scene, onClick) {
  here = { people: scene?.people ?? [], more: scene?.more ?? 0 };
  $("here").replaceChildren(
    ...(here.people.length
      ? [
          bustStrip({
            people: here.people,
            more: here.more,
            words: controls.here,
            onClick,
          }),
        ]
      : []),
  );
  drawTalkStrip();
}
/**
 * The same people on top of the talk box while a talk is open, whoever speaks
 * lit and a little larger. A speaker who is not in the room (a caller, someone
 * a scene brings in) stands first, by the face their card gave.
 */
let talkFace;
/** Who you are talking to, when someone speaks; nobody while the narrator does. */
let talkPersonId;
function drawTalkStrip() {
  const name = $("talk-name").textContent;
  const inRoom = here.people.some((p) => p.personId === talkPersonId);
  const speaker =
    talkPersonId && !inRoom && talkFace
      ? [{ personId: talkPersonId, name, face: talkFace }]
      : [];
  const others = here.people.filter((p) => p.personId !== talkPersonId);
  const speaking = here.people.filter((p) => p.personId === talkPersonId);
  // The speaker is always among those shown; the rest keep the room's order.
  const shown = [...speaker, ...speaking, ...others]
    .slice(0, TALK_STRIP_PEOPLE)
    .sort(
      (a, b) =>
        (speaker.includes(a) ? -1 : here.people.indexOf(a)) -
        (speaker.includes(b) ? -1 : here.people.indexOf(b)),
    );
  $("talk-strip").replaceChildren(
    ...(shown.length
      ? [bustStrip({ people: shown, speakingId: talkPersonId ?? undefined })]
      : []),
  );
}

/**
 * That night's news at home, as a toast top right: it fades by itself after
 * controls.opening.newsToastSeconds, goes at once on its close, and the story
 * stays in News either way.
 */
/** A story's headline as every news surface says it: its headline, else its lede, else the newscast's first line. */
const storyHeadline = (story) =>
  story.headline ?? story.lede ?? story.broadcast?.[0]?.text ?? "";
/**
 * The front-page photo of the room where a state or local government acts.
 * No photo shows the official's own face, which would not match the record;
 * a federal story has none until the art has one without a face.
 */
const STORY_PHOTOS = {
  state: ["story-governor-1.jpg"],
  local: ["story-council-1.jpg", "story-council-2.jpg"],
};
/**
 * The level of government a story is about: its own level, else the body,
 * government or law its record names (the nation's ids start "US", a state's
 * "US-" and its postal code, everything else is local).
 */
function storyLevel(story) {
  const facts = story.facts ?? {};
  if (facts.level) return facts.level;
  if (story.kind === "address") return "federal";
  const who = String(
    facts.governmentId ?? facts.body ?? facts.lawId ?? "",
  ).replace(/^(office|law):/, "");
  if (!who) return undefined;
  if (/^US(:|$)/.test(who)) return "federal";
  if (/^US-[A-Z]{2}:federal\b/.test(who)) return "federal";
  if (/^US-[A-Z]{2}(:|$)/.test(who)) return "state";
  return "local";
}
/** A lead story about a government acting carries the photo of that level's room. */
function storyPhoto(story) {
  const level = storyLevel(story);
  if (!level || level === "federal") return undefined;
  const acting = `${story.kind ?? ""} ${story.facts?.recordKind ?? ""}`;
  if (
    !/address|inauguration|law|bill|vote|council|budget|veto|sign/.test(acting)
  )
    return undefined;
  const list = STORY_PHOTOS[level] ?? STORY_PHOTOS.local;
  return `/art/newspaper/${sameFor(list, story.recordId ?? story.id ?? "")}`;
}
function hideNewsToast() {
  hideToast($("news-surface"));
}
/**
 * The night's paper: the news engine's stories the player heard, newest
 * first, only those still news on its date (the archive keeps the rest).
 */
async function nightsNews(personId) {
  const rows = await api(`/api/news?id=${encodeURIComponent(personId)}`);
  const stories = rows
    .filter((r) => r.fresh !== false)
    .filter((r) => r.headline || r.lede)
    .filter(storyHeadline);
  return { stories, outlet: stories[0]?.outlet };
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
    hideNewsToast();
    openNewsReader(news);
  };
  $("news-surface-close").onclick = hideNewsToast;
  showToast($("news-surface"), controls.opening?.newsToastSeconds ?? 8);
}
function openNewsReader(news) {
  const [lead, ...rest] = news.stories;
  // The story opens as the paper's front page: its masthead and layout.
  const outlet = news.outlet ?? {
    name: controls.news.desk,
    layout: "broadsheet",
  };
  $("news-reader-masthead").textContent = outlet.name ?? controls.news.desk;
  engraveMasthead($("news-reader-masthead"), outlet);
  $("news-reader-date").textContent = dateWords(today(), { weekday: true });
  $("news-reader").className = `panel paper paper-${
    ["broadsheet", "modern", "tabloid", "weekly"].includes(outlet.layout)
      ? outlet.layout
      : "broadsheet"
  }`;
  $("news-reader-headline").textContent = storyHeadline(lead);
  $("news-reader-body").replaceChildren(
    ...readerBody({
      lead,
      address: news.address,
      photo: storyPhoto(lead),
      none: controls.news.noStoryText,
    }),
  );
  $("news-reader-more").replaceChildren(...readerMore(rest.map(storyHeadline)));
  show("news-reader", true);
}
$("news-reader-close").addEventListener("click", () =>
  show("news-reader", false),
);

// Escape closes the top thing that is open and restores focus; only when nothing is open does it
// open Options (owner, Sept 20: "Escape dismisses the top applicable transient context and
// restores focus; when none is open, it opens the session menu"). In order: a person's card, the
// news reader, a term's card, the open menu. A talk or a scene is not one of them.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("person").hidden) {
    closePerson();
    return;
  }
  if (!$("news-reader").hidden) {
    show("news-reader", false);
    return;
  }
  if (!$("tip").hidden) {
    show("tip", false);
    return;
  }
  if (openTab) {
    // Focus goes back to the rail button that opened the menu.
    const opener = document.querySelector("#rings [data-tab].active");
    closeSheet();
    opener?.focus();
    return;
  }
  if ($("front").hidden) openSheet("options");
});

async function renderScene({ keepBackdrop = false } = {}) {
  const scene = await api(`/api/scene?id=${encodeURIComponent(me.id)}`);
  // The opening's staged story sets the backdrop itself; setting the room's
  // here first would load two pictures in a row (owner, Oct 28, point 2).
  if (!keepBackdrop) $("backdrop").src = scene.backdrop.url;
  // A person in the room is talked to by clicking them; their name in the talk
  // box opens their card (owner, Oct 27: the card has no Talk button).
  drawHere(scene, (p) => talkTo(p.personId));
  me.scene = scene;
}

async function renderCard() {
  const card = await api(`/api/card?id=${encodeURIComponent(me.id)}`);
  me.card = card;
  me.names = { ...me.names, [me.id]: card.name };
  $("card-name").textContent = card.name;
  $("card-place").textContent = me.placeName;
  setClock(packet?.at ?? { date: today(), minuteOfDay: me.minuteOfDay ?? 0 });
}

// The Guide's search, kept so an underlined term opens straight to it.
// The government whose budget the Budgets tab shows, once the player picks one.
let budgetGovernment;
let budgetLine;
// The level and the other state the Government tab shows, once the player picks them.
let governmentLevel;
let governmentState = "";
// The branch the Government tab shows, Legislative or Executive.
let governmentBranch;
// What the Issues tab shows: the laws at a level, in force or not, on a subject.
const issueFilter = { level: ALL, force: ALL, subject: ALL };
// The party whose officeholders the Parties tab shows.
let partyTab;
let guideQuery = "";
// Each civic term and its one-line definition.
let guideTerms = new Map();
api("/api/guide?q=").then((rows) => {
  guideTerms = new Map(rows.map((row) => [row.term.toLowerCase(), row]));
  // Every civic term in player text is underlined until learned, wherever it appears.
  watchTerms(document.getElementById("game"), {
    terms: guideTerms,
    learned,
    hooks: {
      onHover: (node, key) => showTip(node, key),
      onLeave: hideTipSoon,
      onClose: () => show("tip", false),
      onOpen: (text) => {
        show("tip", false);
        guideQuery = text;
        openSheet("guide");
      },
    },
  });
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
/** The hover card at a node: a term and its line; a Guide term can be marked learned. */
function showTipAt(node, { term, short, key }) {
  tipTerm = { node, key };
  $("tip-term").textContent = term;
  $("tip-short").textContent = short;
  $("tip-learned").hidden = !key;
  show("tip", true);
  // The box is measured in the real window; the tip is placed in the scaled one.
  const rect = node.getBoundingClientRect();
  const k = uiScale();
  const box = {
    left: rect.left / k,
    top: rect.top / k,
    bottom: rect.bottom / k,
  };
  const tip = $("tip");
  tip.style.left = `${Math.min(box.left, viewWidth() - tip.offsetWidth - 16)}px`;
  tip.style.top =
    box.bottom + tip.offsetHeight + 12 < viewHeight()
      ? `${box.bottom + 6}px`
      : `${box.top - tip.offsetHeight - 6}px`;
}
function showTip(node, key) {
  const term = guideTerms.get(key);
  showTipAt(node, { term: term.term, short: term.short, key });
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
  // Learned everywhere: every underline of the term, under any plural, goes at once.
  for (const node of document.querySelectorAll(
    `[data-term-key="${tipTerm.key}"], .term`,
  ))
    if (
      node.dataset.termKey === tipTerm.key ||
      node.textContent.trim().toLowerCase() === tipTerm.key
    )
      node.classList.remove("term");
  show("tip", false);
});
/** The Guide's reset: every term the player marked learned is underlined again. */
function resetLearned() {
  learned.clear();
  try {
    localStorage.removeItem(LEARNED_KEY);
  } catch {
    // Without storage there is nothing kept to clear.
  }
  for (const node of document.querySelectorAll("[data-term-key]"))
    node.classList.add("term");
}
/**
 * A label shown on screen, underlined when the whole label is a Guide term
 * (never a search through prose): hover shows its definition, and clicking
 * it opens the Guide there.
 */
function termLabel(text) {
  const key = String(text).trim().toLowerCase();
  return termWord({
    text,
    isTerm: guideTerms.has(key),
    learned: learned.has(key),
    onHover: (b) => showTip(b, key),
    onLeave: hideTipSoon,
    onOpen: () => {
      show("tip", false);
      guideQuery = text;
      openSheet("guide");
    },
  });
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
// A key as a person would say it (a name inside a screen that has its own `words`).
const keyWords = words;
// Money amounts are kept in cents; "minor/hour" reads as dollars an hour; a plain amount is rounded.
// A percent reads with its sign, any other unit in words.
const amount = (value, unit) => {
  if (unit?.startsWith("minor"))
    // A rate per hour or day keeps its cents; a plain amount reads rounded, as Budgets does.
    return unit.includes("/")
      ? `${moneyWords(Number(value))}/${unit.split("/")[1]}`
      : roundedMoney(Number(value));
  // A rate as a person would say it: at most two decimals (a combined sales
  // tax of 8.773% reads 8.77%; Medicare's 1.45% stays itself).
  if (unit?.startsWith("percent"))
    return `${Number(Number(value).toFixed(2))}%${unit.length > 7 ? ` ${unit.slice(8).replace(/-/g, " ")}` : ""}`;
  if (unit?.startsWith("USD/")) return `$${value}/${unit.slice(4)}`;
  return `${value ?? ""}${unit ? ` ${unit.replace(/-/g, " ")}` : ""}`;
};
/** What follows a number typed for a law's amount: a percent sign, dollars, or its unit in words. */
const amountUnit = (unit) =>
  !unit
    ? ""
    : unit.startsWith("percent")
      ? "%"
      : unit.startsWith("minor")
        ? `$${unit.includes("/") ? `/${unit.split("/")[1]}` : ""}`
        : unit.replace(/-/g, " ");
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
  $("hour").textContent = controls.time?.hour ?? "";
  $("week").textContent = controls.time?.week ?? "";
  $("day").textContent = controls.time?.day ?? "";
  $("continue").textContent = controls.time?.continue ?? "";
  return value;
});

function renderPacket(value) {
  packet = value ?? packet;
  const open = packet?.kind === "stop";
  $("hour").disabled = $("day").disabled = $("week").disabled = busy || open;
  show("continue", packet?.kind === "stop");
  if (packet) setClock(packet.at);
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
  else if (line !== shownJournalLine) {
    showToast($("journal-note"), controls.opening?.newsToastSeconds ?? 8);
    // A new line since the Journal was last open: a dot on its icon until it is read.
    if (shownJournalLine && openTab !== "journal")
      document
        .querySelector('#rings [data-tab="journal"]')
        ?.classList.add("unread");
  }
  shownJournalLine = line;
}
async function refresh(scene = {}) {
  await Promise.all([
    renderScene(scene),
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
    // That night, once the returns close: the scene of your own result (the
    // concession call or the victory), when the director staged one.
    if (night.resultMomentId) await showStory(night.resultMomentId);
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
      else if (
        office.reasonKey === "office-day.executive-order" ||
        office.reasonKey === "office-day.emergency" ||
        office.reasonKey === "office-day.state-of-the-state" ||
        office.reasonKey === "office-day.own-hearing" ||
        office.reasonKey === "office-day.appointment" ||
        office.reasonKey === "office-day.budget-proposal"
      )
        await atOrders();
      else if (
        office.reasonKey === "office-day-federal.budget-request" ||
        office.reasonKey === "office-day-federal.joint-address"
      )
        await atOrders();
      else if (office.reasonKey === "office-day-federal.nomination")
        await atNominations();
      else if (
        office.reasonKey === "office-day-federal.floor-vote" ||
        office.reasonKey === "office-day-state.floor-vote"
      )
        await atFloor();
      busy = false;
      return act(
        `/api/resume?${new URLSearchParams({ kind: "stop", pauseId: result.packet.pauseId })}`,
      );
    }
    const moment = storyStop(result.packet);
    if (moment) await showStory(moment.recordId);
  } catch (error) {
    // The server holds an open stop this page does not show (a skip raced a stop another call
    // opened): take it back from the server so Continue shows; only a refusal with nothing held
    // is told as it is.
    if (!(await resyncOpenStop())) $("card-place").textContent = error.message;
  } finally {
    busy = false;
    renderPacket();
  }
}
/** Show the stop the server holds for the saved life, if one is open; true when it did. */
async function resyncOpenStop() {
  const held = (await api("/api/title").catch(() => undefined))?.life?.packet;
  if (held?.kind !== "stop") return false;
  renderPacket(held);
  await refresh();
  const moment = storyStop(held);
  if (moment) await showStory(moment.recordId);
  return true;
}

// ---- The officeholder's day (OFFICE-LOCAL): the meeting and the desk ----
/** A stop the office-day engine holds: a meeting at its hour, or the desk in the morning. */
function officeStop(value) {
  return value?.kind === "stop"
    ? value.stop.modules.find((row) => row.moduleId === "core2-office-day-v1")
    : undefined;
}
const voteWords = () => controls.meeting ?? {};
/** One agenda item or desk bill as the meeting panel draws it (ui/meeting-item.mjs). */
function billBlock(item, members, rows, onPaper) {
  const paperButton = () => {
    const open = makeButton({
      className: "action",
      textContent: controls.bill?.open ?? "",
    });
    open.addEventListener("click", () => onPaper(item.billId));
    return open;
  };
  return meetingItem({
    item,
    members,
    words: voteWords(),
    floor: controls.floor ?? {},
    rows: [
      [...(onPaper ? [paperButton()] : []), ...(rows[0] ?? [])],
      ...rows.slice(1),
    ],
  });
}
function inMeeting() {
  return new Promise((resolve) => {
    const words = voteWords();
    // A press acts once: every button on the panel is off from the press until
    // the panel redraws from the server's answer, so a second quick press sends
    // nothing. A refusal (the item was already taken up) redraws the meeting as
    // it stands with the server's own line at its top, never a page error.
    const act = async (path) => {
      for (const b of $("meeting").querySelectorAll("button"))
        b.disabled = true;
      try {
        draw(await post(path));
      } catch (refused) {
        draw(await api("/api/meeting"));
        $("meeting-items").prepend(prose(refused.message, "meeting-note"));
      }
    };
    const draw = (scene) => {
      if (!scene) return finish();
      $("meeting-adjourn").disabled = false;
      $("meeting-adjourn").textContent =
        (scene.seated ? words.adjourn : words.leave) ?? "";
      $("backdrop").src = scene.backdrop.url;
      drawHere(scene);
      $("card-place").textContent = scene.title;
      $("meeting-title").textContent = scene.title;
      $("meeting-items").replaceChildren(
        ...scene.items.map((item) => {
          const speak = ["for", "against"].map((position) => {
            const b = makeButton({
              className: "action small",
              textContent:
                words[position === "for" ? "speakFor" : "speakAgainst"] ??
                position,
            });
            b.addEventListener("click", () =>
              act(
                `/api/meeting/speak?${new URLSearchParams({ meetingId: scene.id, billId: item.billId, position })}`,
              ),
            );
            return b;
          });
          const vote = ["yes", "no", "abstain", "own"].map((how) => {
            const b = makeButton({
              className: "action",
              textContent: words[how] ?? how,
            });
            b.addEventListener("click", () =>
              act(
                `/api/meeting/item?${new URLSearchParams({ meetingId: scene.id, billId: item.billId, vote: how })}`,
              ),
            );
            return b;
          });
          // Anyone in the room speaks, at any board; only the seated vote.
          return billBlock(
            item,
            scene.members ?? [],
            // A bill a committee already failed stays listed, with nothing to press.
            item.takenUp || item.status !== "drafted"
              ? []
              : [speak, ...(scene.seated ? [vote] : [])],
            (billId) =>
              openBillPaper(
                billId,
                (...nodes) => $("meeting-items").replaceChildren(...nodes),
                () => api("/api/meeting").then(draw),
                controls.bill?.backMeeting,
              ),
          );
        }),
      );
      // A resident's one line under the title: an empty agenda, or what they can do here.
      if (scene.note)
        $("meeting-items").prepend(prose(scene.note, "meeting-note"));
      // Said before the press: what Adjourn does with the items still open.
      $("meeting-adjourn-note")?.remove();
      if (scene.items.some((item) => !item.takenUp))
        $("meeting-adjourn").before(
          Object.assign(prose(words.adjournNote ?? "", "meeting-note"), {
            id: "meeting-adjourn-note",
          }),
        );
      $("meeting-adjourn").onclick = async () => {
        $("meeting-adjourn").disabled = true;
        await post(
          `/api/meeting/adjourn?${new URLSearchParams({ meetingId: scene.id })}`,
        );
        finish();
      };
    };
    const finish = () => {
      show("meeting", false);
      resolve();
    };
    $("meeting-adjourn").textContent = words.adjourn ?? "";
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
            [],
            [
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
            ],
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

// The floor vote that holds a member of Congress's clock: each bill on tomorrow's floor with
// the paper to read and Yes, No, Abstain or Decide for me (the engine never votes for the player).
function atFloor() {
  return new Promise((resolve) => {
    const words = controls.meeting ?? {};
    const draw = (bills) => {
      if (!bills.length) return finish();
      $("desk-items").replaceChildren(
        ...bills.map((item) =>
          billBlock(
            item,
            [],
            [
              ["yes", "no", "abstain", "own"].map((how) => {
                const b = makeButton({
                  className: "action",
                  textContent: words[how] ?? how,
                });
                b.addEventListener("click", async () =>
                  draw(
                    await post(
                      `/api/floor?${new URLSearchParams({ billId: item.billId, how })}`,
                    ),
                  ),
                );
                return b;
              }),
            ],
            (billId) =>
              openBillPaper(
                billId,
                (...nodes) => $("desk-items").replaceChildren(...nodes),
                () => api("/api/floor").then(draw),
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
    api("/api/floor").then(draw);
  });
}

// The orders the governor's staff brings for signature hold the clock: each is issued (or revoked) or set aside by the player.
/** The president's open cabinet posts: who each could go to, best first, then the Senate's vote. */
function atNominations() {
  return new Promise((resolve) => {
    const words = controls.nominations ?? {};
    const draw = (posts) => {
      if (!posts.length) return finish();
      $("desk-items").replaceChildren(
        ...posts.map((entry) => {
          let nominee = "";
          return plate(
            entry.title,
            // With no one to nominate the post can only be left open.
            ...(entry.candidates.length
              ? [
                  select({
                    options: [
                      { value: "", label: words.own ?? "" },
                      ...entry.candidates.map((c) => ({
                        value: c.id,
                        label: (c.work && c.place
                          ? words.row
                          : c.place
                            ? words.rowPlace
                            : "{name}"
                        )
                          .replace("{name}", c.name)
                          .replace("{work}", c.work ?? "")
                          .replace("{place}", c.place ?? ""),
                      })),
                    ],
                    onChange: (value) => {
                      nominee = value;
                    },
                  }),
                ]
              : [introText(words.nobody ?? "")]),
            buttonRow(
              ...["nominate", "leave"]
                .filter((how) => how === "leave" || entry.candidates.length)
                .map((how) => {
                  const b = makeButton({
                    className: "action",
                    textContent: words[how] ?? "",
                  });
                  b.addEventListener("click", async () =>
                    draw(
                      await post(
                        `/api/nominations?${new URLSearchParams({
                          post: entry.post,
                          ...(how === "leave" ? { how } : {}),
                          ...(how === "nominate" && nominee
                            ? { nomineeId: nominee }
                            : {}),
                        })}`,
                      ),
                    ),
                  );
                  return b;
                }),
            ),
          );
        }),
      );
    };
    const finish = () => {
      show("desk", false);
      resolve();
    };
    show("desk", true);
    api("/api/nominations").then(draw);
  });
}
function atOrders() {
  return new Promise((resolve) => {
    const words = controls.orders ?? {};
    const draw = (orders) => {
      if (!orders.length) return finish();
      $("desk-items").replaceChildren(
        ...orders.map((item) => {
          // An open cabinet post: the people it could go to, best first; left alone, the first stands.
          let nominee = "";
          const picker =
            item.kind === "post"
              ? [
                  select({
                    options: [
                      { value: "", label: words["post-own"] ?? "" },
                      ...item.candidates.map((c) => ({
                        value: c.id,
                        label: (c.work && c.place
                          ? words.row
                          : c.place
                            ? words.rowPlace
                            : "{name}"
                        )
                          .replace("{name}", c.name)
                          .replace("{work}", c.work ?? "")
                          .replace("{place}", c.place ?? ""),
                      })),
                    ],
                    onChange: (value) => {
                      nominee = value;
                    },
                  }),
                ]
              : [];
          // The state budget: the change to each line, in steps of its amount, as the office panel's editor sets it.
          const lines =
            item.kind === "budget"
              ? item.lines.map((row) =>
                  labeled(
                    `${row.name} ${roundedMoney(row.amountMinor)}`,
                    select({
                      options: [-20, -10, 0, 10, 20].map((pct) => {
                        const minor = Math.round((row.amountMinor * pct) / 100);
                        return {
                          value: minor,
                          label: controls.budgetEditor[String(pct)],
                          selected: row.changeMinor === minor,
                        };
                      }),
                      onChange: async (changeMinor) => {
                        await post(
                          `/api/office/budget-line?${new URLSearchParams({ line: row.line, changeMinor })}`,
                        );
                      },
                    }),
                  ),
                )
              : [];
          const kindWords = (how) =>
            item.kind === "request" || item.kind === "joint"
              ? words[`${item.kind}-${how}`]
              : item.kind === "hearing"
                ? words[`hearing-${how}`]
                : item.kind === "address"
                  ? words[`address-${how}`]
                  : item.kind === "emergency"
                    ? words[`emergency-${how}`]
                    : item.kind === "post"
                      ? words[`post-${how}`]
                      : item.kind === "budget"
                        ? words[`budget-${how}`]
                        : how === "issue" && item.revoke
                          ? words.revoke
                          : words[how];
          return plate(
            item.kind === "request" || item.kind === "joint"
              ? words[item.kind]
              : item.kind === "hearing"
                ? words.hearing
                : item.kind === "address"
                  ? words.address
                  : item.kind === "emergency"
                    ? words.emergency
                    : item.kind === "budget"
                      ? words.budget
                      : (item.name ?? ""),
            ...picker,
            ...lines,
            buttonRow(
              ...(item.kind === "address"
                ? ["issue"]
                : ["issue", "decline"]
              ).map((how) => {
                const b = makeButton({
                  className: "action",
                  textContent: kindWords(how),
                });
                b.addEventListener("click", async () => {
                  try {
                    draw(
                      await post(
                        `/api/orders?${new URLSearchParams({
                          entryId: item.entryId,
                          how,
                          ...(item.kind === "post" && nominee
                            ? { nomineeId: nominee }
                            : {}),
                        })}`,
                      ),
                    );
                  } catch {
                    // The entry is no longer waiting (the day moved, or another stop cleared it): the
                    // desk redraws from what is waiting now, never a stale plate with a dead button.
                    draw(await api("/api/orders"));
                  }
                });
                return b;
              }),
            ),
          );
        }),
      );
    };
    const finish = () => {
      show("desk", false);
      resolve();
    };
    show("desk", true);
    api("/api/orders").then(draw);
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
      $("election-day-lines").append(...lines.map((line) => prose(line.text)));
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
      setClock(day.at);
      if (scene) {
        $("backdrop").src = scene.backdrop.url;
        drawHere(scene);
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
                drawHere(done.scene);
              }
              if (done.line) say([done.line]);
              ask(day);
            },
          ],
          [labels.skipCanvass, () => ask(day)],
        );
      else ask(day);
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
      drawHere(night.scene);
    }
    // The governor races elsewhere that night have their own page after the
    // call, two columns of rows, so all of them fit the panel at 1024x768
    // with nothing to scroll (owner, Oct 27 audit: rows past the panel's foot
    // could not be reached).
    const steps = night.nation.races.length
      ? [...night.steps, { nation: night.nation }]
      : night.steps;
    let at = 0;
    const draw = () => {
      $("returns").replaceChildren(
        electionNightScreen({
          title: night.title,
          step: steps[at],
          labels,
          last: at === steps.length - 1,
          onNext: async () => {
            if (at < steps.length - 1) {
              at += 1;
              draw();
              return;
            }
            await post(
              `/api/election-night/watched?${new URLSearchParams({ id: me.id, contestId: night.contestId })}`,
            );
            show("returns", false);
            resolve();
          },
        }),
      );
    };
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
    const labels = {
      ...controls.polling,
      know: controls.polling?.know,
      forRace: controls.polling?.forRace,
    };
    const draw = (value) => {
      scene = value;
      $("backdrop").src = scene.backdrop.url;
      drawHere(scene);
      $("ballot").replaceChildren(
        ballotPaper({
          contests: scene.contests,
          labels: { ...labels, blank: controls.polling?.leaveBlank },
          onMark: async (contestId, candidateId) => {
            const result = await post(
              `/api/polling-place/mark?${new URLSearchParams({
                contestId,
                candidateId: candidateId ?? "",
              })}`,
            );
            if (result.pollingPlace) draw(result.pollingPlace);
            else finish();
          },
          know: (personId) =>
            api(
              `/api/known?${new URLSearchParams({ id: me.id, other: personId })}`,
            )
              .then((c) => ({
                name: c.name,
                face: c.face,
                summary: c.summary,
              }))
              .catch(() => null),
          onLeave: async () => {
            await post("/api/polling-place/leave");
            finish();
          },
        }),
      );
    };
    const finish = () => {
      show("ballot", false);
      resolve();
    };
    draw(scene);
    show("ballot", true);
  });
}
// Day and Week run the world forward (owner, Oct 15, 2026); a calendar day
// runs it to that day. A scene the director fires stops any of them there.
for (const mode of ["day", "week"])
  $(mode).addEventListener("click", () => {
    // Living on puts the evening's paper away.
    hideNewsToast();
    return act(`/api/advance?mode=${mode}`);
  });
// Hour lets an hour go by where the player stands (the clock's own wait, /api/wait):
// the people at a place are those there at that hour, so waiting is how a player
// lets the shift change. A scene the director fires stops it there, as with Day.
$("hour").addEventListener("click", () => {
  hideNewsToast();
  return act("/api/wait?hours=1");
});
// Stories News held when it was last open: a dot on the rail's News icon until it is read.
// The first count a life is opened with is already read: a reload starts with
// nothing unread, and only what arrives after it lights the dot (P12).
let seenNews;
async function newsCount() {
  const rows = await api(`/api/news?id=${encodeURIComponent(me.id)}`);
  // Every row News lists (its public records), the same rows its screen draws.
  return rows.length;
}
async function markNews(read) {
  const count = await newsCount();
  if (read || seenNews === undefined) seenNews = count;
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
/** Who you are talking to: their name on the box, and their bust lit on the strip above it. */
async function setWho(personId, name) {
  talkPersonId = personId;
  $("talk-name").textContent = name ?? "";
  talkFace = undefined;
  show("talk-who", Boolean(name));
  drawTalkStrip();
  // Someone in the room is already on the strip; anyone else stands there by their card's face.
  if (!personId || here.people.some((p) => p.personId === personId)) return;
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: personId })}`,
  ).catch(() => undefined);
  if (!c || $("talk-name").textContent !== (name ?? "")) return;
  talkFace = c.face ?? undefined;
  drawTalkStrip();
}
/** A talk's lines: what you said before, what they said before, and what is said now. */
function spokenLines(lines) {
  return transcript(
    lines.map((line) => ({
      text: line.text,
      mine: line.speakerId === me.id,
      lying: line.act === "lie",
    })),
    {
      mineWho: $("card-name").textContent,
      theirWho: $("talk-name").textContent,
    },
  );
}
// The narrator speaks first and alone; Continue, then the person talks (owner,
// Oct 28 sitting, 36: "The narrator shows first, Continue, then the person
// talks"). What comes next (the person, the next part of a speech) waits
// here for that Continue.
let onContinue;
/** The narration alone with one Continue, then `then`; no narration, `then` at once. */
function narrateFirst(setting, then) {
  if (!setting.length) return then();
  onContinue = then;
  talkControls({ silent: false, leave: false });
  fillTalk({ lines: setting, replies: [] });
  setScales({ available: false });
}
/**
 * Numbered replies; a key press of the number says it. Each is shown as the
 * player's own words, the line the transcript then records (owner, Nov 1:
 * a choice "should be an actual reply").
 */
function replies(choices, onPick) {
  return choices.map((choice) => talkReply(choice, choice.text, onPick));
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
    lines: spokenLines(value.lines),
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
  const opened = await post(
    `/api/talk/open?otherId=${encodeURIComponent(otherId)}${occasion}`,
  );
  renderTalk(opened);
  // Nothing to say opens no box (the server answers none): the room is handed
  // back, as after a talk's end.
  if (!opened) await renderScene();
}
// Saying nothing is a smaller control beside the four replies (owner, Oct 14).
// A line that does not read right is marked where it is said; no time passes.
// Mark gap is a developer control: it joins the talk box only while dev
// mode is on, and is never in the player's markup.
const gapButton = makeButton({
  id: "talk-gap",
  className: "action small",
  textContent: "",
});
void controlsReady.then(() => {
  gapButton.textContent = controls.talkBox?.markGap ?? "";
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
  if (!onContinue) show("talk-skip", false);
  if (onContinue) {
    const then = onContinue;
    onContinue = undefined;
    await then();
    return;
  }
  if (filing) {
    $("talk-leave").click();
    return;
  }
  const left = talk ? await post("/api/talk/leave") : undefined;
  // The talk's minutes moved the clock: the card shows the new time.
  if (left?.packet) renderPacket(left.packet);
  renderTalk(undefined);
  show("talk", false);
  // A story's end hands the room back to the one scene renderer, so the people in it can be
  // clicked to talk again (a story draws them without a click).
  await renderScene();
  if (!$("continue").hidden) $("continue").click();
});
// Skip scene ends the address at once; the room is handed back as at its last Continue.
$("talk-skip").addEventListener("click", async () => {
  onContinue = undefined;
  show("talk-skip", false);
  renderTalk(undefined);
  show("talk", false);
  await renderScene();
  if (!$("continue").hidden) $("continue").click();
});
$("talk-leave").addEventListener("click", async () => {
  if (filing) {
    await post("/api/filing/leave");
    filing = undefined;
    filingNarrated = false;
    show("talk", false);
    await refresh();
    renderPacket();
    return;
  }
  onContinue = undefined;
  const left = await post("/api/talk/leave");
  // The talk's minutes moved the clock: the card shows the new time.
  if (left?.packet) renderPacket(left.packet);
  renderTalk(undefined);
  await renderScene();
});

// ---- The filing office (step 3), a visit in the clerk's words ----
let filing;
// The counter's narration has played its beat for this visit.
let filingNarrated = false;
function renderFiling(value) {
  filing = value;
  if (!value) return;
  $("backdrop").src = value.backdrop.url;
  drawHere(value);
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
  // The narrator sets the counter up first, alone, whatever the visit
  // arrives with (a race picked at once adds lines before this runs); Continue,
  // then the clerk speaks. Once per visit (owner, Nov 8: "it says first thing
  // on June 7th. You head to the clerk's office and speak to...").
  if (value.intro?.length && !filingNarrated) {
    filingNarrated = true;
    narrateFirst(
      value.intro.map((line) =>
        talkLine({ kind: "speech narration", text: line.text }),
      ),
      () => renderFiling(value),
    );
    return;
  }
  fillTalk({ lines: spokenLines(lines) });
  // No form at the counter (owner, Oct 28, point 31: the rules panel was a
  // dev menu): filing carries the party the player is tied to, from the
  // record; the platform is SG-SCREENS-filing-platform-from-views.
  const choose = async (choice) => {
    // "All right." is the way out: it walks out as Leave does, never a reply
    // that only clears itself (C13).
    if (choice.action.kind === "done") {
      await post(
        `/api/filing/choose?${new URLSearchParams({ key: choice.key })}`,
      );
      $("talk-leave").click();
      return;
    }
    const params = new URLSearchParams({ key: choice.key });
    if (choice.action.kind === "file" && value.overlay?.party)
      params.set("party", value.overlay.party);
    renderFiling(await post(`/api/filing/choose?${params}`));
  };
  // Each race told apart before the pick: its seat, its election day and
  // who holds the seat now, from the contest's records. It says nothing of what the
  // office does (SG-SCREENS-office-hover-prose: no office-duties bank yet).
  const counter = controls.filing;
  const factsOf = (choice) => {
    const seat = value.seats?.[choice.action.contestId];
    if (!seat) return "";
    return [
      ...(seat.seat ? [`${counter.seat} ${seat.seat}`] : []),
      dateWords(seat.electionDate),
      seat.holder ? `${counter.heldBy} ${seat.holder}` : counter.openSeat,
    ].join(" · ");
  };
  // The counter offers four replies at most (SG-SCREENS-counter-six-replies),
  // the races soonest first; every race is a way in from the office's own view
  // in Travel. Each race is told apart in its own line (its seat, its election
  // day and who holds it now), never in a hover card over the next line
  // (owner, Nov 1: "a terribly designed menu").
  const electionOf = (choice) =>
    value.seats?.[choice.action.contestId]?.electionDate ?? "";
  const picks = new Set(
    value.visit.choices
      .filter((choice) => choice.action.kind === "pick")
      .sort((x, y) => electionOf(x).localeCompare(electionOf(y)))
      .slice(0, 4),
  );
  const choices = value.visit.choices
    .filter((choice) => choice.action.kind !== "pick" || picks.has(choice))
    .slice(0, 4);
  // At the counter you can walk out where that is a real choice: not beside
  // a lone "All right." that already ends the visit. Silence is not an answer.
  talkControls({
    silent: false,
    leave: !(
      choices.length > 0 && choices.every((c) => c.action.kind === "done")
    ),
  });
  const buttons = replies(choices, choose);
  choices.forEach((choice, i) => {
    if (choice.action.kind !== "pick") return;
    buttons[i].append(" ", smallText(factsOf(choice), "reply-facts"));
  });
  fillTalk({ replies: buttons });
  // What the filing asks next is said by the clerk, once, in the talk: no
  // count or status label sits under the dialogue (owner, Nov 14).
  setScales({ available: false });
}
async function openFiling(filedWith, contestId) {
  filingNarrated = false;
  closeSheet();
  renderTalk(undefined);
  const opened = await post(
    `/api/filing/open?filedWith=${encodeURIComponent(filedWith)}`,
  );
  // A closed office is visited at its next opening: the clock has moved there.
  // Something that came up on the way is lived first; the counter waits.
  if (opened.waiting || opened.waited) {
    const packet = opened.waiting ? opened.packet : opened.waited;
    if (packet) renderPacket(packet);
    if (opened.waiting) {
      const moment = storyStop(packet);
      if (moment) await showStory(moment.recordId);
      return;
    }
  }
  // Nothing to file and no petition out: the counter has no scene.
  if (opened.nothing) return;
  const pick =
    contestId &&
    opened.visit?.choices.find(
      (c) => c.action.kind === "pick" && c.action.contestId === contestId,
    );
  renderFiling(
    pick
      ? await post(
          `/api/filing/choose?${new URLSearchParams({ key: pick.key })}`,
        )
      : opened,
  );
}

// ---- Party: join one; the tie is read by filing and the party's loyalty ----
function partyRows(party) {
  const words = controls.party ?? {};
  if (party.member) {
    const m = party.member;
    // What the line stands on: the registration (the tie's own record, with
    const line = row(
      words.member,
      [
        words.registered
          .replace("{party}", m.name)
          .replace("{date}", dateWords(m.since)),
      ].join(" · "),
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
      partyTab = p.name;
      // Back to Parties, where joining happens, to show the new membership.
      openSheet("parties");
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
// Each person the last call reached, in the English engine's words.
let campaignLines = [];
// The speech being built: the parts said and the four on offer, from the server.
let speechState = null;
/**
 * The town's next local ballot: every city, township and county seat on it
 * with each filer by name, from the filing records, marked unopposed or
 * unfilled where that is what the records hold.
 */
/**
 * Asking people for something, played as a scene (owner: every campaign act is
 * a scene): the place with the player at it, each person asked the next
 * Continue (their name and bust, what they said from the ask's own record),
 * the last the total in the narrator's voice. An evening of donor calls and a
 * volunteer shift are this.
 */
function playAsks({ asked, summary, scene }) {
  closeSheet();
  renderTalk(undefined);
  if (scene) {
    $("backdrop").src = scene.backdrop.url;
    // Each person is heard by name and bust as they answer.
    drawHere();
  }
  show("talk", true);
  const step = (at) => {
    talkControls({ silent: false, leave: false });
    setScales({ available: false });
    if (at < asked.length) {
      setWho(asked[at].personId, asked[at].name);
      fillTalk({
        lines: [talkLine({ kind: "speech", text: asked[at].line })],
        replies: [],
      });
      onContinue = () => step(at + 1);
      return;
    }
    setWho(null, null);
    fillTalk({
      lines: [talkLine({ kind: "speech narration", text: summary })],
      replies: [],
    });
  };
  step(0);
}
/**
 * A governor's race that carries the office the law elects on its ticket: the running mate
 * once named, else the people of the player's party the world's own pick ranks, best first, to
 * choose from, and Choose for me for the world's pick (owner, Nov 14).
 */
function ticketSection(filing, ticket) {
  const words = controls.runningMate ?? {};
  const title = words.title;
  if (ticket.mate) return stripSection(1, title, introText(ticket.mate.name));
  if (!ticket.choices.length)
    return stripSection(
      1,
      title,
      introText(
        ticket.joinsAfterPrimary
          ? words.nominee.replace("{ticket}", ticket.officeSaid)
          : words.later,
      ),
    );
  let picked = ticket.choices[0].id;
  const choose = async (personId) => {
    await post(
      `/api/campaign/running-mate?${new URLSearchParams({ filingId: filing.id, ...(personId ? { personId } : {}) })}`,
    );
    await openSheet("campaign");
  };
  return stripSection(
    1,
    title,
    select({
      options: ticket.choices.map((c) => ({
        value: c.id,
        label: (c.work && c.place
          ? words.row
          : c.place
            ? words.rowPlace
            : c.work
              ? words.rowWork
              : "{name}"
        )
          .replace("{name}", c.name)
          .replace("{work}", c.work ?? "")
          .replace("{place}", c.place ?? ""),
      })),
      onChange: (value) => {
        picked = value;
      },
    }),
    buttonRow(
      makeButton({
        className: "action primary",
        textContent: words.choose,
        onclick: () => choose(picked),
      }),
      makeButton({
        className: "action",
        textContent: words.own,
        onclick: () => choose(null),
      }),
    ),
  );
}
async function campaignParts() {
  const v = await api(`/api/campaign?id=${encodeURIComponent(me.id)}`);
  const parts = [];
  for (const {
    filing,
    contest,
    campaign,
    pollSample,
    petition,
    outings,
    standing,
    debates,
    pictures,
    runningMate,
  } of v.campaigns) {
    const goOut = async (outing, outletId) => {
      const kindOf = {
        doors: "canvass",
        calls: "raise-money",
        event: "event",
        forum: "forum",
        interview: "interview",
        party: "donor-meeting",
      };
      const result = await post(
        `/api/campaign/day?${new URLSearchParams({ filingId: filing.id, kind: kindOf[outing], ...(outletId ? { outletId } : {}) })}`,
      );
      // The outing's hours moved the clock: the card shows the new time.
      if (result.packet) renderPacket(result.packet);
      campaignLines = (result.calls ?? []).map((call) => call.line);
      // An evening of calls is a scene (owner: every campaign act is a scene):
      // the player at the phones, one call per Continue, each person heard by
      // name with what they gave or why not, then the night's total.
      if (outing === "calls" && result.callsLine) {
        campaignResult = result.callsLine;
        playAsks({
          asked: result.calls ?? [],
          summary: result.callsLine,
          scene: result.scene,
        });
        return;
      }
      campaignResult = [
        controls.campaignOutings[outing],
        result.doorsKnocked
          ? controls.campaignResults.doors.replace("{n}", result.doorsKnocked)
          : "",
        // A petition outing says the doors that opened, everyone asked to
        // sign (the Words lead, Nov 14); "reached" stays for vote-asking doors.
        result.answered !== null && result.answered !== undefined
          ? controls.campaignResults.answered.replace("{n}", result.answered)
          : result.reached
            ? controls.campaignResults.reached.replace("{n}", result.reached)
            : "",
        // How many signed at the doors, a day of none included (owner, Nov 14:
        // "Tab total and each outing"), outside the dialogue.
        result.signed === null || result.signed === undefined
          ? ""
          : result.signed === 0
            ? controls.campaignResults.signedNone
            : controls.campaignResults.signed.replace("{n}", result.signed),
        result.raisedMinor ? moneyWords(result.raisedMinor) : "",
      ]
        .filter(Boolean)
        .join(" · ");
      // A donor meeting is seen in the host's home, told by what the room gave.
      if (outing === "party" && result.callsLine)
        campaignResult = result.callsLine;
      // Something that came up while out holds the clock: it is shown, as
      // after Day, so Continue never stands over an empty screen.
      const moment = storyStop(result.packet);
      // The doors and the calls are seen where they happen, with the people reached.
      if (result.scene || moment) closeSheet();
      if (result.scene) {
        $("backdrop").src = result.scene.backdrop.url;
        drawHere(result.scene);
      }
      if (moment) await showStory(moment.recordId);
      if (!result.scene && !moment) reopenTrail(filing.id);
    };
    const act = async (kind, extra = {}) => {
      campaignLines = [];
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
            ? `${controls.campaignActs[kind] ?? ""}: ${result.contacted} · ${Object.entries(
                result.answers,
              )
                .map(([k, n]) => `${plain(k) ?? ""} ${n}`)
                .join(" · ")}`
            : result.reached !== undefined
              ? `${controls.campaignActs[kind] ?? ""}: ${result.reached} · +${result.warmer} · −${result.cooler}`
              : `${controls.campaignActs[kind] ?? ""}: ${result.answers.filter((a) => a.yes || a.givenMinor > 0).length} / ${result.answers.length}${result.answers.some((a) => a.givenMinor) ? ` · ${moneyWords(result.answers.reduce((t, a) => t + (a.givenMinor ?? 0), 0))}` : ""}`;
      // A volunteer shift is a scene: each person asked is the next Continue.
      if (kind === "ad" && result.scene) {
        playAsks({ asked: [], summary: result.line, scene: result.scene });
        return;
      }
      if (
        (kind === "volunteer" || kind === "endorsement") &&
        result.answers?.length
      ) {
        playAsks({
          asked: result.answers,
          summary: campaignResult,
          scene: result.scene,
        });
        return;
      }
      // A speech is seen where it was given, with the people it reached.
      if (result.scene) {
        closeSheet();
        $("backdrop").src = result.scene.backdrop.url;
        drawHere(result.scene);
        return;
      }
      reopenTrail(filing.id);
    };
    const venue = select({
      options: (v.venues ?? []).map((place) => ({
        value: place,
        label: controls.venues?.[place] ?? "",
      })),
    });
    const button = (label, kind, extra) => {
      const b = makeButton({ textContent: label });
      b.addEventListener("click", () =>
        act(kind, typeof extra === "function" ? extra() : extra),
      );
      return b;
    };
    // The acts are scenes you go to: each is a place on the trail (the mock's pl-trail), its
    // hours and why it is out of reach, and Go. Money, the speech and debates open their own
    // controls beside the list.
    const T = controls.campaignBoard;
    const go = (onClick) => ({ label: T.go, onClick });
    const entries = [
      ...(outings ?? []).map((choice) => {
        const why = choice.why
          ? (controls.campaignUnavailable[choice.why.key] ?? "")
              .replace("{price}", moneyWords(choice.why.priceMinor ?? 0))
              .replace("{cash}", moneyWords(choice.why.cashMinor ?? 0))
          : "";
        return {
          group: T.groupOut,
          title: controls.campaignOutings[choice.outing],
          picture: choice.picture,
          load: async () => ({
            facts: [
              {
                label: T.howLong,
                value: `${choice.hours} ${controls.campaignOutings.hours}`,
              },
            ],
            does: why ? [why] : [],
          }),
          ...(choice.available
            ? { go: go(() => goOut(choice.outing, choice.outletId)) }
            : {}),
        };
      }),
      ...[
        ["volunteer", undefined],
        ["endorsement", undefined],
        ["ad", { amountMinor: "5000" }],
        ["poll", { sampleSize: String(pollSample) }],
      ].map(([kind, extra]) => ({
        group: T.groupAsk,
        title: controls.campaignActs[kind],
        picture: pictures?.[kind],
        load: async () => ({}),
        // stopgapId: SG-PLAY-campaign-acts-buttons
        go: go(() => act(kind, extra)),
      })),
      {
        group: T.groupMoney,
        title: controls.campaignActs.mail,
        picture: pictures?.mail,
        load: async () => {
          const dollarsOut = numberBox({
            value: 50,
            min: 0,
            step: 1,
            label: controls.campaignContribute.dollars,
          });
          const send = button(controls.campaignActs.mail, "mail", () => ({
            amountMinor: String(Math.round(Number(dollarsOut.value) * 100)),
          }));
          send.dataset.testid = "campaign-mail";
          return { nodes: [buttonRow(dollarsOut, send)] };
        },
      },
      {
        group: T.groupMoney,
        title: controls.campaignContribute.give,
        picture: pictures?.contribute,
        load: async () => {
          const dollarsIn = numberBox({
            value: 0,
            min: 0,
            step: 1,
            label: controls.campaignContribute.dollars,
          });
          const give = makeButton({
            textContent: controls.campaignContribute.give,
          });
          give.addEventListener("click", () =>
            act("contribute", {
              amountMinor: String(Math.round(Number(dollarsIn.value) * 100)),
            }),
          );
          return { nodes: [buttonRow(dollarsIn, give)] };
        },
      },
      {
        group: T.groupSpeak,
        title: T.speech,
        picture: pictures?.speech,
        load: async () => ({
          nodes: [
            speechCard({
              words: controls.speech,
              state: speechState,
              venue,
              onBegin: async () => {
                speechState = await post("/api/campaign/speech/begin");
                reopenTrail(filing.id);
              },
              onPick: async (choice) => {
                speechState = await post(
                  `/api/campaign/speech/pick?${new URLSearchParams({ key: choice.key })}`,
                );
                reopenTrail(filing.id);
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
                drawHere(result.scene);
              },
            }),
          ],
        }),
      },
      // A debate the outlet invited the candidates to: one position (or a pass) on each question it asks.
      ...(debates ?? []).map((debate) => ({
        group: T.groupSpeak,
        title: controls.debate.title ?? T.debate,
        picture: pictures?.debate,
        load: async () => ({
          nodes: [
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
                reopenTrail(filing.id);
              },
            }),
          ],
        }),
      })),
    ];
    const trail = [
      ...travelScreen({
        entries,
        // The only list under a trail tile is why the act is out of reach today.
        labels: { whoIsThere: "", whatICanDo: T.notToday },
      }),
      ...(campaignResult ? [line(campaignResult)] : []),
      ...campaignLines.map((text) => line(text)),
    ];
    // The campaign board (the mock's pl-campaign): where the race stands in sentences the
    // English engine wrote, the money, and the way out onto the trail.
    // Its card in Travel shows the street the trail starts on, as each act's tile shows its place.
    const part = { filing, contest, trail, picture: pictures?.doors };
    const labelsC = controls.campaignBoard ?? {};
    const out = makeButton({ textContent: labelsC.trail });
    out.addEventListener("click", () => trailView(part));
    part.tab = stripBoard({
      className: "campaign-board",
      columns: [
        [
          stripSection(
            1,
            controls.raceStanding.title,
            ...(standing ?? []).map((text) => introText(text)),
          ),
          ...(runningMate ? [ticketSection(filing, runningMate)] : []),
        ],
        [
          stripSection(
            2,
            labelsC.money,
            moneyFigure(moneyWords(campaign.raisedMinor)),
            dotRows([
              {
                label: labelsC.raised,
                value: moneyWords(campaign.raisedMinor),
              },
              { label: labelsC.spent, value: moneyWords(campaign.spentMinor) },
              { label: labelsC.volunteers, value: String(campaign.volunteers) },
              { label: labelsC.doors, value: String(campaign.doors) },
              // The petition record: the signatures held against those the
              // law asks, and the day they are due (owner, Nov 14: the tab keeps
              // the running total). A race that asks no signatures shows none.
              ...(petition?.needed
                ? [
                    {
                      label: labelsC.signatures,
                      value: labelsC.signaturesHeld
                        .replace("{signed}", String(petition.signed))
                        .replace("{needed}", String(petition.needed))
                        .replace("{date}", dateWords(petition.due)),
                    },
                  ]
                : []),
              ...(campaign.endorsements
                ? [
                    {
                      label: labelsC.endorsements,
                      value: String(campaign.endorsements),
                    },
                  ]
                : []),
            ]),
          ),
        ],
        [buttonTray(out)],
      ],
    });
    parts.push(part);
  }
  return parts;
}
/**
 * The campaign trail: where the acts are (owner, Oct 20: "campaign acts are
 * scenes you go to"). One card in Travel per filed campaign; its doors, event,
 * interview, forum, calls, donor meeting, speech and debate start their scenes.
 */
function trailView(part) {
  $("sheet-body").replaceChildren(...part.trail);
  $("sheet-body").classList.add("place-view");
}
/** Back to the trail after an act that stays on the screen (a poll, an ad, a speech's next step). */
async function reopenTrail(filingId) {
  await openSheet("travel");
  const part = (await campaignParts()).find((p) => p.filing.id === filingId);
  if (part) trailView(part);
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
  ].map((text) => talkLine({ kind: "why", text }));
}
/** The owner's grade control on a scene line (dev mode): it reaches the line's pieces. */
function gradeOf(line, momentId) {
  if (!line.parts?.length) return {};
  return {
    grade: {
      labels: controls.grade,
      send: (word, note) =>
        api(
          `/api/grade?${new URLSearchParams({
            grade: word,
            note,
            parts: line.parts.join(","),
            text: line.text,
            momentId,
          })}`,
          "POST",
        ),
    },
  };
}
async function showStory(momentId) {
  const story = await api(
    `/api/story?momentId=${encodeURIComponent(momentId)}${HELD_VIEW ? "&held=1" : ""}`,
  );
  me.names = { ...me.names, ...story.names };
  $("backdrop").src = story.backdrop.url;
  drawHere(story);
  show("talk", true);
  setWho(null, null);
  // A scene with a purpose is its own exchange; any other opens a talk.
  // The narrator sets the scene alone; Continue, then the person speaks.
  const withId = story.talk?.askerId ?? story.talkToId;
  const setting = story.narration.map((line) =>
    talkLine({
      kind: "speech narration",
      text: line.text,
      held: line.held,
      ...gradeOf(line, momentId),
    }),
  );
  // A speech heard (the address on the evening news): its speaker's own
  // words from the record, then Continue.
  if (story.speech) {
    // The speech plays one part per Continue (owner, Oct 28 sitting, 11:
    // "Each Continue can carry a paragraph"); the last Continue ends it.
    const parts = story.speech.parts?.length
      ? story.speech.parts
      : [story.speech.text];
    // Every part's picture is fetched up front, so a cutaway never shows the
    // last room under the next part's people.
    for (const beat of story.beats ?? []) new Image().src = beat.backdrop.url;
    const sayPart = (at) => {
      show("talk-skip", true);
      setWho(story.speech.speakerId, story.names[story.speech.speakerId]);
      // The part's picture and cast: the desk, the town, the colonnade, the
      // officials on the strip with their office under their name, and home.
      const beat = story.beats?.[at];
      if (beat) {
        $("backdrop").src = beat.backdrop.url;
        drawHere(beat);
      }
      talkControls({ silent: false, leave: false });
      fillTalk({
        lines: [talkLine({ kind: "speech", text: parts[at] })],
        replies: [],
      });
      setScales({ available: false });
      if (at + 1 < parts.length) onContinue = () => sayPart(at + 1);
    };
    narrateFirst(setting, () => sayPart(0));
    return;
  }
  if (withId) {
    narrateFirst(setting, () =>
      story.talk ? playExchange(story) : talkTo(withId, momentId),
    );
    return;
  }
  // The narrator alone is a Continue.
  talkControls({ silent: false, leave: false });
  fillTalk({
    lines: [
      ...setting,
      ...(HELD_VIEW && story.talk ? whyRows(story.talk.why) : []),
    ],
    replies: [],
  });
  setScales({ available: false });
}
/** A scene with a purpose, tapped through: each reply leads to its own branch, to the close. */
function playExchange(story) {
  const { talk } = story;
  setWho(talk.askerId, story.names[talk.askerId]);
  const said = [...talk.opening];
  const shown = () =>
    transcript(
      said.map((line) => ({
        text: line.text,
        mine: line.role === "asked",
        held: line.held,
        ...gradeOf(line, story.momentId),
      })),
      {
        mineWho: $("card-name").textContent,
        theirWho: story.names[talk.askerId],
      },
    );
  // The path is the index of each reply chosen, from the first.
  // The asker follows up: no walking away mid-exchange, no silence as a reply.
  talkControls({ silent: false, leave: false });
  const play = (node, path) => {
    said.push(...node.lines, ...(node.end?.close ? [node.end.close] : []));
    fillTalk({ lines: shown() });
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
            fillTalk({ lines: shown(), replies: [] });
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
/**
 * The approved person card's strip screen for one person, built from their known record
 * (owner, Nov 7, item 54, "perfect"). Shown in its own panel by showPerson and inside the
 * People screen beside the roster. Returns null when the person is gone.
 */
async function personCardNode(
  person,
  stillWanted = () => true,
  openOther = (other) => showPerson(other),
) {
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: person.personId })}`,
  );
  await controlsReady;
  if (!stillWanted()) return null;
  const labels = controls.person;
  const known = c.publicKnowledge;
  const stance = voteWords();
  const pronoun = c.pronouns;
  const fill = (text) =>
    text.replace(/\{(\w+)\}/g, (_all, slot) => pronoun?.[slot] ?? "");
  const heading = (key, theyKey) =>
    pronoun ? fill(labels[key]) : labels[theyKey ?? key];
  const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const role = [
    c.relation && capital(c.relation),
    known?.party,
    c.age !== null && c.age !== undefined ? `${labels.age} ${c.age}` : null,
  ]
    .filter((part) => part !== null && part !== undefined && part !== "")
    .join(" · ");
  const sharedLines = (c.shared ?? [])
    .filter((s) => labels.sharedWords?.[s.kind])
    .map((s) =>
      introText(
        s.name
          ? `${labels.sharedWords[s.kind]} · ${s.name}`
          : labels.sharedWords[s.kind],
      ),
    );
  // How close you are and why that last changed, read from the tie's own record
  // (the card's tie row: its closeness and its latestChange); a person with no
  // tie to you has neither line.
  const closeness = Number.isFinite(person.level)
    ? labels.closenessWords[
        Math.min(
          labels.closenessWords.length - 1,
          Math.floor(Math.max(0, person.level) * labels.closenessWords.length),
        )
      ]
    : null;
  const change = person.latestChange;
  const changeLine = change
    ? introText(
        [
          labels.tieChange[
            change.after > change.before
              ? "closer"
              : change.after < change.before
                ? "apart"
                : "same"
          ],
          labels.tieCauses[change.cause],
          dateWords(change.date),
        ]
          .filter(Boolean)
          .join(" · "),
      )
    : null;
  if (closeness) sharedLines.unshift(introText(closeness));
  if (changeLine) sharedLines.push(changeLine);
  // Their public record, from the past module's public tier: a fact the record does not hold is left out.
  const recordRows = known
    ? [
        ["since", dateOrValue(known.serviceStart)],
        ["votes", known.votesOnRecord],
        ["sponsored", known.lawsSponsored],
        ["signed", known.lawsSigned],
      ]
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => ({
          label: labels.publicRecord[key],
          value: String(value),
        }))
        .concat(
          known.positions.map((p) => ({
            label: policyLabel(p.question),
            value: p.position > 0 ? (stance.for ?? "") : (stance.against ?? ""),
          })),
        )
    : [];
  const people = peopleSentence(
    (c.colleagues ?? []).map((k) => ({
      name: k.name,
      relation: k.office,
      onOpen: () => openOther({ personId: k.personId }),
    })),
  );
  const firstColumn = [
    ...(c.summary?.length
      ? [
          stripSection(
            1,
            heading("whoIs", "whoAre"),
            introText(c.summary.join(" ")),
          ),
        ]
      : []),
    ...(c.traitLines?.length
      ? [
          stripSection(
            2,
            heading("howISee", "howISeeThem"),
            perkList(c.traitLines.map((t) => ({ name: t.label }))),
          ),
        ]
      : []),
    // Where they place themselves politically, once the player has learned it; until then the
    // card says so (the world still holds the real view).
    ...(c.view || c.viewUnknown
      ? [
          stripSection(
            2,
            controls.who.views,
            introText(c.view ? leanWord(c.view) : controls.who.viewUnknown),
            ...(c.viewAbout
              ? [
                  introText(
                    controls.who.viewAbout.replace("{about}", c.viewAbout),
                  ),
                ]
              : []),
          ),
        ]
      : []),
    ...(sharedLines.length
      ? [stripSection(5, labels.betweenUs, ...sharedLines)]
      : []),
    // Their life from the records, oldest first, as the card has told it since
    // #6772 and #7090: the card is sent the story and draws it (owner's
    // playtest, Nov 8).
    ...(c.history?.length
      ? [
          stripSection(
            5,
            capital(heading("lifeStory", "lifeStoryThey")),
            ...lifeParagraphs(c.history),
          ),
        ]
      : []),
  ];
  const secondColumn = [
    ...(people
      ? [stripSection(3, capital(heading("herPeople", "theirPeople")), people)]
      : []),
    ...(recordRows.length
      ? [stripSection(4, labels.publicRecordTitle, dotRows(recordRows))]
      : []),
  ];
  // Dev mode: what they remember, a section only while dev mode is on.
  const memory = devModeOn()
    ? await devMemorySection({
        personId: person.personId,
        labels: controls.devMemory,
        dateOf: (iso) => dateWords(iso),
      })
    : null;
  if (memory) secondColumn.push(memory);
  if (devModeOn())
    secondColumn.push(
      await devRecordsSection({
        personId: person.personId,
        labels: controls.devRecords,
      }),
      await devPersonSection({
        personId: person.personId,
        labels: controls.devPerson,
        onDone: () => refresh(),
      }),
    );
  if (!stillWanted()) return null;
  return {
    name: c.name,
    node: stripScreen({
      name: c.name,
      role,
      face: c.face ?? null,
      columns: secondColumn.length
        ? [firstColumn, secondColumn]
        : [firstColumn],
    }),
  };
}
async function showPerson(person) {
  const request = ++personRequest;
  const opener = document.activeElement;
  const card = await personCardNode(person, () => request === personRequest);
  if (!card) return;
  personOpener = opener;
  closeSheet();
  $("person-name").textContent = card.name;
  $("person-facts").replaceChildren(card.node);
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

// ---- Go to a place in town: its picture now, and whoever works there ----
async function visit(organizationId) {
  closeSheet();
  renderTalk(undefined);
  const v = await post(
    `/api/goto/visit?org=${encodeURIComponent(organizationId)}`,
  );
  me.names = { ...me.names, ...v.names };
  $("backdrop").src = v.backdrop.url;
  drawHere(v, (p) => talkTo(p.personId));
  me.scene = v;
  $("card-place").textContent = v.name;
  // The visit's hour moved the clock: the card shows the new time.
  if (v.packet) renderPacket(v.packet);
}

// ---- Go home from a place: the trip back, then the room the day has you in ----
async function goHome() {
  closeSheet();
  renderTalk(undefined);
  const v = await post("/api/goto/home");
  me.names = { ...me.names, ...(v.names ?? {}) };
  $("card-place").textContent = me.placeName;
  if (v.packet) renderPacket(v.packet);
  await renderScene();
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

/** An On and Off toggle (the Options pattern): `on()` says which is lit, `set(bool)` changes it. */
function onOffToggle({ attr, on, set, testid, labels }) {
  const bar = tabBar({
    attr,
    active: on() ? "on" : "off",
    tabs: ["on", "off"].map((key) => ({
      key,
      label: labels[key],
      onSelect: async () => {
        await set(key === "on");
        chooseTab(bar, attr, on() ? "on" : "off");
      },
    })),
  });
  for (const tab of bar.querySelectorAll(".tab"))
    tab.dataset.testid = `${testid}-${tab.dataset[attr]}`;
  return bar;
}

// ---- The seat as a job, and what stops you (OFFICE-LOCAL) ----
/**
 * What the player holds as an official, as plate-built nodes for Your office: the seat (office,
 * pay, next meeting, the posts they name, what they have done), the budget lines they may send
 * and the deals they offer colleagues. Each is empty when the player has none of it.
 */
async function officeParts() {
  const v = await api(`/api/office?id=${encodeURIComponent(me.id)}`);
  if (!v.jobs.length && !v.stops.length)
    return { seat: [], stops: [], budget: [], deals: [] };
  const words = controls.officeStops ?? {};
  const labels = controls.officeScreen ?? {};
  const paged = (items, { rows, columns, rowHeight, className }) =>
    pager({
      items,
      render: (node) => node,
      rows,
      columns,
      rowHeight,
      gap: 8,
      className,
    });
  // What stops you: one On and Off switch per kind of vote this seat has. Off, you are away from
  // that kind of vote: the record has you absent, a bill on your desk waits, nothing is cast for you.
  const stops = v.stops.length
    ? [
        stripSection(
          1,
          labels.stops,
          ...v.stops.map((stop) =>
            settingRow(
              words.switches?.[stop.key] ?? "",
              onOffToggle({
                attr: "stop",
                testid: `office-stop-${stop.key}`,
                labels: controls.options,
                on: () => stop.on,
                set: async (wanted) => {
                  const next = await post(
                    `/api/office/stops?${new URLSearchParams({ key: stop.key, on: String(wanted) })}`,
                  );
                  stop.on =
                    next.stops.find((s) => s.key === stop.key)?.on ?? wanted;
                },
              }),
            ),
          ),
        ),
      ]
    : [];
  const seat = [
    ...v.jobs.map((job) =>
      stripSection(
        1,
        labels.mySeat,
        dotRows(
          [
            { label: labels.office, value: job.title },
            {
              label: labels.pay,
              value: `${moneyWords(job.annualMinor)} ${words.aYear ?? ""}`,
            },
            job.nextMeeting && {
              label: labels.nextMeeting,
              value: dateWords(job.nextMeeting),
            },
          ].filter(Boolean),
        ),
      ),
    ),
    // An open town post you appoint: the people it could go to, best first; left on the
    // official's own choice, the first stands.
    ...(v.heads?.length
      ? [
          stripSection(
            2,
            labels.heads,
            paged(
              v.heads.map((head) =>
                listRow(
                  "office-pick",
                  { as: "label" },
                  `${head.title} · ${words.nameHeadPick ?? ""} `,
                  select({
                    options: [
                      { value: "", label: words.ownChoice ?? "" },
                      ...head.candidates.map((c) => ({
                        value: c.id,
                        label: (c.work && c.place
                          ? words.row
                          : c.place
                            ? words.rowPlace
                            : "{name}"
                        )
                          .replace("{name}", c.name)
                          .replace("{work}", c.work ?? "")
                          .replace("{place}", c.place ?? ""),
                      })),
                    ],
                    onChange: async (nomineeId) => {
                      if (nomineeId)
                        await post(
                          `/api/office/name-head-pick?${new URLSearchParams({ post: head.post, nomineeId })}`,
                        );
                    },
                  }),
                ),
              ),
              { rows: 3, columns: 1, rowHeight: 52, className: "office-paged" },
            ),
          ),
        ]
      : []),
    // Your staff: the aides who serve now, and the people the staff engine would weigh for the
    // post with its reasons; Hire runs the engine's own hire, paid from the post's budget line.
    ...(v.aides?.serving.length || v.aides?.candidates.length
      ? [
          stripSection(
            2,
            labels.aides,
            ...v.aides.serving.map((a) => row(a.name, labels.aideRole ?? "")),
            ...(v.aides.candidates.length
              ? [
                  paged(
                    v.aides.candidates.map((c) => {
                      const hire = makeButton({ textContent: labels.hire });
                      hire.addEventListener("click", async () => {
                        await post(
                          `/api/office/hire-aide?${new URLSearchParams({ personId: c.id })}`,
                        );
                        openSheet("office");
                      });
                      const why = Object.entries(c.reasons)
                        .filter(([, value]) => value > 0)
                        .map(([key, value]) =>
                          key === "family"
                            ? labels.reasons?.family
                            : `${labels.reasons?.[key] ?? ""} ${Math.round(value * 100)}%`,
                        )
                        .join(" · ");
                      return deskBill(
                        peopleSentence([
                          {
                            name: c.name,
                            onOpen: () => {
                              closeSheet();
                              showPerson({ personId: c.id });
                            },
                          },
                        ]),
                        line(
                          `${c.from === "known" ? labels.fromKnown : labels.fromApplicant} · ${why}`,
                        ),
                        buttonRow(hire),
                      );
                    }),
                    {
                      rows: 3,
                      columns: 1,
                      rowHeight: 116,
                      className: "office-paged",
                    },
                  ),
                ]
              : []),
          ),
        ]
      : []),
    ...(v.acts.length
      ? [
          stripSection(
            3,
            labels.acts,
            paged(
              v.acts.map((a) =>
                row(
                  `${dateWords(a.date)} · ${controls.actions?.[a.kind] ?? ""}`,
                  a.how === "absent"
                    ? (words.absent?.[a.detail] ?? "")
                    : `${a.kind === "vote" ? (words.votes?.[a.detail] ?? a.detail) : a.detail}${a.how === "own-choice" ? ` · ${words.ownChoice ?? ""}` : a.how === "adjourned" ? ` · ${words.adjourned ?? ""}` : ""}`,
                ),
              ),
              { rows: 4, columns: 1, rowHeight: 48, className: "office-paged" },
            ),
          ),
        ]
      : []),
  ];
  // The budget you may send now: the change to each line, in steps of its amount.
  const budget = v.budget
    ? [
        stripSection(
          1,
          controls.budgetEditor.title,
          paged(
            v.budget.lines.map((row) =>
              labeled(
                `${row.name} ${roundedMoney(row.amountMinor)}`,
                select({
                  options: [-20, -10, 0, 10, 20].map((pct) => {
                    const minor = Math.round((row.amountMinor * pct) / 100);
                    return {
                      value: minor,
                      label: controls.budgetEditor[String(pct)],
                      selected: row.changeMinor === minor,
                    };
                  }),
                  onChange: async (changeMinor) => {
                    await post(
                      `/api/office/budget-line?${new URLSearchParams({ line: row.line, changeMinor })}`,
                    );
                  },
                }),
              ),
            ),
            { rows: 5, columns: 2, rowHeight: 56, className: "office-paged" },
          ),
        ),
      ]
    : [];
  // The deal to offer each colleague who votes on a bill of yours when you talk to them.
  const deals = (v.deals ?? []).map((bill) =>
    stripSection(
      2,
      `${bill.number} · ${controls.deals.title}`,
      paged(
        bill.colleagues.map((colleague) =>
          labeled(
            colleague.name,
            select({
              value: colleague.deal ?? "none",
              options: ["none", "favor", "back-their-item"].map((deal) => ({
                value: deal,
                label: controls.deals[deal],
              })),
              onChange: async (deal) => {
                await post(
                  `/api/office/deal?${new URLSearchParams({ memberId: colleague.key, deal })}`,
                );
              },
            }),
          ),
        ),
        { rows: 4, columns: 2, rowHeight: 56, className: "office-paged" },
      ),
    ),
  );
  return { seat, stops, budget, deals };
}

// ---- The bill on paper: one document, every section clickable ----
/** The simulation's estimate beside a clicked section, every figure a record
 * the server read: the statute it amends with the values before and after,
 * the budget line and its amount, and the bill's own cost estimate. */
function billEstimate(paper, section) {
  const words = controls.bill ?? {};
  const est = section.estimate;
  const lines = [];
  if (est.statute) lines.push(`${words.amends ?? ""} ${est.statute}`);
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
  // Today's amount beside the new one, as two cells: the law in force, and what the bill makes it.
  let compare = null;
  if (before && after)
    compare = {
      todayLabel: words.today ?? "",
      today: before,
      newLabel: words.proposed ?? "",
      proposed: after,
    };
  else if (est.line && est.ofMinor != null && est.lineNewMinor != null)
    compare = {
      todayLabel: words.today ?? "",
      today: roundedMoney(est.ofMinor),
      newLabel: words.proposed ?? "",
      proposed: roundedMoney(est.lineNewMinor),
    };
  else if (after) lines.push(`${words.to ?? ""} ${after}`);
  // The two cells above carry the amounts; the line is then only named.
  if (est.line)
    lines.push(
      [
        `${words.line ?? ""}: ${policyLabel(`budget-line:${est.line}`)}`,
        !compare && est.lineNewMinor != null
          ? roundedMoney(est.lineNewMinor)
          : null,
        !compare && est.ofMinor != null
          ? `${words.from ?? ""} ${roundedMoney(est.ofMinor)}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
    );
  lines.push(
    [
      paper.estimate.workers > 0
        ? `${paper.estimate.workers} ${words.workers ?? ""}`
        : null,
      paper.estimate.payMinor > 0
        ? roundedMoney(paper.estimate.payMinor)
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  // The estimate says what the records give, never the section's own words
  // again; a section that changes a rule and no amount says so.
  const shown = lines.filter(Boolean);
  return {
    prose: shown.length || compare ? "" : (words.noFigure ?? ""),
    lines: shown,
    compare,
  };
}
/**
 * Open a bill as one paper document: designation, title, sponsor, each
 * section in plain words, the floor date and whip, and the vote and signature
 * records when the body has made them. Clicking a section shows its estimate
 * beside it. `show` draws the nodes, `back` returns to the rows.
 */
async function openBillPaper(billId, show, back, backLabel) {
  // Only the newest draw of a page is shown. Two acts close together (a vote,
  // then calling the question) each redraw the page; the earlier redraw can
  // finish its reads last, and must not put its older page over the newer one.
  const mine = (show.draws = (show.draws ?? 0) + 1);
  const paper = await api(`/api/bill?billId=${encodeURIComponent(billId)}`);
  const stage = await api(
    `/api/bill/stage?billId=${encodeURIComponent(billId)}`,
  );
  const view = await api(`/api/bill/page?billId=${encodeURIComponent(billId)}`);
  const words = controls.bill ?? {};
  const pageWords = controls.billPage ?? {};
  // The bill's number and its body's name over the room that body works in (the government
  // screen's own room picture for that body); none when the body has no picture.
  const band = await api(
    `/api/government/bodies?${new URLSearchParams({
      id: me.id,
      level:
        view.level === "state" || view.level === "federal"
          ? view.level
          : "local",
      state: /^office:(US-[A-Z]{2}):/.exec(paper.bodyOfficeId ?? "")?.[1] ?? "",
    })}`,
  )
    .then((bodies) => {
      const body = [...bodies.legislative, ...bodies.executive].find(
        (row) => row.officeId === paper.bodyOfficeId,
      );
      return body?.picture
        ? { picture: body.picture, title: `${paper.spoken} · ${body.name}` }
        : null;
    })
    .catch(() => null);
  const floor = controls.floor ?? {};
  // A bill opened inside the meeting or the desk returns to it; a menu has no Back
  // (owner, Oct 29: "continue and back needs to be removed from every single menu"):
  // a menu's bill closes with the menu's tabs and close control.
  const backButton = backLabel
    ? makeButton({ className: "action", textContent: backLabel })
    : null;
  backButton?.addEventListener("click", back);
  // Where the bill is: the committee's record, what members told you, the floor and
  // the override, each member by name (ui/bill-stage.mjs). They stand in the
  // bill's own board, under Where it is.
  const stageNodes = billStageSections(
    stage,
    controls.billStage ?? {},
    (person) => showPerson({ personId: person.personId }),
    async (how) => {
      await api(
        `/api/bill/vote?${new URLSearchParams({ billId, vote: how })}`,
        "POST",
      );
      await openBillPaper(billId, show, back, backLabel);
    },
    {
      onMove: async (index, direction) => {
        await api(
          `/api/bill/amend?${new URLSearchParams({ billId, index, direction })}`,
          "POST",
        );
        await openBillPaper(billId, show, back, backLabel);
      },
      onCall: async (item) => {
        await api(
          `/api/bill/amendment-vote?${new URLSearchParams({ amendmentId: item.id })}`,
          "POST",
        );
        await openBillPaper(billId, show, back, backLabel);
      },
      estimate: (item) =>
        [
          item.estimateAfter.workersRaised > 0
            ? `${item.estimateAfter.workersRaised} ${words.workers ?? ""}`
            : null,
          item.estimateAfter.annualPayMinor > 0
            ? moneyWords(item.estimateAfter.annualPayMinor)
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      onDecide: async (how) => {
        await api(`/api/desk?${new URLSearchParams({ billId, how })}`, "POST");
        await openBillPaper(billId, show, back, backLabel);
      },
    },
    {
      onAsk: (index) =>
        api(`/api/bill/redraft?${new URLSearchParams({ billId, index })}`),
      onKeep: async (index) => {
        await api(
          `/api/bill/redraft?${new URLSearchParams({ billId, index })}`,
          "POST",
        );
        await openBillPaper(billId, show, back, backLabel);
      },
      estimate: (redraft) =>
        [
          redraft.estimateAfter.workersRaised > 0
            ? `${redraft.estimateAfter.workersRaised} ${controls.bill?.workers ?? ""}`
            : null,
          redraft.estimateAfter.annualPayMinor > 0
            ? moneyWords(redraft.estimateAfter.annualPayMinor)
            : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      onVote: async (how) => {
        await api(
          `/api/bill/override?${new URLSearchParams({ billId, vote: how })}`,
          "POST",
        );
        await openBillPaper(billId, show, back, backLabel);
      },
      onCall: async () => {
        await api(
          `/api/bill/override-call?${new URLSearchParams({ billId })}`,
          "POST",
        );
        await openBillPaper(billId, show, back, backLabel);
      },
    },
  );
  if (show.draws !== mine) return;
  show(
    ...(backButton ? [backButton] : []),
    billPaper({
      spoken: paper.spoken,
      title: paper.title,
      sponsor: `${words.sponsor ?? ""} ${paper.sponsor}`,
      sectionsLabel: words.sections ?? "",
      whereLabel: words.where ?? "",
      billLabel: words.bill ?? "",
      voteLabel: words.vote ?? "",
      band,
      stage: stageNodes,
      estimateLabel: words.estimate ?? "",
      // The budget lines the bill sets, this year beside last year's.
      extra: billFigures({
        view,
        textOf: (index) => paper.sections[index]?.text ?? paper.title,
        money: roundedMoney,
        percent: (value) =>
          new Intl.NumberFormat("en-US", {
            style: "percent",
            maximumFractionDigits: 1,
          }).format(value / 100),
        words,
      }),
      // Where it is: the committee or body that has it, who filed it and the days, from the page view.
      where: {
        heading: view.where.committee
          ? keyWords(view.where.committee)
          : view.where.bodyTitle,
        rows: [
          view.where.filedBy?.name && {
            label: pageWords.filedBy,
            value: view.where.filedBy.name,
          },
          view.where.filedOn && {
            label: pageWords.filedOn,
            value: dateWords(view.where.filedOn),
          },
          view.where.reachedChamberOn && {
            label: pageWords.reached,
            value: dateWords(view.where.reachedChamberOn),
          },
        ].filter(Boolean),
      },
      views: { clean: pageWords.clean, compare: pageWords.compare },
      amendsLabel: words.amends ?? "",
      // Each chamber's result as the English engine words it, from the stage view, then the floor's
      // vote by party and those who cast none, from the page view.
      votes: [...stage.floor, ...stage.override].map((entry) => {
        const tally = view.tallies.find(
          (t) => t.stage === "floor" && t.chamber === entry.chamber,
        );
        return {
          big: entry.result,
          text: entry.chamberTitle,
          rows: [
            ...(tally?.byParty ?? []).map((row) => ({
              label: row.party ? keyWords(row.party) : pageWords.noParty,
              value: `${row.yes} ${pageWords.to} ${row.no}`,
            })),
            ...(tally?.notVoting
              ? [{ label: pageWords.notVoting, value: String(tally.notVoting) }]
              : []),
          ],
          // The player's own members in this chamber and the vote each cast
          // (the page view's yourMembers): a name, then the vote.
          members: (() => {
            const mine = (view.yourMembers ?? []).filter(
              (m) => m.chamber === entry.chamber && m.vote,
            );
            return {
              label: mine.length > 1 ? pageWords.yourMembers : pageWords.yours,
              rows: mine.map((m) => ({
                label: m.name,
                value: controls.billStage?.[m.vote] ?? "",
              })),
            };
          })(),
        };
      }),
      blank: billEstimate(paper, { estimate: {} }),
      sections: paper.sections.map((section) => ({
        text: section.text ?? paper.title,
        estimate: billEstimate(paper, section),
        inserted: view.sections[section.index]?.inserted ?? null,
        struck: view.sections[section.index]?.struck ?? null,
        amends: view.sections[section.index]?.amends?.citation ?? null,
      })),
      lines: [
        paper.authorityWarning,
        paper.effective,
        paper.floorDate
          ? `${floor.takenUp ?? ""} ${dateWords(paper.floorDate)}`
          : null,
        paper.decision
          ? `${words.decided ?? ""}: ${floor.status?.[paper.decision.status] ?? ""}${paper.decision.decidedOn ? ` · ${dateWords(paper.decision.decidedOn)}` : ""}`
          : null,
      ],
    }),
    // Dev mode: where to introduce it, how each member votes, the margin, then act (fr-dev-bill).
    ...(devModeOn()
      ? [
          await devBillCard({
            paper,
            labels: controls.devBill,
            traceLabel: controls.devTrace.trace,
            onTrace: async () => {
              const drawTrace = async (chosen) => {
                const traced = await api(
                  `/api/bill/stage?billId=${encodeURIComponent(billId)}`,
                );
                show(
                  backButton,
                  devTraceVote({
                    stage: traced,
                    paper,
                    labels: controls.devTrace,
                    words: controls.billStage,
                    floor: controls.floor,
                    chosen,
                    onPick: drawTrace,
                  }),
                );
              };
              await drawTrace(null);
            },
            onDone: () => openBillPaper(billId, show, back, backLabel),
          }),
        ].filter(Boolean)
      : []),
  );
}

// ---- From your seat (steps 6 to 9): draft; the vote is at the meeting ----
// Asking colleagues and the vote itself are acts in the day and the meeting
// scene (OFFICE-LOCAL); the seat drafts, and a drafted bill goes on the
// body's next agenda.
let seatResult = "";
let seatText = [];
// The tab of Your office the player last used.
async function seatRows() {
  const v = await api(`/api/seat?id=${encodeURIComponent(me.id)}`);
  const parts = await officeParts();
  const draftNodes = [];
  const act = async (params) => {
    const r = await post(`/api/seat/act?${new URLSearchParams(params)}`);
    seatText = r.text ?? [];
    seatResult = r.number
      ? `${r.number} · ${controls.floor.status[r.status] ?? ""}${r.floorDate ? ` · ${controls.floor.takenUp} ${dateWords(r.floorDate)}` : ""}${
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
    // Every law area, one group each: its policies and budget lines, each with what is in
    // force today beside the amount you type. Money is typed in dollars and kept in cents.
    const seat = controls.seat ?? {};
    const itemKey = (item) =>
      item.series
        ? `series:${item.series}`
        : item.question
          ? `question:${item.question}`
          : `line:${item.line}`;
    const draftBlock = draftCard({
      words: {
        title: seat.title ?? "",
        issue: seat.issue ?? "",
        today: seat.today ?? "",
        newAmount: seat.newAmount ?? "",
        draft: seat.draft ?? "",
        none: controls.bill?.none ?? "",
      },
      groups: (body.menus ?? []).map((menu) => ({
        name: menu.name,
        items: menu.items.map((item) => ({
          value: itemKey(item),
          label: `${
            item.series
              ? policyLabel(item.series)
              : item.question
                ? policyLabel(item.question)
                : item.name
          }${item.allowed === false ? ` · ${controls.authority?.[item.reason] ?? ""}` : ""}`,
          // What the law in force holds, as the bill's paper cites it: a
          // yes-or-no question reads Yes or No, as the Issues tab says it.
          today:
            item.today?.value == null
              ? null
              : item.kind === "policy-question"
                ? item.today.value
                  ? controls.politics.yes
                  : controls.politics.no
                : amount(item.today.value, item.today.unit),
          unit: item.series ? amountUnit(item.unit) : item.line ? "$" : "",
          cents: item.unit?.startsWith("minor") || Boolean(item.line),
          blocked: item.allowed === false,
          note:
            item.allowed === false
              ? (controls.authority?.[item.reason] ?? "")
              : "",
        })),
      })),
      onDraft: (item, typed) => {
        const [kind, key] = [
          item.value.slice(0, item.value.indexOf(":")),
          item.value.slice(item.value.indexOf(":") + 1),
        ];
        act({
          kind: "draft",
          officeId: body.officeId,
          ...(kind === "series"
            ? { series: key }
            : kind === "line"
              ? { line: key }
              : { question: key }),
          value: item.cents ? String(Math.round(Number(typed) * 100)) : typed,
        });
      },
    });
    // The body's line on the board: who sits on it, and the way in to writing
    // a bill, which takes the whole screen (a list of subjects beside the
    // chosen one's page). A menu has no Back (owner, Oct 28 and 29): the Your
    // office tab above it returns to the seat.
    const write = makeButton({
      className: "action",
      textContent: seat.title ?? "",
    });
    write.dataset.act = "write-a-bill";
    write.addEventListener("click", () =>
      $("sheet-body").replaceChildren(draftBlock),
    );
    draftNodes.push(
      stripSection(
        2,
        body.title,
        line(body.members.map((m) => m.name).join(" · ")),
        buttonRow(write),
      ),
    );
  }
  const floor = controls.floor;
  const labels = controls.officeScreen ?? {};
  // Your bills, each with its standing, the day it is taken up, how the vote came out and
  // the paper that opens to read it (the mock's "On my desk").
  const desk = v.bills.map(({ bill, votes, tally, floorDate }) => {
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
    return deskBill(
      deskTitle(`${bill.number} · ${floor.status[bill.status] ?? ""}`),
      ...(floorDate
        ? [line(`${floor.takenUp} ${dateWords(floorDate)}`, "floor-date")]
        : []),
      ...(votes.length
        ? [
            line(
              `${floor.voted}: ${tally.yes} ${floor.yes}, ${tally.no} ${floor.no}`,
              "floor-result",
            ),
          ]
        : []),
      open,
    );
  });
  const left = (v.incompatibilities ?? []).map((l) =>
    line(`${l.date} · ${l.left} → ${l.took} · ${l.law}`),
  );
  const result = seatResult
    ? [plate(null, line(seatResult), ...seatText.map((t) => line(t)))]
    : [];
  // Office hours: the residents' cases the cases engine opened for this official, each with the
  // two answers the engine offers; a decision runs the engine's own `handleCase`.
  const caseWords = controls.officeCases ?? {};
  const open = await api(
    `/api/office/cases?id=${encodeURIComponent(me.id)}`,
  ).catch(() => []);
  const cases = open.length
    ? [
        stripSection(
          1,
          labels.officeHours,
          ...open.map((c) => {
            const answer = (decision, text) => {
              const b = makeButton({ textContent: text });
              b.addEventListener("click", async () => {
                await post(
                  `/api/office/case?${new URLSearchParams({ caseId: c.id, decision })}`,
                );
                openSheet("office");
              });
              return b;
            };
            return deskBill(
              peopleSentence([
                {
                  name: c.name,
                  onOpen: () => {
                    closeSheet();
                    showPerson({ personId: c.personId });
                  },
                },
              ]),
              line(
                `${caseWords.problems?.[c.problem] ?? ""} · ${caseWords.by} ${dateWords(c.respondBy)}`,
              ),
              buttonRow(
                answer("help", caseWords.help),
                answer("decline", caseWords.decline),
              ),
            );
          }),
        ),
      ]
    : [];
  return [
    stripBoard({
      className: "office-board",
      columns: [
        parts.seat,
        [
          ...parts.stops,
          ...result,
          ...(desk.length
            ? [
                stripSection(
                  1,
                  labels.onMyDesk,
                  desk.length > 3
                    ? pager({
                        items: desk,
                        render: (node) => node,
                        rows: 3,
                        columns: 1,
                        rowHeight: 110,
                        gap: 10,
                      })
                    : deskList(...desk),
                ),
              ]
            : []),
          ...draftNodes,
          ...(left.length ? [stripSection(3, labels.left, ...left)] : []),
        ],
        [...cases, ...parts.budget, ...parts.deals],
      ],
    }),
  ];
}

/** The Kit 13 calendar icon a kind of dated record is drawn with. */

/** The player's own picture: the look chosen in the creator, else their figure in the room. */
/** The player's own history, oldest first: the reader every person's card uses. */
async function ownHistory() {
  const card = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: me.id })}`,
  );
  return card.history ?? [];
}
/** A life's lines as sentences grouped by what mattered (controls.lifeGroups), one paragraph each. */
/**
 * A tab of the You group as the approved strip screen: the player's name and
 * the one bust every tab of the group shows (the card's own face record), with
 * the tab's sections beside it. No whole figure stands beside a menu (owner,
 * Nov 7).
 */
function ownStrip(columns) {
  const c = me.card;
  return stripScreen({
    name: c.name,
    role: c.job
      ? [c.job.title, c.job.employer].filter(Boolean).join(", ")
      : `${controls.who.age} ${c.age}`,
    face: c.face ?? null,
    columns,
  });
}
function lifeParagraphs(lines) {
  // Dev mode: each sentence opens its record in the one Trace box, drawn under the story.
  if (!devModeOn()) return lifeStory(lines, controls.lifeGroups);
  const { node, open } = traceBox(controls.devTrace.trace);
  return [...lifeStory(lines, controls.lifeGroups, open), node];
}
/** A record image has no substitute when its producer has not supplied one. */

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
      // Everyone you know, not only the card's closest page.
      ...(me.card.known ?? me.card.ties),
    ]) {
      if (person.personId === me.id) continue;
      const prior = records.get(person.personId) ?? {};
      records.set(person.personId, {
        ...prior,
        ...person,
        // The groups each record puts them in (the card view's), joined.
        groups: [
          ...new Set([...(prior.groups ?? []), ...(person.groups ?? [])]),
        ],
      });
    }
    // Closest first within each group (the roster keeps this order).
    const level = new Map(
      (me.card.known ?? me.card.ties).map((t) => [t.personId, t.level]),
    );
    return peopleScreen({
      people: [...records.values()].sort(
        (a, b) =>
          (level.get(b.personId) ?? -Infinity) -
          (level.get(a.personId) ?? -Infinity),
      ),
      household,
      labels,
      card: (person, stillWanted, openOther) =>
        personCardNode(person, stillWanted, openOther),
    });
  },
  /**
   * You, as the owner approved it on Nov 7 (item 53; the mock's you-ol-g): your
   * name and role over a bust, "Who I am" and "What I'm like" in the first
   * person from your own records, and the people you're closest to as names
   * that open their cards. "What people say about me" waits for a record of
   * what people say about a person (stopgap in the PR body).
   */
  async who() {
    const c = me.card;
    const labels = controls.who ?? {};
    const known = await api(
      `/api/known?${new URLSearchParams({ id: me.id, other: me.id })}`,
    ).catch(() => ({ summaryFirst: [] }));
    const strengthWord = { strong: labels.strong, mild: labels.mild };
    const peopleLine = peopleSentence(
      (c.home?.members ?? []).map((member) => ({
        name: member.name,
        relation: member.relation,
        onOpen: () => {
          closeSheet();
          showPerson(member);
        },
      })),
    );
    const role = c.job
      ? [c.job.title, c.job.employer].filter(Boolean).join(", ")
      : `${labels.age} ${c.age}`;
    return [
      stripScreen({
        name: c.name,
        role,
        face: c.face ?? null,
        columns: [
          [
            ...(known.summaryFirst?.length
              ? [
                  stripSection(
                    1,
                    labels.whoIAm,
                    introText(known.summaryFirst.join(" ")),
                  ),
                ]
              : []),
            // Where the player places themselves politically: the views engine's own label.
            ...(c.view
              ? [stripSection(2, labels.views, introText(leanWord(c.view)))]
              : []),
            ...(c.traitLines?.length
              ? [
                  stripSection(
                    2,
                    labels.whatImLike,
                    perkList(
                      c.traitLines.map((row) => ({
                        name: row.label,
                        strength: strengthWord[row.strength],
                      })),
                    ),
                  ),
                ]
              : []),
          ],
          [
            ...(peopleLine
              ? [stripSection(3, labels.myPeople, peopleLine)]
              : []),
            // Your own life from the same lines the card tells of anyone (the mock
            // draws no life section; it follows "My people").
            ...(known.history?.length
              ? [
                  stripSection(
                    5,
                    labels.myLife,
                    ...lifeParagraphs(known.history),
                  ),
                ]
              : []),
          ],
        ],
      }),
    ];
  },
  async money() {
    const [budget, bank] = await Promise.all([
      api(`/api/budget?id=${encodeURIComponent(me.id)}`),
      api(`/api/bank?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.money;
    const dwelling = me.card.dwelling;
    const deductions = Object.entries(budget.withholding?.byLine ?? {});
    // Cash, spending, assets and debts: the ledger's, the credit engine's and
    // the housing engine's records for the household, served by /api/bank.
    const named = (table, key) =>
      table?.[key] ?? words(String(key).split(".").pop());
    const owedWords = (paid, asked) =>
      asked > paid
        ? `${moneyWords(paid)} ${labels.loanPaid} · ${moneyWords(asked - paid)} ${labels.unpaid}`
        : moneyWords(paid);
    // Money as the Nov 8 play mock draws it (pl-money): strips of typed rows with dot leaders,
    // never charts. My money (the cash in large type, then each month's balance), what went
    // out last month, what I own and what I owe, and what comes out of my pay. Every figure
    // is a record's own; a ledger line per day and the campaign's money (in the mock) wait on
    // records the bank does not serve yet.
    const shortMonth = (date) =>
      (MONTH_NAMES[Number(String(date).slice(5, 7)) - 1] ?? "").slice(0, 3);
    const months = [...(bank?.cash?.months ?? [])].reverse();
    const spent = [
      ...(bank?.spending ?? []).map((line) => ({
        label: named(labels.reasons, line.reasonKey),
        value: line.paidMinor,
        unpaid: line.requestedMinor - line.paidMinor,
      })),
      ...(bank?.loanPayments ?? []).map((payment) => ({
        label: labels.loanPayments,
        value: payment.paidMinor,
        unpaid: payment.dueMinor - payment.paidMinor,
      })),
    ]
      .filter((part) => part.value > 0 || part.unpaid > 0)
      .sort((a, b) => b.value - a.value);
    const spentTotal = spent.reduce((n, part) => n + part.value, 0);
    // The bank's figures are the household's; said so when you share it.
    const shared = (me.card.home?.members ?? []).length > 0;
    const homeValue = bank?.assets?.find((a) => a.kind === "home")?.valueMinor;
    const owned = (bank?.assets ?? []).filter((a) => a.kind !== "home");
    // The home has its own strip, named for whose it is (the household's when
    // you share it): what kind of home, how it is held, and the figure the
    // records put on it (its value when owned, the rent when rented). A rented
    // home is never listed under what you own.
    const held = dwelling?.tenure === "own" ? labels.owned : labels.rented;
    const homeRow = dwelling && {
      label: words(dwelling.kind ?? "") || labels.home,
      value:
        dwelling.tenure === "own" && homeValue
          ? `${held} · ${roundedMoney(homeValue)}`
          : dwelling.tenure !== "own" && dwelling.rentMinor !== undefined
            ? `${held} · ${roundedMoney(dwelling.rentMinor)} ${labels.monthly}`
            : held,
    };
    const ownRows = owned.map((asset) => ({
      label:
        asset.kind === "savings" && bank.name
          ? `${labels.assetKinds.savings} · ${bank.name}`
          : labels.assetKinds[asset.kind],
      value: roundedMoney(asset.valueMinor),
    }));
    const debtRows = (bank?.debts ?? []).map((debt) => ({
      label: named(labels.debtKinds, debt.kind),
      value:
        debt.pastDueMinor > 0
          ? `${roundedMoney(debt.owedMinor)} · ${roundedMoney(debt.pastDueMinor)} ${labels.pastDue}`
          : roundedMoney(debt.owedMinor),
    }));
    return [
      moneyBoard({
        columns: [
          [
            {
              title: bank?.name ? `${labels.cash} · ${bank.name}` : labels.cash,
              // The household's cash now, the same count as each month's row
              // under it (the bank's figures are the household's).
              figure: roundedMoney(bank?.cash?.nowMinor ?? me.card.liquidMinor),
              rows: months.map((m) => ({
                label: shortMonth(m.date),
                value: roundedMoney(m.cashMinor),
              })),
            },
          ],
          [
            ...(spent.length
              ? [
                  {
                    title: `${shared ? labels.householdLastMonth : labels.lastMonth} · ${roundedMoney(spentTotal)}`,
                    rows: spent.map((part) => ({
                      label: part.label,
                      value:
                        part.unpaid > 0
                          ? owedWords(part.value, part.value + part.unpaid)
                          : roundedMoney(part.value),
                    })),
                  },
                ]
              : []),
            ...(deductions.length
              ? [
                  {
                    title: labels.deductions,
                    rows: deductions.map(([name, value]) => ({
                      label: words(name),
                      value: moneyWords(value),
                    })),
                  },
                ]
              : []),
          ],
          [
            ...(homeRow
              ? [
                  {
                    title: shared ? labels.householdHome : labels.home,
                    rows: [homeRow],
                  },
                ]
              : []),
            ...(ownRows.length
              ? [{ title: labels.assets, rows: ownRows }]
              : []),
            ...(debtRows.length
              ? [{ title: labels.debts, rows: debtRows }]
              : []),
          ],
        ].filter((column) => column.length),
      }),
    ];
  },
  async jobs() {
    // On framed plates: your job with its workplace's
    // painting, its title in the name type, pay and hours; beside it the work
    // and school of your life as sentences, from the one history every
    // card reads. Never a scroll.
    const labels = controls.jobs;
    const job = me.card.job;
    const life = await ownHistory();
    const worked = life.filter((h) => h.kind === "work" || h.kind === "school");
    const work = stripSection(
      1,
      labels.work,
      ...(job
        ? [
            ...(job.presentation?.imageUrl
              ? [
                  pictureFrame({
                    src: job.presentation.imageUrl,
                    className: "job-picture",
                  }),
                ]
              : []),
            heading(job.title, "h3"),
            ...(job.employer ? [prose(job.employer, "job-employer")] : []),
            row(
              labels.pay,
              `${moneyWords(job.wageDailyMinor)} ${labels.daily}`,
            ),
            row(
              labels.hours,
              `${Number(job.hoursDaily.toFixed(1))} ${labels.daily}`,
            ),
          ]
        : [
            prose(labels.noJob, "record-empty"),
            // Why, from the household's records (path 10).
            ...(me.card.noJob ? [prose(me.card.noJob.text, "job-why")] : []),
          ]),
    );
    work.classList.add("job-plate");
    // The jobs open in town, from the position records; shown to a person with no job.
    const { openings } = job
      ? { openings: [] }
      : await api(`/api/openings?id=${encodeURIComponent(me.id)}`);
    return [
      ownStrip([
        [
          work,
          ...(job
            ? []
            : [
                stripSection(
                  1,
                  labels.openings,
                  ...(openings.length
                    ? openings.flatMap((o) => [
                        heading(o.title, "h3"),
                        ...(o.employer
                          ? [prose(o.employer, "job-employer")]
                          : []),
                        row(
                          labels.pay,
                          `${moneyWords(o.hourlyMinor)} ${labels.hourly}`,
                        ),
                        ...(o.hoursDaily !== null
                          ? [
                              row(
                                labels.hours,
                                `${Number(o.hoursDaily.toFixed(1))} ${labels.daily}`,
                              ),
                            ]
                          : []),
                      ])
                    : [prose(labels.noOpenings, "record-empty")]),
                ),
              ]),
        ],
        worked.length
          ? [stripSection(2, labels.workAndSchool, ...lifeParagraphs(worked))]
          : [],
      ]),
    ];
  },
  // Your own life as sentences, the same lines a person's card tells of anyone you open.
  async history() {
    const life = await ownHistory();
    return [
      ownStrip([
        [stripSection(1, controls.titles.history, ...lifeParagraphs(life))],
      ]),
    ];
  },
  async journal() {
    const chapters = await api(`/api/journal?id=${encodeURIComponent(me.id)}`);
    // One story from birth, a page to each chapter of the life, with no heading over any
    // part of it (owner, Oct 27: "written like a story, not individual sections... from
    // birth"; "remove all those subheadings").
    return journalScreen({
      chapters,
      labels: controls.journal,
      yearOf: (iso) => iso.slice(0, 4),
    });
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
    // The one who died, then each living person they can carry on as: a name
    // opens that life.
    return recordScreen({
      sections: [
        {
          items: [
            { fact: [me.card.name, "†"] },
            {
              people: people.map((p) => ({
                name: p.name,
                note: p.why,
                onOpen: () => playAs(p.id),
              })),
            },
          ],
        },
      ],
    });
  },
  // How the place is doing (owner, Nov 5, ruling 23: "Keep it, call it Metrics"): plain numbers,
  // this year beside last, no charts. Every figure is the record's; the words are control names.
  async metrics() {
    const view = await api("/api/metrics");
    const words = controls.metrics;
    const figure = (row, value) =>
      row.unit === "dollars"
        ? roundedMoney(Math.round(value * 100))
        : row.unit === "money"
          ? roundedMoney(Math.round(value))
          : row.unit === "count"
            ? Math.round(value).toLocaleString("en-US")
            : `${value.toFixed(1)} ${words.percent}`;
    const sections = view.sections.map((section, at) =>
      stripSection(
        at + 1,
        // A section that shows one government's books is headed by that government's name.
        section.name ?? words[section.key],
        ...section.rows.map((row) => {
          const moved = row.before === null ? null : row.now - row.before;
          const direction =
            moved === null
              ? ""
              : Math.abs(moved) < 0.05
                ? words.same
                : moved > 0
                  ? words.up
                  : words.down;
          return typedRow(
            words[row.key],
            // A small town's count shows the people behind it ("13 of 86").
            row.of === undefined
              ? figure(row, row.now)
              : `${figure(row, row.now)} ${words.of} ${figure(row, row.of)}`,
            row.before === null
              ? ""
              : `${words.lastYear} ${figure(row, row.before)} · ${[direction, moved !== null && Math.abs(moved) >= 0.05 ? (row.unit === "dollars" ? roundedMoney(Math.round(Math.abs(moved) * 100)) : row.unit === "money" ? roundedMoney(Math.round(Math.abs(moved))) : row.unit === "count" ? Math.round(Math.abs(moved)).toLocaleString("en-US") : `${Math.abs(moved).toFixed(1)} ${words.points}`) : "", words.since].filter(Boolean).join(" ")}`,
          );
        }),
      ),
    );
    // Three columns, like the approved mock's Metrics grid: the sections dealt out in turn.
    const columns = [[], [], []];
    sections.forEach((section, at) => columns[at % 3].push(section));
    return [stripBoard({ columns: columns.filter((c) => c.length) })];
  },
  async budgets() {
    const view = await api(`/api/budget?id=${encodeURIComponent(me.id)}`);
    const labels = controls.politics;
    // The town's own books open first: the government the budget view names as the town's
    // (its city, or the county that runs a town with no city government).
    const town = view.governments.find(
      (g) => g.id === view.townGovernmentId && g.latest,
    );
    const chosen =
      view.governments.find((g) => g.id === budgetGovernment) ?? town;
    const gov = chosen ?? view.governments[0];
    const tabs = tabBar({
      attr: "gov",
      active: gov?.id,
      tabs: view.governments
        .filter((g) => g.latest)
        .map((g) => ({
          key: g.id,
          label: g.name,
          onSelect: () => {
            budgetGovernment = g.id;
            budgetLine = undefined;
            void openSheet("budgets");
          },
        })),
    });
    if (!gov?.latest) return [stripBoard({ tabs, columns: [[]] })];
    const latest = gov.latest;
    // The executive steps a spending line's priority up or down.
    const steps = (record) =>
      gov.youAreExecutive
        ? [
            [labels.decrease, -1],
            [labels.increase, 1],
          ].map(([name, sign]) => ({
            glyph: sign > 0 ? "+" : "−",
            title: name,
            label: `${name} ${record.name ?? record.line}`,
            onClick: async () => {
              await post(
                `/api/budget/priority?${new URLSearchParams({ governmentId: gov.id, line: record.line, change: String((gov.priorities?.changes?.[record.line] ?? 0) + sign * 10_000_000) })}`,
              );
              await openSheet("budgets");
            },
          }))
        : [];
    // The approved Budgets screen (owner, Nov 7, item 56; the mock's bud-strips): the
    // governments as tabs, the fiscal year typed at the right, the departments, the open
    // department as a typed page, the town's money, and who wrote it. The game keeps
    // budget lines by category rather than departments, so each spending line is a
    // department; Last year comes from the government's previous budget; "Asked" is the line
    // before this year's budget bill (lineBeforeBill); the executive's bust is the offices
    // record's chief executive; a department's head is the executive's appointee for its line
    // (budget.ts headsOf).
    const words = controls.budgetStrips;
    const books = gov.books;
    const prior = gov.prior;
    const lastOf = (lines, key) => lines?.find((r) => r.line === key)?.minor;
    // A line the government spends nothing on is not listed (P29): a budget
    // reads like a real one. The line open stays, so a pick always shows.
    const spending = latest.spending.filter((r) => r.minor !== 0);
    const opened =
      spending.find((r) => r.line === budgetLine) ??
      latest.spending.find((r) => r.line === budgetLine) ??
      spending[0] ??
      latest.spending[0];
    // "Since last year ... up by ..." from the record's own change, and its history as a line
    // (Nation's budgetView: changeMinor, changePct, history oldest first); never computed here.
    const pctFormat = new Intl.NumberFormat("en-US", {
      style: "percent",
      maximumFractionDigits: 1,
    });
    const sinceLast = (record, { short = false } = {}) => {
      if (record?.changeMinor === undefined || record.changeMinor === null)
        return [];
      const how =
        record.changeMinor === 0
          ? words.unchanged
          : (record.changeMinor > 0 ? words.increased : words.decreased)
              .replace("{amount}", roundedMoney(Math.abs(record.changeMinor)))
              // A total's row is the amount alone; a line's carries its share too.
              .replace(
                short ? " ({pct})" : "{pct}",
                short
                  ? ""
                  : pctFormat.format(Math.abs(record.changePct ?? 0) / 100),
              );
      return [typedRow(words.sinceLastYear, how)];
    };
    const history = (record, size) => {
      const line = trendLine(record?.history, size);
      return line ? [line] : [];
    };
    // Last year is a row of its own with the figure on the same line, never a note under.
    const lastYear = (minor) =>
      minor === undefined
        ? []
        : [typedRow(words.lastYear, roundedMoney(minor))];
    // A government whose books list no spending line has no department to open (opened is undefined).
    const stepButtons = (opened ? steps(opened) : []).map((step) => {
      const button = makeButton({
        className: "action small",
        textContent: step.glyph,
        title: step.title,
      });
      button.setAttribute("aria-label", step.label);
      button.onclick = async () => {
        button.disabled = true;
        try {
          await step.onClick();
        } finally {
          button.disabled = false;
        }
      };
      return button;
    });
    const balance = latest.balanceMinor;
    return [
      stripBoard({
        tabs,
        fiscal: `${words.fiscalYear} ${latest.fiscalYear}`,
        columns: [
          [
            stripSection(
              1,
              words.departments,
              pager({
                items: spending.map((r) =>
                  departmentRow({
                    name: r.name ?? r.line,
                    amount: roundedMoney(r.minor),
                    head: r.head,
                    selected: r.line === opened?.line,
                    onSelect: () => {
                      budgetLine = r.line;
                      void openSheet("budgets");
                    },
                  }),
                ),
                render: (node) => node,
                rows: Math.max(4, Math.floor((viewHeight() - 380) / 56)),
                columns: 1,
                rowHeight: 52,
                gap: 2,
                className: "bsdepts",
              }),
            ),
          ],
          ...(opened
            ? [
                [
                  stripSection(
                    2,
                    opened.name ?? opened.line,
                    typedRow(
                      opened.name ?? opened.line,
                      roundedMoney(opened.minor),
                    ),
                    ...lastYear(lastOf(prior?.spending, opened.line)),
                    ...sinceLast(opened),
                    ...history(opened),
                    ...(opened.askedMinor !== undefined
                      ? [typedRow(words.asked, roundedMoney(opened.askedMinor))]
                      : []),
                    ...(stepButtons.length ? [buttonTray(...stepButtons)] : []),
                  ),
                ],
              ]
            : []),
          [
            stripSection(
              3,
              gov.name,
              typedRow(words.comingIn, roundedMoney(latest.revenueMinor)),
              ...lastYear(prior?.revenueMinor),
              ...sinceLast(latest.totals?.revenue, { short: true }),
              ...history(latest.totals?.revenue, { height: 36 }),
              typedRow(words.goingOut, roundedMoney(latest.spendingMinor)),
              ...lastYear(prior?.spendingMinor),
              ...sinceLast(latest.totals?.spending, { short: true }),
              ...history(latest.totals?.spending, { height: 36 }),
              typedRow(
                words.balance,
                `${roundedMoney(Math.abs(balance))} ${balance < 0 ? words.short : words.ahead}`,
              ),
              ...sinceLast(latest.totals?.balance, { short: true }),
              ...(books
                ? [typedRow(words.savings, roundedMoney(books.cashMinor))]
                : []),
            ),
            ...(gov.executive?.title
              ? [
                  stripSection(
                    4,
                    gov.executive.title,
                    personCard(
                      {
                        face: gov.executive.face,
                        name: gov.executive.name,
                        party: gov.executive.party,
                        line: gov.executive.title,
                        onOpen: () =>
                          showPerson({ personId: gov.executive.cardId }),
                      },
                      { layout: "leader" },
                    ),
                  ),
                ]
              : []),
            ...(latest.adoptedOn
              ? [
                  stripSection(
                    5,
                    words.whoWrote,
                    // `latest.adoptedBy` is the adoption record (body, tallies, bill, amendments);
                    // Screens words it from the record with the Budgets labels.
                    introText(
                      `${labels.adopted} ${dateWords(latest.adoptedOn)}`,
                    ),
                  ),
                ]
              : []),
          ],
        ],
      }),
    ];
  },
  async calendar() {
    const { date: recordDate, items } = await api(
      `/api/calendar?id=${encodeURIComponent(me.id)}`,
    );
    // Today is the world's day: the later of the clock's last packet and the
    // record, so a day the world has reached never offers a jump to it.
    const date = [packet?.at.date, recordDate].filter(Boolean).sort().at(-1);
    const labels = controls.calendar;
    return [
      calendarScreen({
        date,
        items,
        labels,
        held: packet?.kind === "stop",
        onAdvance: (day) => {
          closeSheet();
          act(`/api/advance?mode=calendar&date=${day}`);
        },
        onAttend: async ({ officeId, date: day }, attend) =>
          (
            await post(
              `/api/meeting/attend?${new URLSearchParams({ officeId, date: day, attend: String(attend) })}`,
            )
          ).items,
      }),
      devRunPanel({ labels: controls.devRun, onDone: () => refresh() }),
      ...(devModeOn()
        ? [
            await devScenePanel({
              labels: controls.devScene,
              wordOf: keyWords,
              onDone: () => refresh(),
            }),
          ]
        : []),
      ...(devModeOn()
        ? [
            await devCampaignPanel({
              labels: controls.devCampaign,
              onDone: () => refresh(),
            }),
          ].filter(Boolean)
        : []),
    ];
  },
  async news() {
    const labels = controls.news;
    // One feed, what you heard, newest first: News and the toast read the
    // news engine's same stories through storyHeadline.
    const { stories } = await nightsNews(me.id);
    if (newsFor !== me.id) {
      newsFor = me.id;
      newsOrder = [];
      newsTab = null;
      newsSeen = new Set();
      newsShowing = null;
    }
    const outlets = new Map();
    // The player's own outlets have a tab from the first day, before they print.
    for (const paper of await api(
      `/api/news/home?id=${encodeURIComponent(me.id)}`,
    ))
      outlets.set(paper.id, { ...paper, stories: [] });
    for (const story of stories) {
      const outlet = story.outlet ?? {
        id: "news",
        name: labels.desk,
        layout: "broadsheet",
      };
      const key = outlet.id ?? outlet.name;
      if (!outlets.has(key)) outlets.set(key, { ...outlet, stories: [] });
      outlets.get(key).stories.push(story);
    }
    // A place with no press of its own opens on the desk of stories no outlet
    // printed, there every day.
    if (
      ![...outlets.values()].some((outlet) => outlet.home) &&
      !outlets.has("news")
    )
      outlets.set("news", {
        id: "news",
        name: labels.desk,
        layout: "broadsheet",
        stories: [],
      });
    // One tab order, whatever came in last (play-nov8-news-opens-on-a-different-paper-each-time):
    // the player's own paper first (an outlet of the place they live in), then the
    // desk of stories no outlet printed (there from day one), the other papers by
    // name, the Nation's last; which tab it opens on is ui/news-open.mjs.
    const rank = (outlet) =>
      outlet.home || outlet.stories.some((st) => st.outlet?.home)
        ? 0
        : outlet.id === "news"
          ? 1
          : outlet.id === "nation"
            ? 3
            : 2;
    // Tabs News showed before keep their places; new ones follow by rank.
    const placeOf = (key) => {
      const at = newsOrder.indexOf(key);
      return at < 0 ? newsOrder.length : at;
    };
    const ordered = new Map(
      [...outlets].sort(
        ([keyA, a], [keyB, b]) =>
          placeOf(keyA) - placeOf(keyB) ||
          rank(a) - rank(b) ||
          // The player's own outlets keep the order the press record gives them.
          (rank(a) ? String(a.name).localeCompare(String(b.name)) : 0),
      ),
    );
    newsOrder = [
      ...newsOrder,
      ...[...ordered.keys()].filter((key) => !newsOrder.includes(key)),
    ];
    // News opens on the last tab chosen if it has something new, else the
    // followed outlet with the newest unread story, else the home paper.
    const read = (key) => {
      for (const story of ordered.get(key)?.stories ?? [])
        newsSeen.add(story.id);
    };
    const opening =
      newsShowing && ordered.has(newsShowing)
        ? newsShowing
        : openingTab(ordered, newsTab, newsSeen);
    newsShowing = opening;
    read(opening);
    return [
      newsBoard({
        outlets: ordered,
        chosenKey: opening,
        followsAny: (
          await api(`/api/news/follows?id=${encodeURIComponent(me.id)}`)
        ).any,
        onChoose: (key) => {
          newsTab = key;
          newsShowing = key;
          read(key);
        },
        labels,
        date: today(),
        headlineOf: storyHeadline,
        photoOf: storyPhoto,
      }),
    ];
  },
  // The Guide as an encyclopedia page (owner, Oct 29: every menu like
  // Government, never blocks of text): the terms as cards on a plate, paged
  // two across, and the chosen term's article beside them; the search narrows
  // the cards as it is typed.
  async guide() {
    const terms = await api(`/api/guide?q=${encodeURIComponent(guideQuery)}`);
    return guideScreen({
      terms,
      query: guideQuery,
      labels: controls.guide,
      onSearch: async (text) => {
        guideQuery = text;
        const found = await api(`/api/guide?q=${encodeURIComponent(text)}`);
        // A slower answer to an older query never replaces a newer one.
        return text === guideQuery ? found : null;
      },
      onReset: resetLearned,
    });
  },
  /**
   * The title's Patch notes, as the Nov 8 front mock draws it (fr-notes): the builds in a
   * strip at the left, newest first, and the chosen build's changes in a strip per heading
   * (Changed, Improved, Fixed), each note's text under it. The release machinery's file is
   * the only source; no card per note, no chips.
   */
  async patchNotes() {
    const { releases } = await api("/api/patch-notes");
    const labels = controls.patchNotes ?? {};
    return [
      ...patchNotesScreen({
        title: labels.builds,
        builds: releases.map((r) => ({
          name: r.version,
          // The release file says "Released November 8, 2026."; the list shows "Nov 8".
          when: (() => {
            const day = new Date(
              String(r.released ?? "")
                .replace(/^Released\s+/i, "")
                .replace(/\.$/, ""),
            );
            return Number.isNaN(day.getTime())
              ? ""
              : day.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
          })(),
          groups: (r.groups ?? []).map((group) => ({
            heading: group.heading,
            notes: group.notes.map((note) =>
              [note.title, note.text].filter(Boolean).join(". "),
            ),
          })),
        })),
      }),
    ];
  },
  /**
   * The title's Saved games, as the Nov 8 front mock draws it (fr-saves): one strip per saved
   * life, its name over a bust, the game's date and Load. The game keeps one life, the one
   * Continue opens; more slots and Delete wait for the versioned save format in
   * early-access preparation (OWNER-DECISIONS: "Saves don't matter" until then), so there
   * is no Delete here: a control with no effect is a defect.
   */
  async saves() {
    await controlsReady;
    const words = controls.saves;
    const life = titleLife;
    if (!life) return [plate(null, prose(words.none, "saves-none"))];
    return [
      personCard(
        { name: life.name, face: life.face },
        {
          layout: "saved",
          note: dateWords(life.date),
          actions: [
            makeButton({
              className: "action",
              textContent: words.load,
              onclick: () => {
                closeSheet();
                $("front-continue").click();
              },
            }),
          ],
        },
      ),
    ];
  },
  /**
   * Options as the Nov 8 front mock draws it (fr-options): a strip for Seeing (Full screen
   * as On and Off toggles), a strip for Leave (Quit to title) and a strip for Dev mode, lit
   * toggles and never checkboxes, and a strip for which scenes may stop the day (the
   * director's own record, by group). Color-blind colors are one global setting
   * (palette-setting.mjs). Save now is in the mock but is not a setting the game keeps yet,
   * so it is not drawn.
   */
  async options() {
    await controlsReady;
    const labels = controls.options;
    const toggle = (spec) => onOffToggle({ ...spec, labels });
    const seeing = document.fullscreenEnabled
      ? [
          settingRow(
            labels.fullScreen,
            toggle({
              attr: "full",
              testid: "options-fullscreen",
              on: () => Boolean(document.fullscreenElement),
              set: async (wanted) => {
                try {
                  if (wanted)
                    await document.documentElement.requestFullscreen();
                  else if (document.fullscreenElement)
                    await document.exitFullscreen();
                } catch {
                  // The browser refused; the toggle shows the state it is in.
                }
              },
            }),
          ),
        ]
      : [];
    seeing.push(
      settingRow(
        labels.colorBlind,
        toggle({
          attr: "palette",
          testid: "options-color-blind",
          on: colorBlindOn,
          set: setColorBlind,
        }),
      ),
    );
    // Which kinds of scene may stop the day: the director's own record of the
    // player's setting (/api/scene-filter), one On/Off per group of kinds.
    const filter = me
      ? await api(`/api/scene-filter?id=${encodeURIComponent(me.id)}`)
      : null;
    const groups = new Map();
    for (const [kind, group] of Object.entries(filter?.groups ?? {}))
      if (group && labels.sceneGroups[group])
        groups.set(group, [...(groups.get(group) ?? []), kind]);
    let allowed = new Set(filter?.allowed ?? filter?.kinds ?? []);
    const stopping = filter
      ? [...groups].map(([group, kinds]) =>
          settingRow(
            labels.sceneGroups[group],
            toggle({
              attr: "stop",
              testid: `options-stop-${group}`,
              on: () => kinds.every((kind) => allowed.has(kind)),
              set: async (wanted) => {
                for (const kind of kinds) {
                  if (wanted) allowed.add(kind);
                  else allowed.delete(kind);
                }
                const every = allowed.size === filter.kinds.length;
                const saved = await post(
                  `/api/scene-filter?id=${encodeURIComponent(me.id)}&kinds=${every ? "all" : [...allowed].join(",")}`,
                );
                allowed = new Set(saved.allowed ?? saved.kinds);
              },
            }),
          ),
        )
      : [];
    return [
      optionsBoard({
        columns: [
          [
            ...(seeing.length ? [{ title: labels.seeing, rows: seeing }] : []),
            ...(stopping.length
              ? [{ title: labels.sceneStop, rows: stopping }]
              : []),
            {
              title: labels.leave,
              rows: [
                quitButton(labels.quitToTitle, () => window.location.reload()),
              ],
            },
          ],
          [
            {
              title: labels.devMode,
              rows: [
                toggle({
                  attr: "dev",
                  testid: "options-dev-mode",
                  on: devModeOn,
                  set: setDevMode,
                }),
              ],
            },
          ],
        ],
      }),
    ];
  },
  async travel() {
    const [places, government] = await Promise.all([
      api(`/api/goto?id=${encodeURIComponent(me.id)}`),
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.travel;
    // The offices that take your filings: one card each.
    const byOffice = new Map();
    for (const c of government.contests) {
      const filedWith = c.filingOffice.filedWith;
      const name = c.filingOffice.said;
      // A town's or county's own clerk is named for the place ("City or town
      // clerk, Point Pleasant"); a state's or the nation's office already is.
      const title =
        c.contest.family === "municipalOffice"
          ? labels.counterTitle
              .replace("{office}", name)
              .replace("{town}", me.placeName.split(",")[0])
          : name;
      if (!byOffice.has(name))
        byOffice.set(name, {
          name: title,
          filedWith,
          filing: true,
        });
    }
    const counters = await Promise.all(
      [...byOffice.values()].map(async (office) => ({
        ...office,
        presentation: {
          imageUrl: (
            await api(
              `/api/goto/counter-picture?filedWith=${encodeURIComponent(office.filedWith)}`,
            )
          ).url,
        },
      })),
    );
    // The campaign trail: one card per filed campaign, where its acts wait.
    const trails = (await campaignParts()).map((part) => ({
      name: labels.trail,
      trail: part,
      presentation: { imageUrl: part.picture },
      presentCount: 0,
      presentNames: [],
      reasons: [],
      organizationId: part.filing.id,
    }));
    const destinations = [...trails, ...counters, ...places];
    // What you can do at a place is the core's own offers for it: bare action names.
    const doHere = (p) =>
      p.trail || p.filing
        ? []
        : [
            // Why you may go: your party's office.
            ...p.reasons
              .filter((r) => r.kind === "member")
              .map(() => labels.memberHere ?? ""),
            ...p.reasons
              .filter((r) => r.kind === "action")
              .map((r) => controls.actions?.[r.recordId] ?? ""),
          ].filter(Boolean);
    const town = me.placeName.split(",")[0];
    const groupOf = (p) =>
      p.trail ? labels.groupTrail : p.filing ? labels.groupFiling : town;
    // A place's detail loads when it is chosen: an office keeps its clerk's hours.
    const detailOf = (p) => async () => {
      const hours = p.filing
        ? await api(
            `/api/filing/hours?filedWith=${encodeURIComponent(p.filedWith)}`,
          )
        : {};
      const opensLine = hours.opens
        ? labels.opensAt
            .replace("{day}", dateWords(hours.opens.date, { weekday: true }))
            .replace("{time}", timeWords(hours.opens.minuteOfDay))
        : "";
      const known = new Set((p.known ?? []).map((k) => k.name));
      const who = peopleSentence([
        ...(p.known ?? []).map((k) => ({
          name: k.name,
          onOpen: () => {
            closeSheet();
            showPerson({ personId: k.personId });
          },
        })),
        ...(p.presentNames ?? [])
          .filter((name) => !known.has(name))
          .map((name) => ({ name })),
      ]);
      return {
        openLabel: labels.openLabel,
        open: p.filing
          ? opensLine || labels.filing
          : p.presentCount
            ? labels.open
            : labels.closed,
        who,
        does: doHere(p),
      };
    };
    // Out at a place, the way home comes first.
    const home = await api("/api/goto/home");
    return travelScreen({
      labels,
      entries: [
        ...(home.away
          ? [
              {
                group: town,
                title: labels.home,
                home: true,
                picture: home.picture,
                // Who is there now, as every place says.
                load: async () => ({
                  who: home.who.length
                    ? peopleSentence(home.who.map((name) => ({ name })))
                    : null,
                }),
                go: { label: labels.goHome, onClick: goHome },
              },
            ]
          : []),
        ...destinations.map((p) => ({
          group: groupOf(p),
          title: p.name,
          filing: Boolean(p.filing),
          picture: p.presentation?.imageUrl,
          ...(p.trail
            ? { onOpen: () => trailView(p.trail) }
            : {
                load: detailOf(p),
                go: {
                  label: `${labels.go} ${p.name}`,
                  onClick: () =>
                    p.filing
                      ? openFiling(p.filedWith)
                      : visit(p.organizationId),
                },
              }),
        })),
      ],
    });
  },
  async politics() {
    return sheets.government();
  },
  async office() {
    return seatRows();
  },
  /**
   * Campaigns: the coming ballot's real races (owner, Oct 28, point 19), each
   * opening to who runs, with their filed views, every candidate's name their
   * card, and File for it taking you to the office that takes the filing.
   * The player's own filed campaign stays above it (screens-campaign-board
   * is the one board that replaces those rows).
   */
  /** The campaign board of each filed race (the Campaign tab; one filed race shows its board). */
  async campaign() {
    const parts = await campaignParts();
    if (!parts.length) return [];
    if (parts.length === 1) return [parts[0].tab];
    return rosterScreen({
      title: controls.campaignBoard.title,
      className: "campaign-screen",
      groups: [
        {
          entries: parts.map((part) => ({
            key: part.filing.id,
            label: part.contest?.title ?? part.filing.id,
            data: { campaign: part.filing.id },
            part,
          })),
        },
      ],
      render: async (entry) => [entry.part.tab],
    });
  },
  async campaigns() {
    const [v, ballot, asked] = await Promise.all([
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
      api("/api/government/local-races"),
      api("/api/campaign/asks").catch(() => ({ asks: [] })),
    ]);
    // stopgapId: SG-PLAY-campaign-ask-on-screen
    // A candidate who knows you asking for money (play-campaign-ask-reaches-player):
    // what they asked, the sum you'd give by your own reasons, and your answer.
    const askWords = controls.campaignAsks;
    const askPage = (ask) => {
      const status = statusLine();
      const dollarsIn = numberBox({
        value: Math.round(ask.suggestedMinor / 100),
        min: 1,
        step: 1,
        label: askWords.amount,
      });
      const answer = (kind) =>
        makeButton({
          className: kind === "give" ? "action primary" : "action",
          textContent: askWords[kind],
          onclick: async () => {
            const response = await post(
              `/api/campaign/asks/answer?${new URLSearchParams({
                askId: ask.id,
                answer: kind,
                ...(kind === "give"
                  ? {
                      amountMinor: String(
                        Math.round(Number(dollarsIn.value) * 100),
                      ),
                    }
                  : {}),
              })}`,
            ).catch(() => ({ answered: false }));
            // A sum they can't give (more than they hold, past the limit, not whole dollars) is refused here.
            if (!response.answered) {
              status.textContent = askWords.notGiven;
              return;
            }
            await refresh();
            await openSheet("campaigns");
          },
        });
      return [
        rosterTitle(ask.candidate, ask.party ?? undefined),
        stripSection(
          1,
          askWords.title,
          row(askWords.race, ask.race),
          row(askWords.asked, dateWords(ask.askedOn)),
          row(askWords.suggested, roundedMoney(ask.suggestedMinor)),
          row(askWords.cash, roundedMoney(asked.cashMinor)),
        ),
        buttonRow(dollarsIn, answer("give"), answer("decline")),
        status,
      ];
    };
    const labels = controls.localRaces;
    const stance = voteWords();
    const filedFor = new Set(v.filings.map((f) => f.contestId));
    // A filing for any seat of an at-large race is a filing for the race.
    const filed = {
      has: (contestId) =>
        filedFor.has(contestId) ||
        ballot.races.some(
          (race) =>
            race.contestId === contestId &&
            race.contestIds?.some((id) => filedFor.has(id)),
        ),
    };
    const status = (race) =>
      filed.has(race.contestId)
        ? labels.youFiled
        : race.filers.length
          ? labels.running.replace("{n}", race.filers.length)
          : labels.noFilers;
    // One race's page: its title and date, who is running (face, party, where they stand),
    // its dates, and File for it when the player may.
    const racePage = (race) => {
      const candidates = race.filers.length
        ? race.filers.map((f) =>
            personCard({
              name: f.name ?? "",
              line: f.party ?? "",
              party: f.party,
              face: f.face,
              onOpen: () => {
                closeSheet();
                showPerson({ personId: f.cardId });
              },
              more: f.stances.map((st) =>
                row(
                  policyLabel(st.question),
                  st.position > 0 ? (stance.for ?? "") : (stance.against ?? ""),
                ),
              ),
            }),
          )
        : [prose(labels.noFilers, "record-empty")];
      const mayFile =
        race.filingOpen &&
        race.playerMayFile &&
        !filed.has(race.contestId) &&
        race.filedWith;
      // A race the player may run for in kind but cannot file for today
      // says why, from the eligibility rule's own record, and offers no filing.
      const cannotFile =
        race.playerMayFile && !filed.has(race.contestId) && race.cannotFile
          ? race.cannotFile
          : null;
      const cannotFileWords = cannotFile
        ? (cannotFile.rule === "minimum-age"
            ? labels.cantFileAge
            : cannotFile.rule === "residency"
              ? labels.cantFileResidency
              : labels.cantFile
          )
            .replace("{required}", cannotFile.required)
            .replace("{actual}", cannotFile.actual)
        : null;
      const fileButton = makeButton({ textContent: labels.fileForIt });
      fileButton.dataset.testid = "file-for-it";
      fileButton.addEventListener("click", () =>
        openFiling(race.filedWith, race.contestId),
      );
      return [
        rosterTitle(
          race.title,
          dateWords(race.electionDate, { year: today() }),
        ),
        rosterCols(
          // A candidate's name opens their card; there is no rally to go to
          // (SG-SCREENS-candidate-rally: no engine keeps a rally as a place and a time).
          stripSection(1, labels.whoIsRunning, ...candidates),
          rosterSide(
            // An at-large race fills several seats at once.
            ...(race.seats > 1
              ? [
                  stripSection(
                    3,
                    labels.seats,
                    dotRows([{ label: labels.seatsToFill, value: race.seats }]),
                  ),
                ]
              : []),
            ...(race.lastTime
              ? [
                  stripSection(
                    3,
                    labels.lastTime,
                    dotRows([
                      {
                        label: dateWords(race.lastTime.date, {
                          year: today(),
                        }),
                        value: race.lastTime.winnerId
                          ? nameLink(race.lastTime.winner, () =>
                              showPerson({ personId: race.lastTime.winnerId }),
                            )
                          : race.lastTime.winner,
                      },
                      {
                        label: labels.share,
                        value: `${race.lastTime.sharePercent} ${labels.percent}`,
                      },
                    ]),
                  ),
                ]
              : []),
            stripSection(
              2,
              labels.dates,
              dateList([
                ...(race.filingOpens && race.filingOpens > today()
                  ? [
                      {
                        when: dateWords(race.filingOpens, {
                          month: "short",
                          year: today(),
                        }),
                        text: labels.filingOpens,
                      },
                    ]
                  : []),
                ...(race.filingClosed
                  ? []
                  : [
                      {
                        when: dateWords(race.filingDeadline, {
                          month: "short",
                          year: today(),
                        }),
                        text: labels.filingCloses,
                      },
                    ]),
                {
                  when: dateWords(race.electionDate, {
                    month: "short",
                    year: today(),
                  }),
                  text: labels.electionDay,
                },
              ]),
            ),
            ...(mayFile && !cannotFile ? [buttonTray(fileButton)] : []),
            ...(cannotFileWords
              ? [prose(cannotFileWords, "record-empty")]
              : []),
          ),
        ),
      ];
    };
    // The player's own record in office, as voters read it: roll calls, bills sponsored and
    // promises with their status, each row tagged with its record id for the Trace.
    const recordSection = (record) => {
      const floor = controls.floor?.status ?? {};
      const tag = (rows) => {
        const node = dotRows(
          rows.map((row) => ({ label: row.label, value: row.value })),
        );
        [...node.children].forEach((child, at) => {
          child.dataset.recordId = rows[at].id;
        });
        return [node];
      };
      const voteRows = record.votes.map((vote) => ({
        id: vote.id,
        label: vote.number
          ? `${vote.number} · ${policyLabel(vote.question)}`
          : `${policyLabel(vote.question)} · ${dateWords(vote.date)}`,
        value: `${vote.position > 0 ? labels.votedFor : labels.votedAgainst} · ${
          vote.passed ? labels.votePassedResult : labels.voteAgainstResult
        }`,
      }));
      const billRows = record.bills.map((bill) => ({
        id: bill.id,
        label: bill.number,
        value: floor[bill.status] ?? "",
      }));
      const promiseRows = record.promises.map((promise) => ({
        id: promise.id,
        label: `${policyLabel(promise.question)} · ${promise.position > 0 ? (stance.for ?? "") : (stance.against ?? "")}`,
        value:
          promise.status === "kept"
            ? labels.promiseKept
            : promise.status === "broken"
              ? labels.promiseBroken
              : labels.promiseOpen,
      }));
      return voteRows.length || billRows.length || promiseRows.length
        ? [
            stripSection(
              2,
              labels.yourRecord,
              ...(voteRows.length
                ? [stripSection(3, labels.recordVotes, ...tag(voteRows))]
                : []),
              ...(billRows.length
                ? [stripSection(3, labels.recordBills, ...tag(billRows))]
                : []),
              ...(promiseRows.length
                ? [stripSection(3, labels.recordPromises, ...tag(promiseRows))]
                : []),
            ),
          ]
        : [];
    };
    const byDate = new Map();
    for (const race of ballot.races) {
      const day = byDate.get(race.electionDate) ?? [];
      day.push(race);
      byDate.set(race.electionDate, day);
    }
    const groups = [
      ...(asked.asks.length
        ? [
            {
              title: askWords.title,
              entries: asked.asks.map((ask) => ({
                key: ask.id,
                label: ask.candidate,
                aside: roundedMoney(ask.suggestedMinor),
                data: { ask: ask.id },
                ask,
              })),
            },
          ]
        : []),
      ...[...byDate.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, races]) => ({
          title: dateWords(day, { year: today() }),
          entries: races.map((race) => ({
            key: race.contestId,
            label: race.title,
            aside:
              race.filers.length || filed.has(race.contestId)
                ? status(race)
                : "",
            data: { contest: race.contestId },
            race,
          })),
        })),
    ];
    if (!groups.length) return [prose(labels.noBallot, "record-empty")];
    return rosterScreen({
      title: labels.title,
      groups,
      className: "elections-screen",
      render: async (entry) =>
        entry.ask
          ? askPage(entry.ask)
          : [
              ...racePage(entry.race),
              ...(filed.has(entry.race.contestId) ||
              entry.race.lastTime?.winnerId === me.id
                ? recordSection(await api(`/api/campaign/record?id=${me.id}`))
                : []),
            ],
    });
  },
  /**
   * Politics → Government, drawn as a game menu (owner, Oct 29: "make it look like a real
   * game menu"). The level (Local, State, Federal) and the branch
   * (Legislative, Executive) are two rows of tabs. A lawmaking body is its
   * room's painting with its name and when it meets, its party split, its
   * members as cards (a big chamber as a seat chart with your members and its
   * leaders first), its recent roll calls as bars and what is coming up, with
   * the level's executive beside it. One fixed panel: what does not fit pages
   * inside its box, never a scroll (owner, Oct 29). Every card opens the
   * person's card, where you act (owner, Oct 29: see and jump).
   */
  // Bills before your state's chambers and Congress, followed from home: where each is, how
  // your own members voted, whether it reaches your place; a card opens the bill's paper.
  async bills() {
    const words = controls.billFollow ?? {};
    const status = controls.floor?.status ?? {};
    const list = await api("/api/bills/following");
    if (!list.length)
      return [stripSection(1, controls.titles.bills, prose(words.empty))];
    // The bills a player follows, listed by where each stands, beside the
    // chosen bill's own page (the one list-beside-page part): no button to
    // read a bill and no Back from it.
    const stages = [...new Set(list.map((item) => item.status))];
    return rosterScreen({
      title: controls.titles.bills,
      className: "bills",
      groups: stages.map((stage) => ({
        title: status[stage] ?? "",
        entries: list
          .filter((item) => item.status === stage)
          .map((item) => ({
            key: item.id,
            label: item.title,
            aside: item.number,
          })),
      })),
      render: (entry, show) => void openBillPaper(entry.key, show, () => {}),
    });
  },
  /** Dev mode's Watch: what moved since the first dev change, month by month, and the golden path's steps. */
  async watch() {
    return [
      await devWatchSections({ labels: controls.devWatch, playerId: me.id }),
    ];
  },
  async government() {
    const labels = controls.politics;
    const [{ states }, gov] = await Promise.all([
      api(`/api/government/state?state=`),
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
    ]);
    const fill = (text, values) =>
      Object.entries(values).reduce(
        (t, [k, v]) => t.replaceAll(`{${k}}`, String(v)),
        text ?? "",
      );
    const short = (iso) => dateWords(iso, { month: "short", year: today() });
    const open = (cardId) => () => {
      closeSheet();
      showPerson({ personId: cardId });
    };
    // A seat as a voter says it: a town's ward, a state's district, at large.
    const seatWords = (body, district) =>
      !district
        ? body.seats > 1
          ? labels.atLarge
          : ""
        : /^\d+$/.test(district)
          ? fill(labels.district, {
              n: Number(district),
            })
          : district;
    const card = (body, m, line, large = false) =>
      personCard(
        {
          name: m.name,
          line,
          party: m.party,
          face: m.face,
          onOpen: open(m.cardId),
        },
        { large },
      );
    const sinceLine = (m) =>
      m.party
        ? fill(labels.partySince, {
            party: m.party,
            date: monthWords(m.serviceStart),
          })
        : fill(labels.sinceOnly, { date: monthWords(m.serviceStart) });
    // How many rows of cards fit under the room's picture in this window:
    // the panel never scrolls, so a short window pages sooner.
    const rowsFor = (taken, most) =>
      Math.max(1, Math.min(most, Math.floor((viewHeight() - taken) / 72)));
    const comingWords = (item) =>
      item.kind === "meeting"
        ? labels.regularMeeting
        : item.kind === "bill"
          ? // A bill with no composed title is named by the law it changes; a
            // row never ends in a colon.
            item.title || item.law
            ? fill(labels.billOnFloor, {
                number: item.number ?? "",
                title: item.title || policyLabel(item.law),
              })
            : (item.number ?? "")
          : (item.title ?? "");
    const comingList = (items) =>
      dateList(
        items.map((item) => ({
          when: short(item.date),
          text: comingWords(item),
        })),
        labels.nothingComing,
      );
    const voteList = (votes) =>
      votes.length
        ? [
            voteRows(
              votes.map((v) => ({
                title: v.title,
                result: `${v.passed ? labels.passed : labels.failed} · ${fill(labels.yesCount, { n: v.yes })}, ${fill(labels.noCount, { n: v.no })}`,
                when: short(v.date),
                ...(v.openable
                  ? {
                      onOpen: () =>
                        openBillPaper(
                          v.billId,
                          (...nodes) =>
                            $("sheet-body").replaceChildren(...nodes),
                          () => openSheet("government"),
                        ),
                    }
                  : {}),
              })),
            ),
          ]
        : [dateList([], labels.noVotes)];
    // The party split, largest first, as big numbers in the party's color; a nonpartisan body as one.
    const splitBar = (body) => {
      const total = fill(labels.seatsTotal, { n: body.seats });
      const held = body.members.length;
      const parts = body.parties.length
        ? body.parties.map((p) => ({
            party: p.party,
            seats: p.seats,
            label:
              (p.seats === 1 ? labels.partySingular : labels.partyPlural)?.[
                p.party
              ] ?? p.party,
          }))
        : [{ party: null, seats: held, label: labels.nonpartisan }];
      const unlisted = held - parts.reduce((sum, p) => sum + p.seats, 0);
      return seatNumbers(
        unlisted > 0 && body.parties.length
          ? [...parts, { party: null, seats: unlisted, label: total }]
          : parts,
        body.vacant
          ? {
              count: body.vacant,
              label: fill(labels.vacantCount, { n: body.vacant }),
            }
          : null,
      );
    };
    const lawmakingView = (body, executive) => {
      // The body's name over its room, no line under it (owner, Nov 7: no
      // subtitles on menus): its seats are in Seats, its meeting and election
      // in Coming up.
      const header = chamberHeader({
        picture: body.picture,
        name: body.name,
      });
      const big = body.seats > 12;
      // A big chamber: your own members and its leaders first, then everyone
      // by party, paged; a small body: every member, paged when it must.
      const leaderIds = new Set(body.leaders.map((l) => l.cardId));
      const people = big
        ? [
            ...body.members
              .filter((m) => m.own)
              .map((m) => card(body, m, seatWords(body, m.district))),
            ...body.leaders.map((l) => {
              // A leader who sits in this chamber is drawn as its member,
              // party included; one from elsewhere by name.
              const seated = body.members.find((m) => m.cardId === l.cardId);
              // A leader's post is a civic term: underlined until learned, its
              // meaning on hover, the Guide on a click.
              return card(
                body,
                seated ?? { ...l, party: null },
                termLabel(words(l.post)),
              );
            }),
            ...[...body.members]
              .filter((m) => !m.own && !leaderIds.has(m.cardId))
              .sort(
                (a, b) =>
                  (a.party ?? "").localeCompare(b.party ?? "") ||
                  a.name.localeCompare(b.name),
              )
              .map((m) => card(body, m, seatWords(body, m.district))),
          ]
        : body.members.map((m) => card(body, m, seatWords(body, m.district)));
      // The level's chief executive beside its lawmakers, where it has one.
      const chief = executive.find((e) => e.chief);
      return {
        main: [
          header,
          stripSection(1, labels.seats, splitBar(body)),
          stripSection(
            2,
            labels.members,
            pager({
              items: people,
              render: (node) => node,
              rows: big ? rowsFor(700, 3) : rowsFor(620, 4),
              columns: 2,
              rowHeight: 64,
              gap: 8,
              className: "members-pager",
            }),
          ),
        ],
        side: [
          {
            title: null,
            nodes: [
              stripSection(
                3,
                labels.recentVotes,
                ...voteList(body.recentVotes),
              ),
              stripSection(4, labels.comingUp, comingList(body.comingUp)),
              ...(chief?.members[0]
                ? [
                    stripSection(
                      5,
                      chief.title,
                      personCard(
                        {
                          face: chief.members[0].face,
                          name: chief.members[0].name,
                          party: chief.members[0].party,
                          line: chief.title,
                          onOpen: open(chief.members[0].cardId),
                        },
                        { layout: "leader", note: sinceLine(chief.members[0]) },
                      ),
                    ),
                  ]
                : []),
            ],
          },
        ],
      };
    };
    // The executive branch: the chief executive's office on the left, the
    // level's other elected officers and what is coming up on the right.
    const executiveView = (executive) => {
      const chief = executive.find((e) => e.chief) ?? executive[0];
      const officers = executive.filter((e) => e !== chief);
      const head = chief?.members[0];
      const runs = peopleSentence(
        officers.flatMap((o) =>
          o.members.map((m) => ({
            name: m.name,
            relation: o.title,
            onOpen: open(m.cardId),
          })),
        ),
      );
      return {
        main: chief
          ? [
              chamberHeader({
                picture: chief.picture,
                name: chief.title,
              }),
              ...(head
                ? [
                    stripSection(
                      1,
                      chief.title,
                      personCard(
                        {
                          face: head.face,
                          name: head.name,
                          party: head.party,
                          line: chief.title,
                          onOpen: open(head.cardId),
                        },
                        { layout: "leader", note: sinceLine(head) },
                      ),
                    ),
                  ]
                : []),
              stripSection(
                3,
                labels.comingUp,
                comingList(
                  executive
                    .flatMap((o) => o.comingUp)
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .slice(0, 4),
                ),
              ),
            ]
          : [],
        side: runs
          ? [
              {
                title: null,
                nodes: [
                  stripSection(
                    2,
                    fill(labels.whoRuns, {
                      name: chief?.government ?? chief?.title ?? "",
                    }),
                    runs,
                  ),
                ],
              },
            ]
          : [],
      };
    };
    // The chosen level, branch, state and body, kept while the sheet is open.
    let bodyChoice = null;
    const devBills = devModeOn()
      ? await devBillsPanel({
          labels: controls.devBills,
          onDone: () => refresh(),
        })
      : null;
    const devBribe = devBills
      ? await devBribePanel({
          labels: controls.devBribe,
          bodies: devBills.bodies,
          billId: devBills.billId,
          onDone: () => refresh(),
        })
      : null;
    const devPanels = devBills
      ? devPanelsRow(devBills.section, ...(devBribe ? [devBribe] : []))
      : null;
    const screen = async () => {
      const level = governmentLevel ?? gov.ownRace?.tier ?? "local";
      const stateKey = level === "local" ? "" : governmentState;
      const v = await api(
        `/api/government/bodies?${new URLSearchParams({ id: me.id, level, state: stateKey })}`,
      );
      // A place with no local government of its own (the District, an unincorporated place)
      // opens on the level that governs it; Local stays a tab and says so when chosen.
      const empty = !v.legislative.length && !v.executive.length;
      if (empty && !governmentLevel && level === "local") {
        governmentLevel = "state";
        return screen();
      }
      // A branch the level has nothing in is not offered (nothing on screen
      // does nothing): a township with no executive shows its board alone.
      // SG-PLAY-government-judicial-no-judges: no Judicial branch yet, since no
      // judge exists in the world to show (owner, Oct 29: judges read-only).
      const offered = ["legislative", "executive"].filter((key) =>
        key === "legislative" ? v.legislative.length : v.executive.length,
      );
      const branch = offered.includes(governmentBranch)
        ? governmentBranch
        : (offered[0] ?? "legislative");
      const redraw = async () => {
        const node = await screen();
        if (openTab === "government") $("sheet-body").replaceChildren(node);
      };
      const levels = tabBar({
        attr: "level",
        className: "government-picker",
        active: level,
        tabs: ["local", "state", "federal"].map((key) => ({
          key,
          label: controls.levels?.[key] ?? words(key),
          onSelect: () => {
            governmentLevel = key;
            bodyChoice = null;
            void redraw();
          },
        })),
      });
      const branches = tabBar({
        attr: "branch",
        className: "government-branch",
        active: branch,
        tabs: offered.map((key) => ({
          key,
          label: labels.branches?.[key] ?? words(key),
          onSelect: () => {
            governmentBranch = key;
            void redraw();
          },
        })),
      });
      // The state filter: the kit's dropdown, the player's state by name
      // first (owner, Oct 28, point 15).
      const stateFilter =
        level !== "local"
          ? select({
              className: "government-state",
              label: labels.stateFilter,
              value: stateKey,
              options: [
                { value: "", label: gov.homeState?.name ?? labels.ownState },
                ...states
                  .filter((st) => st.key !== gov.homeState?.key)
                  .map((st) => ({ value: st.key, label: st.name })),
              ],
              onChange: (state) => {
                governmentState = state;
                bodyChoice = null;
                void redraw();
              },
            })
          : null;
      const bodies = v.legislative;
      const body =
        bodies.find((b) => b.officeId === bodyChoice) ?? bodies[0] ?? null;
      // More than one lawmaking body at a level (a town council and the
      // county board; a state's two chambers): one tab each.
      const bodyTabs =
        branch === "legislative" && bodies.length > 1
          ? [
              tabBar({
                attr: "body",
                className: "government-bodies",
                active: body?.officeId,
                tabs: bodies.map((b) => ({
                  key: b.officeId,
                  label: b.name,
                  onSelect: () => {
                    bodyChoice = b.officeId;
                    void redraw();
                  },
                })),
              }),
            ]
          : [];
      const view = empty
        ? {
            main: [
              plate(
                null,
                prose(
                  (labels.noLocalGovernment ?? "").replace(
                    "{state}",
                    gov.homeState?.name ?? "",
                  ),
                ),
              ),
            ],
            side: [],
          }
        : branch === "executive" || !body
          ? executiveView(v.executive)
          : lawmakingView(body, v.executive);
      const screenNode = splitScreen({
        className: "government-screen strip-screen strip-wrap strips ol-g",
        controls: [
          levels,
          stateFilter,
          offered.length > 1 ? branches : null,
        ].filter(Boolean),
        // Dev mode's Bills and Bribe panels sit in the main column under what they act on.
        main: [...bodyTabs, ...view.main, ...(devPanels ? [devPanels] : [])],
        side: view.side,
      });
      // The panel never scrolls: the members' pager gives up rows first (`fitPagers`, here and
      // when the sheet opens).
      fitPagers(screenNode);
      return screenNode;
    };
    return [await screen()];
  },
  /**
   * Parties, illustrated: the state's map with the player's districts and
   * town filled in the color of the party that holds each, a legend of the
   * parties by seats, then each party's seats as person rows (owner, Oct
   * 28, point 20: the map that once existed, brought back).
   */
  async parties() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    const labels = controls.politics;
    const party = v.party;
    const mine = party?.member?.name;
    // Every party the player can read about: the ones that hold office here,
    // the ones open to join, and the player's own, each once. A party with no
    // one in office still has its page, so its member sees the membership and
    // a newcomer can join it.
    const keys = [
      ...new Set([
        ...v.parties.map((p) => p.party),
        ...(party?.parties ?? []).map((p) => p.name),
        ...(mine ? [mine] : []),
      ]),
    ];
    // One party's page: who holds office for it (cards, paged), and where the player stands
    // with it (registered, or Join).
    const partyPage = (name) => {
      const seats = v.parties.find((p) => p.party === name)?.seats ?? [];
      const meNodes = !party
        ? []
        : mine === name
          ? partyRows(party)
          : !mine
            ? partyRows(party).filter(
                (node, at) =>
                  node.tagName === "BUTTON" && party.parties[at]?.name === name,
              )
            : [];
      return [
        rosterTitle(name),
        stripSection(
          1,
          labels.inOffice,
          seats.length
            ? pager({
                items: seats,
                render: (s) =>
                  personCard({
                    name: s.name,
                    line: s.title,
                    party: name,
                    face: s.face,
                    onOpen: () => {
                      closeSheet();
                      showPerson({ personId: s.cardId });
                    },
                  }),
                rows: Math.max(
                  1,
                  Math.min(5, Math.floor((viewHeight() - 420) / 72)),
                ),
                columns: 2,
                rowHeight: 64,
                gap: 8,
              })
            : prose(labels.noHolders ?? "", "record-empty"),
        ),
        ...(meNodes.length
          ? [stripSection(2, controls.party.me, ...meNodes)]
          : []),
      ];
    };
    if (!keys.length) return [prose(labels.noParties ?? "", "record-empty")];
    return rosterScreen({
      title: labels.partiesTitle,
      className: "parties-screen",
      chosenKey: keys.includes(partyTab) ? partyTab : mine,
      groups: [
        {
          entries: keys.map((name) => ({
            key: name,
            label: name,
            name,
          })),
        },
      ],
      render: async (entry) => {
        partyTab = entry.name;
        return partyPage(entry.name);
      },
    });
  },
  /**
   * Issues: the law in force here as cards by subject (owner, Oct 28, point
   * 21: "click an issue (minimum wage) and see the law itself and find the
   * law"), each card opening the law's own screen: what is in force at each
   * level and since when, the statute it rests on, the measure that enacted
   * it, what is coming, and who voted. No row repeats the state the filter
   * and the card already name.
   */
  async issues() {
    const [v, changes] = await Promise.all([
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
      api(`/api/changes?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.politics;
    // A policy question's law reads yes or no; every other law, its amount.
    const lawText = (law, value, unit) =>
      law.yesNo ? (value ? labels.yes : labels.no) : amount(value, unit);
    // Who sets it, by level: "Federal law", "State law", the local body's.
    // The state level reads the place's own word (Commonwealth, Territory...).
    const setBy = (level) =>
      (labels.issueSetBy?.[level] ?? words(level)).replaceAll(
        "{level}",
        v.homeState?.levelWord ?? "",
      );
    // The subject a series belongs to: the policy question's own domain
    // ("us-policy-positions:fiscal.adopt-income-tax"), or the table's for an amount.
    const groupOf = (series) =>
      series.includes(":")
        ? series.split(":")[1].split(".")[0]
        : (labels.issueGroupOf?.[series] ?? "fiscal");
    // An additive tax (income) is one law per level, each at its own rate:
    // the list names each level's rate, never their sum as one rate.
    const valueText = (law) =>
      law.text ??
      (law.additive
        ? law.levels
            .filter((l) => l.row && l.row.value !== null && !l.setAside)
            .map(
              (l) =>
                `${setBy(l.level)} ${lawText(law, l.row.value, l.row.unit)}`,
            )
            .join(" · ") || null
        : law.value !== null && law.value !== undefined
          ? lawText(law, law.value, law.unit)
          : null);
    // What a law passed in play did (play-what-this-law-did-page): each row it
    // passed, newest first, with whom it reached by the reach records and the
    // money for each, full people by name and counted people by count; a row a
    // later one replaced says when, and each person when it stopped for them.
    const didSection = async (law) => {
      const did = await api(
        `/api/law/did?${new URLSearchParams({ series: law.series })}`,
      ).catch(() => []);
      if (!did.length) return [];
      const w = labels.lawDid;
      const fill = (text, values) =>
        Object.entries(values).reduce(
          (t, [k, v]) => t.replaceAll(`{${k}}`, String(v)),
          text ?? "",
        );
      const nodes = did.flatMap((d) => {
        const head = row(
          setBy(d.level),
          [
            d.repeal ? w.repealed : lawText(law, d.value, d.unit),
            fill(w.from, { date: dateWords(d.effectiveDate) }),
            ...(d.replacedOn
              ? [fill(w.until, { date: dateWords(d.replacedOn) })]
              : []),
          ].join(" · "),
        );
        if (!d.records) return [head, prose(w.noOneYet, "record-empty")];
        const group = (key, part) =>
          Math.round(part.people)
            ? [
                row(
                  // Counted groups stand for whole people in words.
                  fill(w[key], {
                    n: Math.round(part.people).toLocaleString("en-US"),
                  }),
                  roundedMoney(part.amountMinor),
                ),
              ]
            : [];
        return [
          head,
          ...group("fullHere", d.fullInTown),
          ...group("fullElsewhere", d.fullElsewhere),
          ...group("counted", d.counted),
          ...d.named.map((p) =>
            row(
              p.name,
              [
                roundedMoney(p.amountMinor),
                ...(p.endedOn
                  ? [fill(w.stopped, { date: dateWords(p.endedOn) })]
                  : []),
              ].join(" · "),
            ),
          ),
        ];
      });
      return [stripSection(5, w.title, ...nodes)];
    };
    // One law's page: what is in force at each level and since when, the statute, the
    // measure that enacted it, what is coming, what changed, what it did and how members voted.
    const lawPage = async (law) => {
      const inForce = law.levels
        .filter((l) => l.row)
        .flatMap((l) => [
          row(setBy(l.level), lawText(law, l.row.value, l.row.unit)),
          ...(l.row.effectiveDate
            ? [row(labels.since, dateWords(l.row.effectiveDate))]
            : []),
        ]);
      const statutes = law.levels
        .filter((l) => l.row?.terms?.cite)
        .map((l) => row(labels.statute, l.row.terms.cite));
      const measures = (
        await Promise.all(
          law.levels
            .filter((l) => l.row?.terms?.enactedBy)
            .map(async (l) => {
              const billId = l.row.terms.enactedBy;
              const paper = await api(
                `/api/bill?billId=${encodeURIComponent(billId)}`,
              ).catch(() => null);
              return paper
                ? makeButton({
                    textContent: `${labels.enactedBy} ${paper.title}`,
                    onclick: () =>
                      openBillPaper(
                        billId,
                        (...nodes) => $("sheet-body").replaceChildren(...nodes),
                        () => openSheet("issues"),
                      ),
                  })
                : null;
            }),
        )
      ).filter(Boolean);
      const coming = law.pending.map((pending) =>
        row(
          setBy(pending.level),
          `${lawText(law, pending.value, pending.unit)} · ${dateWords(pending.effectiveDate)}`,
        ),
      );
      const changed = [...changes.took, ...changes.ahead]
        .filter((c) => c.series === law.series)
        .map((change) =>
          row(
            dateWords(change.date),
            [change.measure, change.what].filter(Boolean).join(" · "),
          ),
        );
      const did = await didSection(law);
      const votes = (law.votes ?? []).map((vote) =>
        row(vote.name, controls.meeting?.[vote.vote] ?? ""),
      );
      // Repeal from the player's seat: an officeholder whose body has the
      // power drafts the repeal through the one bill engine (a draft with
      // the value 0, an amount zeroed or a yes-or-no law answered No, the
      // same call dev mode's Repeal button makes) and opens its paper; where
      // the player's bodies lack the power the page names the bodies that
      // have it. A resident with no office sees neither.
      const repealButtons = [];
      const repealLines = [];
      for (const level of law.levels) {
        if (!level.row || !level.repeal) continue;
        if (level.repeal.officeId) {
          const officeId = level.repeal.officeId;
          const params = { kind: "draft", officeId, value: "0" };
          if (law.yesNo) params.question = law.series;
          else params.series = law.series;
          const button = makeButton({
            className: "action",
            textContent: `${labels.repeal} · ${setBy(level.level)}`,
          });
          button.addEventListener("click", async () => {
            const out = await post(
              `/api/seat/act?${new URLSearchParams(params)}`,
            );
            openBillPaper(
              out.id,
              (...nodes) => $("sheet-body").replaceChildren(...nodes),
              () => openSheet("issues"),
            );
          });
          repealButtons.push(button);
        } else if (level.repeal.body) {
          repealLines.push(
            row(
              setBy(level.level),
              labels.repealElsewhere.replace("{body}", level.repeal.body),
            ),
          );
        }
      }
      return [
        rosterTitle(policyLabel(law.series)),
        stripSection(1, labels.inForce, ...inForce, ...statutes),
        ...(repealButtons.length ? [buttonTray(...repealButtons)] : []),
        ...(repealLines.length
          ? [stripSection(5, labels.repeal, ...repealLines)]
          : []),
        ...(measures.length ? [buttonTray(...measures)] : []),
        ...(coming.length ? [stripSection(2, labels.coming, ...coming)] : []),
        ...(changed.length
          ? [stripSection(3, labels.changed, ...changed)]
          : []),
        ...did,
        ...(votes.length ? [stripSection(4, labels.votes, ...votes)] : []),
      ];
    };
    // Three filters over the one list of laws: level, in force and subject. The list is the
    // long-list box beside the chosen law's page (the Nov 8 mock); the filters read the law rows.
    const fw = labels.issueFilter;
    const order = Object.keys(labels.issueGroups ?? {});
    const byName = (a, b) =>
      policyLabel(a.series).localeCompare(policyLabel(b.series));
    if (!v.law.length) return [prose(labels.noIssues, "record-empty")];
    const subjectKeys = [
      ...new Set(v.law.map((law) => groupOf(law.series))),
    ].sort((a, b) => order.indexOf(a) - order.indexOf(b));
    const levelWord = (level) =>
      (fw.levels?.[level] ?? words(level)).replaceAll(
        "{level}",
        v.homeState?.levelWord ?? "",
      );
    const choices = {
      level: levelChoices(v.law).map((key) => [key, levelWord(key)]),
      force: [
        ["in", fw.inForce],
        ["not", fw.notInForce],
      ],
      subject: subjectKeys.map((key) => [
        key,
        labels.issueGroups?.[key] ?? words(key),
      ]),
    };
    const draw = (list) => {
      const laws = filterLaws(v.law, issueFilter, groupOf).sort(byName);
      list.replaceChildren(
        ...(laws.length
          ? rosterScreen({
              title: controls.titles.issues,
              className: "issues-laws",
              groups: [
                {
                  entries: laws.map((law) => ({
                    key: law.series,
                    label: policyLabel(law.series),
                    aside: valueText(law) ?? "",
                    data: { series: law.series },
                    law,
                  })),
                },
              ],
              render: (lawEntry) => lawPage(lawEntry.law),
            })
          : [prose(fw.none, "record-empty")]),
      );
    };
    return [
      issueFilterScreen({
        words: fw,
        choices,
        state: issueFilter,
        draw,
      }),
    ];
  },
};
// Screens shown as tabs across the top of one menu screen.
const groups = {
  politics: [
    "government",
    "office",
    "campaigns",
    "campaign",
    "parties",
    "issues",
    "bills",
    "budgets",
    "metrics",
  ],
  who: ["who", "jobs", "history"],
  // Dev mode's Watch has the Calendar's sheet to itself, as a second tab.
  calendar: ["calendar", "watch"],
};
const groupOf = (tab) =>
  Object.entries(groups).find(([, tabs]) => tabs.includes(tab))?.[0] ?? tab;
async function openSheet(tab) {
  await controlsReady;
  if (tab === "politics") tab = "government";
  openTab = tab;
  if (tab !== "news") newsShowing = null;
  if (tab === "news") markNews(true);
  if (tab === "journal")
    document
      .querySelector('#rings [data-tab="journal"]')
      ?.classList.remove("unread");
  show("tip", false);
  const group = groupOf(tab);
  const politics =
    group === "politics"
      ? await api(`/api/government?id=${encodeURIComponent(me.id)}`)
      : { seats: [], filings: [], ofVotingAge: false };
  // A slower request for an earlier sheet must not put its tabs over the one opened since.
  if (openTab !== tab) return;
  const holdsOffice =
    politics.holdsOffice ||
    politics.seats.some((s) => s.holder?.personId === me.id);
  for (const b of document.querySelectorAll("[data-tab]"))
    b.classList.toggle("active", b.dataset.tab === group);
  $("sheet-title").textContent = controls.titles[group];
  // The tabs of the sheet's group that are the player's business today; a
  // group with one tab left (the Calendar outside dev mode) shows no tab row.
  const tabNames = (groups[group] ?? []).filter(
    (name) =>
      (name !== "office" || holdsOffice) &&
      (name !== "watch" || devModeOn()) &&
      // Budgets wait until they are the player's business: an office, a
      // filing, or the age to vote.
      (name !== "campaign" || politics.filings.length > 0) &&
      (name !== "budgets" ||
        holdsOffice ||
        politics.filings.length > 0 ||
        politics.ofVotingAge),
  );
  // The sheet's tabs on the one tab bar (ui/tab.mjs).
  $("sheet-tabs").replaceChildren(
    ...(tabNames.length > 1
      ? [
          tabBar({
            tabs: tabNames.map((name) => ({
              key: name,
              label: controls.titles[name],
              onSelect: () => openSheet(name),
            })),
            active: tab,
          }),
        ]
      : []),
  );
  const body = await sheets[tab]();
  // A slower, earlier request must not reopen a sheet closed meanwhile.
  if (openTab !== tab) return;
  // A sheet opened from the title (Options, Patch notes) sits centered over the painting.
  $("sheet").classList.toggle(
    "options-sheet",
    tab === "options" || !$("front").hidden,
  );
  const character = groupOf(tab) === "who";
  // You carries its own bust (the approved strip screen). Jobs and study and
  // Your life are strip screens too: no full-body figure stands beside a menu
  // (owner, Nov 7: "let's just do the busts"; Nov 10: "start removing the people").
  $("sheet").classList.toggle(
    "strip-sheet",
    character ||
      tab === "budgets" ||
      tab === "metrics" ||
      tab === "journal" ||
      tab === "money" ||
      tab === "campaign" ||
      tab === "calendar" ||
      tab === "watch" ||
      tab === "news",
  );
  $("sheet-body").replaceChildren(...body);
  $("sheet-body").classList.remove("place-view", "compact", "tight");
  $("sheet-body").classList.toggle(
    "cols",
    tab !== "who" && tab !== "calendar" && body.length > 12,
  );
  // A screen is as tall as what it holds (owner, Oct 27: "so much dead space");
  // the calendar, the people web and two-column readers fill the window.
  // A screen that ends under its content fits; one that flows in columns or
  // lays its sections out in a grid (Politics, Budgets) takes the window.
  $("sheet").classList.toggle(
    "fits",
    !["calendar", "people", "news", "watch", "bills"].includes(tab) &&
      !$("sheet-body").classList.contains("cols") &&
      !$("sheet-body").querySelector(".screen-grid, .split-screen"),
  );
  show("sheet", true);
  $("game").classList.add("sheet-open");
  fitPagers($("sheet-body"));
}
/**
 * No menu scrolls (owner, Oct 29; Lane 4, path 11): once a sheet is on
 * screen, each pager in a part of it that runs past its foot (the sheet's
 * body, or a split screen's side or main) gives back a row at a time until
 * the part fits, the pager holds one row, or a row given back no longer
 * shortens the part (something else in it is the taller). A screen counts its rows from the
 * window; what sits above a pager (a tray of buttons, a long title) is only
 * known once drawn.
 */
function fitPagers(root) {
  // Again once late type and pictures have their size.
  document.fonts?.ready.then(() => fitPagersNow(root));
  for (const image of root.querySelectorAll("img"))
    if (!image.complete)
      image.addEventListener("load", () => fitPagersNow(root), { once: true });
  fitPagersNow(root);
}
function fitPagersNow(root, waits = 30) {
  window.requestAnimationFrame(() => {
    // A screen fitted as it is built waits for the sheet to mount it.
    if (!root.isConnected) {
      if (waits > 0) fitPagersNow(root, waits - 1);
      return;
    }
    const over = (node) => node && node.scrollHeight > node.clientHeight + 1;
    for (const box of root.querySelectorAll(".pager")) {
      if (!box.setRows) continue;
      const part = box.closest(".split-side, .split-main");
      // A screen that shares its sheet with dev panels is made shorter than its content; its own
      // overflow counts, so the pager gives rows up and nothing is drawn over a dev panel.
      const screen = box.closest(".split-screen");
      while (
        (over(part) || over(screen) || over($("sheet-body"))) &&
        box.rowCount() > 1
      ) {
        // A row given back only where it makes the part shorter: a list
        // beside a taller page (a race's page of candidates) keeps its rows.
        const tall = over(part)
          ? part
          : over(screen)
            ? screen
            : $("sheet-body");
        const before = tall.scrollHeight;
        box.setRows(box.rowCount() - 1);
        if (tall.scrollHeight < before) continue;
        box.setRows(box.rowCount() + 1);
        break;
      }
    }
    // A side still past its foot: its list of recent votes keeps the newest
    // that fit (at least one).
    for (const part of root.querySelectorAll(".split-side")) {
      const shown = () =>
        [...part.querySelectorAll(".vote-rows .dl")].filter((v) => !v.hidden);
      while (over(part) && shown().length > 1) shown().at(-1).hidden = true;
    }
  });
}
// The rail over the player card: a column of round icons, News among them; it is
// the one menu, Who you are among them, the Guide its own entry (owner, Oct 28,
// point 23: not a tab in Politics). The card under it shows only the date
// and time (owner, Oct 27: "the time and date on the bottom"; no second picture).
// The rail is named from the controls file, so it is mounted once that loads.
void controlsReady.then(() => {
  mountRail(
    $("rings"),
    [
      "who",
      "journal",
      "calendar",
      "money",
      "politics",
      "news",
      "people",
      "travel",
      "guide",
    ],
    controls.titles,
  );
  for (const b of document.querySelectorAll("[data-tab]"))
    b.addEventListener("click", () =>
      groupOf(openTab) === b.dataset.tab && b.classList.contains("ring")
        ? closeSheet()
        : openSheet(b.dataset.tab),
    );
});
function closeSheet() {
  openTab = undefined;
  newsShowing = null;
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

fitUiScale();
window.addEventListener("resize", fitUiScale);

// ---- New life ----
// The title screen: a national scene or event, full window, that moves on with
// each visit (owner, Oct 8 and Oct 14). Continue resumes the life in progress.
let titleLife = null;
// The painting drifts by CSS while the title is open; every few seconds the
// next scene of the day's rotation fades in over it.
function rotateTitle(scenes, seconds) {
  let at = 0;
  const next = $("backdrop-next");
  // The rotation runs only on the title menu itself: a creator panel keeps the
  // painting it opened on (owner, Oct 28: "the double background jump").
  const onTitleMenu = () => !$("front").hidden && !$("front-main").hidden;
  setInterval(() => {
    if (!onTitleMenu()) return;
    at = (at + 1) % scenes.length;
    next.src = scenes[at].backdrop.url;
    next.onload = () => {
      next.onload = null;
      next.classList.add("fading");
      setTimeout(() => {
        if (!onTitleMenu()) return next.classList.remove("fading");
        // One picture, one fade: both layers drift on the same clock, so the
        // base takes the new picture underneath and the top layer clears at once
        // (no second fade, no restarted zoom; owner, Nov 8 P1).
        const back = $("backdrop");
        const clear = () => {
          back.onload = null;
          next.style.transition = "none";
          next.classList.remove("fading");
          void next.offsetWidth;
          next.style.transition = "";
        };
        back.onload = clear;
        back.src = next.src;
        if (back.complete) clear();
      }, 3100);
    };
  }, seconds * 1000);
}
api("/api/title").then((title) => {
  if (!$("front").hidden) $("backdrop").src = title.backdrop.url;
  if (title.scenes?.length > 1) rotateTitle(title.scenes, title.rotateSeconds);
  titleLife = title.life;
  $("front-continue").disabled = !titleLife;
  // The mock (fr-title) offers Continue only for a life that exists, by that person's name.
  $("front-continue").hidden = !titleLife;
  void controlsReady.then(() => {
    $("front-continue").querySelector(".continue-text b").textContent = (
      controls.title?.continueAs ?? ""
    ).replace("{name}", titleLife?.name ?? "");
  });
  // The life's own face: the look the creator saved, as every other view of the player reads it.
  setFace("front-continue-bust", titleLife?.face);
  // New game's two choices, each under its busts (the mock's fr-new): someone
  // starting out, and three who hold office.
  $("new-start-busts").replaceChildren(
    ...(title.newGame?.start
      ? [drawFace(title.newGame.start, { shape: "bust", column: 210 })]
      : []),
  );
  $("new-advanced-busts").replaceChildren(
    ...(title.newGame?.advanced ?? []).map((face) =>
      drawFace(face, { shape: "bust", column: 132 }),
    ),
  );
});
$("front-continue").addEventListener("click", async () => {
  const life = titleLife;
  if (!life) return;
  me = {
    id: life.personId,
    placeName: life.placeName,
    date: life.date,
    minuteOfDay: life.minuteOfDay,
    names: {},
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
  if (opening?.home?.date === life.date)
    showNewsSurface(await nightsNews(life.personId));
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
// The world's settings, as the approved world screen draws them: a row of arrows over
// the figure each step means (owner, Nov 8: "the figure itself in each control"). The
// chosen step of each row is kept here; the server reads the settings it makes.
const worldStep = {};
function worldWords(row, value) {
  const w = controls.worldSettings;
  const words = (template, n) => template.replace("{n}", String(n));
  if (row.id === "population")
    return value === null ? w.real : words(w.people, count(value));
  if (row.id === "lean")
    return value === 0
      ? w.even
      : words(value < 0 ? w.left : w.right, Math.round(Math.abs(value) * 100));
  if (value === 1) return w.usual;
  const percent = Math.round(Math.abs(value - 1) * 100);
  return words(value > 1 ? w.more : w.less, percent);
}
const usualStep = (row) =>
  row.values.findIndex(
    (v) => v === null || v === 1 || (row.id === "lean" && v === 0),
  );
function count(n) {
  return new Intl.NumberFormat("en-US").format(n);
}
function drawWorldRows() {
  const holder = $("world-rows");
  if (!controls.worldSettings || !holder) return;
  holder.replaceChildren(
    ...controls.worldSettings.rows.map((row) => {
      worldStep[row.id] ??= usualStep(row);
      const at = worldStep[row.id];
      return lookRow(
        {
          id: `world-${row.id}`,
          label: row.label,
          value: worldWords(row, row.values[at]),
        },
        {
          onMove: (_id, by) => {
            worldStep[row.id] = Math.max(
              0,
              Math.min(row.values.length - 1, at + by),
            );
            drawWorldRows();
          },
          arrowLabel: (by, r) =>
            controls.creator[by < 0 ? "previous" : "next"].replace(
              "{row}",
              r.label.toLowerCase(),
            ),
        },
      );
    }),
  );
}
function worldSettings() {
  const chosen = {};
  for (const row of controls.worldSettings.rows) {
    const value = row.values[worldStep[row.id] ?? usualStep(row)];
    if (value !== null && value !== 1 && !(row.id === "lean" && value === 0))
      chosen[row.id] = value;
  }
  const pick = (ids) =>
    Object.fromEntries(
      ids
        .filter(([, id]) => chosen[id] !== undefined)
        .map(([key, id]) => [key, chosen[id]]),
    );
  const economy = pick([
    ["wages", "wages"],
    ["householdCash", "cash"],
    ["outsideDemand", "demand"],
  ]);
  const politics = pick([
    ["leanShift", "lean"],
    ["turnout", "turnout"],
  ]);
  const settings = {
    ...(chosen.population !== undefined
      ? { population: chosen.population }
      : {}),
    ...(Object.keys(economy).length ? { economy } : {}),
    ...(Object.keys(politics).length ? { politics } : {}),
  };
  return Object.keys(settings).length ? settings : undefined;
}
$("front-options").addEventListener("click", () => openSheet("options"));
$("front-saves").addEventListener("click", () => openSheet("saves"));
$("front-patch-notes").addEventListener("click", () => openSheet("patchNotes"));
// Dev mode is a setting in Options, off by default; its controls show while it is on.
onDevMode((dev) => {
  if (dev) $("talk-silent").before(gapButton);
  else gapButton.remove();
});
restoreDevMode();
restoreColorBlind();
if (devModeOn()) $("talk-silent").before(gapButton);
// New game: Custom world (the world's settings, then the creator), Start a
// life (the creator) or New world (straight in, a random person and place).
const FRONT_PANELS = [
  "front-main",
  "front-new",
  "front-advanced",
  "front-pick",
  "cr-screen",
];
/**
 * Where the close X on the front takes you from each panel: one level out. There is no Back
 * button on any menu (owner, Oct 28: "Remove every Continue and Back from every menu").
 */
const FRONT_OUT = {
  "front-new": () => frontPanel("front-main"),
  "front-advanced": () => frontPanel("front-new"),
  "front-pick": () => frontPanel("front-advanced"),
  "cr-screen": () => {
    // After a state is picked, out returns to the states (owner, Oct 28, point 5), then out of
    // the creator.
    if (setup.state) {
      setup.state = null;
      setup.town = null;
      $("cr-place-summary-name").textContent = "";
      void showStates();
      return;
    }
    frontPanel("front-new");
  },
};
document.getElementById("front-close")?.addEventListener("click", () => {
  const here = FRONT_PANELS.find((id) => !document.getElementById(id).hidden);
  FRONT_OUT[here]?.();
});
show("front-close", false);
function frontPanel(name) {
  for (const id of FRONT_PANELS) show(id, id === name);
  // The close X is on every front panel but the title menu itself.
  show("front-close", name !== "front-main" && name !== null);
  // Each panel is named for what it is (the Nov 8 front mock), not by the game's name.
  const title = document.querySelector("#front > .title");
  if (title && controls.frontTitles?.[name])
    title.textContent = controls.frontTitles[name];
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
  placeDraws: 0,
  recipe: null,
  initial: null,
  previous: [],
  // The creator's open tab of clothes and the look last shown, so a tab flips at once.
  lookTab: "everyday",
  lookView: null,
};
/** A record value as the player reads it: an ISO date in words, else as kept. */
function dateOrValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? dateWords(value) : value;
}
$("cr-month").replaceChildren(
  ...optionsOf(MONTH_NAMES.map((name, i) => ({ value: i + 1, label: name }))),
);
function fillDays() {
  const month = Number($("cr-month").value);
  const length = new Date(Date.UTC(2001, month, 0)).getUTCDate();
  const keep = Number($("cr-day").value) || 1;
  $("cr-day").replaceChildren(
    ...optionsOf(
      Array.from({ length }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
      })),
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
    ...optionsOf(years.map((row) => ({ value: row.year, label: row.label }))),
  );
  const nearest = years.reduce(
    (best, row) =>
      Math.abs(row.year - want) < Math.abs(best.year - want) ? row : best,
    years[0],
  );
  $("cr-year").value = String(nearest.year);
}
$("cr-month").addEventListener("change", async () => {
  fillDays();
  await fillYears();
});
$("cr-day").addEventListener("change", () => fillYears());
/** A filled field drops its missing mark and the line at the bottom. */
function filledIn() {
  for (const group of document.querySelectorAll("#cr-screen .missing"))
    group.classList.remove("missing");
  $("front-status").textContent = "";
}
for (const id of ["cr-given", "cr-family"])
  $(id).addEventListener("input", filledIn);
function pickGender(g) {
  setup.gender = g;
  filledIn();
  for (const b of document.querySelectorAll("[data-gender]")) {
    const on = b.dataset.gender === g;
    b.setAttribute("aria-pressed", String(on));
  }
  void openLook();
}
for (const b of document.querySelectorAll("[data-gender]"))
  b.addEventListener("click", () => pickGender(b.dataset.gender));
$("cr-random-name").addEventListener("click", async () => {
  // A name is drawn for a gender (owner, Nov 1); with none chosen yet the gender field flashes
  // as missing instead of the button saying what it waits for (the Nov 8 creator mock).
  if (!setup.gender) {
    document
      .querySelector("[data-gender]")
      ?.closest(".group")
      ?.classList.add("missing");
    return;
  }
  setup.nameDraws++;
  const name = await api(
    `/api/creator/name?${new URLSearchParams({ seed: setup.seed, draw: setup.nameDraws, gender: setup.gender ?? "" })}`,
  );
  $("cr-given").value = name.givenName;
  $("cr-family").value = name.familyName;
  filledIn();
  nameFigure();
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
  if (!$("cr-year").options.length) await randomBirthday();
  await controlsReady;
  frontPanel("cr-screen");
  void showStates();
  // A bust stands in the creator from its first frame, before a gender is chosen.
  void openLook();
}
$("new-life").addEventListener("click", () => frontPanel("front-new"));
$("new-advanced").addEventListener("click", () => {
  drawWorldRows();
  frontPanel("front-advanced");
});
$("new-start").addEventListener("click", () => void openCreator());
$("new-world").addEventListener("click", () => startLife({ custom: true }));
$("advanced-build").addEventListener(
  "click",
  () => void startLife({ custom: true, pick: true }),
);
// Begin names what is still missing and marks it, until it is filled (owner, Oct 28: "It
// should flash red, or say what is missing at the bottom").
function missingForBegin() {
  const given = $("cr-given").value.trim();
  const family = $("cr-family").value.trim();
  if (!setup.gender)
    return { group: "gender-choices", text: controls.creator.missingGender };
  if (!given || !family)
    return { group: "creator-name", text: controls.creator.missingName };
  if (!setup.town)
    return {
      group: "creator-stage-place",
      text: controls.creator.missingPlace,
    };
  return null;
}
function nameFigure() {
  $("cr-figure-name").textContent =
    `${$("cr-given").value.trim()} ${$("cr-family").value.trim()}`.trim();
}
for (const id of ["cr-given", "cr-family"])
  $(id).addEventListener("input", nameFigure);

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
    `/api/creator/towns?${new URLSearchParams({ state: setup.state.key, q: $("cr-town-search").value, seed: setup.seed })}`,
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
          showPlaceName();
          filledIn();
        },
      ),
    ),
  );
}
$("cr-town-search").addEventListener("input", () => void listTowns());
// Random place: the world's own draw of a state and town from all 56, then
// on to the look, as picking the town does (owner, Oct 28: "Add a Random
// button to picking where you live").
$("cr-place-random").addEventListener("click", async () => {
  setup.placeDraws++;
  const { state, town } = await api(
    `/api/creator/place?${new URLSearchParams({ seed: setup.seed, draw: setup.placeDraws })}`,
  );
  setup.state = state;
  setup.town = town;
  $("cr-state-name").textContent = state.name;
  showPlaceName();
  filledIn();
  await showStates();
});

// Character appearance: the look's bust (the one every screen will draw) and
// a row with arrows for each thing a bust shows. Below the rows both tabs
// share, two tabs of clothes (owner, Nov 12: "two tabs, everyday and formal,
// bust flips between them"): the bust wears the open tab's clothes.
function showLook(view) {
  setup.recipe = view.recipe;
  setup.lookView = view;
  const tab = setup.lookTab;
  $("cr-bust").replaceChildren(
    drawFace(view.faces[tab], { shape: "bust", column: 250 }),
  );
  const row = (r) =>
    lookRow(r, {
      onMove: (id, by) => void moveLook(id, by),
      arrowLabel: (by, it) =>
        controls.creator[by < 0 ? "previous" : "next"].replace(
          "{row}",
          it.label.toLowerCase(),
        ),
    });
  const tabs = Object.entries(controls.creator.lookTabs).filter(([key]) =>
    view.rows.some((r) => r.tab === key),
  );
  $("cr-rows").replaceChildren(
    ...view.rows.filter((r) => !r.tab).map(row),
    ...(tabs.length
      ? [
          tabBar({
            attr: "lookTab",
            className: "look-tabs",
            active: tab,
            tabs: tabs.map(([key, label]) => ({
              key,
              label,
              onSelect: () => {
                setup.lookTab = key;
                showLook(setup.lookView);
              },
            })),
          }),
        ]
      : []),
    ...view.rows.filter((r) => r.tab === tab).map(row),
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
}
/** The place chosen or drawn, named at the top of Where I'm from. */
function showPlaceName() {
  // A town record's name may already carry its state ("Pewaukee, Wisconsin").
  $("cr-place-summary-name").textContent = setup.town.name.includes(
    setup.state.name,
  )
    ? setup.town.name
    : `${setup.town.name}, ${setup.state.name}`;
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
$("cr-begin").addEventListener("click", () => {
  const missing = missingForBegin();
  if (missing) {
    $("front-status").textContent = missing.text;
    document
      .querySelector(`[data-testid="${missing.group}"]`)
      .classList.add("missing");
    return;
  }
  void startLife({
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
  });
});
const placeControls = ["new-world", "advanced-build", "cr-begin"];

/** Advanced start: everyone who holds an office in the built world, to play as. */
async function offerPlayAs(life) {
  const holders = await api("/api/advanced/officeholders");
  const labels = controls.advanced;
  const list = $("pick-list");
  let chosen = null;
  const choose = async (holder) => {
    chosen = holder;
    draw();
    const { face } = await api(
      `/api/advanced/officeholder-face?id=${encodeURIComponent(holder.personId)}`,
    );
    if (chosen !== holder) return;
    $("pick-detail").replaceChildren(
      playAsDetail(holder, {
        face,
        labels,
        levels: controls.levels,
        onPlay: () => void enterAs(life, holder.personId),
      }),
    );
  };
  const draw = () => {
    const found = holders.filter((h) =>
      `${h.name} ${h.title} ${h.government}`
        .toLowerCase()
        .includes($("pick-search").value.trim().toLowerCase()),
    );
    list.replaceChildren(
      ...playAsList(found.slice(0, 200), {
        levels: controls.levels,
        selected: chosen?.personId,
        onSelect: (holder) => void choose(holder),
      }),
      ...(found.length === 0 ? [noteLine(labels.none)] : []),
    );
  };
  $("pick-search").oninput = draw;
  $("pick-detail").replaceChildren();
  draw();
  show("front-status", false);
  document.querySelector("#front .progress").hidden = true;
  frontPanel("front-pick");
  for (const id of placeControls) $(id).disabled = false;
}
async function enterAs(life, personId) {
  frontPanel(null);
  const value = await post(`/api/play?id=${encodeURIComponent(personId)}`);
  me = {
    id: value.personId,
    placeName: life.placeName,
    date: life.date,
    names: life.names,
  };
  show("front", false);
  for (const id of ["rings", "card"]) show(id, true);
  $("game").classList.add("in-play");
  renderPacket(value.packet);
  await refresh();
}

/**
 * Loading worth watching (Lane 4, path 3): while the first scene is drawn,
 * the world just built tells its past. A year counter runs through the
 * years of your life; each year writes its lines of your story into the
 * journal and prints the headlines you heard that year; the state's map
 * fills in county by county, your districts last. Everything comes from the
 * built world's records (/api/newlife/story, loading.ts). A click, or the
 * end of the years, finishes it. Resolves when it is done.
 */
function playLoadingStory(story) {
  const panel = $("loading-story");
  const years = story?.years ?? [];
  if (!years.length) return Promise.resolve();
  const journal = $("loading-journal");
  journal.replaceChildren();
  show("loading-story", true);
  // About six seconds in all, at most seven tenths of a second a year.
  const step = Math.min(700, 6000 / years.length);
  return new Promise((resolve) => {
    let at = 0;
    let shown = years[0].year;
    let timer;
    const finish = () => {
      window.clearTimeout(timer);
      panel.removeEventListener("click", finish);
      $("loading-year").textContent = String(years.at(-1).year);
      resolve();
    };
    panel.addEventListener("click", finish);
    const next = () => {
      if (at >= years.length) return finish();
      const year = years[at];
      // The counter runs up to the year, a year at a time.
      if (shown < year.year) {
        shown += 1;
        $("loading-year").textContent = String(shown);
        timer = window.setTimeout(next, Math.min(80, step / 4));
        return;
      }
      $("loading-year").textContent = String(year.year);
      journal.append(
        ...year.lines.map((row) => prose(row.text, "loading-line")),
        ...year.headlines.map((row) => prose(row.headline, "loading-headline")),
      );
      at += 1;
      timer = window.setTimeout(next, step);
    };
    next();
  });
}

async function startLife({ custom = false, pick = false, placeKey, person }) {
  for (const id of placeControls) $(id).disabled = true;
  // The loading card: the panel holds only the progress over the scene.
  frontPanel(null);
  // The creator already names the town: the card carries that name from the first step.
  const chosenName = placeKey
    ? $("cr-place-summary-name").textContent.trim()
    : "";
  if (chosenName)
    document.querySelector("#front > .title").textContent = chosenName;
  show("front-status", true);
  const bar = document.querySelector("#front .progress");
  bar.hidden = false;
  bar.firstElementChild.style.width = "0";
  try {
    const settings = custom ? worldSettings() : undefined;
    // Outside Custom world, a fresh seed draws the world.
    const seed = custom
      ? $("seed").value
      : setup.seed || (await api("/api/seed")).seed;
    // Real progress through every step, from the server's build.
    // The server builds the world in twelve steps (BuildStage in world.ts); a step is named
    // while it runs and the bar fills one twelfth for each step finished.
    const STEPS = [
      "people",
      "past",
      "economy",
      "core",
      "government",
      "elections",
      "budgets",
      "legislature",
      "cabinet",
      "workings",
      "history",
      "opening",
    ];
    // A poll still in flight when the build ends leaves the line alone.
    let built = false;
    // The world's story plays once the world exists (playLoadingStory).
    let playback = null;
    const playStory = () =>
      (playback ??= api("/api/newlife/story")
        .catch(() => null)
        .then((story) => playLoadingStory(story)));
    const poll = setInterval(async () => {
      const p = await api("/api/newlife/progress").catch(() => undefined);
      if (p?.story) playStory();
      if (!p || built) return;
      // The step in plain words, and a bar that shows how many steps are done; no counts.
      const at =
        p.stage === "done" ? STEPS.length : Math.max(STEPS.indexOf(p.stage), 0);
      bar.firstElementChild.style.width = `${Math.round((at / STEPS.length) * 100)}%`;
      $("front-status").textContent = controls.loading?.[p.stage] ?? "";
    }, 400);
    let life;
    try {
      life = await post(
        `/api/newlife?${new URLSearchParams({ seed, date: $("date").value, ...(placeKey ? { placeKey } : {}), ...(person ? { person: JSON.stringify(person) } : {}), ...(settings ? { settings: JSON.stringify(settings) } : {}) })}`,
      );
    } finally {
      clearInterval(poll);
      built = true;
      // Built: the bar is full and no "Ready" line is left behind.
      bar.firstElementChild.style.width = "100%";
      $("front-status").textContent = "";
    }
    // The loading card is named for the place the world is built around (fr-loading).
    const loadingTitle = document.querySelector("#front > .title");
    if (loadingTitle && life.placeName)
      loadingTitle.textContent = life.placeName;
    // The story plays to its end (or a click) before the life opens.
    await playStory();
    show("loading-story", false);
    // Advanced: the world is built; choose whom to play, with no address.
    if (pick) {
      await offerPlayAs(life);
      return;
    }
    const opening = await api(
      `/api/opening?id=${encodeURIComponent(life.personId)}`,
    );
    me = {
      id: life.personId,
      placeName: life.placeName,
      date: life.date,
      names: life.names,
    };
    show("front", false);
    if (opening?.home) me.minuteOfDay = opening.home.minuteOfDay;
    // Home that evening (the server's rule for the opening day), with the
    // night's news to pick up, then the first choices pointed out.
    for (const id of ["rings", "card"]) show(id, true);
    $("game").classList.add("in-play");
    renderPacket(life.packet);
    await refresh({ keepBackdrop: Boolean(life.sceneMomentId) });
    const news = await nightsNews(life.personId);
    // The scene the director staged for the evening (the address) plays first
    // and sets the one backdrop the opening loads. The night's news pops up
    // after it opens, so it waits until the speech ends (C5; owner, Nov 7:
    // "News pop-ups wait until the scene ends").
    if (life.sceneMomentId) await showStory(life.sceneMomentId);
    showNewsSurface(news);
  } catch (error) {
    bar.hidden = true;
    $("front-status").textContent = error.message;
    for (const id of placeControls) $(id).disabled = false;
    frontPanel(person ? "cr-screen" : "front-new");
  }
}
