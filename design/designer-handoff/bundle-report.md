# Portable mascot exploration bundle

Location: `dist/exploration/`

- Copied both exploration galleries and only their recursively referenced artwork, prompts, and guides. Original exploration files were not edited.
- Preserved image names and relative directory structure, including round-one concepts and round-two cast iterations referenced by the prompt archive.
- Redirected repository source links to the mobile-friendly `evidence.html` page, which names source files, reviewed sections, source status, and open design decisions. No application source files or absolute machine paths were shipped.
- Bundled the three referenced Plus Jakarta Sans font weights under `fonts/` and rewrote gallery font URLs.
- Added navigation back to the designer handoff and between both gallery rounds. Marked round one as an archive superseded by the current direction.
- Added responsive HTML versions of the three detailed text guides, with portable gallery links and downloadable sanitized Markdown originals.
- Enlarged portable guide and evidence typography for mobile: 16px body copy, 14px navigation and table labels, and at least 12px secondary metadata. Detailed tables remain scrollable.
- Kept theme toggling, exact-size controls, full-size artwork links, and existing responsive layouts.

Bundle size: **25.53 MiB** (26,770,340 bytes), **36 files**.

Validation: **314 references checked**, all exploration assets and anchors resolve; **21 PNGs** match their original files byte for byte. No private machine paths or application-source dependencies remained. All six links back to the main handoff now resolve to `dist/index.html`.

## Final combined-bundle verification

Primary observation from the final static-bundle validation: **48 public files**, **38.14 MiB**, and **400 local references checked**, including the main brief and standalone HTML. All local files and HTML anchors resolve; no external asset references were found.

All eight published screenshots match the provided originals byte for byte. The same eight screenshots embedded in the standalone HTML also match the originals by SHA-256. A scan of every public file found no absolute user or private temporary paths, file URIs, private key blocks, known provider credential formats, or credential assignments matching the checked patterns. This is a pattern scan, not a guarantee against every possible secret format.

Detailed results: `review/final-bundle-validation.json` outside the published directory.
