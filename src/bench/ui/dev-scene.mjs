/* global fetch */
// Dev mode's Scenes panel, on the Calendar beside Run until: every situation type the director
// stages, with the cause it waits on. A type whose cause the game can bring about is forced through
// that code (today a death a person in your circle will hear of); the rest are listed as having no
// game code to attach to. Control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { statusLine } from "./fields.mjs";

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

/** The panel. `labels` is controls.devScene; `onDone()` refreshes the game's screens. */
export async function devScenePanel({ labels, onDone }) {
  const scenes = await send("scenes");
  // The ones brought about directly first, then those that run the world until they happen, then the rest.
  const rank = (row) => ({ death: 0, layoff: 1, wait: 2 })[row.recipe] ?? 3;
  // Only a scene the game can bring about is offered, by its name alone: a kind nothing can
  // start stays off, and no line explains the rest (owner, Nov 8, 2:15 a.m.: no subtexts).
  const offered = [...scenes]
    .filter((row) => row.recipe)
    .sort((a, b) => rank(a) - rank(b));
  let chosen =
    offered.find((row) => row.key === lastType)?.key ?? offered[0]?.key;
  // One button per scene, the chosen one lit (mock fr-dev-scene).
  const buttons = offered.map((row) => {
    const b = makeButton({ className: "action small", textContent: row.key });
    b.dataset.scene = row.key;
    b.setAttribute("aria-pressed", String(row.key === chosen));
    b.addEventListener("click", () => {
      chosen = row.key;
      for (const other of buttons)
        other.setAttribute(
          "aria-pressed",
          String(other.dataset.scene === chosen),
        );
    });
    return b;
  });
  const result = statusLine();
  result.textContent = lastResult;
  const make = makeButton({ className: "action" }, labels.make);
  make.dataset.testid = "dev-scene";
  make.addEventListener("click", async () => {
    make.disabled = true;
    result.textContent = "";
    try {
      lastType = chosen;
      const out = await send("scene", { typeKey: chosen });
      lastResult = [labels.begun, out.personId, ...out.causeRecords].join(
        " · ",
      );
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
    el("div", { className: "acts" }, ...buttons),
    el("div", { className: "acts" }, make),
    result,
  );
}
