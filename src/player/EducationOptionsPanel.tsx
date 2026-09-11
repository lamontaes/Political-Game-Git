import { acceptedEducationPath } from "../simulation/education-study-terms";
import { expandInstitution } from "../education/compact";
import type {
  CompactInstitution,
  EducationDictionary,
} from "../education/compact";
import { useEffect, useMemo, useState } from "react";
import type { World } from "../simulation/types";
import type { EducationInstitution } from "../education/types";
import { searchInstitutions } from "../education/catalog";
import {
  applyForEducation,
  educationOptionReason,
  pendingEducationOffers,
  respondToEducationOffer,
} from "../education/study-provider";
export interface EducationOptionsPanelProps {
  world: World;
  onWorldChange: (world: World) => void;
}
export function EducationOptionsPanel({
  world,
  onWorldChange,
}: EducationOptionsPanelProps) {
  const [catalog, setCatalog] = useState<readonly EducationInstitution[]>([]),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState("postsecondary"),
    [offset, setOffset] = useState(0),
    [selected, setSelected] = useState<string | null>(null),
    [compare, setCompare] = useState<string[]>([]),
    [message, setMessage] = useState("Loading institution directory…");
  useEffect(() => {
    let cancelled = false;
    setCatalog([]);
    setMessage("Loading institution directory…");
    void (async () => {
      try {
        const manifest = (await fetch("/education/manifest.json").then((r) => {
          if (!r.ok) throw new Error("Directory manifest unavailable");
          return r.json();
        })) as {
          chunks: {
            kind: string;
            path: string;
            sha256: string;
            recordCount: number;
          }[];
        };
        const rows: EducationInstitution[] = [];
        for (const chunk of manifest.chunks.filter(
          (c) => !kind || c.kind === kind,
        )) {
          if (!/^catalog-[a-f0-9]{64}\.json$/.test(chunk.path))
            throw new Error("Invalid directory manifest");
          const response = await fetch(`/education/${chunk.path}`);
          if (!response.ok) throw new Error("Directory unavailable");
          const bytes = await response.arrayBuffer();
          const hash = [
            ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          ]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          if (hash !== chunk.sha256)
            throw new Error("Directory integrity check failed");
          const payload = JSON.parse(new TextDecoder().decode(bytes)) as {
            dictionary: EducationDictionary;
            records: CompactInstitution[];
          };
          const chunkRows = payload.records.map((r) =>
            expandInstitution(r, payload.dictionary),
          );
          if (chunkRows.length !== chunk.recordCount)
            throw new Error("Incomplete directory");
          rows.push(...chunkRows);
        }
        if (!cancelled) {
          setCatalog(rows);
          setMessage("");
        }
      } catch (e) {
        if (!cancelled)
          setMessage(e instanceof Error ? e.message : "Directory unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind]);
  const availableCatalog = useMemo(() => {
    const byId = new Map<string, EducationInstitution>();
    for (const r of catalog) {
      const prior = byId.get(r.id);
      const expected =
        world.currentDate >= "2025-07-01" ? "2025-26" : "2024-25";
      if (!prior || r.sourceYear === expected) byId.set(r.id, r);
    }
    return [...byId.values()];
  }, [catalog, world.currentDate]);
  const result = useMemo(
    () => searchInstitutions(availableCatalog, query, kind, offset),
    [availableCatalog, query, kind, offset],
  );
  const institution = availableCatalog.find((r) => r.id === selected);
  const act = (result: { ok: boolean; world: World; message: string }) => {
    setMessage(result.message);
    if (result.ok) onWorldChange(result.world);
  };
  return (
    <section aria-label="Real education options">
      <h3>Find a school or college</h3>
      {world.history.educationEnrollments
        .filter(
          (e) =>
            world.control.kind === "person" &&
            e.personId === world.control.personId &&
            e.programKind.startsWith("postsecondary:edu-path7-") &&
            !acceptedEducationPath(world, e.id),
        )
        .map((e) => (
          <p key={e.id}>
            Saved study {e.programKind}: accepted terms unavailable or
            unsupported. Enrollment history is preserved; progression is
            unavailable.
          </p>
        ))}
      <p>
        NCES school (2024–25) and college (2024–25 / 2025–26) directories and
        reported offerings. A listing establishes neither attendance nor
        admission. Study fees and schedules shown below are game-authored.
      </p>
      <label>
        Search institutions{" "}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOffset(0);
          }}
        />
      </label>
      <label>
        Institution type{" "}
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setOffset(0);
          }}
        >
          <option value="">All institutions</option>
          <option value="postsecondary">Colleges</option>
          <option value="school">Public schools</option>
          <option value="district">School districts</option>
        </select>
      </label>
      <p>{result.total.toLocaleString()} matching institutions</p>
      <ul>
        {result.rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setSelected(r.id)}>
              {r.name} — {r.city}, {r.state} ({r.officialId})
            </button>
            <label>
              <input
                type="checkbox"
                checked={compare.includes(r.id)}
                onChange={(e) =>
                  setCompare(
                    e.target.checked
                      ? [...compare, r.id]
                      : compare.filter((id) => id !== r.id),
                  )
                }
              />
              Compare
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={offset === 0}
        onClick={() => setOffset(Math.max(0, offset - 30))}
      >
        Previous institutions
      </button>
      <button
        type="button"
        disabled={offset + 30 >= result.total}
        onClick={() => setOffset(offset + 30)}
      >
        More institutions
      </button>
      {compare.length > 0 && (
        <table>
          <caption>Compare reported institution facts</caption>
          <thead>
            <tr>
              <th>Institution</th>
              <th>Reported status</th>
              <th>Offered capabilities</th>
            </tr>
          </thead>
          <tbody>
            {availableCatalog
              .filter((r) => compare.includes(r.id))
              .map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.statusLabel}</td>
                  <td>
                    {r.capabilities
                      .filter((c) => c.state === "offered")
                      .map((c) => c.label)
                      .join(", ")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
      {institution && (
        <section aria-label="Institution details">
          <h4>{institution.name}</h4>
          <p>
            {institution.id} · {institution.statusLabel} · {institution.release}
          </p>
          <p>
            County: {institution.countyGeoid ?? "not supplied"}. Historical
            founding: unknown. Exact tuition and program-specific admission
            prerequisites: not established.
          </p>
          <ul>
            {institution.capabilities
              .filter((c) => c.state === "offered")
              .map((c) => (
                <li key={c.code}>
                  {c.label}
                  {c.kind === "noncredit" ? (
                    <>
                      <p>
                        {educationOptionReason(world, institution, c) ??
                          "Game-authored option: eight two-hour sessions, at least seven days apart; $25 per attended session. Completion records noncredit study, never a degree or license."}
                      </p>
                      <button
                        type="button"
                        disabled={
                          !!educationOptionReason(world, institution, c)
                        }
                        onClick={() =>
                          act(applyForEducation(world, institution, c.code))
                        }
                      >
                        Request {c.label.trim()} study offer
                      </button>
                    </>
                  ) : (
                    <p>
                      Information only. A specific program and admission route
                      are not established.
                    </p>
                  )}
                </li>
              ))}
          </ul>
          <details>
            <summary>Source evidence</summary>
            <ul>
              {institution.evidence.map((e) => (
                <li key={e.artifactId}>
                  {e.artifactId}, {e.member}, row {e.row}; SHA-256 {e.sha256}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
      {pendingEducationOffers(world).map((offer) => (
        <section key={offer.id} aria-label="Study offer">
          <h4>Review noncredit study offer</h4>
          <p>
            Game-authored terms: eight two-hour sessions, at least seven days
            apart, $25 charged per attended session. No academic degree or
            professional license. Accept today or request fresh terms later.
          </p>
          <button
            type="button"
            onClick={() => act(respondToEducationOffer(world, offer.id, true))}
          >
            Accept study offer
          </button>
          <button
            type="button"
            onClick={() => act(respondToEducationOffer(world, offer.id, false))}
          >
            Decline study offer
          </button>
        </section>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
