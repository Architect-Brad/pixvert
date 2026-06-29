# Pixvert

Real-time image converter with vector tracing, batch processing, crop/rotate/flip, drag-to-reorder, EXIF auto-orient, and live Web Worker previews.

## Features

- **12+ formats** — PNG, JPEG, WebP, AVIF, TIFF, BMP, SVG output; HEIC, RAW (CR2, NEF, ARW, DNG), and more input via `sharp`
- **Vector tracing** — bitmap-to-SVG path generation powered by `vtracer-wasm` with 9 tunable parameters (colors, speckle, precision, layer diff, corner threshold, length, iterations, splice)
- **Live preview** — Web Workers re-encode on a separate thread as you adjust quality, dimensions, crop, or rotation; no upload needed for preview
- **Crop / Rotate / Flip** — extract regions, 90° increments, horizontal/vertical/both flips; applied in-worker for preview and server-side for final output
- **EXIF auto-orient** — server-side auto-rotation based on embedded EXIF orientation tags
- **URL input** — fetch and convert remote images via a server proxy (avoids CORS issues)
- **Batch processing** — convert multiple files at once, download a ZIP; drag-to-reorder files before conversion, SSE progress stream, disk-backed with 30-minute auto-cleanup
- **Comparison view** — side-by-side original and converted result with compression ratio display
- **Rate limited** — 100 requests/minute per IP

## Architecture

```
client/        SvelteKit + Svelte 4 + Tailwind CSS + Web Workers
server/        Fastify (Node.js) + sharp + vtracer-wasm
```

- **Client** — SvelteKit + Tailwind CSS SPA. Live preview renders entirely in-browser via `OffscreenCanvas` and Web Workers. `convert.worker.js` re-encodes raster formats with crop/rotate/flip; `trace.worker.js` runs `vtracer-wasm` for SVG tracing with full parameter control. Batch files are reorderable via HTML5 drag-and-drop.
- **Server** — Fastify 4 API server. `sharp` handles all raster conversion, EXIF auto-orient, crop, resize, rotate, flip. `vtracer-wasm` handles vector tracing. `archiver` produces batch ZIPs. Jobs are disk-backed under `os.tmpdir()/pixvert-batches/` with 30-minute TTL auto-cleanup.

## Quick start

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```sh
cd server && npm install
cd ../client && npm install
```

### Run (development)

Pixvert runs two processes — the SvelteKit dev server (frontend) and the Fastify API server (image processing).

**Terminal 1 — API server:**
```sh
cd server
npm run dev
# starts on http://localhost:3001
```

**Terminal 2 — Frontend dev server:**
```sh
cd client
npm run dev
# starts on http://localhost:5173
# open this URL in your browser
```

The frontend dev server has hot reload. Open `http://localhost:5173` in your browser.

## Build

### Build the frontend for production

```sh
cd client
npm run build
```

Output lands in `client/.svelte-kit/output/`. With `@sveltejs/adapter-node`, this includes a standalone Node.js server (`server/index.js`) that serves the compiled SvelteKit app.

## Production deployment

You need both the API server and the built frontend server running.

### Option A: Two processes

```sh
# Terminal 1 — API server
cd server
PORT=3001 node src/index.js

# Terminal 2 — Frontend (built with adapter-node)
cd client
PORT=3000 node .svelte-kit/output/server/index.js
```

Set `PORT` (default 3001) to change the API server port. Set `ORIGIN` (e.g. `https://pixvert.example.com`) for the frontend server when deployed to a public URL to prevent redirect issues.

### Option B: Reverse proxy (recommended for production)

```
                           ┌──────────────┐
                           │  nginx/Caddy  │
                           │ :443          │
                           └──┬────────┬───┘
                              │        │
                     /api/*   │        │ /*
                              │        │
                     ┌────────▼──┐  ┌──▼──────────┐
                     │  Fastify  │  │  SvelteKit   │
                     │ :3001     │  │  (adapter-node)
                     └───────────┘  │ :3000        │
                                    └──────────────┘
```

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name pixvert.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        client_max_body_size 50M;
    }
}
```

If using a reverse proxy to route `/api/*` to the Fastify server, update the client's API base URL accordingly. The current client code hardcodes `http://localhost:3001` — you would need to set `VITE_API_BASE=/api` and update `+page.svelte` to use it (or configure the SvelteKit server to proxy `/api` to `localhost:3001` via its own config).

## API

All routes are on the Fastify server (default `http://localhost:3001`).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/fetch-image?url=` | Proxy-fetch a remote image (returns raw bytes) |
| `POST` | `/convert` | Convert a single file (multipart). See query params below. |
| `POST` | `/batch` | Start a batch conversion, returns `{ jobId }`. Same query params. |
| `GET` | `/batch/progress/:jobId` | SSE stream of per-file progress |
| `GET` | `/batch/download/:jobId` | Download completed ZIP |

### `/convert` and `/batch` query parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | string | `png` | Output format: `png`, `jpeg`, `webp`, `avif`, `tiff`, `bmp`, `svg` |
| `width` | int | — | Resize width (px) |
| `height` | int | — | Resize height (px) |
| `quality` | int | `90` | Encode quality (1–100, relevant for JPEG/WebP/AVIF) |
| `trace` | bool | `false` | Enable vector tracing (SVG output only) |
| `mode` | string | `color` | Trace mode: `color` or `bw` |
| `colors` | int | `16` | Max colors for tracing (2–256) |
| `filterSpeckle` | int | `4` | Speckle filter size (0–20) |
| `pathPrecision` | int | `5` | Path precision (1–10) |
| `layerDiff` | int | `16` | Layer difference threshold (1–50) |
| `corner` | int | `60` | Corner threshold (0–180) |
| `length` | float | `4.0` | Length threshold (1–20) |
| `iterations` | int | `10` | Max iterations (1–50) |
| `splice` | int | `45` | Splice threshold (0–180) |
| `crop_x` | int | — | Crop origin X (px) |
| `crop_y` | int | — | Crop origin Y (px) |
| `crop_w` | int | — | Crop width (px) |
| `crop_h` | int | — | Crop height (px) |
| `rotate` | float | `0` | Rotation angle (degrees, e.g. 90, 180, 270) |
| `flip` | string | — | Flip: `h`, `v`, or `hv` |

The `/convert` response includes `X-Converted-Size` header with the output file size in bytes.

## Comparison

How Pixvert stacks up against existing image conversion tools:

| Tool | Vector tracing | Live preview | Batch | Crop / Rotate / Flip | Free | Self-hostable |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| **Pixvert** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Squoosh (Google) | ❌ | ✅ | ❌ | ❌ | ✅ | ❌ (PWA only) |
| CloudConvert | ❌ | ❌ | ✅ | ✅ | Freemium | ❌ |
| Convertio | ❌ | ❌ | ✅ | ✅ | Freemium | ❌ |
| Vectorizer.io | ✅ (proprietary) | ❌ | ❌ | ❌ | ❌ (paid) | ❌ |
| ImageMagick (CLI) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| FFmpeg (libavif etc.) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |

### Key differentiators

- **Vector tracing + live preview** is unique — no other tool lets you tune trace settings (colors, speckle, precision) with instant visual feedback. Vectorizer.io produces higher quality traces but costs money and has no preview. CloudConvert and Convertio don't trace at all (they only embed raster in SVG wrappers).
- **No-upload preview** — all slider adjustments (quality, resize, crop, rotate) render in-browser via Web Workers. Your image never touches a server until you explicitly click "Convert & Download". Squoosh does this too, but doesn't trace.
- **Self-hostable** — unlike SaaS tools, you own your data. Run it on a local network or air-gapped machine.
- **Batch with progress** — SSE stream gives real-time per-file status. CloudConvert does this too but charges per conversion.

### Current limitations vs industry

| Gap | Pixvert | Industry leader |
|-----|---------|-----------------|
| Tracing quality | Good (vtracer) | Excellent (Vectorizer.io, Adobe Illustrator) |
| Input formats | ~10 (PNG, JPEG, WebP, AVIF, TIFF, BMP, SVG, HEIC, RAW) | 200+ (CloudConvert) |
| Output size estimate | After conversion only | Before conversion (CloudConvert) |
| WebP/AVIF encode in preview | Fallback to PNG in some browsers | N/A (server-side only) |
| Auto-orient from EXIF | ✅ | ✅ (most tools) |
| Drag to reorder in batch | ✅ | ✅ (Convertio) |
| Convert history / accounts | ❌ | ✅ (CloudConvert, Convertio) |

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | Svelte 4, SvelteKit 2, Tailwind CSS, Vite |
| Workers | `OffscreenCanvas`, `vtracer-wasm` |
| Backend | Fastify 4, sharp, @resvg/resvg-js, archiver |
| Tracing | vtracer-wasm (WASM port of visioncortex/vtracer) |

## License

MIT
