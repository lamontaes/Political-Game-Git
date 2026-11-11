/* global fetch */
// Dev mode's Scenes panel, on the Calendar beside Run until: every situation type the director
// stages, under what dev mode can do for it (bring it about now, run the world until its cause
// record comes, or nothing yet). Control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { select, statusLine } from "./fields.mjs";

/** One state's row of kind buttons, named by its state for the checks. */
function stateRow(state, buttons) {
  const row = el("div", { className: "acts" }, ...buttons);
  row.dataset.state = state;
  return row;
}

async function send(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: input ? "POST" : "GET",
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The last result line, kept across the sheet's redraws. */
let lastResult = "";
/** The kind picked, kept across redraws too. */
let lastType = "";

/**
 * The panel. `labels` is controls.devScene; `wordOf(kind)` says a setting kind in words;
 * `onDone()` refreshes the game's screens.
 */
export async function devScenePanel({ labels, wordOf, onDone }) {
  const scenes = await send("scenes");
  // Every kind, under the one of three headings that says what dev mode can do for it (the
  // engines' own records decide it, `scenes()`): bring it about now, run the world until its
  // cause record comes, or nothing yet. No line under any button (owner, Nov 8, 2:15 a.m.: no
  // subtexts); a kind nothing can start is listed and cannot be picked.
  const STATES = ["plays", "waits", "none"];
  const startable = scenes.filter((row) => row.state !== "none");
  let chosen =
    startable.find((row) => row.key === lastType)?.key ?? startable[0]?.key;
  const buttons = [];
  const groups = STATES.map((state) => {
    const rows = scenes
      .filter((row) => row.state === state)
      .sort((a, b) => a.key.localeCompare(b.key));
    const own = rows.map((row) => {
      const b = makeButton({
        className: "action small",
        textContent: row.key,
      });
      b.dataset.scene = row.key;
      b.dataset.state = state;
      b.disabled = state === "none";
      b.setAttribute("aria-pressed", String(row.key === chosen));
      b.addEventListener("click", () => {
        chosen = row.key;
        for (const other of buttons)
          other.setAttribute(
            "aria-pressed",
            String(other.dataset.scene === chosen),
          );
      });
      buttons.push(b);
      return b;
    });
    return rows.length
      ? [
          el("h4", {
            textContent: `${labels.states[state]} (${rows.length})`,
          }),
          stateRow(state, own),
        ]
      : [];
  }).flat();
  // Who the scene is for, who is mourned (a death scene) and where it is set, from the director's own
  // records (GET /api/dev/scene-cast); each starts on "any", which leaves the choice to the director.
  const pick = { forId: "", mournedId: "", where: "" };
  const pickers = el("div", { className: "dev-scene-cast" });
  const drawPickers = async () => {
    pick.forId = pick.mournedId = pick.where = "";
    let cast = null;
    try {
      cast = await send(`scene-cast?typeKey=${encodeURIComponent(chosen)}`);
    } catch {
      cast = null;
    }
    const field = (label, options, key, redraw) =>
      select({
        label,
        name: key,
        value: "",
        options: [{ value: "", label: `${label}: ${labels.any}` }, ...options],
        onChange: (value) => {
          pick[key] = value;
          if (redraw) {
            // Who is mourned depends on who the scene is for: that pick starts over.
            pick.mournedId = "";
            draw();
          }
        },
      });
    const draw = () => {
      const kept = pick.forId;
      pickers.replaceChildren(
        ...(cast
          ? [
              field(
                labels.forPicker,
                cast.for.map((p) => ({ value: p.id, label: p.name })),
                "forId",
                true,
              ),
              ...(cast.mourned
                ? [
                    field(
                      labels.mourning,
                      (
                        cast.mourned[kept] ?? Object.values(cast.mourned).flat()
                      ).map((p) => ({ value: p.id, label: p.name })),
                      "mournedId",
                    ),
                  ]
                : []),
              ...(cast.where.length
                ? [
                    field(
                      labels.where,
                      cast.where.map((kind) => ({
                        value: kind,
                        label: wordOf(kind),
                      })),
                      "where",
                    ),
                  ]
                : []),
            ]
          : []),
      );
      const forBox = pickers.querySelector('[name="forId"]');
      if (forBox) forBox.value = kept;
    };
    draw();
  };
  for (const b of buttons)
    b.addEventListener("click", () => void drawPickers());
  await drawPickers();
  const result = statusLine();
  result.textContent = lastResult;
  const make = makeButton({ className: "action" }, labels.make);
  make.dataset.testid = "dev-scene";
  make.addEventListener("click", async () => {
    make.disabled = true;
    result.textContent = "";
    try {
      lastType = chosen;
      const out = await send("scene", {
        typeKey: chosen,
        ...(pick.forId ? { forId: pick.forId } : {}),
        ...(pick.mournedId ? { mournedId: pick.mournedId } : {}),
        ...(pick.where ? { where: pick.where } : {}),
      });
      // A run that waited says which record came and when, or that it never came in the days run.
      const record = out.causeRecords[0] ?? "";
      lastResult = out.ran
        ? (out.ran.reason === "cap" ? labels.neverCame : labels.came)
            .replace("{record}", record)
            .replace("{days}", String(out.ran.days))
        : [labels.begun, out.personId, ...out.causeRecords].join(" · ");
      result.textContent = lastResult;
      await onDone();
    } catch (error) {
      lastResult = error.message;
      result.textContent = lastResult;
    } finally {
      make.disabled = false;
    }
  });
  return el(
    "section",
    { className: "dev-only dev-scene" },
    el("h3", { textContent: labels.title }),
    ...groups,
    pickers,
    el("div", { className: "acts" }, make),
    result,
  );
}
