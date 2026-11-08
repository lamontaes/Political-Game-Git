/* global fetch */
// Dev mode's person controls, a section on a person's card: have them fall seriously ill (the
// health module's own onset, so the death, the estate, the news and the funeral follow in their own
// time) and run the world until they die. Control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { statusLine } from "./fields.mjs";
import { stripSection } from "./strips.mjs";

async function post(path, input) {
  const response = await fetch(`/api/dev/${path}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The section. `labels` is controls.devPerson; `onDone()` refreshes the game's screens. */
export function devPersonSection({ personId, labels, onDone }) {
  const result = statusLine();
  const button = (label, testid, work) => {
    const node = makeButton({ className: "action" }, label);
    node.dataset.testid = testid;
    node.addEventListener("click", async () => {
      node.disabled = true;
      result.textContent = "";
      try {
        result.textContent = await work();
        await onDone();
      } catch (error) {
        result.textContent = error.message;
      } finally {
        node.disabled = false;
      }
    });
    return node;
  };
  return stripSection(
    7,
    labels.title,
    el(
      "div",
      { className: "dev-bills-row" },
      button(labels.fallIll, "dev-ill", async () => {
        await post("illness", { personId });
        return labels.ill;
      }),
      button(labels.runUntilDies, "dev-until-dies", async () => {
        const ran = await post("run-until", {
          event: "death",
          person: personId,
          cap: 366,
        });
        return [labels.reasons[ran.reason], `${ran.days}`, ...ran.records].join(
          " · ",
        );
      }),
    ),
    result,
  );
}
