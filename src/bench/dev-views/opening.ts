/**
 * Dev mode's "How this world opened" (owner, Nov 16, 2026: "be sure this is on dev mode as well as
 * tracing, but track everything at open so that way you can ... finally eliminate all of these
 * random draws or fixed things"). For a town, a person, a household, a business and an office, each
 * value the opening set: what it is today in the record, how the opening made it (real data, the
 * world's offset from a published figure, a decision, generation, an ad hoc draw or a number fixed
 * for every world), the line of code and the data row that made it, the record's own saved source,
 * and what replaces it when it is a draw or a fixed number. How each value was made is the opening
 * audit's list (src/bench/dev-views/opening-sources.json, from the Account lead's report
 * opening-draws-and-fixed-values in the project's shared folder); the values are read from the
 * records each time. "Every draw the opening took" is not a hand list: Record rebuilds this world
 * from its recipe with the draw recorder on (src/core2/kernel/draw-recorder.ts) and lists each line of
 * code that drew, by file and function, with what the list says of it; a site the list does not
 * know shows as such, and dev-opening-draws.test.ts fails on one. Read-only: it writes nothing to
 * this world and spends none of its time.
 */
import { coreAPI, personOrFillIn } from "../../core2/state";
import { realLocalities } from "../../core2/places";
import {
  publishedPlaceReferencePopulation,
  placeReferencePopulation,
} from "../../core2/gov-rules/place-population";
import { townWorkplaceWeights } from "../../core2/modules/jobs";
import type { EntrantPick } from "../world";
import { worldOffsetUnit } from "../../core2/world-draw";
import {
  pastElections,
  realResult,
  townSeats,
} from "../../core2/modules/offices";
import {
  latestApproval,
  presidentElection,
} from "../../core2/modules/national-opinion";
import {
  centuryLegislatures,
  centuryOf,
  partyKeyIssues,
  centuryPresidency,
  centuryRace,
  centurySeatRace,
  historyMode,
  PARTIES_MODULE_ID,
  statePlaces,
  stateRightShare,
  type TieRow,
} from "../../core2/modules/elections";
import { healthReport } from "../../core2/modules/health";
import { openingRentals } from "../../core2/modules/housing";
import { allOfficials, partySide } from "../../core2/modules/officials";
import type { CoreState, PersonId, Source } from "../../core2/types";
import {
  drawStage,
  startDrawRecording,
  stopDrawRecording,
  type DrawSite,
} from "../../core2/kernel/draw-recorder";
import type { DevView } from "../dev-views";
import {
  buildBenchWorldInStages,
  buildRecipeOf,
  type BuildRecipe,
} from "../world";
import SOURCES from "./opening-sources.json" with { type: "json" };

/** How the opening made a value (src/bench/dev-views/opening-sources.json). */
interface Made {
  readonly made: keyof typeof SOURCES.kinds;
  readonly by: string;
  readonly replace?: string;
}

/** One opening value: what it is now, how it was made and where that is written down. */
export interface OpeningRow {
  readonly label: string;
  readonly value: string;
  readonly made: string;
  readonly by: string;
  readonly source?: string;
  readonly drawKey?: string;
  readonly replace?: string;
  /** A record the Trace box opens from this row. */
  readonly recordId?: string;
}

export type OpeningSubject =
  "town" | "person" | "household" | "business" | "office";

export interface OpeningView {
  readonly subject: OpeningSubject;
  readonly id: string;
  readonly title: string;
  readonly rows: readonly OpeningRow[];
  /** What else can be opened: the player's household, town employers, the town's seats. */
  readonly choices: Readonly<
    Record<OpeningSubject, readonly { id: string; name: string }[]>
  >;
  /** How many rows of each kind, so a glance says how much is still drawn or fixed. */
  readonly kinds: Readonly<Record<string, number>>;
}

const ROWS = SOURCES.rows as Readonly<Record<string, Made>>;

function row(
  key: string,
  label: string,
  value: unknown,
  extra: Partial<OpeningRow> = {},
): OpeningRow {
  const made = ROWS[key];
  if (!made)
    throw new Error(
      `src/bench/dev-views/opening-sources.json has no row ${key}.`,
    );
  return {
    label,
    value: shown(value),
    made: SOURCES.kinds[made.made],
    by: made.by,
    ...(made.replace ? { replace: made.replace } : {}),
    ...extra,
  };
}

/** Today's approval base, or "none" before the first month has run. */
function approvalNow(pct: number | undefined): string {
  return pct === undefined ? shown(pct) : `${shown(pct)}%`;
}

function shown(value: unknown): string {
  if (value === undefined || value === null) return "none";
  if (typeof value === "number")
    return Number.isInteger(value)
      ? value.toLocaleString("en-US")
      : value.toFixed(3);
  return String(value);
}

const dollars = (minor: number) =>
  `$${Math.round(minor / 100).toLocaleString("en-US")}`;

const cited = (source: Source | undefined) =>
  source
    ? `${source.tag}: ${source.citation}${source.estimatedFrom ? ` (from ${source.estimatedFrom})` : ""}`
    : undefined;

const percent = (share: number) => `${(share * 100).toFixed(1)}%`;

function placeOf(core: CoreState) {
  const key = core.placeMetadata.placeKey;
  return realLocalities().find((place) => place.key === key);
}

function townView(core: CoreState, placeId: string): OpeningRow[] {
  const api = coreAPI(core);
  const place = placeOf(core);
  const geoid = place?.sourceGeoid;
  const rows: OpeningRow[] = [];
  if (geoid) {
    const published = publishedPlaceReferencePopulation(geoid);
    const world = placeReferencePopulation(geoid, core.seed);
    const key = `world-place-population:${geoid}`;
    rows.push(
      row(
        "town.population",
        "People in town",
        world
          ? `${shown(world.value)} (published ${shown(published?.value)})`
          : "none",
        {
          source: published?.source,
          drawKey: `${key}: ${shown(worldOffsetUnit(core.seed, key))}`,
        },
      ),
    );
  }
  const world = townWorkplaceWeights(placeId as never, core.seed);
  const total = (weights: ReadonlyMap<string, number>) =>
    [...weights.values()].reduce((sum, w) => sum + w, 0) || 1;
  const wTotal = total(world);
  for (const [part, weight] of [...world]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6))
    rows.push(
      row("town.jobsMix", `Share of jobs: ${part}`, percent(weight / wTotal), {
        drawKey: `sector-mix:${placeId}:${part}: ${shown(worldOffsetUnit(core.seed, `sector-mix:${placeId}:${part}`))}`,
      }),
    );
  const byKind = new Map<string, number>();
  for (const organization of core.organizations.values())
    if (organization.placeId === placeId && organization.classification)
      byKind.set(
        organization.classification,
        (byKind.get(organization.classification) ?? 0) + 1,
      );
  for (const [kind, count] of [...byKind].sort((a, b) =>
    a[0].localeCompare(b[0]),
  ))
    rows.push(row("town.employersOfKind", `Employers: ${kind}`, count));
  rows.push(
    row(
      "town.householdMix",
      "Kinds of household",
      core.placeMetadata.householdMixBasis,
    ),
  );
  // A new game's draw passes over a place where no player can be picked
  // (world.ts `passOver`); each one passed over, with why.
  const passedOver = core.placeMetadata.openingPassedOver
    ? (JSON.parse(core.placeMetadata.openingPassedOver) as {
        key: string;
        reason: string;
      }[])
    : [];
  for (const passed of passedOver)
    rows.push(
      row(
        "town.passedOver",
        `Passed over first: ${realLocalities().find((p) => p.key === passed.key)?.displayName ?? passed.key}`,
        passed.reason,
      ),
    );
  // The president's approval starts at the share of the vote the race that
  // seated them recorded; the game opens on Inauguration Day, so no month of
  // their term moved it before day one.
  const election = presidentElection(api);
  rows.push(
    row(
      "town.presidentApproval",
      "President's approval on day one",
      election
        ? `${shown(election.share * api.parameter("macroHundred"))}% (their share in the ${election.date} election; months of the term before day one: 0; now ${approvalNow(latestApproval(api)?.pct)})`
        : "none (no record of the race that seated the president)",
      election ? { recordId: election.termId } : {},
    ),
  );
  // Who the century before day one elected (src/core2/electorate-century.ts), or today's real
  // record when the world chose it; the President's term carries the race (Trace opens it).
  const century = centuryOf(core.seed, core.startedAt);
  const sitting = centuryPresidency(core.seed, core.startedAt);
  const pct = (share: number) => `${(share * 100).toFixed(1)}%`;
  rows.push(
    row(
      "town.president",
      "President on day one",
      sitting
        ? `${sitting.winnerParty}: won ${sitting.year} with ${pct(sitting.winnerShare)} of the two-party vote and ${sitting.winnerSide > 0 ? sitting.electoral.republican : sitting.electoral.democratic} electors; the person's term ${sitting.personTerms}, the party's ${sitting.partyTerms} in a row (${sitting.id})`
        : "today's real record (the world chose it)",
      election ? { recordId: election.termId } : {},
    ),
    row(
      "town.century",
      "The century's presidential elections",
      historyMode(core.seed) === "century"
        ? century.presidencies
            .map(
              (p) =>
                `${p.year} ${p.winnerSide > 0 ? "R" : "D"}${p.incumbentRan ? " (sitting President ran)" : ""} ${pct(p.republicanShare)} R, electors ${p.electoral.republican}-${p.electoral.democratic}${p.timeForChange.side ? `, time for a change cost the ${p.timeForChange.side > 0 ? "R" : "D"} ticket ${pct(p.timeForChange.share)}` : ""}`,
            )
            .join("; ")
        : "none (today's real record)",
    ),
  );
  // Congress on day one and every Congress of the century (electorate-century.ts).
  const congress = century.congresses.at(-1);
  const seated = (c: (typeof century.congresses)[number]) =>
    `House ${c.house.republican} R, ${c.house.democratic} D; Senate ${c.senate.republican} R, ${c.senate.democratic} D`;
  rows.push(
    row(
      "town.congress",
      "Congress on day one",
      historyMode(core.seed) === "century" && congress
        ? `${seated(congress)}, after the ${congress.year} elections (${congress.id})`
        : "today's real roster (the world chose it)",
    ),
    row(
      "town.governors",
      "Governors on day one",
      historyMode(core.seed) === "century"
        ? (() => {
            const governors = [...century.seats.values()].filter(
              (seat) =>
                seat.chamber === "executive" && seat.rosterKey === "governor",
            );
            const r = governors.filter((seat) => seat.side > 0).length;
            return `${r} R, ${governors.length - r} D, elected through the century`;
          })()
        : "today's real record (the world chose it)",
    ),
    row(
      "town.legislature",
      "The state legislature on day one",
      historyMode(core.seed) === "century"
        ? (() => {
            // The town's state's chambers, counted seat by seat; every other state's chambers
            // as results (electorate-century.ts congressElections).
            const chambers = new Map<string, { r: number; d: number }>();
            const control = { r: 0, d: 0 };
            const all = new Map<string, { r: number; d: number }>();
            for (const seat of centuryLegislatures(
              core.seed,
              core.startedAt,
            ).values()) {
              const key = `${seat.stateKey}:${seat.rosterChamber}`;
              const count = all.get(key) ?? { r: 0, d: 0 };
              if (seat.side > 0) count.r += 1;
              else count.d += 1;
              all.set(key, count);
              if (seat.hidden) continue;
              chambers.set(seat.rosterChamber ?? "legislature", count);
            }
            for (const count of all.values())
              if (count.r > count.d) control.r += 1;
              else if (count.d > count.r) control.d += 1;
            const name = (chamber: string) =>
              chamber === "upper"
                ? "upper chamber"
                : chamber === "lower"
                  ? "lower chamber"
                  : "one chamber";
            const mine = [...chambers]
              .map(([chamber, c]) => `${name(chamber)} ${c.r} R, ${c.d} D`)
              .join("; ");
            return `${mine || "not counted by the century (its members are not elected on the two national sides)"}; across the country the Republicans hold ${control.r} chambers and the Democrats ${control.d}, elected seat by seat through the century`;
          })()
        : "today's real roster (the world chose it)",
    ),
    row(
      "town.stateLean",
      "Your state on day one",
      (() => {
        // The state as play's counts read it: its counted places' vote-weighted lean.
        const town = coreAPI(core)
          .moduleState("core2-offices-v1")
          .table("loaded")
          .get("town") as unknown as { stateKey: string } | undefined;
        const usps = town?.stateKey.slice(3) ?? "";
        const share = stateRightShare(usps, core.seed);
        const places = statePlaces(usps, core.seed);
        return share === null
          ? "no counted places"
          : `${pct(share)} Republican across its ${places.length} counted places (${historyMode(core.seed) === "century" ? "the century's last count in the state" : "its 2024 presidential vote and this world's swing"})`;
      })(),
    ),
    row(
      "town.rentalVacancy",
      "Your town's empty rentals on day one",
      (() => {
        // The town's own past: the leases its renters signed in the last year,
        // each leaving a unit empty between tenants (housing-past.ts openingVacancy).
        const town = core.placeMetadata?.housingTown;
        const api = coreAPI(core);
        const rentals = town ? openingRentals(api, town) : undefined;
        if (!rentals) return "no rental homes here";
        return `${Math.round(rentals.vacant)} of ${Math.round(rentals.units)} rentals empty (${pct(rentals.vacant / Math.max(1, rentals.units))}), from the ${Math.round(rentals.signed)} leases its ${Math.round(rentals.renters)} renting households signed in the last year, each leaving a home empty about ${api.parameter("rentalVacantMonths")} months`;
      })(),
    ),
    row(
      "town.districtLeans",
      "Where the town's districts lean on day one",
      (() => {
        // Each district seat covering the town, at the lean its official reads (officials.ts seatLean).
        const api = coreAPI(core);
        const bySeat = new Map(allOfficials(api).map((o) => [o.seatId, o]));
        const lines = townSeats(api)
          .filter(
            (s) =>
              s.office.kind === "us-house" ||
              s.office.kind.startsWith("legislature-"),
          )
          .map((s) => bySeat.get(s.seat.id))
          .filter((o): o is NonNullable<typeof o> => o !== undefined)
          .map(
            (o) =>
              `${o.body}${o.district === null ? "" : ` district ${o.district}`}: ${pct((o.districtLean + 1) / 2)} Republican (${o.leanSource})`,
          );
        return lines.length
          ? lines.join("; ")
          : "no district seat covers the town";
      })(),
    ),
    row(
      "town.partyTies",
      "The town's party ties on day one",
      (() => {
        // Every adult's tie, as the parties engine keeps it (parties.ts openParties).
        const api = coreAPI(core);
        if (!core.modules.has(PARTIES_MODULE_ID)) return "no parties here";
        const names = new Map(
          (
            api
              .moduleState(PARTIES_MODULE_ID)
              .table("parties")
              .rows() as unknown as {
              id: string;
              name: string;
            }[]
          ).map((row) => [row.id, row.name]),
        );
        const ties = (
          api
            .moduleState(PARTIES_MODULE_ID)
            .table("ties")
            .rows() as unknown as TieRow[]
        ).filter((t) => t.personId !== core.playerId);
        if (!ties.length) return "no adult ties yet";
        const counts = new Map<string, number>();
        for (const t of ties) {
          const label =
            t.tie === "party"
              ? (names.get(t.partyId ?? "") ?? "a party")
              : t.tie === "independent"
                ? "independent"
                : "no party";
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        return [...counts]
          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
          .map(([label, n]) => `${label} ${pct(n / ties.length)}`)
          .join(", ");
      })(),
    ),
    row(
      "town.parties",
      "The parties",
      historyMode(core.seed) === "century"
        ? century.parties
            .map((party) => {
              const first = party.positions[0]?.position ?? 0;
              const now = party.positions.at(-1)?.position ?? first;
              const other =
                century.parties
                  .find((p) => p.side !== party.side)
                  ?.positions.at(-1)?.position ?? 0;
              const issues = partyKeyIssues(now, other, 3)
                .map(
                  (i) =>
                    `${i.supports ? "for" : "against"} ${i.question.split(".").at(-1)}`,
                )
                .join(", ");
              const won = century.presidencies
                .filter((p) => p.winnerSide === party.side)
                .map((p) => p.year);
              // Its members of Congress as seated (officials-roster.ts drawOfficial).
              const members = allOfficials(coreAPI(core)).filter(
                (o) =>
                  (o.bodyKind === "us-house" || o.bodyKind === "us-senate") &&
                  !o.independent &&
                  partySide(o.party) === party.side,
              );
              const seated = members.length
                ? `; its ${members.length} members of Congress stand at ${(members.reduce((a, o) => a + o.ideal, 0) / members.length).toFixed(2)} on average`
                : "";
              return `${party.name} (${party.id}): ${party.founded ?? "before 1925"}; stands at ${now.toFixed(2)} (${first.toFixed(2)} in ${party.positions[0]?.year ?? ""})${seated}; ${issues}; won the presidency ${won.length} times${won.length ? ` (last ${won.at(-1)})` : ""}`;
            })
            .join("; ")
        : "today's real parties (the world chose it)",
    ),
    row(
      "town.foundedParties",
      "Parties founded in the century",
      historyMode(core.seed) === "century"
        ? century.foundings.length
          ? century.foundings
              .map(
                (f) =>
                  `${f.id}: founded ${f.year} at ${f.position.toFixed(2)} on the members' scale (${f.side === 0 ? "between the two" : f.side < 0 ? "left" : "right"}), from the ${pct(f.unreachedShare)} of voters neither party reached that year, founding pressure ${f.pressure.toFixed(2)} against a cost of ${f.cost}${(() => {
                    const last = century.presidencies
                      .filter((p) => p.foundedParty?.id === f.id)
                      .at(-1);
                    return last
                      ? `; it stood in ${century.presidencies.filter((p) => p.foundedParty?.id === f.id).length} presidential races and took ${pct(last.foundedParty!.share)} of every vote in ${last.year}${f.endedYear ? `; its share fell in each of the last races, so it merged into ${f.mergedInto} in ${f.endedYear}` : ""}`
                      : "; it has not yet stood in a presidential race";
                  })()}`,
              )
              .join("; ")
          : "none: the century's parties kept their voters close enough that no pressure outweighed the cost of a new one"
        : "none (today's real parties)",
    ),
    row(
      "town.countyLeans",
      "Counties counted in the century",
      historyMode(core.seed) === "century"
        ? (() => {
            const shares = Object.values(century.countyLeans);
            return shares.length
              ? `${shares.length} counties, each counted in every presidential election at its own lean and carried by its own results; after the last, from ${pct(Math.min(...shares))} to ${pct(Math.max(...shares))} right of the two-party vote, and each state stands where its counties' mean does`
              : "none: every state was counted as one place";
          })()
        : "none (today's real map)",
    ),
    row(
      "town.congresses",
      "The century's Congresses",
      historyMode(core.seed) === "century"
        ? century.congresses.map((c) => `${c.year}: ${seated(c)}`).join("; ")
        : "none (today's real record)",
    ),
  );
  return rows;
}

function personView(core: CoreState, personId: string): OpeningRow[] {
  const person = personOrFillIn(core, personId);
  if (!person) throw new Error("No such person.");
  const rows: OpeningRow[] = [
    row("person.name", "Name", `${person.givenName} ${person.familyName}`, {
      source: cited(person.source),
      recordId: person.id,
    }),
    row("person.birthDate", "Born", person.birthDate),
  ];
  // The player's age at the start, and how the opening set it (world.ts `entrantChoice`).
  const pick =
    personId === core.playerId && core.placeMetadata?.openingPlayerPick
      ? (JSON.parse(core.placeMetadata.openingPlayerPick) as EntrantPick)
      : undefined;
  if (pick)
    rows.push(
      row(
        pick.how === "town-adult"
          ? "person.playerAge.townAdult"
          : "person.playerAge.chosen",
        "Age when the life began",
        pick.how === "chosen-age"
          ? `${pick.age} (chosen ${pick.chosenAge}${pick.estimated ? "; nobody in town was that age, so the nearest age stands in" : ""})`
          : pick.age,
        pick.how === "town-adult"
          ? {
              drawKey: `opening-player:${person.placeId}: ${shown(pick.unit ?? 0)}, one of ${pick.among} adults in id order`,
            }
          : {},
      ),
    );
  const traitSources = person.traitSources ?? {};
  for (const [trait, value] of Object.entries(person.traits).sort((a, b) =>
    a[0].localeCompare(b[0]),
  ))
    rows.push(
      row("person.trait", `Trait: ${trait}`, value, {
        source: cited(traitSources[trait] ?? person.sharedTraitSource),
      }),
    );
  rows.push(
    row("person.cash", "Cash on hand", dollars(person.liquidMinor), {
      source: cited(person.source),
    }),
  );
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  if (job)
    rows.push(
      row(
        "person.job",
        "Job",
        `${job.title}${job.hourlyMinor ? `, ${dollars(job.hourlyMinor)} an hour` : ""}`,
        { source: cited(job.source), recordId: job.id },
      ),
    );
  const birthplace = person.pastFacts?.find((f) => f.kind === "birthplace");
  if (birthplace)
    rows.push(
      row("person.birthplace", "Birthplace", birthplace.summary, {
        source: cited(birthplace.source),
        recordId: birthplace.id,
      }),
    );
  rows.push(
    row("person.knownPeople", "People they know", person.knownIds.size),
    row(
      "person.conditions",
      "Health conditions",
      (
        healthReport(core).conditionsByPerson.get(person.id as PersonId) ?? []
      ).join(", ") || "none",
    ),
  );
  return rows;
}

function householdView(core: CoreState, householdId: string): OpeningRow[] {
  const household = core.households.get(householdId);
  if (!household) throw new Error("No such household.");
  const members = household.memberIds
    .map((id) => core.people.get(id))
    .filter((p) => p !== undefined);
  return [
    row("household.members", "People", members.length, {
      source: cited(household.source),
      recordId: household.id,
    }),
    ...members.map((member) =>
      row(
        "household.memberAge",
        `Born: ${member.givenName}`,
        member.birthDate,
        {
          recordId: member.id,
        },
      ),
    ),
    row("household.since", "Moved in", household.since ?? "none"),
  ];
}

function businessView(core: CoreState, organizationId: string): OpeningRow[] {
  const organization = core.organizations.get(organizationId);
  if (!organization) throw new Error("No such business.");
  const staff = [...core.jobs.values()].filter(
    (job) => job.organizationId === organization.id && job.endsAt === undefined,
  ).length;
  return [
    row("business.name", "Name", organization.name, {
      recordId: organization.id,
    }),
    row(
      "business.kind",
      "Kind",
      organization.classification ?? organization.kind,
    ),
    row("business.cash", "Cash on day one", dollars(organization.liquidMinor), {
      source: cited(organization.source),
    }),
    row("business.staff", "Staff in full records", staff),
  ];
}

/** Whether the research holds the real result of a seat's race. */
function raceRecorded(
  jurisdiction: string,
  officeKind: string,
  seatId: string,
  race: { date: string; party: string | null },
): boolean {
  return (
    jurisdiction.startsWith("US-") &&
    realResult({
      officeKind,
      seatId,
      usps: jurisdiction.split("-").at(-1)!,
      party: race.party,
      date: race.date,
    }) !== null
  );
}

function officeView(core: CoreState, seatId: string): OpeningRow[] {
  const api = coreAPI(core);
  const held = townSeats(api).find((s) => s.seat.id === seatId);
  if (!held) throw new Error("No such seat in town.");
  const holder = held.holder;
  const elections = pastElections(api, seatId);
  const last = elections.at(-1);
  // The race behind the term where the century ran it (electorate-century.ts): its record.
  const year = last ? Number(last.date.slice(0, 4)) : 0;
  const century = !last
    ? undefined
    : held.office.kind === "president" || held.office.kind === "vice-president"
      ? centuryRace(core.seed, core.startedAt, year)
      : centurySeatRace(
          core.seed,
          held.office,
          { id: seatId, district: held.seat.district ?? null },
          year,
        );
  return [
    row(
      "office.office",
      "Office",
      `${held.office.title}, ${held.office.governmentName}`,
    ),
    row(
      "office.holder",
      "Holder",
      holder
        ? `${holder.identity.givenName} ${holder.identity.familyName}`
        : "vacant",
      holder ? { recordId: holder.id } : {},
    ),
    row(
      "office.serviceStart",
      "In this seat since",
      holder ? (holder.serviceStart ?? holder.startDate) : "none",
      { drawKey: `${seatId}:career` },
    ),
    row(
      "office.termEnds",
      "Term ends",
      holder?.endDate
        ? `${holder.endDate}${holder.endEstimated ? " (estimated)" : ""}`
        : "none",
    ),
    row("office.termsBefore", "Elections won before day one", elections.length),
    // A race the century ran is its record; under "today", a race the research records reads
    // its real result as this world drifts it; any other is drawn inside the office kind's band.
    last && century
      ? row(
          "office.lastShareCentury",
          "Share of the vote last time",
          `${percent(last.share)} in ${last.date.slice(0, 4)}`,
          { recordId: century.id },
        )
      : last &&
          raceRecorded(held.office.jurisdiction, held.office.kind, seatId, last)
        ? row(
            "office.lastShareRecorded",
            "Share of the vote last time",
            `${percent(last.share)} in ${last.date.slice(0, 4)}`,
            { drawKey: `${seatId}:${last.date}:share` },
          )
        : row(
            "office.lastShare",
            "Share of the vote last time",
            last
              ? `${percent(last.share)} in ${last.date.slice(0, 4)}`
              : "none",
            {
              drawKey: last
                ? "<seat seed>:<election day>:winner-share"
                : undefined,
            },
          ),
  ];
}

function choices(core: CoreState, placeId: string, playerId?: string) {
  const player = playerId ? core.people.get(playerId as PersonId) : undefined;
  const household = player
    ? core.households.get(player.householdId)
    : undefined;
  const people = [
    ...(household?.memberIds ?? []),
    ...[...(player?.knownIds ?? [])].slice(0, 12),
  ]
    .map((id) => core.people.get(id))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, name: `${p.givenName} ${p.familyName}` }));
  const businesses = [...core.organizations.values()]
    .filter((o) => o.placeId === placeId && o.classification)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((o) => ({ id: o.id, name: o.name }));
  const seats = townSeats(coreAPI(core)).map((s) => ({
    id: s.seat.id,
    name: `${s.office.title}${s.holder ? `: ${s.holder.identity.givenName} ${s.holder.identity.familyName}` : ""}`,
  }));
  return {
    town: [{ id: placeId, name: core.placeMetadata.placeName ?? placeId }],
    person: people,
    household: household
      ? [{ id: household.id, name: player!.familyName }]
      : [],
    business: businesses,
    office: seats,
  };
}

/** The view for one subject; with no id, the player's (their town, household, employer, first seat). */
export function openingView(
  core: CoreState,
  placeId: string,
  subject: OpeningSubject,
  id?: string,
): OpeningView {
  const playerId = core.playerId;
  const options = choices(core, placeId, playerId);
  const player = playerId ? core.people.get(playerId) : undefined;
  const fallback: Record<OpeningSubject, string | undefined> = {
    town: placeId,
    person: playerId,
    household: player?.householdId,
    business:
      (player?.jobId && core.jobs.get(player.jobId)?.organizationId) ||
      options.business[0]?.id,
    // A seat the town elects first: the President's is the last a town's view needs.
    office: (
      townSeats(coreAPI(core)).find(
        (s) => s.office.level !== "federal" && s.office.level !== "state",
      ) ?? townSeats(coreAPI(core))[0]
    )?.seat.id,
  };
  const at = id || fallback[subject];
  if (!at) throw new Error(`No ${subject} to open.`);
  const rows =
    subject === "town"
      ? townView(core, at)
      : subject === "person"
        ? personView(core, at)
        : subject === "household"
          ? householdView(core, at)
          : subject === "business"
            ? businessView(core, at)
            : officeView(core, at);
  const title = options[subject].find((choice) => choice.id === at)?.name ?? at;
  const kinds: Record<string, number> = {};
  for (const r of rows) kinds[r.made] = (kinds[r.made] ?? 0) + 1;
  return { subject, id: at, title, rows, choices: options, kinds };
}

/** How a line of code that draws at the opening draws (opening-sources.json `sites`). */
interface SiteRow {
  readonly made: keyof typeof SOURCES.kinds;
  readonly what: string;
  readonly replace?: string;
}

const SITES = SOURCES.sites as Readonly<Record<string, SiteRow>>;

/** One line of code that drew while this world opened, with how often and what the list says of it. */
export interface OpeningDraw {
  readonly site: string;
  readonly stages: string;
  readonly count: number;
  readonly primitive: string;
  /** Absent when the list does not know the site: a new draw to classify. */
  readonly made?: string;
  readonly what?: string;
  readonly replace?: string;
}

/** The sites a recorded opening drew at, folded by file and function, most draws first. */
export function openingDraws(sites: readonly DrawSite[]): OpeningDraw[] {
  const folded = new Map<
    string,
    { count: number; stages: Set<string>; primitives: Set<string> }
  >();
  for (const site of sites) {
    const key = `${site.file}#${site.fn}`;
    const row = folded.get(key) ?? {
      count: 0,
      stages: new Set<string>(),
      primitives: new Set<string>(),
    };
    row.count += site.count;
    row.stages.add(site.stage);
    row.primitives.add(site.primitive);
    folded.set(key, row);
  }
  return [...folded]
    .map(([site, row]) => {
      const listed = SITES[site];
      return {
        site,
        stages: [...row.stages].join(", "),
        count: row.count,
        primitive: [...row.primitives].sort().join(", "),
        ...(listed
          ? {
              made: SOURCES.kinds[listed.made],
              what: listed.what,
              ...(listed.replace ? { replace: listed.replace } : {}),
            }
          : {}),
      };
    })
    .sort((a, b) => b.count - a.count || a.site.localeCompare(b.site));
}

/**
 * Builds this world again from its recipe with the draw recorder on and returns every site that
 * drew, by the bench's build stage (the warm-up's days included). The twin is built, read and
 * dropped; this world is not touched.
 */
export async function recordOpening(
  recipe: BuildRecipe,
): Promise<{ draws: OpeningDraw[]; seconds: number }> {
  const started = Date.now();
  startDrawRecording();
  let sites: DrawSite[] = [];
  try {
    await buildBenchWorldInStages(
      recipe.seed,
      recipe.date,
      recipe.options,
      (stage) => drawStage(stage),
    );
  } finally {
    sites = stopDrawRecording();
  }
  return {
    draws: openingDraws(sites),
    seconds: Math.round((Date.now() - started) / 1000),
  };
}

/** The last recording of each world, kept while the world lives. */
const recorded = new WeakMap<
  CoreState,
  { draws: OpeningDraw[]; seconds: number }
>();

const SUBJECTS: readonly OpeningSubject[] = [
  "town",
  "person",
  "household",
  "business",
  "office",
];

const view: DevView = {
  name: "opening",
  client: "dev-opening.mjs",
  labels: SOURCES.labels,
  routes: {
    "GET opening": ({ mode, q }) => {
      const subject = (q("subject") || "town") as OpeningSubject;
      if (!SUBJECTS.includes(subject))
        throw new Error(`No opening view for ${subject}.`);
      return openingView(
        mode.core,
        mode.placeId,
        subject,
        q("id") || undefined,
      );
    },
    "GET opening/draws": ({ mode }) => drawsAnswer(recorded.get(mode.core)),
    "POST opening/record": async ({ mode }) => {
      const recipe = buildRecipeOf(mode.core);
      if (!recipe)
        throw new Error(
          "This world was not built in this session, so it has no recipe to rebuild its opening from.",
        );
      const done = await recordOpening(recipe);
      recorded.set(mode.core, done);
      return drawsAnswer(done);
    },
  },
};

function drawsAnswer(
  done: { draws: OpeningDraw[]; seconds: number } | undefined,
) {
  return done
    ? {
        recorded: true,
        seconds: done.seconds,
        draws: done.draws,
        unknown: done.draws.filter((d) => !d.made).length,
      }
    : { recorded: false, seconds: 0, draws: [], unknown: 0 };
}

export default view;
