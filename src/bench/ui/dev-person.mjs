/* global fetch */
// Dev mode's person controls, a section on a person's card: have them fall seriously ill (the
// health module's own onset, so the death, the estate, the news and the funeral follow in their own
// time) and run the world until they die. Control names and record data only.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { statusLine } from "./fields.mjs";
import { stripSection } from "./strips.mjs";
import { followBar } from "./dev-view.mjs";

async function get(path) {
  const response = await fetch(`/api/dev/${path}`);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

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
export async function devPersonSection({ personId, labels, onDone }) {
  const offered = await get(`offers?personId=${encodeURIComponent(personId)}`);
  const result = statusLine();
  const button = (label, testid, work) => {
    const node = makeButton({ className: "action small" }, label);
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
    // Follow them: from then on each act of theirs keeps every option's reasons. It decides
    // nothing and spends no time; someone in the player's circle is already kept.
    followBar({
      load: () => get(`following?personId=${encodeURIComponent(personId)}`),
      onToggle: async (view, draw) => {
        draw(
          await post(view.status === "dev-mode" ? "unfollow" : "follow", {
            personId,
          }),
        );
      },
    }),
    el(
      "div",
      { className: "acts" },
      button(labels.fallIll, "dev-ill", async () => {
        await post("illness", { personId });
        return labels.ill;
      }),
      button(labels.layOff, "dev-layoff", async () => {
        const out = await post("layoff", { personId });
        // A worker who played today is booked for the next day before their shift.
        return out.bookedFor
          ? labels.layoffBooked.replace(
              "{date}",
              new Date(`${out.bookedFor}T00:00:00Z`).toLocaleDateString(
                "en-US",
                {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  timeZone: "UTC",
                },
              ),
            )
          : labels.laidOff;
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
    // What the game offers them today, and only that: a pick is the choice they make at their next
    // decision, through the same chooser, and shows here as picked until it is made.
    el("h4", { className: "label", textContent: labels.decide }),
    el(
      "div",
      { className: "acts" },
      ...offered.offers.map((offer) => {
        const node = makeButton(
          { className: "action small" },
          [offer.actionId, offer.targetName].filter(Boolean).join(" · "),
        );
        node.dataset.testid = "dev-offer";
        node.setAttribute(
          "aria-pressed",
          String(offer.key === offered.pending),
        );
        node.addEventListener("click", async () => {
          node.disabled = true;
          try {
            await post("choose", { personId, key: offer.key });
            for (const other of node.parentNode.querySelectorAll(
              '[data-testid="dev-offer"].on',
            ))
              other.classList.remove("on");
            node.classList.add("on");
            // A pick changes nothing on any screen until the person decides, so nothing is redrawn.
            result.textContent = labels.picked;
          } catch (error) {
            result.textContent = error.message;
          } finally {
            node.disabled = false;
          }
        });
        return node;
      }),
    ),
  );
}
