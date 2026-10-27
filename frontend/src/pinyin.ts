export type InitialOption = { label: string; value: string };

export const initials: InitialOption[] = [
  { label: "无", value: "" },
  ..."b p m f d t n l g k h j q x zh ch sh r z c s y w".split(" ").map((value) => ({ label: value, value })),
];

export const finals = [
  "a", "o", "e", "i", "u", "ü", "ai", "ei", "ui", "ao", "ou", "iu", "ie", "üe", "er",
  "ia", "ua", "uo", "iao", "uai", "an", "en", "in", "un", "ün", "ian", "uan", "üan",
  "ang", "eng", "ing", "ong", "iang", "uang", "iong",
] as const;

// 按普通话音节表列出可拼组合；不存在的组合直接在界面中禁用。
const validCombinations: Record<string, string[]> = {
  "": ["a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "er"],
  b: ["a", "o", "i", "u", "ai", "ei", "ao", "ie", "iao", "an", "en", "in", "ian", "ang", "eng", "ing"],
  p: ["a", "o", "i", "u", "ai", "ei", "ao", "ou", "ie", "iao", "an", "en", "in", "ian", "ang", "eng", "ing"],
  m: ["a", "o", "e", "i", "u", "ai", "ei", "ao", "ou", "ie", "iu", "iao", "an", "en", "in", "ian", "ang", "eng", "ing"],
  f: ["a", "o", "u", "ei", "ou", "an", "en", "ang", "eng"],
  d: ["a", "e", "i", "u", "ai", "ei", "ao", "ou", "iu", "ie", "ui", "ia", "uo", "iao", "an", "en", "in", "un", "ian", "uan", "ang", "eng", "ing", "ong"],
  t: ["a", "e", "i", "u", "ai", "ao", "ou", "ie", "ui", "uo", "iao", "an", "in", "un", "ian", "uan", "ang", "eng", "ing", "ong"],
  n: ["a", "e", "i", "u", "ü", "ai", "ei", "ao", "ie", "iu", "uo", "üe", "iao", "an", "en", "in", "ian", "uan", "ang", "eng", "ing", "ong", "iang"],
  l: ["a", "o", "e", "i", "u", "ü", "ai", "ei", "ao", "ou", "ie", "iu", "uo", "üe", "ia", "iao", "an", "in", "un", "ian", "uan", "ang", "eng", "ing", "ong", "iang"],
  g: ["a", "e", "u", "ai", "ei", "ao", "ou", "ui", "ua", "uo", "uai", "an", "en", "un", "uan", "ang", "eng", "ong", "uang"],
  k: ["a", "e", "u", "ai", "ao", "ou", "ui", "ua", "uo", "uai", "an", "en", "un", "uan", "ang", "eng", "ong", "uang"],
  h: ["a", "e", "u", "ai", "ei", "ao", "ou", "ui", "ua", "uo", "uai", "an", "en", "un", "uan", "ang", "eng", "ong", "uang"],
  j: ["i", "ü", "ie", "iu", "üe", "ia", "iao", "in", "ün", "ian", "üan", "ing", "iang", "iong"], q: ["i", "ü", "ie", "iu", "üe", "ia", "iao", "in", "ün", "ian", "üan", "ing", "iang", "iong"], x: ["i", "ü", "ie", "iu", "üe", "ia", "iao", "in", "ün", "ian", "üan", "ing", "iang", "iong"],
  zh: ["a", "e", "i", "u", "ai", "ei", "ao", "ou", "ui", "ua", "uo", "uai", "an", "en", "un", "uan", "ang", "eng", "ong", "uang"],
  ch: ["a", "e", "i", "u", "ai", "ao", "ou", "ui", "ua", "uo", "uai", "an", "en", "un", "uan", "ang", "eng", "ong", "uang"],
  sh: ["a", "e", "i", "u", "ai", "ei", "ao", "ou", "ui", "ua", "uo", "uai", "an", "en", "un", "uan", "ang", "eng", "uang"],
  r: ["e", "i", "u", "ao", "ou", "ui", "uo", "an", "en", "un", "uan", "ang", "eng", "ong"],
  z: ["a", "e", "i", "u", "ai", "ei", "ao", "ou", "ui", "uo", "an", "en", "un", "uan", "ang", "eng", "ong"],
  c: ["a", "e", "i", "u", "ai", "ao", "ou", "ui", "uo", "an", "en", "un", "uan", "ang", "eng", "ong"],
  s: ["a", "e", "i", "u", "ai", "ao", "ou", "ui", "uo", "an", "en", "un", "uan", "ang", "eng", "ong"],
  y: ["a", "o", "e", "i", "ü", "ao", "ou", "üe", "an", "in", "ün", "üan", "ang", "ing", "ong"],
  w: ["a", "o", "u", "ai", "ei", "an", "en", "ang", "eng"],
};

export const toneOptions = [
  { value: 1, mark: "—", label: "一声" }, { value: 2, mark: "↗", label: "二声" },
  { value: 3, mark: "∨", label: "三声" }, { value: 4, mark: "↘", label: "四声" },
  { value: 0, mark: "·", label: "轻声" },
];

const toneMarks: Record<string, string[]> = {
  a: ["a", "ā", "á", "ǎ", "à"], e: ["e", "ē", "é", "ě", "è"], i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"], u: ["u", "ū", "ú", "ǔ", "ù"], ü: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};

export function validFinalsFor(initial: string): string[] { return validCombinations[initial] ?? []; }

function combine(initial: string, final: string): string {
  if (["j", "q", "x"].includes(initial)) return initial + final.replace("ü", "u");
  if (initial === "y") {
    const forms: Record<string, string> = { i: "yi", ü: "yu", e: "ye", üe: "yue", in: "yin", ün: "yun", ian: "yan", üan: "yuan", an: "yan", ang: "yang", ing: "ying", ong: "yong", ao: "yao", ou: "you", a: "ya", o: "yo" };
    return forms[final] ?? `y${final}`;
  }
  if (initial === "w") {
    const forms: Record<string, string> = { u: "wu", a: "wa", o: "wo", ai: "wai", ei: "wei", an: "wan", en: "wen", ang: "wang", eng: "weng" };
    return forms[final] ?? `w${final}`;
  }
  return initial + final;
}

function addTone(syllable: string, tone: number): string {
  if (tone === 0) return syllable;
  const letters = [...syllable];
  let index = syllable.indexOf("a");
  if (index < 0) index = syllable.indexOf("e");
  if (index < 0 && syllable.includes("ou")) index = syllable.indexOf("o");
  if (index < 0) for (let i = letters.length - 1; i >= 0; i -= 1) if (toneMarks[letters[i]]) { index = i; break; }
  if (index >= 0) letters[index] = toneMarks[letters[index]][tone];
  return letters.join("");
}

export function makeSyllable(initial: string, final: string, tone = 0): string { return addTone(combine(initial, final), tone); }

export function randomCombination(): { initial: string; final: string } {
  const initial = initials[Math.floor(Math.random() * initials.length)].value;
  const available = validFinalsFor(initial);
  return { initial, final: available[Math.floor(Math.random() * available.length)] };
}
