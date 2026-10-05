# Recipe Box

A local, single-user app for the recipe videos and pages you save. Paste an Instagram post or Reel, a YouTube video or Short, or a recipe web page. The app reads what it can, shows you an editable preview, and saves the recipe with its original link. Search later by dish, ingredient, tag or note.

Recipe Box runs only on your computer. It has no accounts, uses no paid services and makes no AI calls.

## Start it

**Easiest:** double-click **`Recipe Box.bat`**. On the first run it installs dependencies and builds the app (about a minute). After that it starts in a few seconds and opens http://127.0.0.1:3000 in your browser. Close the window to stop it.

**From a terminal:**

```bash
npm run app
```

This does the same as the launcher. To work on the code with hot reload, use `npm run dev` instead.

Requires Node.js 22 or newer; tested on 24.

### Optional: yt-dlp (recommended)

[yt-dlp](https://github.com/yt-dlp/yt-dlp) is a free, open-source command-line tool. Recipe Box uses it to:

- read captions from **public Instagram posts**, which Instagram only shows to logged-in browsers otherwise;
- fetch **YouTube transcripts**.

```bash
python -m pip install --user yt-dlp
```

The app finds `yt-dlp`, `python -m yt_dlp` or `py -m yt_dlp` automatically. To point at a specific executable, set `YTDLP_PATH`. Update it now and then, because platforms change:

```bash
python -m pip install --user -U yt-dlp
```

Without yt-dlp, websites and YouTube titles, descriptions and thumbnails still import. For Instagram you paste the caption yourself.

## Where your recipes live

All data is stored **outside the repo and outside OneDrive** (so sync can't lock the database):

```
%LOCALAPPDATA%\recipe-box\recipes.db     SQLite database
%LOCALAPPDATA%\recipe-box\thumbs\        thumbnail images
```

To back up, copy that folder. To use a different location, set `RECIPE_BOX_DATA_DIR`.

## How importing works

| Source | What is read | How |
|---|---|---|
| Recipe website | Title, author, image, ingredients, steps, keywords | schema.org Recipe data (JSON-LD or microdata) that most recipe sites publish. Pages without it keep the title and image only. |
| YouTube video / Short | Title, channel, thumbnail, description | YouTube's public oEmbed endpoint plus the description on the watch page. Ingredients and steps are read from the description when it lists them. |
| YouTube, recipe linked in description | Ingredients and steps | If the description links a recipe page ("RECIPE: https://…"), that page's recipe data is used. |
| YouTube transcript | Full transcript text | yt-dlp, only when no written recipe was found. Attached for reference, **not** turned into steps. |
| Instagram post / Reel | Caption, creator, thumbnail | yt-dlp, logged out. Ingredients and steps are read from the caption. |

Rules the importer follows:

- **Nothing is invented.** Ingredient and step lines are copied word for word. A missing quantity stays missing.
- **Every field shows where it came from:** page, caption, description, linked page, transcript, platform, or "added by you".
- Lists found under headings such as "Ingredients:" or "Method:" are trusted. Lists guessed from line shape (quantities, numbering) and titles taken from a caption's first line are marked **check this**.
- **Inferred tags** (from keywords in the title and ingredients) have a dashed outline and an "inferred" label. Hashtags and page keywords are kept as source tags.
- The raw caption, description or transcript is stored with the recipe.
- **Duplicates** are recognised however the link is written: `youtu.be/…`, `/shorts/…` and `watch?v=…` match, as do `/reel/…` and `/p/…`, and tracking parameters are ignored.
- **An incomplete import is still saved** with its link. Paste the caption or transcript into the preview (or later, in Edit), and "Fill in from this text" runs the same parser. Or type the recipe in.

## Known limitations

- **Instagram** depends on yt-dlp's logged-out access. Instagram refuses some posts (private, age-restricted, or temporarily rate-limited). The app never logs in or uses your cookies, so for those posts you paste the caption.
- **Sites with bot protection are not read.** Allrecipes and other Dotdash Meredith sites return HTTP 402 to the app, and Preppy Kitchen uses a Cloudflare check (HTTP 403). The app says so and keeps the link; paste the recipe.
- **Captions written as prose** ("add some garlic, then…") give no ingredient or step lists. They're kept as source text for you to copy from.
- **Transcripts aren't parsed into steps**, because spoken instructions rarely split cleanly and quantities are often only shown on screen.
- **Tag inference** is a simple English keyword list.
- **Search** runs in the browser using word matching with basic plural handling ("tomatoes" finds "tomato"). It doesn't correct typos. It's fine for hundreds of recipes.
- **No dedicated ingredient filter.** Ingredient-type tags (chicken, pasta, seafood…) and search cover it.
- **TikTok, PDFs and cookbook scans aren't supported.** A TikTok link imports as a plain web page (title only).
- **Single user, no login.** The server listens on 127.0.0.1 only, so other devices on your network can't reach it.

## Scripts

| Command | What it does |
|---|---|
| `npm run app` | Install if needed, build if the code changed, start, open the browser |
| `npm run dev` | Development server with hot reload |
| `npm test` | Unit tests (URL detection, caption parsing, tags, search, page parsing) |
| `npm run try-import -- <url>` | Run the importer on a link and print what it found, without saving |
| `npm run seed:samples` | Load the 25 Allrecipes recipes from the old project as samples, tagged `sample` |

## Project layout

```
src/app/page.tsx                 the single page
src/app/api/                     import, recipes CRUD, thumbnails, status
src/components/                  RecipeBox (grid, search, filters), AddRecipeDialog,
                                 RecipeDetail, RecipeEditor, ui
src/lib/                         shared by server and browser: types, url, text-parse, tags, search
src/lib/server/                  db (SQLite), extract (import pipeline), html (JSON-LD), ytdlp, fetch
scripts/                         start, try-import, seed-samples
tests/                           node:test unit tests
legacy/allrecipes-sample.json    the old project's scraped recipes
```

## History

This repo started as **recipe-finder**: fridge and expiry tracking, recipe filters, MongoDB/JWT accounts, Cohere recipe generation, and a separate Express API. That version is kept at the git tag `pre-recipe-collection`:

```bash
git checkout pre-recipe-collection
```
