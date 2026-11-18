// A speech heard on television (owner, Nov 17: "A broadcast speech gets a TV
// graphic"): the speaker's bust on a set with Live over it and the station under
// their name. The bust is the shared strip of busts (ui/bust-strip.mjs) with one
// person; nothing here draws a face of its own.
import { el } from "./dom.mjs";
import { bustStrip } from "./bust-strip.mjs";

/** The set's contents: `live` is the word over it; `speaker` is { personId, name, face }; `station` goes under the name. */
export function tvSet({ live, speaker, station, onClick }) {
  return [
    el("span", { className: "tv-live", textContent: live }),
    bustStrip({
      people: [{ ...speaker, role: station }],
      speakingId: speaker.personId,
      onClick,
    }),
  ];
}
