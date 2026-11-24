// Dev mode's Focus view on a person's card (dev-views/person-focus.ts): whether the person
// chooses every day and why, by the one daily-focus rule, with the last day they and the player
// were together and the days the rule allows. Control names and record data only.
import { el } from "./dom.mjs";

export const slots = {
  async person({ personId, labels, send }) {
    const focus = await send(`person-focus?id=${encodeURIComponent(personId)}`);
    if (!focus) return null;
    const line = (text) =>
      el(
        "div",
        { className: "dev-run-row" },
        el("span", { textContent: text }),
      );
    return el(
      "section",
      { className: "dev-only dev-person-focus" },
      el("h3", { textContent: labels.title }),
      line(
        focus.because
          ? `${labels.daily}: ${labels[focus.because]}`
          : labels.paced,
      ),
      ...(focus.inPlayerCircle ? [line(labels.circle)] : []),
      ...(focus.lastTogether
        ? [
            line(
              `${labels.together}: ${focus.lastTogether} (${focus.daysSinceTogether} / ${focus.daysAllowed})`,
            ),
          ]
        : []),
      ...(focus.lastOnTie ? [line(`${labels.talk}: ${focus.lastOnTie}`)] : []),
    );
  },
};
