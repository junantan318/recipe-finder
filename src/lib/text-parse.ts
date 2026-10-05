// Pulls ingredient and step lines out of free text (captions, descriptions, pasted text).
// Lines are copied as written. Nothing is added, reworded or guessed: if the text has no
// recognisable ingredients or steps, the lists stay empty.

export interface ParsedText {
  ingredients: string[];
  steps: string[];
  hashtags: string[];
  // "heading": found under an explicit heading such as "Ingredients:" — reliable.
  // "pattern": guessed from line shape (quantities, numbering) — shown as uncertain.
  ingredientsFound: "heading" | "pattern" | null;
  stepsFound: "heading" | "pattern" | null;
}

const INGREDIENT_HEADING =
  /^(?:ingredients?|ingredient list|what you(?:'|’)?ll need|what you need|you(?:'|’)?ll need|you will need|shopping list)\b\s*(?:\([^)]*\))?\s*[:\-–—]?\s*(.*)$/i;
const STEP_HEADING =
  /^(?:method|instructions?|directions?|steps?|preparation|procedure|how to make(?: it)?|how to|recipe steps|to make)\b\s*[:\-–—]?\s*(.*)$/i;
// Headings that end a recipe section (social sign-offs, notes, etc.).
const END_HEADING =
  /^(?:notes?|tips?|nutrition|storage|serving suggestions?|follow\b|subscribe\b|link in bio|music\b|credits?\b|equipment\b|tools\b|shop\b|order my\b|recipe:\s*https?|full recipe\b|printable recipe\b)/i;

const UNIT =
  "(?:g|gr|grams?|kg|mg|ml|mls|l|litres?|liters?|oz|ounces?|lbs?|pounds?|cups?|c|tbsps?|tablespoons?|tbs|tsps?|teaspoons?|pinch(?:es)?|dash(?:es)?|cloves?|cubes?|cans?|tins?|packs?|packets?|sticks?|slices?|bunch(?:es)?|handfuls?|sprigs?|pieces?|pcs|stalks?|heads?|knobs?|fillets?|breasts?|thighs?)";
const NUMBER = "(?:\\d+\\s+\\d+/\\d+|\\d+\\s*[½¼¾⅓⅔⅛⅜⅝⅞]|\\d+(?:[.,/]\\d+)?(?:\\s*[-–]\\s*\\d+(?:[.,/]\\d+)?)?|\\d*\\s*[½¼¾⅓⅔⅛⅜⅝⅞])";
// "200g pasta", "2 cups cream", "1/2 tsp salt", "½ onion", "2 chicken breasts"
const QUANTITY_LINE = new RegExp(`^${NUMBER}\\s*(?:${UNIT}\\b\\.?)?\\s*[a-zA-Z(]`, "i");
// "Penne Pasta - 2 Cups", "Garlic: 5 cloves", "Onion - 1 No."
const TRAILING_QUANTITY_LINE = new RegExp(
  `^[\\p{L}][^\\-–:]{0,40}?\\s*[\\-–:]\\s*${NUMBER}\\s*(?:${UNIT}\\b\\.?|nos?\\b\\.?)?\\s*(?:\\([^)]*\\))?$`,
  "iu",
);
// "1. Boil the pasta", "2) Add", "Step 3:"
const NUMBERED_LINE = /^(?:step\s*)?(\d{1,2})\s*(?:[.)\]:]|\s-)\s*(.+)$/i;

const BULLET = /^[\s•●○◦▪▫■□◆◇►▶➤➜→✓✔✅☑️*·\-–—+>]+/u;
// Leading emoji / pictographs ("🍝 Ingredients", "🧄 2 cloves garlic").
const LEADING_EMOJI = /^(?:[\p{Extended_Pictographic}\p{Emoji_Modifier}‍️]\s*)+/u;
// Only "#word" at the start or after whitespace, so "page#section" in a URL isn't a tag.
const HASHTAG = /(?<!\S)#([\p{L}\p{N}_]+)/gu;

function cleanLine(raw: string): string {
  return raw.replace(LEADING_EMOJI, "").replace(BULLET, "").replace(LEADING_EMOJI, "").trim();
}

function isHashtagOnly(line: string): boolean {
  return line.length > 0 && line.replace(HASHTAG, "").replace(/[\s.,·|]/g, "") === "";
}

// Turns an inline list ("Ingredients: pasta, cream, parmesan") into separate lines.
function splitInline(rest: string): string[] {
  if (!rest) return [];
  const pieces = rest.split(/\s*[,;]\s*(?![^(]*\))/).map((p) => p.trim()).filter(Boolean);
  return pieces.length > 1 ? pieces : [rest.trim()];
}

function stripNumber(line: string): string {
  const m = line.match(NUMBERED_LINE);
  return m ? m[2].trim() : line;
}

export function extractHashtags(text: string): string[] {
  const seen = new Set<string>();
  for (const m of text.matchAll(HASHTAG)) {
    seen.add(m[1].toLowerCase());
  }
  return [...seen];
}

export function parseRecipeText(text: string): ParsedText {
  const result: ParsedText = {
    ingredients: [],
    steps: [],
    hashtags: extractHashtags(text),
    ingredientsFound: null,
    stepsFound: null,
  };
  if (!text.trim()) return result;

  const lines = text.replace(/\r\n?/g, "\n").split("\n").map(cleanLine);

  // Pass 1: sections under explicit headings.
  let section: "ingredients" | "steps" | null = null;
  let afterBlank = false;
  let stepsNumbered = false;
  for (const line of lines) {
    if (!line) {
      afterBlank = true;
      continue;
    }
    const wasBlank = afterBlank;
    afterBlank = false;
    const ing = line.match(INGREDIENT_HEADING);
    const step = line.match(STEP_HEADING);
    // A heading is "Ingredients" or "Ingredients: ..."; "Ingredients are simple" is a sentence.
    if (ing && (ing[1] === "" || /^[^:]{1,35}[:\-–—]/.test(line))) {
      section = "ingredients";
      result.ingredientsFound = "heading";
      result.ingredients.push(...splitInline(ing[1]));
      continue;
    }
    if (step && (step[1] === "" || /^[a-z ]+[:\-–—]/i.test(line))) {
      section = "steps";
      result.stepsFound = "heading";
      if (step[1]) result.steps.push(stripNumber(step[1]));
      continue;
    }
    if (END_HEADING.test(line) || isHashtagOnly(line)) {
      section = null;
      continue;
    }
    // After a gap, a sign-off ends the section: prose after an ingredient list, an
    // un-numbered line after numbered steps, or anything carrying hashtags.
    if (section && wasBlank) {
      const signOff =
        new RegExp(HASHTAG.source, "u").test(line) ||
        (section === "ingredients" && line.split(/\s+/).length > 10 && !QUANTITY_LINE.test(line)) ||
        (section === "steps" && stepsNumbered && !NUMBERED_LINE.test(line));
      if (signOff) {
        section = null;
        continue;
      }
    }
    if (section === "steps" && result.steps.length === 0) stepsNumbered = NUMBERED_LINE.test(line);
    if (section === "ingredients") result.ingredients.push(line);
    if (section === "steps") result.steps.push(stripNumber(line));
  }

  // Pass 2: no headings found — fall back to line shape, flagged as uncertain.
  if (!result.ingredientsFound) {
    const found = lines.filter(
      (l) => l && ((QUANTITY_LINE.test(l) && !NUMBERED_LINE.test(l)) || TRAILING_QUANTITY_LINE.test(l)),
    );
    if (found.length >= 2) {
      result.ingredients = found;
      result.ingredientsFound = "pattern";
    }
  }
  if (!result.stepsFound) {
    const numbered = lines.filter((l) => l && NUMBERED_LINE.test(l) && !QUANTITY_LINE.test(stripNumber(l)));
    if (numbered.length >= 2) {
      result.steps = numbered.map(stripNumber);
      result.stepsFound = "pattern";
    }
  }

  result.ingredients = result.ingredients.map((l) => l.replace(HASHTAG, "").trim()).filter(Boolean);
  result.steps = result.steps.map((l) => l.replace(HASHTAG, "").trim()).filter(Boolean);
  return result;
}

// Section labels inside a list ("Meatballs:", "For the sauce:") are shown as headings,
// not numbered, and don't count as ingredients or steps.
export function isSectionHeading(line: string): boolean {
  return line.trim().endsWith(":");
}

export function countItems(lines: string[]): number {
  return lines.filter((l) => l.trim() && !isSectionHeading(l)).length;
}

// "THE Killer Pasta! 🔥 #shorts #recipe" -> "THE Killer Pasta! 🔥"
export function stripHashtags(text: string): string {
  return text.replace(HASHTAG, "").replace(/\s{2,}/g, " ").replace(/[\s|·-]+$/, "").trim();
}

// First meaningful line of a caption, used as a title when the platform gives none.
export function firstLineTitle(text: string): string {
  for (const raw of text.split(/\r?\n/)) {
    const line = cleanLine(raw).replace(HASHTAG, "").replace(/\s+/g, " ").trim();
    if (line.length < 3 || INGREDIENT_HEADING.test(line) || STEP_HEADING.test(line)) continue;
    const sentence = line.split(/(?<=[.!?])\s/)[0];
    return sentence.length > 80 ? `${sentence.slice(0, 77).trimEnd()}…` : sentence;
  }
  return "";
}

// Splits "200g fettuccine" into a quantity and the rest, for display only.
export function splitQuantity(line: string): { qty: string; rest: string } {
  const m = line.match(new RegExp(`^(${NUMBER}\\s*(?:${UNIT}\\b\\.?)?)\\s+(.+)$`, "i"));
  if (!m) return { qty: "", rest: line };
  return { qty: m[1].trim(), rest: m[2] };
}
