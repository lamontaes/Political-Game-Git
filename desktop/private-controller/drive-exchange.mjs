/* global process */
/**
 * The Art Desk exchange folders, bound by Drive folder identity.
 *
 * The bench trades work with the owner through three folders inside
 * 80_ARTBENCH_EXCHANGE of the asset-factory Drive: an inbox of incoming
 * batches, a published catalog, and the immutable review/integration events.
 * Resolving them by name alone means a renamed, moved or mirrored folder can
 * silently become "the exchange", so the hub configures each folder by its
 * Drive item id and treats a name lookup as a reported fallback.
 *
 * Drive for desktop records each mirrored item's id in an extended
 * attribute, so identity is checked locally, with no network and no
 * credentials: nothing here reads a token or calls the Drive API.
 *
 * Configured ids can be overridden per install (settings, or
 * OCD_ARTBENCH_EXCHANGE_FOLDER_IDS as JSON keyed by folder) for a different
 * Drive account or a dedicated QA exchange.
 */

import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";

export const DRIVE_ITEM_ID_XATTR = "com.google.drivefs.item-id#S";

/** The owner's exchange folders as configured identities. */
export const EXCHANGE_FOLDERS = Object.freeze([
  Object.freeze({
    key: "inbox",
    name: "01_INBOX",
    id: "11NUdShqpptAYqttOhpVFaiNikOkyrZwE",
  }),
  Object.freeze({
    key: "catalog",
    name: "02_CATALOG",
    id: "1wGxfsI-dk46ko76PhBVltMXyJU_ejIkN",
  }),
  Object.freeze({
    key: "events",
    name: "03_REVIEW_AND_INTEGRATION_EVENTS",
    id: "1t0EqyzKP56gajy-skGoLeoKPmeXhPcmf",
  }),
]);

const DRIVE_ID = /^[A-Za-z0-9_-]{10,128}$/;

/** The per-install override, from settings or the environment. */
export function exchangeFolderIdOverride(settingsValue = null) {
  if (settingsValue && typeof settingsValue === "object") return settingsValue;
  const raw = process.env.OCD_ARTBENCH_EXCHANGE_FOLDER_IDS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    throw new Error(
      "OCD_ARTBENCH_EXCHANGE_FOLDER_IDS is not readable JSON; refusing to guess the exchange folders.",
    );
  }
}

/** The configured identities, with any override applied. */
export function configuredExchangeFolders(override = null) {
  // A key the folders do not have is a mistyped override, not a no-op: left
  // silent it would trade work through a folder the owner meant to redirect.
  const unknown = Object.keys(override ?? {}).filter(
    (key) => !EXCHANGE_FOLDERS.some((folder) => folder.key === key),
  );
  if (unknown.length)
    throw new Error(
      `The Art Desk exchange override names no such folder: ${unknown.join(", ")}. Expected ${EXCHANGE_FOLDERS.map((folder) => folder.key).join(", ")}.`,
    );
  return EXCHANGE_FOLDERS.map((folder) => {
    const replacement = override?.[folder.key];
    if (replacement === undefined || replacement === null) return folder;
    if (typeof replacement !== "string" || !DRIVE_ID.test(replacement))
      throw new Error(
        `The configured Drive folder id for the Art Desk ${folder.key} is not a Drive id.`,
      );
    return Object.freeze({ ...folder, id: replacement, overridden: true });
  });
}

/** The Drive item id of a mirrored path, or null when it carries none. */
export function readDriveItemId(directory) {
  try {
    return (
      execFileSync("/usr/bin/xattr", ["-p", DRIVE_ITEM_ID_XATTR, directory], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim() || null
    );
  } catch {
    // No attribute (a plain folder, a fixture) or no xattr tool.
    return null;
  }
}

/**
 * Resolve the exchange folders under `root`.
 *
 * A folder whose Drive item id matches its configured id wins, whatever it is
 * called. Otherwise a folder with the configured name is accepted only when
 * it carries no Drive identity at all, and that fallback is reported. A name
 * match that carries a different Drive id, and a folder that is missing
 * altogether, throw: the hub says so instead of substituting a folder.
 */
export function resolveExchangeFolders(
  root,
  { folders = configuredExchangeFolders(), readItemId = readDriveItemId } = {},
) {
  let children;
  try {
    children = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    throw new Error(
      `The Art Desk exchange folder ${root} cannot be read: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const ids = new Map(
    children.map((name) => [name, readItemId(path.join(root, name))]),
  );
  const notes = [];
  const resolved = folders.map((folder) => {
    const byId = children.find((name) => ids.get(name) === folder.id);
    if (byId) {
      if (byId !== folder.name)
        notes.push(
          `The configured ${folder.key} folder (${folder.id}) is named "${byId}" in Drive, not "${folder.name}".`,
        );
      return { ...folder, path: path.join(root, byId), resolvedBy: "id" };
    }
    const byName = children.find((name) => name === folder.name);
    if (!byName)
      throw new Error(
        `No Art Desk ${folder.key} folder under ${root}: neither the configured Drive folder ${folder.id} nor a folder named "${folder.name}" is there.`,
      );
    const foundId = ids.get(byName);
    if (foundId)
      throw new Error(
        `"${folder.name}" under ${root} is Drive folder ${foundId}, not the configured ${folder.key} folder ${folder.id}. Refusing to use it; check whether the exchange was moved, renamed or mirrored from another account.`,
      );
    notes.push(
      `"${folder.name}" under ${root} carries no Drive folder id, so the ${folder.key} folder is matched by name only and its identity is unverified.`,
    );
    return { ...folder, path: path.join(root, byName), resolvedBy: "name" };
  });
  return {
    root,
    folders: resolved,
    paths: Object.fromEntries(
      resolved.map((folder) => [folder.key, folder.path]),
    ),
    notes,
  };
}

/** What Settings shows about the exchange the bench was handed. */
export function exchangeSummary(resolvedOrError) {
  if (resolvedOrError instanceof Error)
    return { ok: false, message: resolvedOrError.message };
  return {
    ok: true,
    root: resolvedOrError.root,
    folders: resolvedOrError.folders.map(({ key, name, id, resolvedBy }) => ({
      key,
      name,
      id,
      resolvedBy,
    })),
    notes: resolvedOrError.notes,
  };
}
