import { useMemo, useState } from "react";

import {
  CONTENT_AUTHORITIES,
  CONTENT_DIMENSIONS,
  CONTENT_STATUSES,
  contentFacetOptions,
  contentIndex,
  declaredList,
  exportContentIndex,
  queryContentItems,
  type ContentAuthority,
  type ContentDimension,
  type ContentFacet,
  type ContentItem,
  type ContentQuery,
  type ContentStatus,
} from "../content";
import "./content-browser.css";

/**
 * A development surface for reading what the game has written down.
 *
 * It answers the questions a review actually asks — what content exists, where
 * did it come from, what can trigger it, what canonical facts does it require,
 * what does it expose, where can it lead, and is it something a player can
 * reach at all — from the banks themselves, through adapters. It holds no
 * world, starts no game, and cannot change anything: everything on screen is
 * a read of module constants.
 *
 * It is deliberately unreachable from ordinary play. Nothing in the player
 * shell links here; `?view=content` is the only way in, alongside the other
 * development routes.
 */
export function ContentBrowserView() {
  const index = useMemo(() => contentIndex(), []);
  const facets = useMemo(() => contentFacetOptions(index.items), [index]);

  const [text, setText] = useState("");
  const [bankId, setBankId] = useState("");
  const [domain, setDomain] = useState("");
  const [family, setFamily] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [role, setRole] = useState("");
  const [authority, setAuthority] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [onlyWithPrerequisites, setOnlyWithPrerequisites] = useState(false);
  const [undeclaredDimension, setUndeclaredDimension] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const query: ContentQuery = useMemo(
    () => ({
      text,
      bankIds: bankId ? [bankId as `${string}.${string}`] : undefined,
      domains: domain ? [domain] : undefined,
      families: family ? [family] : undefined,
      lifeStages: lifeStage ? [lifeStage] : undefined,
      roles: role ? [role] : undefined,
      authorities: authority ? [authority as ContentAuthority] : undefined,
      statuses: status ? [status as ContentStatus] : undefined,
      tags: tag ? [tag] : undefined,
      hasPrerequisites: onlyWithPrerequisites ? true : undefined,
      undeclaredDimensions: undeclaredDimension
        ? [undeclaredDimension as ContentDimension]
        : undefined,
    }),
    [
      text,
      bankId,
      domain,
      family,
      lifeStage,
      role,
      authority,
      status,
      tag,
      onlyWithPrerequisites,
      undeclaredDimension,
    ],
  );

  const results = useMemo(
    () => queryContentItems(index.items, query),
    [index, query],
  );
  const selected =
    results.find((item) => item.id === selectedId) ?? results[0] ?? null;

  function downloadExport(): void {
    const exported = exportContentIndex(index);
    saveFile("content-index.md", "text/markdown", exported.markdown);
    saveFile("content-index.json", "application/json", `${exported.json}\n`);
    setExportStatus(
      `Wrote content-index.md and content-index.json for content digest ${exported.contentDigest}.`,
    );
  }

  return (
    <main className="content-browser" data-testid="content-browser">
      <header className="content-browser__masthead">
        <p className="content-browser__eyebrow">
          Development tooling · not part of play
        </p>
        <h1>Content browser</h1>
        <p className="content-browser__lede">
          Every authored bank the game registers, read through its own source
          module. Nothing here is authored and nothing here is selected: a bank
          that does not declare a dimension says so, with its reason, rather
          than having one filled in on its behalf.
        </p>
        <p className="content-browser__lede content-browser__digest">
          <span data-testid="content-browser-digest">
            digest {index.contentDigest}
          </span>{" "}
          ·{" "}
          <span data-testid="content-browser-bank-count">
            {index.banks.length} banks
          </span>{" "}
          ·{" "}
          <span data-testid="content-browser-item-count">
            {index.items.length} items
          </span>
        </p>
      </header>

      <section
        className="content-browser__toolbar"
        aria-label="Search and filter"
      >
        <label className="content-browser__control">
          Search
          <input
            type="search"
            value={text}
            placeholder="Any word, key or id"
            data-testid="content-browser-search"
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <Choice
          label="Bank"
          value={bankId}
          testId="content-browser-filter-bank"
          options={index.banks.map((bank) => bank.id)}
          onChange={setBankId}
        />
        <Choice
          label="Domain"
          value={domain}
          testId="content-browser-filter-domain"
          options={facets.domains}
          onChange={setDomain}
        />
        <Choice
          label="Thread / family"
          value={family}
          testId="content-browser-filter-family"
          options={facets.families}
          onChange={setFamily}
        />
        <Choice
          label="Life stage"
          value={lifeStage}
          testId="content-browser-filter-life-stage"
          options={facets.lifeStages}
          onChange={setLifeStage}
        />
        <Choice
          label="Speaker / role"
          value={role}
          testId="content-browser-filter-role"
          options={facets.roles}
          onChange={setRole}
        />
        <Choice
          label="Authority"
          value={authority}
          testId="content-browser-filter-authority"
          options={CONTENT_AUTHORITIES.filter((value) =>
            facets.authorities.includes(value),
          )}
          onChange={setAuthority}
        />
        <Choice
          label="Status"
          value={status}
          testId="content-browser-filter-status"
          options={CONTENT_STATUSES.filter((value) =>
            facets.statuses.includes(value),
          )}
          onChange={setStatus}
        />
        <Choice
          label="Tag"
          value={tag}
          testId="content-browser-filter-tag"
          options={facets.tags}
          onChange={setTag}
        />
        <Choice
          label="Undeclared dimension"
          value={undeclaredDimension}
          testId="content-browser-filter-undeclared"
          options={CONTENT_DIMENSIONS}
          onChange={setUndeclaredDimension}
        />
        <label className="content-browser__check">
          <input
            type="checkbox"
            checked={onlyWithPrerequisites}
            data-testid="content-browser-filter-prerequisites"
            onChange={(event) => setOnlyWithPrerequisites(event.target.checked)}
          />
          Declares prerequisites or required facts
        </label>
        <button
          type="button"
          data-testid="content-browser-export"
          onClick={downloadExport}
        >
          Export Markdown and JSON
        </button>
      </section>

      {exportStatus ? (
        <p
          className="content-browser__lede"
          role="status"
          data-testid="content-browser-export-status"
        >
          {exportStatus}
        </p>
      ) : null}

      <div className="content-browser__layout">
        <section aria-label="Results">
          <h2 className="content-browser__eyebrow">
            <span data-testid="content-browser-result-count">
              {results.length}
            </span>{" "}
            of {index.items.length} items
          </h2>
          <div
            className="content-browser__results"
            data-testid="content-browser-results"
          >
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                className="content-browser__result"
                data-testid="content-browser-result"
                data-content-id={item.id}
                aria-current={selected?.id === item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span className="content-browser__result-title">
                  {item.title}
                </span>
                <span className="content-browser__result-id">{item.id}</span>
                <span className="content-browser__badges">
                  <Badge value={item.domain} />
                  <Badge value={item.family} />
                  <Badge value={item.authority} />
                  <Badge value={item.status} />
                </span>
              </button>
            ))}
            {results.length === 0 ? (
              <p
                className="content-browser__empty"
                data-testid="content-browser-empty"
              >
                Nothing in the index matches those filters.
              </p>
            ) : null}
          </div>
        </section>

        {selected ? (
          <Detail item={selected} />
        ) : (
          <p className="content-browser__empty">
            Choose an item to read what its bank declares about it.
          </p>
        )}
      </div>
    </main>
  );
}

function Detail({ item }: { readonly item: ContentItem }) {
  return (
    <article
      className="content-browser__detail"
      data-testid="content-browser-detail"
      data-content-id={item.id}
    >
      <div>
        <h2>{item.title}</h2>
        <p className="content-browser__result-id">{item.id}</p>
      </div>
      <p>{item.summary}</p>
      <dl className="content-browser__facts">
        <dt>Bank</dt>
        <dd className="content-browser__key">{item.bankId}</dd>
        <dt>Item key</dt>
        <dd className="content-browser__key">{item.itemKey}</dd>
        <dt>Domain</dt>
        <dd>{item.domain}</dd>
        <dt>Thread / family</dt>
        <dd>{item.family}</dd>
        <dt>Authority</dt>
        <dd data-testid="content-browser-detail-authority">{item.authority}</dd>
        <dt>Status</dt>
        <dd data-testid="content-browser-detail-status">{item.status}</dd>
        <dt>Life stages</dt>
        <dd>
          {item.lifeStages.kind === "declared" ? (
            item.lifeStages.value.join(", ")
          ) : (
            <Undeclared reason={item.lifeStages.reason} />
          )}
        </dd>
        <dt>Source</dt>
        <dd className="content-browser__key">
          {item.provenance.sourceModule} · {item.provenance.sourceSymbol}
        </dd>
        {item.provenance.citation ? (
          <>
            <dt>Citation</dt>
            <dd>{item.provenance.citation}</dd>
          </>
        ) : null}
        {item.provenance.sourceUrl ? (
          <>
            <dt>Source URL</dt>
            <dd className="content-browser__key">
              {item.provenance.sourceUrl}
            </dd>
          </>
        ) : null}
        {item.provenance.retrievedAt ? (
          <>
            <dt>Retrieved</dt>
            <dd>{item.provenance.retrievedAt}</dd>
          </>
        ) : null}
        {item.provenance.verification ? (
          <>
            <dt>Verification</dt>
            <dd>{item.provenance.verification}</dd>
          </>
        ) : null}
        {item.provenance.note ? (
          <>
            <dt>Note</dt>
            <dd>{item.provenance.note}</dd>
          </>
        ) : null}
        <dt>Tags</dt>
        <dd className="content-browser__key">
          {item.tags.length > 0 ? item.tags.join(" · ") : "none"}
        </dd>
      </dl>

      <Facet
        heading="Speaker and role requirements"
        facet={item.roles}
        write={(role) =>
          `${role.key}${role.required ? "" : " (optional)"} — ${role.description}`
        }
      />
      <Facet
        heading="Prerequisites"
        facet={item.prerequisites}
        write={(rule) => `${rule.key} — ${rule.description}`}
      />
      <Facet
        heading="Required canonical facts"
        facet={item.requiredFacts}
        write={(rule) => `${rule.key} — ${rule.description}`}
      />
      <Facet
        heading="Variable and name slots"
        facet={item.slots}
        write={(slot) => `${slot.key} — ${slot.description}`}
      />
      <Facet
        heading="Options"
        facet={item.options}
        write={(option) =>
          `${option.key} — ${option.label} — ${option.description}`
        }
      />
      <Facet
        heading="Follow-up hooks"
        facet={item.followUps}
        write={(hook) => `${hook.key} — ${hook.description}`}
      />
      <Facet
        heading="Declared structure"
        facet={item.attributes}
        write={(attribute) =>
          `${attribute.key} — ${attribute.label} — ${attribute.description}`
        }
      />
      <Facet
        heading="Unresolved research"
        facet={item.unresolvedResearch}
        write={(gap) => `${gap.key} — ${gap.description}`}
      />
      {item.provenance.sources.length > 0 ? (
        <section className="content-browser__facet">
          <h3>Cited sources</h3>
          <ul>
            {item.provenance.sources.map((source) => (
              <li key={source.citation}>
                {source.sourceTitle}, {source.citation} — {source.authority},{" "}
                {source.verification}
                {source.retrievedAt ? `, retrieved ${source.retrievedAt}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function Facet<T>({
  heading,
  facet,
  write,
}: {
  readonly heading: string;
  readonly facet: ContentFacet<readonly T[]>;
  readonly write: (value: T) => string;
}) {
  const values = declaredList(facet);
  return (
    <section className="content-browser__facet">
      <h3>{heading}</h3>
      {facet.kind === "undeclared" ? (
        <Undeclared reason={facet.reason} />
      ) : values.length === 0 ? (
        <p className="content-browser__undeclared">None declared.</p>
      ) : (
        <ul>
          {values.map((value, position) => (
            <li key={position}>{write(value)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Undeclared({ reason }: { readonly reason: string }) {
  return (
    <p
      className="content-browser__undeclared"
      data-testid="content-browser-undeclared"
    >
      Not declared by the source bank — {reason}
    </p>
  );
}

function Badge({ value }: { readonly value: string }) {
  return (
    <span className={`content-browser__badge content-browser__badge--${value}`}>
      {value}
    </span>
  );
}

function Choice({
  label,
  value,
  options,
  testId,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly testId: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="content-browser__control">
      {label}
      <select
        value={value}
        data-testid={testId}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Hands the reviewer a file. The browser is a development route, so this is
 * the whole delivery mechanism: no server, no world, no persistence. */
function saveFile(name: string, type: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
