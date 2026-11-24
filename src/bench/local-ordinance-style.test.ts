/**
 * A town's ordinance carries its state's own enacting clause and numbering (stopgap
 * SG-GOV-local-bill-numbering, owner ruling Oct 14: bills follow the real form of their body), read
 * from data/research/gov/local-ordinance-style-2026.json through the one numbering function. Pinned
 * to two places and their world seeds: a Kansas city (its statute gives the clause) and the District
 * of Columbia (its Council numbers by Council Period).
 */
import { expect, it } from "vitest";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { draftBill, members } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import { buildBenchWorld } from "./world";

const PLACES = [
  {
    key: "2051500",
    seed: "830889e2cd942907e673f829a07d89b42052fcf26a2628b5c7a777b75e5ca0a3",
    form: "ordinance",
    clause: /^Be it ordained by the governing body of the city of Norton:/,
    number: (year: string) => new RegExp(`^${year}-\\d+$`),
  },
  {
    key: "1150000",
    seed: "1fc115c8f2ee103efc763375cd4c9077fb8c5747aa2b7c9f26815e2a074c8911",
    form: "act",
    clause: /^Be it enacted by the Council of the District of Columbia/,
    number: () => /^Bill 26-\d+$/,
  },
];

for (const place of PLACES)
  it(`an ordinance drafted in the town's body reads its state's clause and numbering (${place.key})`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const api = coreAPI(core);
    const offices = api
      .moduleState("core2-offices-v1")
      .table("offices")
      .rows() as unknown as { id: string; kind: string }[];
    const body = offices.find((o) =>
      /^(council|legislature-unicameral)$/.test(o.kind),
    );
    expect(body, `${place.key}: a council`).toBeDefined();
    const sponsor = members(api, body!.id).find(
      (t) => t.personId && core.people.has(t.personId),
    )!;
    const bill = draftBill(api, {
      bodyOfficeId: body!.id,
      sponsorId: sponsor.personId!,
      provisions: [
        {
          kind: "policy-question" as const,
          question: "local-policy:paid-family-leave",
          value: 1,
        },
      ],
    });
    expect(bill.number).toMatch(place.number(core.date.slice(0, 4)));
    expect(bill.form.kind).toBe(place.form);
    expect(bill.form.enactingClause).toMatch(place.clause);
    expect(bill.form.enactingClause).not.toContain("{");
    console.log(`${place.key}: ${bill.number}: ${bill.form.enactingClause}`);
  }, 120_000);
