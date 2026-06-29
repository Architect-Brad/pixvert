# Contributing

## Project structure

```
pixvert/
├── client/          SvelteKit frontend (Svelte 4 + Tailwind)
│   └── src/
│       ├── lib/
│       │   ├── convert.worker.js   Raster format preview worker
│       │   └── trace.worker.js     Vector tracing worker (vtracer-wasm)
│       └── routes/
│           └── +page.svelte        Main UI (single ~600-line component)
├── server/          Fastify API server
│   └── src/
│       ├── convert.js              Image conversion logic (sharp + vtracer-wasm)
│       └── index.js                Routes, batch jobs, cleanup, rate limiting
├── README.md
├── CONTRIBUTING.md
└── .gitignore
```

## Development setup

```sh
git clone <repo-url>
cd pixvert/server && npm install
cd ../client && npm install
```

### Running

**Terminal 1 — API server:**
```sh
cd server
npm run dev       # http://localhost:3001
```

**Terminal 2 — Frontend:**
```sh
cd client
npm run dev       # http://localhost:5173
```

The client fetches the API at `http://localhost:3001` (hardcoded in `+page.svelte`).

### Building

```sh
cd client
npm run build
```

Verifies the Svelte app compiles without errors.

## Code style

- **No comments in source code** — code should be self-documenting. If something needs explanation, extract it to a well-named function.
- **Svelte 4** — use `$:`, `{#if}`, `{#each}`, `on:click` conventions. Avoid Svelte 5 runes.
- **Semantic HTML** — use `<label for="id">` + `<input id="id">` associations, not implicit wrapping.
- **ESM everywhere** — both client and server use `"type": "module"`. No CommonJS.
- **No TypeScript** — the project is plain JavaScript.
- **Formatting** — 2-space indentation. No semicolons in Svelte files (Svelte compiler handles it). Semicolons in Node.js files.
- **Async/await** over raw promises. Avoid `.then()` chains.

## Making changes

1. Create a feature branch from `main`.
2. Make your changes.
3. Run `npm run build` in `client/` to verify it compiles.
4. Run `node --check src/index.js` and `node --check src/convert.js` in `server/` to verify syntax.
5. Manually test the affected functionality:
   - Upload an image, adjust settings, verify live preview updates
   - Click "Convert & Download", verify server response
   - Test batch with multiple files
   - Test trace mode with various settings
6. Open a pull request with a clear description of what changed and why.

## Guidelines

- **One feature per PR** — small, focused changes are easier to review.
- **No dependencies without discussion** — adding a package should be justified in the PR description.
- **Browser compatibility** — `OffscreenCanvas` and Web Workers are required. The batch folder picker (`webkitdirectory`) is Chromium/Safari-only; the "Select Files" button covers all browsers.
- **Security** — file uploads are limited to 50 MB by the server. Rate limiting is at 100 req/min/IP. Don't introduce routes that bypass these.
- **No user accounts** — the project intentionally has no auth or database. If you need persistence, propose it in an issue first.

## Feature ideas (not yet implemented)

- Crop with interactive overlay (drag handles on the preview image)
- Arbitrary rotation angle (currently 90° increments)
- Output size estimate before conversion
- HEIC/RAW preview support via server-side decoding
- Keyboard shortcuts
- Convert history (requires storage layer)
- Docker Compose setup for one-command deploy

## Questions

Open an issue for bugs, feature requests, or architecture discussions.
