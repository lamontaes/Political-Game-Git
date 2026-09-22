/* global process */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  EXCHANGE_FOLDERS,
  configuredExchangeFolders,
  discoverExchangeRoot,
  exchangeFolderIdOverride,
  exchangeSummary,
  resolveExchangeFolders,
} from "../private-controller/drive-exchange.mjs";

const INBOX = "11NUdShqpptAYqttOhpVFaiNikOkyrZwE";
const CATALOG = "1wGxfsI-dk46ko76PhBVltMXyJU_ejIkN";
const EVENTS = "1t0EqyzKP56gajy-skGoLeoKPmeXhPcmf";

function exchangeRoot(names) {
  const root = mkdtempSync(path.join(tmpdir(), "ocd-exchange-"));
  for (const name of names) mkdirSync(path.join(root, name));
  return root;
}

/** Stands in for Drive for desktop's item-id attribute. */
const idsFrom = (map) => (directory) => map[path.basename(directory)] ?? null;

test("the owner's exchange folders are the configured identities", () => {
  assert.deepEqual(
    EXCHANGE_FOLDERS.map((folder) => [folder.key, folder.name, folder.id]),
    [
      ["inbox", "01_INBOX", INBOX],
      ["catalog", "02_CATALOG", CATALOG],
      ["events", "03_REVIEW_AND_INTEGRATION_EVENTS", EVENTS],
    ],
  );
});

test("the single mirrored Art Desk exchange is discovered centrally", () => {
  const cloud = mkdtempSync(path.join(tmpdir(), "ocd-cloud-"));
  const root = path.join(
    cloud,
    "GoogleDrive-owner@example.test",
    "My Drive",
    "00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE",
    "80_ARTBENCH_EXCHANGE",
  );
  mkdirSync(root, { recursive: true });
  try {
    assert.equal(discoverExchangeRoot({ cloudStorageRoot: cloud }), root);
  } finally {
    rmSync(cloud, { recursive: true, force: true });
  }
});

test("more than one mirrored Art Desk exchange is refused", () => {
  const cloud = mkdtempSync(path.join(tmpdir(), "ocd-cloud-"));
  try {
    for (const account of ["one", "two"])
      mkdirSync(
        path.join(
          cloud,
          `GoogleDrive-${account}@example.test`,
          "My Drive",
          "00_OUR_CIVIC_DUTY_ASSET_FACTORY_ACTIVE",
          "80_ARTBENCH_EXCHANGE",
        ),
        { recursive: true },
      );
    assert.throws(
      () => discoverExchangeRoot({ cloudStorageRoot: cloud }),
      /More than one shared Art Desk exchange/,
    );
  } finally {
    rmSync(cloud, { recursive: true, force: true });
  }
});

test("a configured id wins over the folder's name", () => {
  const root = exchangeRoot([
    "01_INBOX (old)",
    "02_CATALOG",
    "03_REVIEW_AND_INTEGRATION_EVENTS",
  ]);
  try {
    const resolved = resolveExchangeFolders(root, {
      readItemId: idsFrom({
        "01_INBOX (old)": INBOX,
        "02_CATALOG": CATALOG,
        "03_REVIEW_AND_INTEGRATION_EVENTS": EVENTS,
      }),
    });
    assert.equal(resolved.paths.inbox, path.join(root, "01_INBOX (old)"));
    assert.deepEqual(
      resolved.folders.map((folder) => folder.resolvedBy),
      ["id", "id", "id"],
    );
    assert.equal(resolved.notes.length, 1);
    assert.match(resolved.notes[0], /named "01_INBOX \(old\)"/);
    assert.equal(exchangeSummary(resolved).ok, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a folder with no Drive identity resolves by name and is reported", () => {
  const root = exchangeRoot([
    "01_INBOX",
    "02_CATALOG",
    "03_REVIEW_AND_INTEGRATION_EVENTS",
  ]);
  try {
    const resolved = resolveExchangeFolders(root, {
      readItemId: () => null,
    });
    assert.deepEqual(
      resolved.folders.map((folder) => folder.resolvedBy),
      ["name", "name", "name"],
    );
    assert.equal(resolved.notes.length, 3);
    for (const note of resolved.notes)
      assert.match(note, /matched by name only and its identity is unverified/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a name match carrying another Drive id is refused, not substituted", () => {
  const root = exchangeRoot([
    "01_INBOX",
    "02_CATALOG",
    "03_REVIEW_AND_INTEGRATION_EVENTS",
  ]);
  try {
    assert.throws(
      () =>
        resolveExchangeFolders(root, {
          readItemId: idsFrom({
            "01_INBOX": "1MIRRORmirrorMIRRORmirror00",
            "02_CATALOG": CATALOG,
            "03_REVIEW_AND_INTEGRATION_EVENTS": EVENTS,
          }),
        }),
      (error) =>
        /is Drive folder 1MIRRORmirrorMIRRORmirror00, not the configured inbox folder/.test(
          error.message,
        ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a missing exchange folder is an error the hub can show", () => {
  const root = exchangeRoot(["01_INBOX", "02_CATALOG"]);
  try {
    let thrown = null;
    try {
      resolveExchangeFolders(root, { readItemId: () => null });
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown);
    assert.match(thrown.message, /No Art Desk events folder under/);
    const summary = exchangeSummary(thrown);
    assert.equal(summary.ok, false);
    assert.match(summary.message, /03_REVIEW_AND_INTEGRATION_EVENTS/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("an unreadable exchange root is reported, not treated as empty", () => {
  const root = path.join(tmpdir(), "ocd-exchange-absent");
  assert.throws(
    () => resolveExchangeFolders(root, { readItemId: () => null }),
    /cannot be read/,
  );
});

test("an override replaces one configured identity and keeps the rest", () => {
  const folders = configuredExchangeFolders({ inbox: "1QAqaQAqaQAqaQAqa00" });
  assert.equal(folders[0].id, "1QAqaQAqaQAqaQAqa00");
  assert.equal(folders[0].overridden, true);
  assert.equal(folders[1].id, CATALOG);
  assert.throws(
    () => configuredExchangeFolders({ events: "not a drive id" }),
    /not a Drive id/,
  );
});

test("an unreadable override is refused rather than guessed", () => {
  const previous = process.env.OCD_ARTBENCH_EXCHANGE_FOLDER_IDS;
  process.env.OCD_ARTBENCH_EXCHANGE_FOLDER_IDS = "{oops";
  try {
    assert.throws(() => exchangeFolderIdOverride(null), /not readable JSON/);
  } finally {
    if (previous === undefined)
      delete process.env.OCD_ARTBENCH_EXCHANGE_FOLDER_IDS;
    else process.env.OCD_ARTBENCH_EXCHANGE_FOLDER_IDS = previous;
  }
  assert.deepEqual(exchangeFolderIdOverride({ inbox: INBOX }), {
    inbox: INBOX,
  });
});

test("an override naming no such folder is refused, not ignored", () => {
  assert.throws(
    () => configuredExchangeFolders({ inboxx: "1QAqaQAqaQAqaQAqa00" }),
    /names no such folder: inboxx/,
  );
  // An array is a mistyped override too, not three untouched identities.
  assert.throws(
    () => configuredExchangeFolders(["1QAqaQAqaQAqaQAqa00"]),
    /names no such folder/,
  );
});
