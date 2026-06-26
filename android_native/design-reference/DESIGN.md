# Design reference — imported from claude.ai/design

Source: **Manga Viewer V2** (`24c54aaa-a6b3-498b-bd32-c5d852cb8969`), file `Manga Reader.html`.
Imported via the `claude_design` MCP. This Android app ports that design's theme
system and reader UX to native Kotlin / Jetpack Compose.

## Themes (data-theme in the web design → `AppTheme` enum here)

| Web key   | App enum     | Character                                                        |
|-----------|--------------|-----------------------------------------------------------------|
| `epaper`  | `EPAPER`     | **Mono e-ink.** Max-contrast B/W, flat fills, hairline rules, no motion, grayscale images. **Default.** |
| `kaleido` | `KALEIDO`    | **Color e-ink (Boox Kaleido 3).** Muted desaturated color over warm-gray paper, no motion. |
| `dark`    | `DARK`       | Cinematic dark, violet accent.                                  |
| `light`   | `LIGHT`      | Light.                                                           |
| `sepia`   | `SEPIA`      | Warm paper.                                                      |

The two e-ink themes are the headline feature (the user asked for an
"epaper-mono and color e-paper reader"), so `EPAPER` ships as the default and
both kill animation + apply an image color filter (grayscale for epaper,
desaturate for kaleido).

## Token map (CSS var → Compose `AppColors` field)

- `--bg` → background, `--bg-2` → backgroundElevated
- `--panel` → panel, `--panel-2` → panel2, `--panel-hi` → panelHi
- `--line` → line, `--line-2` → line2 (hairline borders)
- `--ink` → ink, `--ink-2..4` → ink2/ink3/ink4 (text tiers)
- `--accent` → accent, `--accent-soft` → accentSoft, `--accent-line` → accentLine, `--accent-ink` → accentInk
- `--scrim` → scrim (reader chrome gradient)
- genre/status colors collapse to ink in epaper, mute in kaleido

Exact hex for epaper/kaleido is copied verbatim from styles.css. dark/light/sepia
OKLCH values are converted to approximate sRGB hex.

## Reader UX (from reader.jsx)

- Modes: `single`, `double` (spread), `vertical` (webtoon), `horizontal` (strip)
- Direction: `rtl` / `ltr` (affects paging + double-spread ordering + scrubber)
- Fit: `height` / `width` / `original`
- Auto-hiding chrome (top bar + bottom scrubber), tap center to toggle
- Tap left/right thirds to page (direction-aware), page scrubber, chapter menu
- Bookmark current page, progress reported upward on every page change

## Backend (consumed, not reimplemented)

FastAPI at `/api/...` (default `http://10.0.2.2:8202` from the emulator). Key endpoints:
`/api/library`, `/api/library/shelves|languages|collections|sources`,
`/api/series/{id}`, `/api/chapters/{id}/progress`,
`/api/reader/chapter/{id}` (page_count + page_urls), `/api/reader/page/{cid}/{idx}` (image bytes),
`/api/reader/series/{sid}/neighbors/{cid}`, `/api/dashboard/stats|in-progress|timeline`,
`/api/settings`.
