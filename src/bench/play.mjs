/* global document, fetch, URLSearchParams, setTimeout, setInterval, clearInterval, window, localStorage, ResizeObserver, __RELEASE_VERSION__ */
// The game screen on the new core: one scene, the player card, the menus.
// Words on screen are record data, engine text and control names only.
import { makeButton, mountPagers, buttonRow } from "./ui/button.mjs";
import { fillChoiceMenu } from "./ui/menu.mjs";
import {
  talkLine,
  talkReply,
  fillTalk,
  talkControls,
  addTalkLine,
  mountTalkKeys,
  mountSpeakers,
} from "./ui/talk-box.mjs";
import { showToast, hideToast } from "./ui/toast.mjs";
import { mountRail } from "./ui/rail.mjs";
import { makeTab, tabBar } from "./ui/tab.mjs";
import { makeCard } from "./ui/card.mjs";
import { townRow } from "./ui/town-row.mjs";
import { debateCard, speechCard } from "./ui/campaign-acts.mjs";
import {
  listRow,
  personRow,
  factRow,
  noteLine,
  withNotes,
} from "./ui/list-row.mjs";
import { pageIn, pageWhenChanged, menuPages, pagerWords } from "./ui/pager.mjs";
import { fillArtwork } from "./ui/picture.mjs";
import { barChart } from "./ui/chart.mjs";
import {
  select,
  checkboxSetting,
  optionsOf,
  statusLine,
  numberBox,
} from "./ui/fields.mjs";
import { lookRow } from "./ui/look-row.mjs";
import { termWord } from "./ui/term.mjs";
import { recordScreen } from "./ui/screen.mjs";
import { headshot } from "./ui/headshot.mjs";
import { listScreen } from "./ui/list-screen.mjs";
import { roomPeople, clockLines } from "./ui/room.mjs";
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
import { peopleWeb } from "./ui/people-web.mjs";
import { billPaper } from "./ui/bill-paper.mjs";
import { bold, line, prose, heading, labeled, smallText } from "./ui/text.mjs";
import {
  newspaperScreen,
  engraveMasthead,
  readerBody,
  readerMore,
  sameFor,
} from "./ui/newspaper.mjs";
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
  $(id).replaceChildren(...(face ? [headshot(face)] : []));
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

function drawPeople(people, onClick) {
  $("people").replaceChildren(
    ...roomPeople(people, {
      selfId: me?.id,
      backdropUrl: $("backdrop").src,
      onClick,
    }),
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
/** The night's paper: the news engine's stories the player heard, newest first. */
async function nightsNews(personId) {
  const rows = await api(`/api/news?id=${encodeURIComponent(personId)}`);
  const stories = rows
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
  engraveMasthead($("news-reader-masthead"), outlet);
  $("news-reader-date").textContent = dateWords(me.date, { weekday: true });
  $("news-reader").className = `panel paper paper-${
    ["broadsheet", "modern", "tabloid", "weekly"].includes(outlet.layout)
      ? outlet.layout
      : "broadsheet"
  }`;
  $("news-reader-headline").textContent = storyHeadline(lead);
  $("news-reader-body").replaceChildren(
    ...readerBody({ lead, address: news.address, photo: storyPhoto(lead) }),
  );
  $("news-reader-more").replaceChildren(...readerMore(rest.map(storyHeadline)));
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
// The government whose budget the Budgets tab shows, once the player picks one.
let budgetGovernment;
// The level and the other state the Government tab shows, once the player picks them.
let governmentLevel;
let governmentState = "";
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
// Money amounts are kept in cents; "minor/hour" reads as dollars an hour.
// A percent reads with its sign, any other unit in words.
const amount = (value, unit) => {
  if (unit?.startsWith("minor"))
    return `${moneyWords(Number(value))}${unit.includes("/") ? `/${unit.split("/")[1]}` : ""}`;
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
  pagerWords(controls.politics);
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
  return makeCard(
    "race",
    {},
    heading(
      [item.title, item.number, item.sponsor].filter(Boolean).join(" · "),
    ),
    item.remarks.length
      ? line(
          item.remarks
            .map(
              (r) =>
                `${r.name} · ${r.position > 0 ? (words.for ?? "") : (words.against ?? "")}`,
            )
            .join(" · "),
        )
      : "",
    item.votes.length
      ? line(
          item.votes.map((v) => `${v.name} ${words[v.vote] ?? ""}`).join(" · "),
        )
      : "",
    onPaper || buttons.length
      ? buttonRow(...(onPaper ? [paperButton()] : []), ...buttons)
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
      setClock(day.at);
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
        ...step.lines.map((line) => prose(line.text)),
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
              ...night.nation.lines.map((line) => prose(line.text)),
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
          return makeCard(
            "race",
            {},
            heading(contest.title),
            buttonRow(
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
  setFace("talk-bust", null);
  show("talk-who", Boolean(name));
  if (!personId) return;
  const c = await api(
    `/api/known?${new URLSearchParams({ id: me.id, other: personId })}`,
  ).catch(() => undefined);
  if (!c || $("talk-name").textContent !== (name ?? "")) return;
  setFace("talk-bust", c.face);
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
// The narration of the scene that opened this talk, kept above its lines.
let talkSetting = [];
function renderTalk(value) {
  if (value?.otherId !== talk?.otherId) lying = false;
  talk = value;
  show("talk", Boolean(value));
  gapButton.classList.remove("marked");
  if (!value) {
    talkSetting = [];
    return;
  }
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
    lines: [...talkSetting, ...spokenLines(value.lines, (line) => line.text)],
    replies: replies(choices, (choice) => sayLine(choice.key)),
  });
  // Dim when there is nothing false to say; tipped and red while lying.
  setScales({ available: lies.length > 0, on: lying });
}
async function sayLine(key) {
  lying = false;
  renderTalk(await post(`/api/talk/say?key=${encodeURIComponent(key)}`));
}
async function talkTo(otherId, momentId, setting = []) {
  // The menu hides the conversation, so a conversation closes it first.
  closeSheet();
  lying = false;
  talkSetting = setting;
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
            talkLine({ kind: "speech narration", text: line.text }),
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
      dateWords(seat.electionDate),
      seat.holder ? `${counter.heldBy} ${seat.holder}` : counter.openSeat,
    ].join(" · ");
  };
  const choices = value.visit.choices
    .filter((c) => !(asMenu && c.action.kind === "pick"))
    .slice(0, 6);
  const buttons = replies(choices, choose);
  choices.forEach((choice, i) => {
    if (choice.action.kind !== "pick") return;
    buttons[i].append(smallText(factsOf(choice), "reply-facts"));
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
      talkReply({}, counter.chooseRace, () => show("race-menu", true)),
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
        `${dateOrValue(check.actual ?? "")}${check.required ? ` / ${dateOrValue(check.required)}` : ""}${check.metOn ? ` · ${controls.filing?.metOn ?? ""} ${dateWords(check.metOn)}` : ""}`,
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
        bold(policyLabel(question)),
        select({
          name: question,
          options: [
            { value: "", label: controls.filing?.noStance ?? "" },
            { value: "1", label: controls.filing?.for ?? "" },
            { value: "-1", label: controls.filing?.against ?? "" },
          ],
        }),
      ),
    ),
  );
  $("filing-party").replaceChildren(
    ...optionsOf([
      { value: "", label: controls.filing?.noStance ?? "" },
      ...overlay.parties.map((name) => ({
        value: name,
        label: name,
        selected: name === overlay.party,
      })),
    ]),
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
  // A block of its own: each race is a row under the title, not squeezed beside it.
  const block = makeCard(
    "race local-races",
    {},
    line(date ? `${labels.title} · ${dateWords(date)}` : labels.title, "label"),
  );
  if (!races.length) block.append(line(labels.noBallot, "label"));
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
          : `${labels.filingCloses} ${dateWords(race.filingDeadline)}`,
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
        result.doorsKnocked
          ? controls.campaignResults.doors.replace("{n}", result.doorsKnocked)
          : "",
        result.reached
          ? controls.campaignResults.reached.replace("{n}", result.reached)
          : "",
        result.raisedMinor ? moneyWords(result.raisedMinor) : "",
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
            ? `${controls.campaignActs[kind] ?? ""}: ${result.contacted} · ${Object.entries(
                result.answers,
              )
                .map(([k, n]) => `${plain(k) ?? ""} ${n}`)
                .join(" · ")}`
            : result.reached !== undefined
              ? `${controls.campaignActs[kind] ?? ""}: ${result.reached} · +${result.warmer} · −${result.cooler}`
              : `${controls.campaignActs[kind] ?? ""}: ${result.answers.filter((a) => a.yes || a.givenMinor > 0).length} / ${result.answers.length}${result.answers.some((a) => a.givenMinor) ? ` · ${moneyWords(result.answers.reduce((t, a) => t + (a.givenMinor ?? 0), 0))}` : ""}`;
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
    rows.push(
      listRow(
        "campaign",
        {},
        bold(
          [
            contest?.title,
            contest ? dateWords(contest.electionDate) : null,
            controls.filing?.status?.[filing.status] ?? "",
          ]
            .filter(Boolean)
            .join(" · "),
        ),
        `${controls.campaignResults.raised.replace("{amount}", moneyWords(campaign.raisedMinor))} · ${controls.campaignResults.spent.replace("{amount}", moneyWords(campaign.spentMinor))} · ${volunteerCount(campaign.volunteers)} · ${controls.campaignResults.doors.replace("{n}", campaign.doors)}`,
        buttonRow(
          ...(outings ?? []).map((choice) => {
            // A grayed outing says why, from the records.
            const why = choice.why
              ? (controls.campaignUnavailable[choice.why.key] ?? "")
                  .replace("{price}", moneyWords(choice.why.priceMinor ?? 0))
                  .replace("{cash}", moneyWords(choice.why.cashMinor ?? 0))
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
        buttonRow(
          button(controls.campaignActs.volunteer, "volunteer"),
          button(controls.campaignActs.donation, "donation"),
          button(controls.campaignActs.endorsement, "endorsement"),
          button(controls.campaignActs.ad, "ad", { amountMinor: "5000" }),
          button(controls.campaignActs.poll, "poll", {
            sampleSize: String(pollSample),
          }),
        ),
        // The player's own money into the campaign: the amount is theirs to set.
        (() => {
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
          return buttonRow(dollarsIn, give);
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
        bold(controls.raceStanding.title),
        ...(standing ?? []).map((text) => listRow("", { textContent: text })),
        campaignResult ? line(campaignResult) : "",
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
  drawPeople(story.people);
  show("talk", true);
  show("talk-who", false);
  $("talk-name").textContent = "";
  // A scene with a purpose is its own exchange; any other opens a talk.
  // The narrator sets the scene and the person speaks at once beneath it:
  // no step between them (owner, Oct 27: clicking a person starts the talk).
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
    setWho(story.speech.speakerId, story.names[story.speech.speakerId]);
    talkControls({ silent: false, leave: false });
    fillTalk({
      lines: [
        ...setting,
        talkLine({ kind: "speech", text: story.speech.text }),
      ],
      replies: [],
    });
    setScales({ available: false });
    return;
  }
  if (withId) {
    if (story.talk) playExchange(story, setting);
    else await talkTo(withId, momentId, setting);
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
function playExchange(story, setting = []) {
  const { talk } = story;
  setWho(talk.askerId, story.names[talk.askerId]);
  const said = [...talk.opening];
  const lineOf = (line) =>
    talkLine({
      kind: line.role === "asked" ? "history" : "speech",
      who: line.role === "asked" ? $("card-name").textContent : undefined,
      text: line.text,
      held: line.held,
      ...gradeOf(line, story.momentId),
    });
  // The path is the index of each reply chosen, from the first.
  // The asker follows up: no walking away mid-exchange, no silence as a reply.
  talkControls({ silent: false, leave: false });
  const play = (node, path) => {
    said.push(...node.lines, ...(node.end?.close ? [node.end.close] : []));
    fillTalk({ lines: [...setting, ...said.slice(-4).map(lineOf)] });
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
            fillTalk({
              lines: [...setting, ...said.slice(-4).map(lineOf)],
              replies: [],
            });
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
  fillArtwork($("person-media"), {
    portraitUrl:
      c.presentation?.portraitUrl !== undefined
        ? c.presentation.portraitUrl
        : (c.figureUrl ?? person.figureUrl),
    backgroundUrl: c.presentation?.backgroundUrl,
    name: c.name,
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
  // What they are like, said of them, first (the screens designer, Oct 27).
  $("person-facts").replaceChildren(
    ...recordScreen({
      lede: c.sketch,
      sections: [
        c.work && {
          title: labels.work,
          items: [
            { text: c.work.title ?? "", tone: "feature" },
            { text: c.work.employer ?? "" },
          ],
        },
        c.school && { title: labels.school, items: [{ text: c.school.name }] },
        c.placeName && { title: labels.place, items: [{ text: c.placeName }] },
        // What the two share, by the records the director's scenes read too.
        c.shared?.length && {
          title: labels.together,
          items: c.shared.map((s) => {
            const line = row(labels.sharedWords?.[s.kind], s.name ?? "");
            line.dataset.record = s.recordId;
            return { node: line };
          }),
        },
        // The seats they reached before the start, from the government's history.
        c.seats?.length && {
          title: labels.seats,
          items: c.seats.map((s) => {
            const line = row(s.office, `${labels.since} ${s.year}`);
            line.dataset.record = s.recordId;
            return { node: line };
          }),
        },
        // An officeholder's colleagues in office, closest first, from their ties.
        c.colleagues && {
          title: labels.knows,
          items: c.colleagues.length
            ? c.colleagues.map((k) => {
                const line = row(
                  k.name,
                  `${k.office} · ${k.level < 0 ? labels.rival : (labels.tieWords?.[k.kind] ?? "")}`,
                );
                line.dataset.tie = k.recordId;
                return { node: line };
              })
            : [{ text: labels.noColleagues }],
        },
        // No "Last talked" (owner, Oct 27, 5 PM: never shown).
        known && {
          items: [
            row(labels.publicRecord.party, known.party),
            row(labels.publicRecord.since, dateOrValue(known.serviceStart)),
            row(labels.publicRecord.votes, known.votesOnRecord),
            row(labels.publicRecord.sponsored, known.lawsSponsored),
            row(labels.publicRecord.signed, known.lawsSigned),
            ...known.positions.map((p) =>
              row(
                policyLabel(p.question),
                p.position > 0 ? (stance.for ?? "") : (stance.against ?? ""),
              ),
            ),
          ].map((node) => ({ node })),
        },
      ].filter(Boolean),
    }),
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
  return [
    ...v.jobs.map((job) =>
      listRow(
        "campaign",
        { title: job.citation },
        bold(job.title),
        ` ${moneyWords(job.annualMinor)} ${words.aYear ?? ""}`,
        job.nextMeeting
          ? ` · ${words.nextMeeting ?? ""} ${dateWords(job.nextMeeting)}`
          : "",
      ),
    ),
    // An open town post you appoint: the people it could go to, best first; left on the official's own choice, the first stands.
    ...(v.heads ?? []).map((head) =>
      listRow(
        "campaign",
        { as: "label" },
        `${head.title} · ${words.nameHeadPick ?? ""} `,
        select({
          options: [
            { value: "", label: words.ownChoice ?? "" },
            ...head.candidates.map((c) => ({
              value: c.id,
              label: c.job ? `${c.name} · ${c.job}` : c.name,
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
    // The budget you may send now: the change to each line, in steps of its amount.
    ...(v.budget
      ? [
          listRow(
            "campaign",
            {},
            bold(controls.budgetEditor.title),
            ...v.budget.lines.map((row) =>
              labeled(
                `${row.name} ${moneyWords(row.amountMinor)}`,
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
          ),
        ]
      : []),
    // The deal to offer each colleague who votes on a bill of yours when you talk to them.
    ...(v.deals ?? []).map((bill) =>
      listRow(
        "campaign",
        {},
        bold(`${bill.number} · ${controls.deals.title}`),
        ...bill.colleagues.map((colleague) =>
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
      ),
    ),
    ...v.acts.map((a) =>
      row(
        `${dateWords(a.date)} · ${controls.actions?.[a.kind] ?? ""}`,
        `${a.detail}${a.how === "own-choice" ? ` · ${words.ownChoice ?? ""}` : ""}`,
      ),
    ),
  ];
}

// ---- The bill on paper: one document, every section clickable ----
/** The simulation's estimate beside a clicked section, every figure a record
 * the server read: the statute it amends with the values before and after,
 * the budget line and its amount, and the bill's own cost estimate. */
function billEstimate(paper, section) {
  const words = controls.bill ?? {};
  const est = section.estimate;
  const lines = [];
  const webCite =
    typeof est.statute === "string" && /^https?:\/\//.test(est.statute);
  if (est.statute && !webCite)
    lines.push(`${words.amends ?? ""} ${est.statute}`);
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
  if (before && after && !est.statute) lines.push(`${before} → ${after}`);
  else if (before && after)
    lines.push(
      webCite
        ? `${words.amends ?? ""} ${words.lawInForce ?? ""}: ${words.from ?? ""} ${before} ${words.to ?? ""} ${after}`
        : `${before} ${words.from ?? ""} ${after}`,
    );
  else if (after) lines.push(`${words.to ?? ""} ${after}`);
  if (est.line)
    lines.push(
      [
        `${words.line ?? ""}: ${policyLabel(`budget-line:${est.line}`)}`,
        est.lineAmountMinor != null ? moneyWords(est.lineAmountMinor) : null,
        est.ofMinor != null
          ? `${words.from ?? ""} ${moneyWords(est.ofMinor)}`
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
      paper.estimate.payMinor > 0 ? moneyWords(paper.estimate.payMinor) : null,
      paper.estimate.note,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  return { prose: section.text ?? paper.title, lines };
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
  show(
    backButton,
    billPaper({
      spoken: paper.spoken,
      title: paper.title,
      sponsor: `${words.sponsor ?? ""} ${paper.sponsor}`,
      sectionsLabel: words.sections ?? "",
      estimateLabel: words.estimate ?? "",
      blank: billEstimate(paper, { estimate: {} }),
      sections: paper.sections.map((section) => ({
        text: section.text ?? paper.title,
        estimate: billEstimate(paper, section),
      })),
      lines: [
        paper.effective,
        paper.floorDate
          ? `${floor.takenUp ?? ""} ${dateWords(paper.floorDate)}`
          : null,
        ...paper.whip.map(
          (count) =>
            `${count.chamber}: ${count.yes} ${floor.for ?? ""}, ${count.no} ${floor.against ?? ""}, ${count.undecided} ${floor.undecided ?? ""}`,
        ),
        ...(paper.votes.length
          ? [
              `${floor.voted ?? ""}: ${paper.tally.yes} ${floor.yes ?? ""}, ${paper.tally.no} ${floor.no ?? ""}`,
              paper.votes
                .map((x) => `${x.name} · ${meet[x.vote] ?? ""}`)
                .join(" · "),
            ]
          : []),
        paper.decision
          ? `${words.decided ?? ""}: ${floor.status?.[paper.decision.status] ?? ""}${paper.decision.passedOn ? ` · ${dateWords(paper.decision.passedOn)}` : ""}`
          : null,
      ],
    }),
  );
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
    // Every law area, one group each: its policies and budget lines. Money
    // is typed in dollars and kept in cents.
    const pick = select({
      options: (body.menus ?? []).map((menu) => ({
        group: menu.name,
        options: menu.items.map((item) => ({
          value: item.series
            ? `series:${item.series}`
            : item.question
              ? `question:${item.question}`
              : `line:${item.line}`,
          label: `${
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
          data:
            item.unit?.startsWith("minor") || item.line ? { cents: "1" } : {},
        })),
      })),
    });
    const value = numberBox({ value: 0 });
    const draft = makeButton({ textContent: controls.seat?.draft ?? "" });
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
        bold(body.title),
        body.members.map((m) => m.name).join(" · "),
        listRow("seat-draft", {}, pick, value, draft),
      ),
    );
  }
  const floor = controls.floor;
  for (const { bill, votes, tally, floorDate, whip } of v.bills)
    rows.push(
      listRow(
        "campaign",
        {},
        bold(`${bill.number} · ${floor.status[bill.status] ?? ""}`),
        // The floor: the day it is taken up, each chamber's count the day
        // before, and how the vote came out.
        ...(floorDate
          ? [line(`${floor.takenUp} ${dateWords(floorDate)}`, "floor-date")]
          : []),
        ...(bill.status === "drafted"
          ? whip.map((count) =>
              line(
                `${count.chamber}: ${count.yes} ${floor.for}, ${count.no} ${floor.against}, ${count.undecided} ${floor.undecided}`,
                "floor-whip",
              ),
            )
          : []),
        ...(votes.length
          ? [
              line(
                `${floor.voted}: ${tally.yes} ${floor.yes}, ${tally.no} ${floor.no}`,
                "floor-result",
              ),
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

/** The player's own picture: the look chosen in the creator, else their figure in the room. */
function portraitUrl() {
  return me.portrait
    ? `/api/portrait?id=${encodeURIComponent(me.id)}`
    : me.scene?.people.find((p) => p.personId === me.id)?.figureUrl;
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
      ...me.card.ties,
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
    // Who joined or left the player's five closest this year, each with the
    // record that changed the tie; one who left and is no longer among the
    // card's ties is still drawn, marked.
    const circle = me.card.circle ?? { joined: [], left: [] };
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
    return peopleWeb({
      people,
      household,
      change,
      self: {
        name: me.card.name,
        face: me.card.face,
        // The saved look, as the card and Who you are read it: not whatever room's figure.
        figureUrl: portraitUrl(),
      },
      inRoom: new Set((me.scene?.people ?? []).map((p) => p.personId)),
      labels,
      dateText: dateWords,
      onCard: (person) => {
        closeSheet();
        showPerson(person);
      },
      onTalk: (person) => {
        closeSheet();
        talkTo(person.personId);
      },
    });
  },
  async who() {
    const c = me.card;
    const labels = controls.who ?? {};
    const born = dateWords(c.birthDate);
    const views =
      c.views ??
      (c.view && controls.leanWords?.[c.view]
        ? [{ text: controls.leanWords[c.view] }]
        : []);
    // What you're like, in plain sentences, never the traits' names (owner, Oct 27);
    // the record sections side by side under it, as a character sheet.
    return recordScreen({
      heading: {
        name: c.name,
        meta: `${labels.age} ${c.age} · ${labels.born} ${born}`,
      },
      lede: c.sketch,
      grid: true,
      sections: [
        {
          title: c.age < 18 ? labels.householdHome : labels.home,
          items: [
            { text: c.home?.placeName ?? me.placeName },
            {
              people: (c.home?.members ?? []).map((member) => ({
                name: member.name,
                note: member.relation,
                onOpen: () => {
                  closeSheet();
                  showPerson(member);
                },
              })),
            },
          ],
        },
        c.job && {
          title: labels.work,
          items: [
            { text: c.job.title, tone: "feature" },
            { text: c.job.employer ?? "" },
          ],
        },
        c.schools?.length && {
          title: labels.school,
          items: [...c.schools].reverse().map((school) => ({
            text: school.name,
          })),
        },
        views.length && {
          title: labels.views,
          items: [
            {
              views: views.map((v) => ({
                label: v.label !== labels.views ? v.label : undefined,
                text: v.text,
              })),
            },
          ],
        },
        {
          title: labels.money,
          items: [{ text: moneyWords(c.liquidMinor), tone: "feature" }],
        },
      ].filter(Boolean),
    });
  },
  async money() {
    const [budget, bank] = await Promise.all([
      api(`/api/budget?id=${encodeURIComponent(me.id)}`),
      api(`/api/bank?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.money;
    const facts = (pairs) =>
      pairs.map(([label, value]) => ({ node: row(label, value) }));
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
    return recordScreen({
      grid: true,
      sections: [
        {
          title: labels.cash,
          items: [{ text: moneyWords(me.card.liquidMinor), tone: "title" }],
        },
        dwelling && {
          title: me.card.age < 18 ? labels.householdHome : labels.home,
          items: [
            dwelling.presentation?.imageUrl && {
              picture: dwelling.presentation.imageUrl,
            },
            { text: words(dwelling.kind ?? "") },
            ...facts([
              [
                labels.tenure,
                dwelling.tenure === "own" ? labels.owned : labels.rented,
              ],
              ...(dwelling.rentMinor !== undefined
                ? [
                    [
                      labels.rent,
                      `${moneyWords(dwelling.rentMinor)} ${labels.monthly}`,
                    ],
                  ]
                : []),
            ]),
          ],
        },
        bank?.cash?.months?.length && {
          title: labels.cashByMonth,
          items: facts(
            bank.cash.months.map((entry) => [
              monthWords(entry.date),
              moneyWords(entry.cashMinor),
            ]),
          ),
        },
        (bank?.spending?.length || bank?.loanPayments?.length) && {
          title: labels.lastMonth,
          items: facts([
            ...(bank.spending ?? []).map((line) => [
              named(labels.reasons, line.reasonKey),
              owedWords(line.paidMinor, line.requestedMinor),
            ]),
            ...(bank.loanPayments ?? []).map((payment) => [
              `${labels.loanPayments} · ${dateWords(payment.date, { year: false })}`,
              owedWords(payment.paidMinor, payment.dueMinor),
            ]),
          ]),
        },
        bank?.assets?.length && {
          title: labels.assets,
          items: facts(
            bank.assets.map((asset) => [
              asset.kind === "savings"
                ? `${labels.assetKinds.savings} · ${bank.name}`
                : labels.assetKinds[asset.kind],
              moneyWords(asset.valueMinor),
            ]),
          ),
        },
        bank?.debts?.length && {
          title: labels.debts,
          items: facts(
            bank.debts.map((debt) => [
              named(labels.debtKinds, debt.kind),
              debt.pastDueMinor > 0
                ? `${moneyWords(debt.owedMinor)} · ${moneyWords(debt.pastDueMinor)} ${labels.pastDue}`
                : moneyWords(debt.owedMinor),
            ]),
          ),
        },
        deductions.length && {
          title: labels.deductions,
          items: facts(
            deductions.map(([name, value]) => [words(name), moneyWords(value)]),
          ),
        },
      ].filter(Boolean),
    });
  },
  async jobs() {
    const labels = controls.jobs;
    const job = me.card.job;
    return recordScreen({
      sections: [
        {
          title: labels.work,
          items: job
            ? [
                job.presentation?.imageUrl && {
                  picture: job.presentation.imageUrl,
                },
                { text: job.title, tone: "title" },
                { text: job.employer ?? "", tone: "feature" },
                {
                  stats: [
                    [
                      labels.pay,
                      `${moneyWords(job.wageDailyMinor)} ${labels.daily}`,
                    ],
                    [
                      labels.hours,
                      `${job.hoursDaily.toFixed(1)} ${labels.daily}`,
                    ],
                  ],
                },
              ]
            : [{ text: labels.noJob, tone: "empty" }],
        },
        {
          title: labels.study,
          items: [...(me.card.schools ?? [])]
            .reverse()
            .map((s) => ({ fact: [s.date.slice(0, 4), s.name] })),
        },
      ],
    });
  },
  async journal() {
    const chapters = await api(`/api/journal?id=${encodeURIComponent(me.id)}`);
    // One story from birth, a paragraph to each turn of the life, with no
    // heading over any part of it (owner, Oct 27: "written like a story,
    // not individual sections... from birth"; "remove all those
    // subheadings").
    return recordScreen({
      sections: [
        {
          items: chapters.map((c) => ({
            text: c.lines.map((l) => l.text).join(" "),
            tone: "narrative",
          })),
        },
      ],
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
  async budgets() {
    const view = await api(`/api/budget?id=${encodeURIComponent(me.id)}`);
    const labels = controls.politics;
    // The town's own books open first; a place with no city government opens
    // on the county's, the local government that serves it.
    const town = ["city", "county"]
      .map((level) =>
        view.governments.find((g) => g.level === level && g.latest),
      )
      .find(Boolean);
    const chosen =
      view.governments.find((g) => g.id === budgetGovernment) ?? town;
    const pick = select({
      options: view.governments.map((g) => ({ value: g.id, label: g.name })),
      value: chosen?.id,
      label: labels.budget,
      onChange: (id) => {
        budgetGovernment = id;
        void openSheet("budgets");
      },
    });
    const gov = chosen ?? view.governments[0];
    if (!gov?.latest) return recordScreen({ controls: [pick], sections: [] });
    const latest = gov.latest;
    // What the treasury actually took in and paid out, from its journal,
    // beside the plan: a treasury gone wrong shows here.
    const books = gov.books;
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
    const chart = (label, lines, withSteps) => ({
      title: label,
      items: [
        {
          pages: [
            ...barChart(
              lines.map((r) => ({
                label: r.name ?? r.line,
                value: r.minor,
                steps: withSteps ? steps(r) : [],
              })),
              label,
              roundedMoney,
            ).children,
          ].map((node) => ({ node })),
          size: 6,
        },
      ],
    });
    return recordScreen({
      controls: [pick],
      grid: true,
      sections: [
        {
          title: `${gov.name} · ${latest.fiscalYear}`,
          wide: true,
          items: [
            {
              text: [
                `${labels.adopted} ${dateWords(latest.adoptedOn)}`,
                books
                  ? `${labels.booksSince} ${dateWords(books.since)}`
                  : labels.noBooks,
              ].join(" · "),
              tone: "small",
            },
            {
              stats: [
                [labels.revenue, latest.revenueMinor],
                [labels.spending, latest.spendingMinor],
                [labels.balance, latest.balanceMinor],
                ...(books
                  ? [
                      [labels.takenIn, books.takenInMinor],
                      [labels.paidOut, books.paidOutMinor],
                      [labels.cashOnHand, books.cashMinor],
                    ]
                  : []),
              ].map(([label, value]) => [label, roundedMoney(value)]),
            },
            books &&
              books.paidOutMinor > latest.spendingMinor && {
                text: labels.overBudget,
                tone: "warning",
              },
          ],
        },
        chart(labels.revenue, latest.revenue, false),
        chart(labels.spending, latest.spending, true),
      ],
    });
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
        onAdvance: (day) => {
          closeSheet();
          act(`/api/advance?mode=calendar&date=${day}`);
        },
      }),
    ];
  },
  async news() {
    // The nation, region and job numbers above the paper, from the economy's records.
    const e = await api(`/api/economy?id=${encodeURIComponent(me.id)}`);
    const pct = (value) => (value === undefined ? "" : `${value.toFixed(1)}%`);
    const econ = controls.news?.economy ?? {};
    // A region's series by its control name and unit; a series with no
    // control name is not shown.
    const count = new Intl.NumberFormat("en-US");
    const value = (unit, v) =>
      unit === "percent"
        ? `${v.toFixed(1)}%`
        : unit === "thousands"
          ? count.format(Math.round(v * 1000))
          : unit === "dollars"
            ? moneyWords(Math.round(v * 100))
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
    const labels = controls.news;
    // One feed, what you heard, newest first: News and the toast read the
    // news engine's same stories through storyHeadline.
    const { stories } = await nightsNews(me.id);
    const outlets = new Map();
    for (const story of stories) {
      const outlet = story.outlet ?? {
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
    return [
      ...economy,
      ...newspaperScreen({
        outlets,
        labels,
        date: me.date,
        headlineOf: storyHeadline,
        photoOf: storyPhoto,
      }),
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
    const next = government.nextFiling;
    return recordScreen({
      paged: true,
      sections: [
        ...["government", "issues", "parties", "campaigns"].map((tab) => ({
          title: controls.titles[tab],
          items: [{ text: labels[tab] }],
        })),
        {
          title: labels.runHere,
          items: next
            ? [
                { fact: [labels.race, next.title] },
                {
                  fact: [
                    labels.filesWith,
                    next.filedWith.replace(
                      /\s*\(counter: ([^)]*)\)/g,
                      `, ${labels.atTheDeskOf} $1`,
                    ),
                  ],
                },
                { fact: [labels.filingOpens, dateWords(next.filingOpens)] },
                {
                  fact: [labels.filingDeadline, dateWords(next.filingDeadline)],
                },
                deadlineTerm && { text: deadlineTerm.short, tone: "small" },
                next.primaryDate && {
                  fact: [labels.primary, dateWords(next.primaryDate)],
                },
                { fact: [labels.election, dateWords(next.electionDate)] },
                next.estimated && { text: labels.estimated, tone: "small" },
              ]
            : [{ text: labels.noRace }],
        },
      ],
    });
  },
  async guide() {
    return listScreen({
      search: {
        value: guideQuery,
        placeholder: controls.guide.search,
        onQuery: (query) => (guideQuery = query),
      },
      entries: async (query) => {
        const terms = await api(`/api/guide?q=${encodeURIComponent(query)}`);
        return terms.map((t) => ({
          title: t.term,
          lede: t.short,
          lines: [t.explanation, t.contextNote],
          opens: true,
          open: terms.length === 1,
        }));
      },
    });
  },
  async options() {
    await controlsReady;
    const labels = controls.options;
    let fullScreen;
    if (document.fullscreenEnabled) {
      const { line, box } = checkboxSetting({
        label: labels.fullScreen,
        checked: document.fullscreenElement,
        testid: "options-fullscreen",
      });
      const status = statusLine();
      box.addEventListener("change", async () => {
        box.disabled = true;
        status.textContent = "";
        try {
          if (box.checked) await document.documentElement.requestFullscreen();
          else await document.exitFullscreen();
        } catch {
          status.textContent = labels.fullScreenUnavailable;
        } finally {
          box.checked = Boolean(document.fullscreenElement);
          box.disabled = false;
        }
      });
      fullScreen = [{ node: line }, { node: status }];
    }
    return recordScreen({
      sections: [
        {
          items: [
            { fact: [labels.version, await displayVersion()] },
            ...(fullScreen ?? []),
            {
              actions: [
                { label: labels.continue, onClick: closeSheet },
                { label: labels.guide, onClick: () => openSheet("guide") },
                // Dev mode, for a developer's session only.
                {
                  label: labels.devMode,
                  className: "dev-only",
                  onClick: () => window.open("/dev"),
                },
                {
                  label: labels.quitToTitle,
                  testid: "quit-to-title",
                  onClick: () => window.location.reload(),
                },
              ],
            },
          ],
        },
      ],
    });
  },
  async travel() {
    const [places, government] = await Promise.all([
      api(`/api/goto?id=${encodeURIComponent(me.id)}`),
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.travel;
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
                  ? `${labels.reasons.action} ${(controls.actions?.[r.recordId] ?? "").toLowerCase()}`
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
    return listScreen({
      search: { placeholder: labels.search },
      layout: "cards",
      entries: (query) =>
        destinations
          .filter((p) =>
            p.name.toLowerCase().includes(query.trim().toLowerCase()),
          )
          .map((p) => ({
            title: p.name,
            picture: p.presentation?.imageUrl,
            lines: [hereLine(p)],
            note: reasonLine(p),
            label: `${labels.go}: ${p.name}`,
            onSelect: () =>
              p.filing ? openFiling(p.filedWith) : visit(p.organizationId),
            // The record behind the reason, for the specs; never shown as text.
            data: {
              reason: (p.filing
                ? [p.filedWith]
                : p.reasons.length
                  ? p.reasons.map((r) => r.recordId)
                  : [p.organizationId]
              ).join(" "),
            },
          })),
    });
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
    // The race you ran in opens first: its level, its office, its seat.
    const race = v.ownRace;
    // Which state's legislature the State view shows: the player's own, or any other.
    const { states } = await api(`/api/government/state?state=`);
    // A level or a state chosen redraws the sheet in place.
    const redraw = async () => {
      const nodes = await screen();
      if (openTab === "government") $("sheet-body").replaceChildren(...nodes);
    };
    const screen = async () => {
      const level = governmentLevel ?? race?.tier ?? "local";
      const otherState = level === "local" ? "" : governmentState;
      const picker = tabBar({
        attr: "level",
        className: "government-picker",
        active: level,
        tabs: ["local", "state", "federal"].map((key) => ({
          key,
          label: controls.levels?.[key] ?? words(key),
          onSelect: () => {
            governmentLevel = key;
            void redraw();
          },
        })),
      });
      if (level !== "local")
        picker.append(
          select({
            className: "government-state",
            label: labels.stateFilter,
            value: otherState,
            options: [
              { value: "", label: labels.ownState },
              ...states.map((st) => ({ value: st.key, label: st.name })),
            ],
            onChange: (state) => {
              governmentState = state;
              void redraw();
            },
          }),
        );
      const holderName = (s) =>
        s.holder
          ? `${s.holder.givenName} ${s.holder.familyName}`
          : labels.vacant;
      // The term as a voter would say it: when it ends, and how the holder won
      // it where the world ran the race.
      const member = (s) => {
        const line = s.holder?.personId
          ? personRow({
              name: holderName(s),
              party: s.holder.party,
              onOpen: () => {
                closeSheet();
                showPerson({ personId: s.holder.personId });
              },
            })
          : row(holderName(s), s.holder?.party ?? "");
        const won =
          s.holder && s.elections.find((e) => e.termId === s.holder.termId);
        const result = controls.results;
        // Years of service and how the holder won, from the term and the seat's
        // elections; who won the seat and has not taken it yet; your own race.
        return withNotes(
          line,
          s.holder
            ? [
                {
                  text: [
                    won
                      ? labels.electedWith
                          .replace("{date}", monthWords(won.date))
                          .replace("{share}", `${Math.round(won.share * 100)}%`)
                      : null,
                    s.holder.endDate
                      ? labels.termEnds.replace(
                          "{date}",
                          monthWords(s.holder.endDate),
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(". "),
                  // The record the line reads, for the specs; never shown as text.
                  data: {
                    term: s.holder.termId,
                    ...(won ? { election: won.termId } : {}),
                  },
                },
              ]
            : [],
          [
            s.elect && {
              variant: "elect",
              text: `${labels.elected} ${s.elect.name} · ${labels.takesOffice} ${dateWords(s.elect.takesOffice)}`,
              data: { contest: s.elect.contestId },
            },
            race &&
              s.seatId === race.seatId && {
                variant: "own-race",
                text: [
                  result.yourRace,
                  race.won ? result.won : result.lost,
                  `${result.you} ${race.votes.toLocaleString("en-US")}`,
                  race.rival
                    ? `${race.rival.name} ${race.rival.votes.toLocaleString("en-US")}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
                data: { contest: race.contestId, record: race.recordId },
              },
          ],
        );
      };
      let bodies;
      let start = 0;
      if (otherState) {
        // Another state's members at this level, its legislature or its members
        // of Congress: every sitting member, by chamber.
        const other = await api(
          `/api/government/state?${new URLSearchParams({ state: otherState, level })}`,
        );
        const chambers = new Map();
        for (const s of other.legislators) {
          if (!chambers.has(s.officeId)) chambers.set(s.officeId, []);
          chambers.get(s.officeId).push(s);
        }
        bodies = [...chambers.values()].map((seats) => ({
          title: seats[0].title,
          items: [
            { text: seats[0].government ?? "", tone: "place" },
            {
              pages: seats.map((s) => ({
                node: row(holderName(s), s.holder?.party ?? ""),
              })),
              size: 6,
            },
          ],
        }));
      } else {
        const offices = new Map();
        for (const s of v.seats.filter((s) => s.tier === level)) {
          if (!offices.has(s.officeId)) offices.set(s.officeId, []);
          offices.get(s.officeId).push(s);
        }
        start = Math.max(
          0,
          [...offices.values()].findIndex((seats) =>
            seats.some((s) => s.seatId === race?.seatId),
          ),
        );
        bodies = [...offices.values()].map((seats) => {
          const first = seats[0];
          const parties = v.partySeatsByOffice[first.officeId] ?? [];
          return {
            title: first.title,
            items: [
              { text: first.body ?? first.government ?? "", tone: "place" },
              first.presentation?.chamberUrl && {
                picture: first.presentation.chamberUrl,
              },
              parties.length && {
                node: barChart(
                  parties.map((p) => ({ label: p.party, value: p.seats })),
                  labels.seats,
                ),
              },
              {
                pages: seats.map((s) => ({ node: member(s) })),
                size: 6,
                start: seats.findIndex((s) => s.seatId === race?.seatId),
              },
              // Future public view records can supply these without changing the layout.
              ...(first.votes ?? []).flatMap((vote) => [
                { text: vote.title, tone: "subhead" },
                {
                  node: barChart(
                    [
                      { label: labels.yes, value: vote.yes },
                      { label: labels.no, value: vote.no },
                    ],
                    labels.votes,
                  ),
                },
              ]),
              ...(first.agenda ?? []).map((item) => ({
                node: row(item.date, item.title),
              })),
            ],
          };
        });
      }
      // The key people: the player's own members first, then the President,
      // the Vice President and each chamber's leader by post and chamber (a
      // leader from another state names the state they serve). Every other
      // member is behind the State and Federal filters.
      const keyLine = (k) => {
        const line = withNotes(
          k.post && !k.own
            ? row(`${words(k.post)}, ${k.chamber ?? k.officeTitle}`, k.name)
            : row(k.officeTitle, k.name),
          [
            k.own && k.post ? words(k.post) : null,
            k.stateName,
            // The President and Vice President a territory's voters do not choose.
            k.chosenByHere === false ? controls.politics.notChosenHere : null,
          ].map((text) => ({ text, className: "label" })),
        );
        // Play anyone: a resident officeholder can be taken over (bench only).
        if (k.resident && k.personId !== me.id) {
          const b = makeButton({
            className: "dev-only",
            textContent: controls.handoff?.play ?? "",
          });
          b.addEventListener("click", () => playAs(k.personId));
          line.append(b);
        }
        return line;
      };
      // The party the player belongs to, with the tie's record and how their
      // views fit it; the parties they could join otherwise. Never joined: files
      // unaffiliated.
      const party = v.party ? partyRows(v.party) : [];
      return recordScreen({
        controls: [picker],
        sections: [
          {
            wide: true,
            items: [
              {
                pages: bodies.map((body) => ({ section: body })),
                size: 1,
                start,
              },
            ],
          },
          ...[
            [labels.yourMembers, v.keyPeople.filter((k) => k.own)],
            [labels.leaders, v.keyPeople.filter((k) => !k.own)],
          ]
            .filter(([, rows]) => rows.length)
            .map(([title, rows]) => ({
              title,
              items: rows.map((k) => ({ node: keyLine(k) })),
            })),
          ...(party.length ? [{ items: party.map((node) => ({ node })) }] : []),
        ],
      });
    };
    return screen();
  },
  async parties() {
    const v = await api(`/api/government?id=${encodeURIComponent(me.id)}`);
    return recordScreen({
      grid: true,
      sections: v.parties.map(({ party, seats }) => ({
        title: party,
        items: [
          { total: [String(seats.length), controls.politics.seats] },
          {
            pages: seats.map((s) => ({ node: row(s.name, s.title) })),
            size: 6,
          },
        ],
      })),
    });
  },
  async issues() {
    const [v, changes] = await Promise.all([
      api(`/api/government?id=${encodeURIComponent(me.id)}`),
      api(`/api/changes?id=${encodeURIComponent(me.id)}`),
    ]);
    const labels = controls.politics;
    // A policy question's law reads yes or no; every other law, its amount.
    const lawText = (law, value, unit) =>
      law.yesNo ? (value ? labels.yes : labels.no) : amount(value, unit);
    return listScreen({
      search: { placeholder: labels.searchIssues },
      size: 4,
      labelOf: termLabel,
      entries: (query) =>
        v.law
          .filter((l) =>
            policyLabel(l.series).toLowerCase().includes(query.toLowerCase()),
          )
          .map((law) => ({
            title: policyLabel(law.series),
            value: law.text ?? lawText(law, law.value, law.unit),
            opens: true,
            facts: [
              // A level's law and when it took effect; a starting answer to a
              // question names its statute instead, as its research did not
              // record the day it took effect.
              ...law.levels
                .filter((l) => l.row)
                .map((level) => [
                  lawLevelLabel(law, level),
                  [
                    lawText(law, level.row.value, level.row.unit),
                    !law.yesNo || level.row.terms?.enactedBy
                      ? dateWords(level.row.effectiveDate)
                      : level.row.terms?.cite,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                ]),
              ...law.pending.map((pending) => [
                `${lawLevelLabel(law, pendingLevel(law, pending))} · ${dateWords(pending.effectiveDate)}`,
                lawText(law, pending.value, pending.unit),
              ]),
              ...[...changes.took, ...changes.ahead]
                .filter((c) => c.series === law.series)
                .map((change) => [
                  dateWords(change.date),
                  [change.measure, change.jurisdiction, change.what]
                    .filter(Boolean)
                    .join(" · "),
                ]),
              ...(law.votes ?? []).map((vote) => [
                vote.name,
                controls.meeting?.[vote.vote] ?? "",
              ]),
            ].map(([label, value]) => [label, plain(value)]),
          })),
    });
  },
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
  $("sheet-title").textContent = controls.titles[group];
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
          label: controls.titles[name],
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
  fillArtwork(
    $("sheet-media"),
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
    !["calendar", "people", "who"].includes(tab) &&
      !$("sheet-body").classList.contains("cols"),
  );
  show("sheet", true);
  $("game").classList.add("sheet-open");
}
pageWhenChanged($("sheet-body"), $("sheet-pager"));
pageWhenChanged($("ballot-races"), $("ballot-pager"));
// The rail over the player card: a column of round icons, News among them; it is
// the one menu, Who you are among them. The card under it shows only the date
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
  setFace("front-continue-bust", titleLife?.face);
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
/** A record value as the player reads it: an ISO date in words, else as kept. */
function dateOrValue(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? dateWords(value) : value;
}
const genderName = (g) =>
  document.querySelector(`[data-gender="${g}"]`)?.textContent ?? "";
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
          .replace("{date}", dateWords(setup.start))
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
    `${controls.creator.summaryAge.replace("{age}", chosenAge())} · ${genderName(setup.gender)}`;
  const pad = (n) => String(n).padStart(2, "0");
  $("cr-summary-born").textContent = controls.creator.summaryBorn.replace(
    "{date}",
    dateWords(
      `${$("cr-year").value}-${pad($("cr-month").value)}-${pad($("cr-day").value)}`,
    ),
  );
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
    ...view.rows.map((row) =>
      lookRow(row, {
        onPick: (id, swatch) => void pickColor(id, swatch),
        onMove: (id, by) => void moveLook(id, by),
        arrowLabel: (by, r) =>
          controls.creator[by < 0 ? "previous" : "next"].replace(
            "{row}",
            r.label.toLowerCase(),
          ),
      }),
    ),
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
      ...(found.length === 0 ? [noteLine(labels.none)] : []),
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
    const opening = await api(
      `/api/opening?id=${encodeURIComponent(life.personId)}`,
    );
    me = {
      id: life.personId,
      placeName: life.placeName,
      date: life.date,
      names: life.names,
      portrait: Boolean(person?.recipe),
    };
    show("front", false);
    if (opening?.home) me.minuteOfDay = opening.home.minuteOfDay;
    // Home that evening (the server's rule for the opening day), with the
    // night's news to pick up, then the first choices pointed out.
    for (const id of ["rings", "card"]) show(id, true);
    $("game").classList.add("in-play");
    renderPacket(life.packet);
    await refresh();
    showNewsSurface(await nightsNews(life.personId));
    // The scene the director staged for the evening (the address) plays first.
    if (life.sceneMomentId) await showStory(life.sceneMomentId);
    coachFirstChoices();
  } catch (error) {
    $("front-status").textContent = error.message;
    for (const id of placeControls) $(id).disabled = false;
    frontPanel(person ? "cr-look" : "front-new");
  } finally {
    document.querySelector("#front .progress").hidden = true;
  }
}
