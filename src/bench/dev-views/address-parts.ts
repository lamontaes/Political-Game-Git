/**
 * Dev mode's "Why each line of an address" (owner, Nov 16, 2026: dev mode must "trace and force
 * every scene to play... see why every scene played and why dialogue options were chosen"; every
 * line of dialogue or narration registered and traceable). For each address on the record, newest
 * first (the President's, a governor's, a town's): each sentence as it was said, the bank pieces it
 * was joined from with each piece's tie (the speaker's view, the place, the law in force, a record,
 * or how it is said), the facts its slots said, and the records those facts came from. Read from the
 * address's own record through the one function every view says it with (address-render.ts), so
 * what dev mode shows is what was said. Reads only; spends no time.
 */
import type { DevView } from "../dev-views";
import { ADDRESS_FACT } from "../../director/opening-facts";
import { saidOf, sentenceText } from "../../director/address-render";

/** How many addresses the view lists, newest first (a screen's length). */
const ADDRESSES_LISTED = 6;

const view: DevView = {
  name: "address-parts",
  client: "dev-address-parts.mjs",
  labels: {
    title: "Why each line of an address",
    show: "Show addresses",
    none: "No addresses yet",
    quoted: "the line people quote",
    ties: {
      stand: "the speaker's view",
      place: "the place",
      law: "the law in force",
      record: "a record",
      frame: "how it is said",
    },
  },
  routes: {
    "GET address-parts": ({ mode }) => {
      const core = mode.core;
      const nameOf = (id: string) => {
        const person = core.people.get(id);
        return person ? `${person.givenName} ${person.familyName}` : id;
      };
      const addresses = [...core.durableLog.values()]
        .filter((row) => saidOf(row.facts).length > 0)
        .sort(
          (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
        )
        .slice(0, ADDRESSES_LISTED)
        .map((row) => {
          const speakerId = String(row.facts?.[ADDRESS_FACT.speaker] ?? "");
          const quoted = Number(row.facts?.[ADDRESS_FACT.rememberedAt]);
          return {
            id: row.id,
            date: row.date,
            speaker: nameOf(speakerId),
            sentences: saidOf(row.facts).map((sentence, at) => ({
              text: sentenceText(sentence),
              quoted: at === quoted,
              pieces: sentence.pieces.map((key, index) => ({
                key,
                tie: sentence.ties[index] ?? null,
              })),
              facts: Object.entries(sentence.values).map(([slot, said]) => ({
                slot,
                said,
              })),
              sources: sentence.sources,
            })),
          };
        });
      return { addresses };
    },
  },
};

export default view;
