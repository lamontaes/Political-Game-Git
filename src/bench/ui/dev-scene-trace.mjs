/* global document */
// Dev mode's scene trace (src/bench/dev-views/scene-trace.ts), drawn in the Calendar sheet's dev
// panels: every scene type with the way dev mode can cause it, the scenes staged for the player with
// their cause and why each person is placed, the register's tie class for every line a scene can
// say, and the director's board for a day (every candidate, the gate that cut it or its score and
// reads, the pick and the life's room). Words are the view's labels; ids open in the Trace box.
import { traceBox } from "./dev-trace-box.mjs";

function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

const number = (value, digits = 3) =>
  Number.isInteger(value) ? String(value) : value.toFixed(digits);

/** A link that opens a record id in the trace box. */
function idLink(id, open) {
  const link = el("button", id, "link small");
  link.type = "button";
  link.addEventListener("click", () => void open(id));
  return link;
}

/** One candidate the board weighed: a stored moment and its cards, with its offers beside it. */
function boardRow(row, words, open) {
  const board = row.board;
  const verdict = board.picked
    ? words.picked
    : row.outcome !== "journal-line" && !board.cut
      ? words.staged
      : `${words.notPicked}${board.cut ? `: ${words.cuts[board.cut] ?? board.cut}` : ""}`;
  const item = el(
    "li",
    `${words.candidate} · ${verdict} · ${words.felt} ${number(board.score)}${board.own ? ` · ${words.own}` : ""}`,
    "dev-board-row",
  );
  item.dataset.picked = String(board.picked === true);
  if (row.cause) {
    const cause = el("div", `${words.cause}: ${row.cause.label} `);
    cause.append(idLink(row.cause.id, open));
    item.append(cause);
  }
  for (const card of board.cards)
    item.append(
      el(
        "div",
        `${words.card}: ${card.typeKey}${card.cut ? ` · ${words.cuts[card.cut] ?? card.cut}` : ""}`,
        "dev-board-card",
      ),
    );
  const reads = Object.entries(board.reads)
    .map(([key, value]) => `${words.readNames[key] ?? key} ${number(value)}`)
    .join(", ");
  if (reads) item.append(el("div", `${words.reads}: ${reads}`));
  if (board.readIds?.length) {
    const ids = el("div", `${words.readRecords}: `);
    for (const id of board.readIds) ids.append(idLink(id, open), " ");
    item.append(ids);
  }
  for (const offer of board.offers ?? []) {
    const line = el(
      "div",
      `${words.offered}: ${offer.typeKey} · ${words.felt} ${number(offer.score)} · ${words.cuts[offer.cut] ?? offer.cut} · `,
      "dev-board-offer",
    );
    line.append(idLink(offer.causeId, open));
    item.append(line);
  }
  return item;
}

function roomLine(room, words) {
  if (!room) return el("p", words.noRoom);
  return el(
    "p",
    `${words.room}: ${words.pace} ${number(room.pace, 2)}, ${words.standing} ${number(room.standing, 2)}, ${words.picks} ${room.picks}: ${words.left} ${number(room.left, 2)}`,
    "dev-board-room",
  );
}

/** The director's board for a day: `show(date)` redraws it for any day. */
function boardSection({ labels, send }) {
  const words = labels.board;
  const trace = traceBox(words.trace);
  const box = el("details", undefined, "dev-scene-board");
  box.append(el("summary", words.title));
  const date = document.createElement("input");
  date.type = "date";
  const button = el("button", words.show);
  button.type = "button";
  const body = el("div");
  const show = async (day) => {
    let answer;
    try {
      answer = await send(
        `scene-trace/board${day ? `?date=${encodeURIComponent(day)}` : ""}`,
      );
    } catch (error) {
      body.replaceChildren(el("p", error.message));
      return;
    }
    date.value = answer.date;
    body.replaceChildren(
      roomLine(answer.room, words),
      answer.rows.length
        ? (() => {
            const list = el("ul");
            for (const row of answer.rows)
              list.append(boardRow(row, words, trace.open));
            return list;
          })()
        : el("p", words.nothing),
    );
  };
  button.addEventListener("click", () => void show(date.value));
  const pick = el("label", `${words.day} `);
  pick.append(date);
  box.append(pick, button, body, trace.node);
  return { node: box, show };
}

async function types({ labels, send }, board) {
  const { types: rows, unreachable } = await send("scene-trace/types");
  const box = el("details", undefined, "dev-scene-types");
  box.append(el("summary", `${labels.types} (${rows.length})`));
  if (unreachable.length)
    box.append(el("p", `${labels.unreachable}: ${unreachable.join(", ")}`));
  const list = el("ul");
  for (const row of rows) {
    const item = el(
      "li",
      `${row.key}: staged ${row.staged}${row.lastStaged ? `, last ${row.lastStaged}` : ""}${row.heldBack ? `, held back ${row.heldBack}` : ""}; lines ${row.lines}${row.unreached ? `, unreached ${row.unreached}` : ""}`,
    );
    if (row.forceable) {
      const button = el("button", labels.force);
      button.type = "button";
      button.addEventListener("click", async () => {
        button.disabled = true;
        try {
          const done = await send("scene-trace/force", { typeKey: row.key });
          // A recipe that could not run here says why; the board names its verdict; a staged scene names the record it came from.
          if (done.why) button.textContent = labels.reasons[done.why];
          else if (done.board) {
            const verdict = `${labels.board.verdicts[done.board.verdict]}${done.board.reason ? `: ${labels.board.cuts[done.board.reason] ?? done.board.reason}` : ""}`;
            button.textContent = `${labels.forced}; ${verdict}`;
            if (done.board.date) {
              await board.show(done.board.date);
              board.node.open = true;
            }
          } else
            button.textContent =
              done.staged === undefined
                ? labels.forced
                : `${labels.forced}; ${done.staged ? labels.stagedNow : labels.notStagedNow}${done.staged && done.causeRecords?.length ? `; ${labels.cause} ${done.causeRecords.join(", ")}` : ""}`;
        } catch (error) {
          button.textContent = error.message;
        }
      });
      item.append(" ", button);
      if (row.why) item.append(el("div", labels.reasons[row.why]));
      if (row.recipe === "legislature")
        item.append(el("div", labels.legislature));
    } else item.append(` (${labels.unreachable})`);
    const more = el("details");
    more.append(el("summary", labels.lines));
    more.addEventListener(
      "toggle",
      async () => {
        const lines = await send(
          `scene-trace/lines?type=${encodeURIComponent(row.key)}`,
        );
        const body = el("ul");
        for (const line of lines)
          body.append(
            el(
              "li",
              `${line.text} [${labels.ties[line.tie]}${line.requires.length ? `; ${labels.needs}: ${line.requires.join(", ")}` : ""}${line.reach === "unreached" ? `; ${labels.reach}: no` : ""}${line.held ? `; ${labels.heldByRule}` : ""}] ${line.key}`,
            ),
          );
        more.append(body);
      },
      { once: true },
    );
    item.append(more);
    list.append(item);
  }
  box.append(list);
  return box;
}

async function moments({ labels, send }) {
  const rows = await send("scene-trace/moments");
  const box = el("details", undefined, "dev-scene-moments");
  box.append(el("summary", `${labels.moments} (${rows.length})`));
  const list = el("ul");
  for (const row of rows) {
    const item = el(
      "li",
      `${row.date} ${row.outcome}${row.closed ? ` (${row.closed})` : ""}: ${labels.cause} ${row.cause ? `${row.cause.kind} ${row.cause.id}` : "none"}`,
    );
    for (const held of row.heldBack)
      item.append(
        el("div", `${labels.held}: ${held.typeKey} (${held.reason})`),
      );
    for (const scene of row.scenes) {
      item.append(
        el(
          "div",
          `${scene.typeKey}: ${labels.setting} ${scene.setting.kind} ${scene.setting.recordId}; ${labels.placed}: ${scene.placed.map((p) => `${p.name} (${p.why})`).join(", ")}`,
        ),
      );
    }
    list.append(item);
  }
  box.append(list);
  return box;
}

export const slots = {
  /** The Calendar sheet's dev panels, after Run, Scene and Campaign. */
  async calendar(context) {
    const box = el("section", undefined, "dev-scene-trace");
    box.append(el("h4", context.labels.title));
    const board = boardSection(context);
    box.append(await types(context, board), await moments(context), board.node);
    await board.show("");
    return box;
  },
};
