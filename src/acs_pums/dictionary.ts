import type {
  PumsDataDictionary,
  PumsVariableDefinition,
  PumsValueCodeDefinition,
} from "./types.js";

/**
 * Parses raw CSV content from Census PUMS_Data_Dictionary_YYYY.csv.
 * Format of Census Data Dictionary CSV lines:
 * NAME,var_name,type,len,description
 * VAL,var_name,type,len,val_min,val_max,val_label
 */
export function parsePumsDataDictionary(
  csvContent: string,
  vintage = "2023",
): PumsDataDictionary {
  const lines = csvContent.split(/\r?\n/);
  const variables: Record<string, PumsVariableDefinition> = {};

  let currentVar: PumsVariableDefinition | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple CSV parser handling quotes
    const tokens = parseCsvLine(line);
    if (tokens.length < 2) continue;

    const rowType = tokens[0]?.trim();

    if (rowType === "NAME") {
      const name = tokens[1]?.trim();
      const dataType = (tokens[2]?.trim().toUpperCase() === "N" ? "N" : "C") as
        "C" | "N";
      const length = parseInt(tokens[3]?.trim() || "0", 10);
      const description = tokens[4]?.trim() || "";

      if (name) {
        currentVar = {
          name,
          record_type: "H", // default, refined if needed
          data_type: dataType,
          length,
          description,
          values: [],
        };
        variables[name] = currentVar;
      }
    } else if (rowType === "VAL" && currentVar) {
      const varName = tokens[1]?.trim();
      if (varName === currentVar.name) {
        const valMin = tokens[4]?.trim() || "";
        const valMax = tokens[5]?.trim() || "";
        const label =
          tokens[6]?.trim() || tokens[5]?.trim() || tokens[4]?.trim() || "";

        const codeStr = valMin === valMax ? valMin : `${valMin}..${valMax}`;
        const isMissingOrNa =
          label.toLowerCase().includes("n/a") ||
          label.toLowerCase().includes("not applicable") ||
          label.toLowerCase().includes("blank") ||
          valMin === "b" ||
          valMin === "b.b" ||
          valMin === "-1";

        const valDef: PumsValueCodeDefinition = {
          code: codeStr,
          label,
          is_missing_or_not_applicable: isMissingOrNa,
        };
        currentVar.values.push(valDef);
      }
    }
  }

  return {
    vintage,
    variables,
  };
}

function parseCsvLine(line: string): string[] {
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
