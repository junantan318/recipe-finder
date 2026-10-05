import { detectSource, type DetectedSource } from "../url.ts";
import { firstLineTitle, parseRecipeText, stripHashtags, type ParsedText } from "../text-parse.ts";
import { inferTags, mergeTags, sourceTags } from "../tags.ts";
import { emptyDraft, isComplete, type ImportResponse, type RecipeDraft } from "../types.ts";
import { parseRecipePage } from "./html.ts";
import { describeFetchError, fetchImageDataUrl, fetchJson, fetchPage } from "./fetch.ts";
import { findYtDlp, ytDlpInfo, ytDlpTranscript } from "./ytdlp.ts";
import { findBySourceKey } from "./db.ts";

// `pageHtml` is set when the page comes from the user's own browser (the "Save to Recipe Box"
// bookmark), for sites that refuse requests from the app itself.
export async function importFromUrl(input: string, pageHtml?: string): Promise<ImportResponse> {
  const source = detectSource(input);
  if (!source) {
    return { duplicate: null, draft: null, outcome: "failed", error: "That doesn't look like a web link." };
  }

  const duplicate = findBySourceKey(source.key);
  if (duplicate) return { duplicate, draft: null, outcome: "complete" };

  const draft = emptyDraft(source.platform);
  draft.url = source.canonicalUrl;
  draft.sourceKey = source.key;

  // Hashtags or page keywords from the source; inferred tags are added at the end.
  let sourceTagNames: string[] = [];
  try {
    if (source.platform === "web") sourceTagNames = await importWeb(source, draft, pageHtml);
    else if (source.platform === "youtube") sourceTagNames = await importYouTube(source, draft);
    else sourceTagNames = await importInstagram(source, draft);
  } catch (err) {
    draft.warnings.push(`Import stopped early: ${describeFetchError(err)}. The link is kept — add the details below.`);
  }

  // Creators often hashtag their own name; that's not useful as a tag.
  const creatorSlug = draft.creator.toLowerCase().replace(/[^a-z0-9]/g, "");
  draft.tags = mergeTags(
    { names: sourceTags(sourceTagNames.filter((t) => !creatorSlug || t.toLowerCase() !== creatorSlug)), origin: "source" },
    { names: inferTags(draft.title, draft.ingredients), origin: "inferred" },
  );
  draft.thumbnailData = await fetchImageDataUrl(draft.thumbnailUrl);
  if (draft.thumbnailUrl && !draft.thumbnailData) draft.warnings.push("The thumbnail couldn't be downloaded.");
  if (draft.thumbnailData) draft.fieldSources.thumbnail ??= draft.platform === "web" ? "page" : "oembed";

  const outcome = isComplete(draft) ? "complete" : draft.title || draft.sourceTexts.length ? "partial" : "failed";
  return { duplicate: null, draft, outcome };
}

// Copies parsed caption/description lines into empty draft fields.
function applyParsed(draft: RecipeDraft, parsed: ParsedText, from: "caption" | "description"): void {
  if (!draft.ingredients.length && parsed.ingredients.length) {
    draft.ingredients = parsed.ingredients;
    draft.fieldSources.ingredients = from;
    if (parsed.ingredientsFound === "pattern") draft.uncertain.push("ingredients");
  }
  if (!draft.steps.length && parsed.steps.length) {
    draft.steps = parsed.steps;
    draft.fieldSources.steps = from;
    if (parsed.stepsFound === "pattern") draft.uncertain.push("steps");
  }
}

function missingMessage(draft: RecipeDraft, where: string): void {
  const missing = [!draft.ingredients.length && "ingredients", !draft.steps.length && "steps"].filter(Boolean);
  if (missing.length) {
    draft.warnings.push(`No ${missing.join(" or ")} found in the ${where}. Paste them below or type them in — nothing has been guessed.`);
  }
}

// ---------- Recipe websites ----------

async function importWeb(source: DetectedSource, draft: RecipeDraft, pageHtml?: string): Promise<string[]> {
  let page;
  try {
    page = pageHtml ? { ok: true, status: 200, html: pageHtml } : await fetchPage(source.canonicalUrl);
  } catch (err) {
    draft.warnings.push(`Couldn't load the page (${describeFetchError(err)}). The link is kept — add the recipe below.`);
    return [];
  }
  if (!page.ok) {
    draft.warnings.push(
      [401, 402, 403, 429].includes(page.status)
        ? `The site blocks automated requests (HTTP ${page.status}). Open the page in your browser and click the "Save to Recipe Box" bookmark, or paste the recipe below.`
        : `The page returned HTTP ${page.status}. Check the link, or paste the recipe below.`,
    );
    return [];
  }
  const { recipe, meta } = parseRecipePage(page.html);
  draft.title = recipe?.title || meta.title;
  if (draft.title) draft.fieldSources.title = "page";
  draft.creator = recipe?.creator || meta.author || meta.siteName;
  if (draft.creator) draft.fieldSources.creator = "page";
  draft.thumbnailUrl = recipe?.image || meta.image;
  const description = recipe?.description || meta.description;
  if (description) draft.sourceTexts.push({ kind: "page", text: description, url: source.canonicalUrl });

  if (!recipe) {
    draft.warnings.push("This page has no structured recipe data, so ingredients and steps weren't read. Paste them below.");
    return [];
  }
  if (recipe.ingredients.length) {
    draft.ingredients = recipe.ingredients;
    draft.fieldSources.ingredients = "page";
  }
  if (recipe.steps.length) {
    draft.steps = recipe.steps;
    draft.fieldSources.steps = "page";
  }
  missingMessage(draft, "page's recipe data");
  return recipe.keywords;
}

// ---------- YouTube ----------

interface OEmbed {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
}

const SKIP_LINK_HOSTS =
  /(youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|fb\.me|twitter\.com|x\.com|pinterest\.|amazon\.|amzn\.|patreon\.com|spotify\.com|apple\.com|threads\.net|linktr\.ee|discord|twitch\.tv|snapchat\.com|paypal\.)/i;

function readDescription(html: string): string {
  const m = html.match(/"shortDescription":("(?:[^"\\]|\\.)*")/);
  if (!m) return "";
  try {
    return JSON.parse(m[1]) as string;
  } catch {
    return "";
  }
}

// Recipe pages the creator links to in the description, most likely first.
function candidateLinks(description: string): { url: string; recipeLine: boolean }[] {
  const links: { url: string; recipeLine: boolean }[] = [];
  for (const line of description.split("\n")) {
    for (const m of line.matchAll(/https?:\/\/[^\s)>\]"']+/g)) {
      const url = m[0].replace(/[.,!?]+$/, "");
      if (SKIP_LINK_HOSTS.test(url) || links.some((l) => l.url === url)) continue;
      links.push({ url, recipeLine: /recipe|ingredients|written|full|blog|printable/i.test(line) });
    }
  }
  return links.sort((a, b) => Number(b.recipeLine) - Number(a.recipeLine)).slice(0, 3);
}

async function importYouTube(source: DetectedSource, draft: RecipeDraft): Promise<string[]> {
  const oembed = await fetchJson<OEmbed>(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(source.canonicalUrl)}`,
  );
  const tags: string[] = [];
  if (oembed) {
    // Titles often end in hashtags; keep them as tags rather than in the title.
    tags.push(...parseRecipeText(oembed.title ?? "").hashtags);
    draft.title = stripHashtags(oembed.title ?? "");
    draft.creator = oembed.author_name ?? "";
    draft.thumbnailUrl = oembed.thumbnail_url ?? null;
    if (draft.title) draft.fieldSources.title = "oembed";
    if (draft.creator) draft.fieldSources.creator = "oembed";
  } else {
    draft.warnings.push("YouTube didn't return details for this video. It may be private, removed or age-restricted.");
  }
  draft.thumbnailUrl ??= `https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`;

  let description = "";
  try {
    description = readDescription((await fetchPage(source.canonicalUrl)).html);
  } catch {
    // Description is optional; carry on with what oEmbed gave.
  }
  if (description) {
    draft.sourceTexts.push({ kind: "description", text: description });
    const parsed = parseRecipeText(description);
    tags.push(...parsed.hashtags);
    applyParsed(draft, parsed, "description");
  }

  // Many creators put the full recipe on their website and link it.
  if (!isComplete(draft) && description) {
    const blocked: string[] = [];
    for (const { url: link, recipeLine } of candidateLinks(description)) {
      try {
        const page = await fetchPage(link, 10000);
        if (!page.ok) {
          if (recipeLine && [401, 402, 403, 429].includes(page.status)) blocked.push(new URL(link).hostname);
          continue;
        }
        const { recipe } = parseRecipePage(page.html);
        if (!recipe || (!recipe.ingredients.length && !recipe.steps.length)) continue;
        if (!draft.ingredients.length && recipe.ingredients.length) {
          draft.ingredients = recipe.ingredients;
          draft.fieldSources.ingredients = "linked-page";
        }
        if (!draft.steps.length && recipe.steps.length) {
          draft.steps = recipe.steps;
          draft.fieldSources.steps = "linked-page";
        }
        draft.sourceTexts.push({ kind: "page", text: recipe.description || recipe.title, url: page.url });
        draft.warnings.push(`Ingredients and steps came from the recipe page linked in the description (${new URL(page.url).hostname}).`);
        tags.push(...recipe.keywords);
        break;
      } catch {
        // Try the next link.
      }
    }
    if (!isComplete(draft) && blocked.length) {
      draft.warnings.push(
        `The description links a recipe page (${blocked.join(", ")}) but that site blocks automated requests. Open it and paste the recipe below.`,
      );
    }
  }

  // Last resort: attach the transcript for reference. It is not parsed into steps, because
  // spoken instructions rarely split cleanly and quantities are often only shown on screen.
  if (!isComplete(draft)) {
    if (await findYtDlp()) {
      try {
        const transcript = await ytDlpTranscript(source.canonicalUrl);
        if (transcript) {
          draft.sourceTexts.push({ kind: "transcript", text: transcript.text });
          draft.warnings.push(
            `The ${transcript.auto ? "auto-generated " : ""}transcript is attached below for reference. Copy any ingredients or steps you want to keep.`,
          );
        }
      } catch {
        draft.warnings.push("The transcript couldn't be downloaded.");
      }
    } else {
      draft.warnings.push("Install yt-dlp to also attach the video transcript (see README).");
    }
  }
  missingMessage(draft, "video description");
  return tags;
}

// ---------- Instagram ----------

async function importInstagram(source: DetectedSource, draft: RecipeDraft): Promise<string[]> {
  if (!(await findYtDlp())) {
    draft.warnings.push(
      "Instagram only shows posts to logged-in browsers, so this needs yt-dlp to read public captions (see README). Paste the caption below for now.",
    );
    return [];
  }
  let info;
  try {
    info = await ytDlpInfo(source.canonicalUrl);
  } catch {
    draft.warnings.push(
      "Instagram didn't share this post without logging in — it may be private, deleted or temporarily rate-limited. Paste the caption below.",
    );
    return [];
  }
  const caption = info.description ?? "";
  draft.creator = info.channel ? `@${info.channel}` : info.uploader ?? "";
  if (draft.creator) draft.fieldSources.creator = "oembed";
  draft.thumbnailUrl = info.thumbnail ?? null;
  if (!caption.trim()) {
    draft.warnings.push("This post has no caption. Add the recipe below.");
    return [];
  }
  draft.sourceTexts.push({ kind: "caption", text: caption });
  // Instagram posts have no title; use the caption's first line and flag it for review.
  draft.title = firstLineTitle(caption);
  if (draft.title) {
    draft.fieldSources.title = "caption";
    draft.uncertain.push("title");
  }
  const parsed = parseRecipeText(caption);
  applyParsed(draft, parsed, "caption");
  missingMessage(draft, "caption");
  return parsed.hashtags;
}
