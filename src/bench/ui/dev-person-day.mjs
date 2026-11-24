// Dev mode's Day view (dev-views/person-day.ts): a person's day so far, as the work clock holds
// it. Hours at work, the office's hours and the record they come from, free time spent and hours
// left. On a person's card for that person, and on the Calendar for the player. Control names and
// record data only.
import { el } from "./dom.mjs";

const hours = (minutes) => `${Math.round((minutes / 60) * 10) / 10}`;

function dayNode(day, labels) {
  const line = (label, value) =>
    el(
      "div",
      { className: "dev-run-row" },
      el("span", { textContent: `${label}: ${value}` }),
    );
  return el(
    "section",
    { className: "dev-only dev-person-day" },
    el("h3", { textContent: labels.title }),
    ...(day
      ? [
          line(labels.atWork, hours(day.workMinutes)),
          ...(day.office
            ? [
                line(
                  labels.office,
                  `${day.office.hours} · ${day.office.sourceId}`,
                ),
              ]
            : []),
          line(labels.free, hours(day.freeTimeMinutes)),
          line(labels.left, `${Math.round(day.hoursLeft * 10) / 10}`),
        ]
      : [line(labels.nobody, "")]),
  );
}

export const slots = {
  async person({ personId, labels, send }) {
    return dayNode(
      await send(`person-day?id=${encodeURIComponent(personId)}`),
      labels,
    );
  },
  async calendar({ labels, send }) {
    return dayNode(await send("person-day"), labels);
  },
};
