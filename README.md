# 📚 My Bookshelf

A personal bookshelf site built from a Google Sheet.

- **Bookshelf**: one bookcase per **genre** (or per **author**). Every book you've read appears as a spine.
  - Each shelf holds **12 books** by default. Use the − / + control to change this.
  - **Series stay together.** If a series won't fit in the space left on a shelf, it moves to the next shelf, and later books fill the gap. A series longer than a whole shelf runs across shelves.
  - Spine thickness reflects the book's length, and a full shelf spans the bookcase.
  - Hover over or tap a spine to see its cover, your rating (out of 10 stars), the genre and the page count.
- **Rankings**: all your read books, ordered by your rating.
- **TBR**: your to-be-read bookcase (packed the same way), showing each book's public rating (out of 5 stars) from Open Library and Google Books. You can sort it by your order or by highest rated.

Covers, page counts and web ratings are looked up automatically from Open Library and Google Books, then cached in your browser.

## The Google Sheet

The site reads the published sheet set in `src/config.ts`:

| Tab        | gid          | Columns                                   |
| ---------- | ------------ | ----------------------------------------- |
| Books Read | `0`          | Title, Author, Series, Genre, Rating (/10) |
| TBR        | `1859169813` | Title, Author, Series, Genre              |

- Header names aren't case-sensitive, and extra spaces are ignored.
- Rating can be a number out of 10 (`8.5`), a fraction (`4/5`), or stars (`★★★½`).
- Leave **Series** blank for a standalone book.
- Separate multiple genres with commas.
- Small typos in series or author names (e.g. "Archives" vs "Archieves") are merged into one shelf, labelled with the spelling you use most.
- You can add these columns if you want:
  - `Series #`: orders books within a series. Without it, books keep sheet order.
  - `Pages`: overrides the looked-up page count.
  - `Cover`: an image URL that overrides the looked-up cover.
  - `Date Read`

Edits to the sheet show up on the site after a refresh. Google can take a few minutes to update the published copy.

To use a different sheet, publish it with **File → Share → Publish to web**. Then update `PUBLISHED_SHEET_URL` and the two gids in `src/config.ts`. A tab's gid is the number after `gid=` in the URL when that tab is open.

## Run locally

```bash
npm install
npm run dev
npm test   # unit tests
```

To work offline with the bundled sample CSVs, run `VITE_USE_SAMPLE=1 npm run dev`.

## Deploy

The workflow in `.github/workflows/deploy.yml` builds the site and publishes it to GitHub Pages. To turn it on, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**. After that, each push to `Main` deploys the site.
