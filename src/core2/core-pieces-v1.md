# Engines own indexed records and institutional dates

Before: Ports had fixed core tables, a one-event callback writer, and individual residents.

After: Engines can register their own versioned tables, schedule keyed institutional work, and read the counted electorate. The player clock keeps its existing interface.

## Interface

Inferred: The facade additions use `core2-api-v20` (v11 adds `repriceCreditFacility`, a dated credit-line rate; v12 adds `rerateJob`, a dated pay change for full or counted workers; v13–v16 add WORLD's job start/end, business credit and standing-obligation seams; v17 adds PEOPLE's `addBornPersonV1`; v18 adds `enterMarket`, a mid-run business entering its market; v19 adds `fundPublicPay`, public wages drawn from a government treasury; v20 adds `closeBusinessByChoice`, an owner closing a solvent business); the existing player API remains `core2-part1b-v1`. [Facade version](data.ts#L11), [facade methods](types.ts#L898).

```ts
registerModule(core, {
  id: "laws",
  state: {
    schemaVersion: 1,
    tables: {
      enactments: {
        indexes: { byPlaceDate: { fields: ["placeId", "date"] } },
        validate(row) {
          /* Throw for invalid engine-owned terms. */
        },
      },
    },
  },
  onCalendarWork(api, work) {
    /* Read owned rows; apply effects through api. */
  },
});
const api = coreAPI(core);
const store = api.moduleState("laws");
const table = store.table("enactments");
table.put({ id: "law:1", placeId, date, phase: "enacted" });
table.get("law:1");
table.query("byPlaceDate", [placeId, date]);
table.remove("law:1");
store.snapshot();
store.restore(snapshot);
```

Inferred: Rows are detached, recursively frozen JSON data. IDs are primary keys. Composite index fields must be present finite scalars: strings, numbers, booleans, or null. Index values preserve types. A unique index rejects conflicting replacement before changing rows. Validators receive frozen records and cannot reenter the same store. A read of all rows or a snapshot is explicit; daily work uses indexes. [Admission and indexes](module-state.ts#L99).

Inferred: Each registered module has its own namespace and positive integer schema version. A snapshot contains its module ID, exact version, and every registered table. Restore validates all rows and builds indexes before replacing the store. Retained handles follow the restored tables. `CoreInput.moduleState` admits explicit opening snapshots; an omitted module starts empty. These snapshots do not convert old-core saves. [Restore](module-state.ts#L229).

## Calendar and player stops

```ts
const calendar = api.moduleCalendar("laws");
calendar.schedule({ key, date, kind, source, sourceRecordIds, payload });
calendar.get(key); // pending, running, completed, or failed
calendar.cancel(key); // pending only
calendar.forget(key); // completed/failed records, explicit retention choice
const token = calendar.registerStop({
  recordId,
  controlledPersonId,
  at: { date, minuteOfDay },
  kind: "offer-deadline",
  reasonKey,
  source,
  hold: true,
});
calendar.releaseStop(token);
```

Inferred: Calendar keys are local to the module. Duplicate retained keys reject. Work must have a handler, source record keys, and a future civil date. Both clocks dispatch that day's indexed bucket before module day hooks. The player clock does so when its day closes, after controlled acts resolve, following its existing daily-module contract. Same-day work follows explicit scheduling order; an earlier handler can cancel later work. No calendar or history scan occurs on quiet days. A failing handler records failure and faults the calendar; automatic replay is refused. Failed records remain readable for diagnosis. [Dispatch](module-calendar.ts#L170), [player day closure](player-v1.ts#L534).

Inferred: Stop registration delegates to the existing module-stop contract and returns its exact token. Stop records are independent of institutional day work: register them before the controlled clock reaches their exact moment. Held deadlines require the owning token's release; one-shot interrupts keep the existing acknowledgment behavior. `earliestPlayerStopV1` reads these stops without advancing. [Owned stop registration](module-calendar.ts#L150).

Inferred: A dated condition producer reads a registered table in `onCalendarWork` and calls `api.addFinanceCondition` with that dated record. The condition reaches the existing finance slot before daily finance settlement. No finance writer change is needed. [Condition contract test](module-calendar.test.ts#L77).

## Voter groups

Voter groups and electorate blocks are gone as decision paths and stores (owner, Oct 14, 2026). The unnamed electorate is the town's counted residents: each counted voter is one member of a live counted household and carries that household's weight, the real voters it stands for. [Counted voters](electorate.ts#L68). A race orders the town's counted adults by lean and readiness into a sample, each with its weight. [Electorate sample](modules/voting.ts#L2794). Places outside the town are counted coarsely on the same sample, each inside its eligible voters. [Place counts](electorate.ts#L495).

The contract test builds a played world in a place drawn from all 56 and checks those promises, and that reading them changes no record. [Electorate contract](voter-groups.test.ts).

## Handoff boundary

Inferred: The three piece contracts cover table isolation, indexes, restoration, rejected writes, keyed date dispatch, stop/resume behavior, dated conditions and the counted electorate. Political engines, actual group generation, accounts acceptance, and the first two M1-port acceptance proofs remain separate work. Calendar and stop registries retain the existing process-local clock scope. The finisher reviews these boundaries before M0-09 is marked passing. [Table contracts](module-state.test.ts), [calendar contracts](module-calendar.test.ts), [group contracts](voter-groups.test.ts), and [clock scope](player-v1.md).
