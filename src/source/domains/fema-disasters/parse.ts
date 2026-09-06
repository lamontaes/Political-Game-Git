/**
 * Reading an OpenFEMA response.
 *
 * The API returns an envelope: a `metadata` object describing the query that
 * was run, and an array named after the entity. Both matter. The metadata is
 * the provider's own record of the filter it applied, which is what makes the
 * committed bytes self-describing rather than a set of rows somebody says came
 * from a query.
 */

import { SourceParseError } from "../../core/index";

export interface OpenFemaEnvelope {
  readonly metadata: {
    readonly filter?: string;
    readonly orderby?: string;
    readonly top?: number;
    readonly count?: number;
    readonly entityname?: string;
    readonly version?: string;
    readonly url?: string;
  };
  readonly records: readonly Record<string, unknown>[];
}

/** Read an OpenFEMA payload, keeping the query metadata alongside the rows. */
export function parseOpenFemaEnvelope(
  bytes: Uint8Array,
  entityName: string,
): OpenFemaEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString("utf-8"));
  } catch (error) {
    throw new SourceParseError(
      `The OpenFEMA payload is not JSON: ${(error as Error).message}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new SourceParseError("The OpenFEMA payload is not an object.");
  }
  const envelope = parsed as Record<string, unknown>;
  if ("error" in envelope) {
    throw new SourceParseError(
      `The OpenFEMA payload is an error response: ${JSON.stringify(envelope.error)}`,
    );
  }
  const records = envelope[entityName];
  if (!Array.isArray(records)) {
    throw new SourceParseError(
      `The OpenFEMA payload carries no "${entityName}" array; it holds ${Object.keys(envelope).join(", ")}.`,
    );
  }
  return {
    metadata: (envelope.metadata ?? {}) as OpenFemaEnvelope["metadata"],
    records: records as readonly Record<string, unknown>[],
  };
}
