# Live Webview brand

Joel approved this logo on 12 September 2026: a rounded mint window with a smaller warm-white preview overlapping its lower-right corner. Both screens show a heading and shorter text line with identical internal proportions. The visual direction combines graphic confidence from GitButler with rounded forms from Things. The canonical artwork is [docs/branding/mark.svg](docs/branding/mark.svg); the packaged icon and README header are exported by `pnpm brand`.

## Priorities

Clarity, recognition, and practical use come first. Personality is a small supporting note, the least important part of the identity. Joel's physical reference was a small workshop tool made for daily use. Rounded corners and modest depth should make the mark legible and approachable without turning it into a toy or character.

The audience is developers of extension-owned VS Code webviews. The concrete promise is targeted frontend reload after a successful build in the existing Development Host. Use “Targeted reload for VS Code webviews” as the short descriptor. “See the change. Keep your session.” is optional supporting copy, not a required part of the logo. Do not claim HMR, universal state preservation, automatic attachment, or zero setup.

## References and translation

| Reference | Joel's reaction | What becomes part of Live Webview |
| --- | --- | --- |
| [GitButler](https://gitbutler.com/) | Liked | A simple, assertive silhouette and confident contrast. Translate the bow-tie mark's visual weight into an overlapping window-and-preview silhouette. Keep mint as a controlled accent; omit the neon texture and bow tie. |
| [Things](https://culturedcode.com/things/) | Liked | Rounded corners, a contained object, and restrained depth. Translate the object-like app icon into a clear rounded window with its preview pane. Omit its checkmark, tray, blue tile, and glossy finish. |
| [Transmit](https://panic.com/transmit/) | No explicit reaction | Explored physical-object recognition; do not carry over the truck or playful emphasis. |
| [Field Notes](https://fieldnotesbrand.com/products/original-kraft) | No explicit reaction | Explored everyday utility and direct labels. No kraft-paper or vintage treatment selected. |
| [PB Swiss Tools](https://www.pbswisstools.com/en/tools/quality-hand-tools/screwdrivers/product/pb-8193-dn) | No explicit reaction | Explored compact grip shapes and identifying color. No tool silhouette or industrial styling selected. |
| [Hultafors Talmeter](https://hultafors.com/en-eu/blogs/hultafors-icons/the-hultafors-marking-measure-talmeter) | No explicit reaction | Physical workflow reference, a Swedish invention from 1954. The reference photo showed a current product, not the original design. No retro styling selected. |

These are visual references, not source artwork to reuse. The approved merge takes graphic confidence from GitButler and approachable forms from Things. Neither reference establishes a brand affiliation.

## Visual system

The values below define the approved implementation. They are not sampled official colors of either reference.

| Token | Value | Derivation and use |
| --- | --- | --- |
| Charcoal | `#202623`, `oklch(0.2615 0.0102 164.07)` | Approved charcoal ground; slightly green undertone connects to mint. Primary ink on light backgrounds. |
| Surface | `#2B332F`, `oklch(0.3120 0.0131 164)` | A small lightness step from charcoal for document grouping. |
| Warm white | `#F4F5ED`, `oklch(0.9672 0.0106 112.37)` | Approved warm white; primary text and the front preview pane. |
| Mint | `#78DDB4`, `oklch(0.8247 0.1126 165.39)` | A restrained translation of GitButler's green energy. Identifying accent, not a success-status color. |
| Deep mint | `#344E43`, `oklch(0.3992 0.0368 166.36)` | Shadow/rim derived from mint and charcoal for modest object depth. |
| Secondary text | `#B5BFB8`, `oklch(0.7948 0.0147 155.51)` | Muted warm white with enough contrast on charcoal and surface. |
| Display / wordmark | Rubik 600, tracking `-0.025em` | Slightly rounded sans-serif corners connect Things' forms with GitButler's strong silhouette. Use the exact name “Live Webview” in title case. |
| Document text | Segoe UI, system sans-serif fallback, 18px / 1.65 | Joel's report-reading preference. Keep prose near 65–75 characters per line. |
| Corner system | Rounded rear frame, slightly tighter front-pane corners | Preserve the first layout's contained forms and modest depth. |
| Depth | A shallow dark rim; optional soft shadow above 64px | Translate Things' object depth into a modest edge, with a fully flat small-size variant. |
| Motion | Source text row extends over 180ms; preview repeats it after a 120ms delay | The source-to-preview order explains the product relationship. Only the text-row length changes; panes stay still. Reduced motion uses opacity, with no idle loop. These durations are a demonstration, not measured product latency. |

[Rubik](https://github.com/googlefonts/rubik) is distributed under SIL OFL 1.1. Preserve its license when bundling the font. The visual sheet embeds the Latin 600 font and its full license, and uses no remote resources at runtime.

Use mostly charcoal and warm white with a smaller mint accent. Large promotional artwork may give mint more space, but gradients and texture are not required. Warm white on charcoal has 14.04:1 contrast; charcoal on mint has 9.39:1. Warm white on mint is only 1.49:1: do not use that pairing for text or a meaningful boundary without a dark separator.

## Mark construction

Use a square artboard with a larger front-facing rounded window frame and a smaller preview pane overlapping its lower-right corner. The frame has a thick upper header edge and a dark inset. The front pane projects just beyond the outer frame. Keep a dark separator between the mint frame and warm-white pane.

Both screen interiors use a 3:2 aspect ratio. Show a heading and a shorter text line as two horizontal bars, with the same proportions in each screen: 20% left gutter; heading at 18% from the top, 60% wide and 12% high; shorter row at 38% from the top, 40% wide and 8% high. These values refer to the content area inside the border, not the outer frame. The front screen is an exact scaled view of that layout. Both rear rows must remain visible above the overlap.

Use warm-white content on the dark source screen and charcoal content on the warm-white preview. The rows represent page content; do not add an abstract symbol, letter, or invented glyph. An optional animation extends the shorter text row in the source, then repeats the change in the preview. The brand communicates content appearing in the preview, not bidirectional event replay or arbitrary actions mirrored into the application.

Preserve the overlapping composition when refining recognition. Do not revert to two equal side-by-side panes to make the relationship more literal. Avoid a cursor, connecting arrow, code brackets, or extra status symbol. Check that the window frame and repeated content distinguish the result from stacked paper documents.

At 32px and above, retain the two content rows and adjust edges to the pixel grid. At 16px, the candidate micro variant omits that detail and uses only the window-and-front-pane silhouette; it relies on recognition from the full mark and cannot yet claim to communicate mirroring by itself. Keep any shallow rim subordinate to the shape. Preserve equal optical weight between icon and wordmark, with approximately half an icon-width of clear space around the lockup. The canonical SVG preserves these proportions. The optional 16px study is not part of the shipped exports; small-size recognition below the packaged icon remains unverified.

## Application

- Marketplace icon: a simple standalone mark, drawn and checked at its actual display sizes.
- README and project artwork: mark plus wordmark, optional descriptor. Use real product screenshots when demonstrating behavior.
- Native VS Code controls: retain the user's theme colors, native icons, Tree View and Output channel. Branding does not replace semantic status colors or introduce decorative UI.
- Voice: direct developer language. Prefer “Build finished”, “Reload this view”, and “Waiting for a successful build”. Personality stays in a small visual detail rather than jokes or a mascot.

## Asset workflow and exclusions

[art-instructions.html](art-instructions.html) retains the construction sheet and prompts for future work. The approved SVG and exported PNGs are in [docs/branding](docs/branding/README.md). `pnpm brand` reproduces the README header and extension icon. Edit the canonical SVG for future geometry changes and regenerate the exports. The original artwork is covered by the MIT license; the bundled font retains its OFL.

No mascot, eyes, toy styling, bouncing motion, neon noise, glossy plastic, decorative gradients, edge accent stripes, or extra nested window layers. The overlapping window, front pane, and matching page layout are the only signature motif. Do not copy the GitButler mark or Things icon. Do not imply that the GitHub release reserves the Marketplace publisher or npm scope.
