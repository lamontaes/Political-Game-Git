import {
  openProductionArtifacts,
  parseDelimited,
  readXlsxSheet,
  readZipMember,
  type ArtifactLock,
} from "../../core/index";
import type { SchoolTuitionInput } from "../../../education/tuition-prices";

/** Replay the acquired rows and their dictionary; never supply absent amounts. */
export function compileSchoolTuitionInput(
  lock: ArtifactLock,
): SchoolTuitionInput {
  const roles = Object.fromEntries(
    lock.artifacts.map((row) => [row.artifactId, row.artifactId]),
  );
  const opened = openProductionArtifacts("education", lock, roles).artifacts;
  const artifacts = Object.fromEntries(
    lock.artifacts.map((row) => [row.artifactId, { sha256: row.bytes.sha256 }]),
  );
  const definitions: Record<string, SchoolTuitionInput["definitions"][string]> =
    {};
  const components: Record<string, SchoolTuitionInput["components"][string]> =
    {};
  for (const key of Object.keys(opened)
    .filter((key) => !key.endsWith("_Dict"))
    .sort()) {
    const data = opened[key]!;
    const dictionary = opened[`${key}_Dict`];
    if (!dictionary)
      throw new Error(`Missing student-charge dictionary for ${key}.`);
    const member = `${key.toLowerCase()}.csv`;
    const dictionaryMember = `${key.toLowerCase()}.xlsx`;
    const workbook = readZipMember(dictionary.bytes, dictionaryMember);
    const descriptions = new Map(
      readXlsxSheet(workbook, "Description").rows.map((row) => [
        row[1],
        row[2] ?? "",
      ]),
    );
    const columns: string[] = [];
    const dictionaryRows = readXlsxSheet(workbook, "varlist").rows;
    for (let index = 0; index < dictionaryRows.length; index += 1) {
      const row = dictionaryRows[index]!;
      const field = row[1] ?? "";
      const price =
        /^(TUITION|FEE|HRCHG)/.test(field) ||
        /^CHG[123]A[TF][0-3]$/.test(field) ||
        /^CIPTUIT/.test(field) ||
        /^CHG1PY[0-3]$/.test(field);
      if (!price && !/^(CIPCODE|CIPLGTH|PRGMSR)/.test(field)) continue;
      const label = row[6] ?? "";
      const description = descriptions.get(field) ?? "";
      definitions[`${key}:${field}`] = {
        label,
        description,
        chargeUnit: !price
          ? null
          : field.startsWith("HRCHG")
            ? "credit-hour"
            : key.endsWith("_AY")
              ? "academic-year"
              : "program",
        academicYear:
          /20\d{2}-\d{2}/.exec(`${label} ${description}`)?.[0] ?? null,
        imputationField: row[5] ?? "",
        dictionaryEvidence: {
          artifactId: `${key}_Dict`,
          sha256: dictionary.artifact.bytes.sha256,
          member: dictionaryMember,
          sheet: "varlist",
          row: index + 1,
          field,
        },
      };
      columns.push(field);
    }
    for (const field of [...columns]) {
      const flag = definitions[`${key}:${field}`]!.imputationField;
      if (flag && !columns.includes(flag)) columns.push(flag);
    }
    const parsed = parseDelimited(readZipMember(data.bytes, member), {
      delimiter: ",",
      hasHeaderRow: false,
      trimFields: true,
    });
    if (parsed.defects.length || !parsed.rows.length)
      throw new Error(`Invalid student-charge source ${key}.`);
    const header = parsed.rows[0]!.fields;
    const rows = parsed.rows.slice(1);
    // NCES's acquired program file appends an unnamed empty field to every
    // data row. Accept only that measured empty tail; named columns stay exact.
    if (
      rows.some(
        (row) =>
          row.fields.length !== header.length &&
          !(
            row.fields.length === header.length + 1 && row.fields.at(-1) === ""
          ),
      )
    )
      throw new Error(`Unexpected student-charge row width in ${key}.`);
    const unitColumn = header.indexOf("UNITID");
    if (unitColumn < 0) throw new Error(`Missing UNITID in ${key}.`);
    const sourceColumns = columns.map((column) => header.indexOf(column));
    components[key] = {
      member,
      columns,
      rows: rows
        .map(
          (row) =>
            [
              `ipeds-unit:${row.fields[unitColumn]}`,
              row.line,
              sourceColumns.map((column) =>
                column < 0 ? "" : (row.fields[column] ?? ""),
              ),
            ] as const,
        )
        .sort((a, b) => a[0].localeCompare(b[0])),
    };
  }
  return { artifacts, definitions, components };
}

/** One source row per line; callers load it through the existing directory lane. */
export function tuitionInputJson(input: SchoolTuitionInput): string {
  const parts = Object.entries(input.components).map(
    ([key, component]) =>
      `${JSON.stringify(key)}:{"member":${JSON.stringify(component.member)},"columns":${JSON.stringify(component.columns)},"rows":[\n${component.rows.map((row) => JSON.stringify(row)).join(",\n")}\n]}`,
  );
  return `{"artifacts":${JSON.stringify(input.artifacts)},"definitions":${JSON.stringify(input.definitions)},"components":{\n${parts.join(",\n")}\n}}\n`;
}
