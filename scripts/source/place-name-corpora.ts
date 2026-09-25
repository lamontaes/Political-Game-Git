import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Names people carry in Puerto Rico and the territories, measured from the
 * education directory the game already ships (`public/education`, the 2025-26
 * CCD school file).
 *
 * The national corpus comes from the SSA and Census tables, and neither
 * covers Puerto Rico's births or the territories' households, so a life begun
 * in Mayagüez was named like a life begun in Ohio. The island's public
 * schools are overwhelmingly named for people, written the way the island
 * writes a name: given name, the father's first surname, the mother's first
 * surname ("Oscar Rodríguez Rivera"). This reads those honorees and keeps:
 *
 *   - each given name carried by at least two distinct honorees, with how
 *     many, split by the sex lists below;
 *   - each surname carried by at least two distinct honorees, with how many;
 *   - how many honorees are written with one surname and how many with two.
 *
 * No honoree's full name is kept, and a school named for the same person in
 * several towns counts that person once, so Luis Muñoz Rivera does not make
 * Muñoz the island's commonest name.
 *
 * What this cannot say: honorees were mostly born between 1850 and 1950, so
 * the given names are that era's, and their surnames are those of people a
 * town chose to honor. `puerto-rico-and-territory-names` asks for the
 * Demographic Registry's names by birth year and the census surname counts.
 *
 * The territories are measured the same way and reported, but their honoree
 * counts are too small to draw a population's names from, so their lives
 * keep the national draw until that request is answered.
 */

export const MEASURED_PLACES = ["PR", "GU", "MP", "VI", "AS"] as const;
export type MeasuredPlace = (typeof MEASURED_PLACES)[number];

/** The fewest distinct honorees a name needs before a life can be given it. */
export const MINIMUM_HONOREES = 2;

const TITLES =
  /^(DR|DRA|PROF|PROFA|PROFESORA|PROFESOR|SOR|HON|LCDO|LCDA|MONSENOR|MONS|REV|PADRE|MADRE|SGT|GEN|CAPT|CAPITAN|MAESTRA|MAESTRO|DON|DONA|SR|SRA|MRS|MR|MS|MISS|CHIEF|ADMIRAL|SEN|GOV|JUDGE|FRAY|MT|ST)\.?$/;
const SCHOOL_WORDS =
  /\b(ESCUELA|ESC|SU|S\.U\.|SEGUNDA|UNIDAD|INTERMEDIA|SUPERIOR|ELEMENTAL|VOCACIONAL|PREVOCACIONAL|PRETECNICA|ACADEMIA|COLEGIO|CENTRO|INSTITUTO|ESPECIALIZADA|BILINGUE|MONTESSORI|HIGH|MIDDLE|ELEMENTARY|SCHOOL|JR|SR|JUNIOR|SENIOR|EARLY|HEAD|START|ACADEMY|COMPLEX|EDUCATIONAL|CAMPUS|ANEXO|URBANA|RURAL|VOCATIONAL|TECHNICAL|SUCCESS)\b.*$/;
const ARTICLES = new Set(["LA", "LAS", "LOS"]);
// "de Jesús" and "del Valle" are surnames. "de Muñoz" after a woman's own
// surname is her husband's, and ends her own name.
const PARTICLE_SURNAMES = new Set([
  "JESUS",
  "LEON",
  "VALLE",
  "RIO",
  "LA CRUZ",
  "LA ROSA",
  "LA TORRE",
  "LA PAZ",
  "LOS SANTOS",
  "LA FUENTE",
]);

/**
 * Given names by sex. Written out, not inferred from spelling: a name the
 * lists do not carry is left out of the draw and counted as unclassified.
 */
const MALE = new Set(
  "ABELARDO ABRAHAM ADALBERTO ADOLFO ALBERTO ALEJANDRO ALFONSO ALFREDO ANDRES ANGEL ANIBAL ANTONIO ARTURO BENIGNO BENJAMIN BERNARDO CARLOS CARMELO CRISTOBAL DANIEL DAVID DIEGO DOMINGO EDUARDO EFRAIN EMILIO ENRIQUE ERNESTO ESTEBAN EUGENIO FEDERICO FELIPE FELIX FERNANDO FRANCISCO GERARDO GERMAN GUILLERMO HECTOR HERMINIO IGNACIO ISMAEL JAIME JESUS JOAQUIN JORGE JOSE JUAN JULIAN JULIO LORENZO LUIS MANUEL MARCIAL MARIANO MARTIN MATIAS MIGUEL NICOLAS OSCAR PABLO PEDRO RAFAEL RAMON RAUL RICARDO ROBERTO RUBEN SALVADOR SANTIAGO SEBASTIAN TEODORO TOMAS VICENTE VICTOR".split(
    " ",
  ),
);
const FEMALE = new Set(
  "ADELA AMALIA ANA ANGELA ANGELICA ANTONIA AUREA AURORA BLANCA CARMEN CLARA CONCEPCION CRISTINA DELIA ELSA ELVIRA ESPERANZA FLORENCIA GLORIA HERMINIA INES ISABEL JOSEFA JOSEFINA JUANA JUANITA JULIA LAURA LIDIA LUISA LUZ MANUELA MARGARITA MARIA MARTA MERCEDES OLGA PAULA PETRA ROSA TERESA VIRGINIA".split(
    " ",
  ),
);

const GIVEN_AND_SURNAME = new Set(["SANTIAGO", "MARTIN", "ROMAN", "LORENZO"]);

/** The island's spelling of the names the directory writes without accents. */
const ACCENTED: Readonly<Record<string, string>> = {
  ALVAREZ: "Álvarez",
  ANDRES: "Andrés",
  ANGEL: "Ángel",
  ANGELICA: "Angélica",
  AUREA: "Áurea",
  AVILES: "Avilés",
  BAEZ: "Báez",
  BAUZA: "Bauzá",
  BARCELO: "Barceló",
  BELEN: "Belén",
  BENITEZ: "Benítez",
  BERRIOS: "Berríos",
  CARRION: "Carrión",
  CINTRON: "Cintrón",
  COLON: "Colón",
  CONCEPCION: "Concepción",
  CORDOVA: "Córdova",
  CRISTOBAL: "Cristóbal",
  DAVILA: "Dávila",
  DIAZ: "Díaz",
  EFRAIN: "Efraín",
  FELIX: "Félix",
  FERNANDEZ: "Fernández",
  GANDIA: "Gandía",
  GARCIA: "García",
  GERMAN: "Germán",
  GOMEZ: "Gómez",
  GONZALEZ: "González",
  GUTIERREZ: "Gutiérrez",
  GUZMAN: "Guzmán",
  HECTOR: "Héctor",
  HERNANDEZ: "Hernández",
  INES: "Inés",
  JESUS: "Jesús",
  JIMENEZ: "Jiménez",
  JOAQUIN: "Joaquín",
  JOSE: "José",
  JULIAN: "Julián",
  LEBRON: "Lebrón",
  LEON: "León",
  LOPEZ: "López",
  MARIA: "María",
  MARIN: "Marín",
  MARQUEZ: "Márquez",
  MARTIN: "Martín",
  MARTINEZ: "Martínez",
  MATIAS: "Matías",
  MELENDEZ: "Meléndez",
  MENDEZ: "Méndez",
  MILLAN: "Millán",
  MUNIZ: "Muñiz",
  MUNOZ: "Muñoz",
  NEGRON: "Negrón",
  NICOLAS: "Nicolás",
  NUNEZ: "Núñez",
  OSCAR: "Óscar",
  PAGAN: "Pagán",
  PALES: "Palés",
  PENA: "Peña",
  PEREZ: "Pérez",
  PINERO: "Piñero",
  QUINONES: "Quiñones",
  RAMIREZ: "Ramírez",
  RAMON: "Ramón",
  RAUL: "Raúl",
  RIO: "Río",
  RODRIGUEZ: "Rodríguez",
  ROLON: "Rolón",
  ROMAN: "Román",
  RUBEN: "Rubén",
  RUIZ: "Ruiz",
  SANCHEZ: "Sánchez",
  SANDIN: "Sandín",
  SEBASTIAN: "Sebastián",
  SELLES: "Sellés",
  SOLA: "Solá",
  SUAREZ: "Suárez",
  TOMAS: "Tomás",
  VAZQUEZ: "Vázquez",
  VELEZ: "Vélez",
  VICTOR: "Víctor",
};

function spelled(upper: string): string {
  return upper
    .split(" ")
    .map((word, index) => {
      if (ACCENTED[word]) return ACCENTED[word];
      const lower = word.toLowerCase();
      if (
        index > 0 &&
        (ARTICLES.has(word) || word === "DE" || word === "DEL")
      ) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

interface Honoree {
  readonly given: string;
  readonly surnames: readonly string[];
}

/** One school name read as a person's name, or null where it is not one. */
export function honoreeFromSchoolName(
  schoolName: string,
  town: string,
): Honoree | null {
  let name = schoolName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  for (const word of town.toUpperCase().split(/[\s.]+/)) {
    if (word.length > 2) {
      name = name.replace(new RegExp(`\\b${word}\\b`, "g"), " ");
    }
  }
  name = name
    .replace(/\(.*?\)/g, " ")
    .replace(/\s-\s.*$/, " ")
    .replace(SCHOOL_WORDS, "")
    .replace(/,/g, " ")
    .trim();
  if (/\d/.test(name)) return null;
  const tokens = name.split(/\s+/).filter(Boolean);
  while (tokens.length > 0 && TITLES.test(tokens[0]!)) tokens.shift();
  const given = tokens.shift();
  if (given === undefined || !(MALE.has(given) || FEMALE.has(given))) {
    return null;
  }
  const units: { text: string; particle: boolean; base: string }[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const word = tokens[index]!;
    if (/^[A-Z]\.?$/.test(word) || /^(Y|II|III|IV)$/.test(word)) continue;
    if ((word === "DE" || word === "DEL") && index + 1 < tokens.length) {
      let base = tokens[index + 1]!;
      let last = index + 1;
      if (ARTICLES.has(base) && index + 2 < tokens.length) {
        base = `${base} ${tokens[index + 2]!}`;
        last = index + 2;
      }
      units.push({ text: `${word} ${base}`, particle: true, base });
      index = last;
      continue;
    }
    units.push({ text: word, particle: false, base: word });
  }
  // A second given name ("Carmen Noelia Peraza Toledo", "Juan José Osuna")
  // comes before the surnames. Santiago and Román are surnames as often.
  if (
    !units[0]?.particle &&
    (units.length >= 3 ||
      (units.length === 2 &&
        (MALE.has(units[0]!.text) || FEMALE.has(units[0]!.text)) &&
        !GIVEN_AND_SURNAME.has(units[0]!.text)))
  ) {
    units.shift();
  }
  const surnames: string[] = [];
  for (const unit of units) {
    if (unit.particle && !PARTICLE_SURNAMES.has(unit.base)) {
      if (surnames.length > 0) break;
      return null;
    }
    surnames.push(unit.text);
  }
  if (surnames.length < 1 || surnames.length > 2) return null;
  return { given, surnames };
}

type CompactRecord = readonly [
  string,
  string,
  string,
  string,
  string,
  ...unknown[],
];

const byCount = (counts: Map<string, number>, floor: number) =>
  [...counts]
    .filter(([, count]) => count >= floor)
    .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
    .map(([name, count]) => [spelled(name), count] as [string, number]);

export function measurePlaceNameCorpora(root = ".") {
  const manifest = JSON.parse(
    readFileSync(join(root, "public/education/manifest.json"), "utf8"),
  ) as { chunks: { kind: string; path: string }[] };
  const chunk = manifest.chunks.find((entry) => entry.kind === "school")!;
  const catalog = JSON.parse(
    readFileSync(join(root, "public/education", chunk.path), "utf8"),
  ) as { records: CompactRecord[] };

  const places: Record<string, unknown> = {};
  for (const place of MEASURED_PLACES) {
    const honorees = new Map<string, Honoree>();
    let schools = 0;
    for (const record of catalog.records) {
      const [, , name, town, state] = record;
      if (state !== place) continue;
      schools += 1;
      const honoree = honoreeFromSchoolName(name, town);
      if (honoree) {
        honorees.set(`${honoree.given}|${honoree.surnames.join(" ")}`, honoree);
      }
    }
    const male = new Map<string, number>();
    const female = new Map<string, number>();
    const surnames = new Map<string, number>();
    let twoSurnames = 0;
    for (const { given, surnames: own } of honorees.values()) {
      const table = MALE.has(given) ? male : female;
      table.set(given, (table.get(given) ?? 0) + 1);
      for (const surname of own) {
        surnames.set(surname, (surnames.get(surname) ?? 0) + 1);
      }
      if (own.length === 2) twoSurnames += 1;
    }
    places[place] = {
      schools,
      honorees: honorees.size,
      honoreesWithTwoSurnames: twoSurnames,
      given: {
        male: byCount(male, MINIMUM_HONOREES),
        female: byCount(female, MINIMUM_HONOREES),
      },
      surnames: byCount(surnames, MINIMUM_HONOREES),
    };
  }
  return {
    source: `public/education/${chunk.path}`,
    note: "Given names and surnames of the people schools are named for, each person counted once, kept where at least two people carried the name. No honoree's full name is kept.",
    minimumHonorees: MINIMUM_HONOREES,
    places,
  };
}

if (process.argv[1]?.endsWith("place-name-corpora.ts")) {
  const out = "src/simulation/place-name-corpora.json";
  const { writeFileSync } = await import("node:fs");
  writeFileSync(out, `${JSON.stringify(measurePlaceNameCorpora())}\n`);
  console.log(`Wrote ${out}; run prettier --write on it before committing.`);
}
