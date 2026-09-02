import type {
  PumsHousingRecord,
  PumsPersonRecord,
  PumsHouseholdCluster,
} from "./types.js";

export function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

export function parseCsvHeaderAndRows(csvContent: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error("CSV content is empty");
  }

  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error("CSV content is empty");
  }

  const headers = parseCsvRow(firstLine).map((h) => h.trim());
  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const row = parseCsvRow(line);
    if (row.length !== headers.length) {
      throw new Error(
        `Malformed CSV row at line ${i + 1}: expected ${headers.length} columns, got ${row.length}`,
      );
    }
    rows.push(row);
  }

  return { headers, rows };
}

export function parseHousingRecord(
  headers: string[],
  row: string[],
): PumsHousingRecord {
  const record: Record<string, string | number | null> = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header) continue;
    const val = row[i]?.trim();

    if (val === "" || val === undefined) {
      record[header] = null;
    } else if (
      header === "WGTP" ||
      header === "ADJINC" ||
      header === "NP" ||
      header === "VALP" ||
      header === "FINCP"
    ) {
      const num = Number(val);
      record[header] = Number.isNaN(num) ? val : num;
    } else {
      record[header] = val;
    }
  }

  if (record.RT !== "H") {
    throw new Error(
      `Invalid Housing Record RT: expected 'H', got '${record.RT}'`,
    );
  }
  if (!record.SERIALNO || typeof record.SERIALNO !== "string") {
    throw new Error("Housing record missing required SERIALNO");
  }
  if (record.WGTP === undefined || record.WGTP === null) {
    throw new Error("Housing record missing required WGTP weight field");
  }

  return record as unknown as PumsHousingRecord;
}

export function parsePersonRecord(
  headers: string[],
  row: string[],
): PumsPersonRecord {
  const record: Record<string, string | number | null> = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (!header) continue;
    const val = row[i]?.trim();

    if (val === "" || val === undefined) {
      record[header] = null;
    } else if (
      header === "PWGTP" ||
      header === "AGEP" ||
      header === "SPORDER" ||
      header === "WAGP" ||
      header === "PINCP" ||
      header === "PERNP"
    ) {
      const num = Number(val);
      record[header] = Number.isNaN(num) ? val : num;
    } else {
      record[header] = val;
    }
  }

  if (record.RT !== "P") {
    throw new Error(
      `Invalid Person Record RT: expected 'P', got '${record.RT}'`,
    );
  }
  if (!record.SERIALNO || typeof record.SERIALNO !== "string") {
    throw new Error("Person record missing required SERIALNO");
  }
  if (record.SPORDER === undefined || record.SPORDER === null) {
    throw new Error("Person record missing required SPORDER field");
  }
  if (record.PWGTP === undefined || record.PWGTP === null) {
    throw new Error("Person record missing required PWGTP weight field");
  }

  return record as unknown as PumsPersonRecord;
}

export function compileHouseholdClusters(
  housingRecords: PumsHousingRecord[],
  personRecords: PumsPersonRecord[],
): PumsHouseholdCluster[] {
  const personMap = new Map<string, PumsPersonRecord[]>();

  for (const person of personRecords) {
    const serial = person.SERIALNO;
    let list = personMap.get(serial);
    if (!list) {
      list = [];
      personMap.set(serial, list);
    }
    list.push(person);
  }

  const clusters: PumsHouseholdCluster[] = [];

  for (const housing of housingRecords) {
    const persons = personMap.get(housing.SERIALNO) || [];
    // Sort persons deterministically by SPORDER
    persons.sort((a, b) => Number(a.SPORDER) - Number(b.SPORDER));

    clusters.push({
      housing,
      persons,
    });
  }

  return clusters;
}
