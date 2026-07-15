# scripts

Developer tooling (not shipped in the app bundle).

## `verify.mjs`

An end-to-end smoke test that drives the running app in a headless browser
(Playwright) and asserts the core features actually work: monthly data +
counter, the data grid, CSV import, canvas padding, custom bar images, icon
alignment, image export, and 2K video export.

```bash
npm run dev        # start the app on http://localhost:5173 (in one terminal)
npm run verify     # run the checks (in another)
```

It prints a JSON result and exits non-zero if anything fails. Screenshots and
exported files are written to `scripts/out/` (git-ignored).
