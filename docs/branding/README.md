# Brand assets

The approved Live Webview mark is a rounded window with a smaller preview overlapping its lower-right corner. The two screens show the same heading and text line. Clarity and recognition come first; personality is a small supporting note.

- [mark.svg](mark.svg) is the editable vector source, exported from the approved construction study.
- [header.png](header.png) is the 1280×440 GitHub and Marketplace README banner. It explains the frontend edit, successful build, and targeted reload loop.
- [social-preview.png](social-preview.png) is the matching 1280×640 social preview. Upload it under the GitHub repository's Settings > General > Social preview.
- `header.svg` and `social-preview.svg` are the generated vector layouts. Edit `scripts/export-brand.mjs` to change their copy or composition.
- [icon.png](../../packages/extension/media/icon.png) is the packaged 256px extension icon.

Run `pnpm brand` from the repository root to regenerate the PNGs. The exporter uses the pinned SVG renderer and bundled Rubik 600 font, so it does not depend on installed system fonts or network access. App builds do not need to regenerate artwork.

Colors: charcoal `#202623`, warm white `#F4F5ED`, mint `#78DDB4`. Both screen interiors have a 3:2 aspect ratio and identical proportional content placement. Keep the two rows visible above the overlap in the rear screen.

The project artwork is covered by the repository's MIT license. Rubik is third-party font software under the separate [SIL Open Font License](OFL.txt). The unmodified font file was obtained from [Google Fonts](https://fonts.google.com/specimen/Rubik); its [upstream project](https://github.com/googlefonts/rubik) records the authors. Preserve the OFL when distributing the font.
