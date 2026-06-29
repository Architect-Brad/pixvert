import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyWebsocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { convertImage, fetchImage } from './convert.js';

const BATCH_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const TMP_DIR = path.join(tmpdir(), 'pixvert-batches');
fs.mkdirSync(TMP_DIR, { recursive: true });

const batchJobs = new Map();

const app = Fastify({ logger: true });

await app.register(cors, { origin: '*' });
await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
await app.register(fastifyWebsocket);
await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
});

function parseCrop(query) {
    const x = parseInt(query.crop_x);
    const y = parseInt(query.crop_y);
    const w = parseInt(query.crop_w);
    const h = parseInt(query.crop_h);
    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
        return { x, y, w, h };
    }
    return null;
}

async function processBatchJob(job) {
    const { files, options, id } = job;
    job.status = 'processing';

    const zip = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    zip.on('data', chunk => chunks.push(chunk));

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        job.progress[i] = { name: file.name, status: 'converting' };
        try {
            const result = await convertImage(file.buffer, {
                targetFormat: options.targetFormat,
                width: options.width,
                height: options.height,
                quality: options.quality,
                trace: options.trace,
                traceOptions: options.traceOptions || {},
                crop: options.crop,
                rotate: options.rotate,
                flip: options.flip,
            });
            const newName = file.name.replace(/\.[^.]+$/, `.${options.targetFormat}`);
            zip.append(result.buffer, { name: newName });
            job.progress[i] = { name: file.name, status: 'done' };
        } catch (err) {
            job.progress[i] = { name: file.name, status: 'error', message: err.message };
        }
    }

    await zip.finalize();
    const zipPath = path.join(TMP_DIR, `${id}.zip`);
    fs.writeFileSync(zipPath, Buffer.concat(chunks));
    job.zipPath = zipPath;
    job.status = 'done';
    job.doneAt = Date.now();
}

function cleanupOldJobs() {
    const now = Date.now();
    for (const [id, job] of batchJobs) {
        if (job.doneAt && (now - job.doneAt) > BATCH_TTL_MS) {
            if (job.zipPath) {
                try { fs.unlinkSync(job.zipPath); } catch { /* ok */ }
            }
            batchJobs.delete(id);
            app.log.info(`Cleaned up batch job ${id}`);
        }
    }
}

setInterval(cleanupOldJobs, CLEANUP_INTERVAL_MS);

app.get('/health', async () => ({ status: 'ok', service: 'pixvert' }));

app.get('/fetch-image', async (request, reply) => {
    const url = request.query.url;
    if (!url) return reply.code(400).send({ error: 'Missing url query param' });

    try {
        const { buffer, type } = await fetchImage(url);
        reply.header('Content-Type', type);
        reply.header('X-Image-Size', buffer.length);
        return buffer;
    } catch (err) {
        return reply.code(400).send({ error: err.message });
    }
});

app.post('/convert', async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.code(400).send({ error: 'No file uploaded' });

    const buffer = await file.toBuffer();
    const q = request.query;
    const targetFormat = q.format || 'png';
    const width = parseInt(q.width) || null;
    const height = parseInt(q.height) || null;
    const quality = parseInt(q.quality) || 90;
    const trace = q.trace === 'true';
    const rotate = parseFloat(q.rotate) || 0;
    const flip = q.flip || null;
    const crop = parseCrop(q);

    const traceOptions = {
        mode: q.mode || 'color',
        colors: parseInt(q.colors) || 16,
        filterSpeckle: parseInt(q.filterSpeckle) || 4,
        pathPrecision: parseInt(q.pathPrecision) || 5,
        layerDiff: parseInt(q.layerDiff) || 16,
        corner: parseInt(q.corner) || 60,
        length: parseFloat(q.length) || 4,
        iterations: parseInt(q.iterations) || 10,
        splice: parseInt(q.splice) || 45,
    };

    const result = await convertImage(buffer, {
        targetFormat, width, height, quality,
        trace, traceOptions,
        crop, rotate, flip,
    });

    reply.header('Content-Type', result.mime);
    reply.header('Content-Disposition', `attachment; filename="converted.${targetFormat}"`);
    reply.header('X-Converted-Size', result.size);
    return result.buffer;
});

// ---- Quick size estimate ----


app.post('/batch', async (request, reply) => {
    const parts = request.files();
    const files = [];
    for await (const part of parts) {
        files.push({ name: part.filename, buffer: await part.toBuffer() });
    }

    if (files.length === 0) {
        return reply.code(400).send({ error: 'No files uploaded' });
    }

    const q = request.query;
    const options = {
        targetFormat: q.format || 'png',
        width: parseInt(q.width) || null,
        height: parseInt(q.height) || null,
        quality: parseInt(q.quality) || 90,
        trace: q.trace === 'true',
        crop: parseCrop(q),
        rotate: parseFloat(q.rotate) || 0,
        flip: q.flip || null,
        traceOptions: {
            mode: q.mode || 'color',
            colors: parseInt(q.colors) || 16,
            filterSpeckle: parseInt(q.filterSpeckle) || 4,
            pathPrecision: parseInt(q.pathPrecision) || 5,
            layerDiff: parseInt(q.layerDiff) || 16,
            corner: parseInt(q.corner) || 60,
            length: parseFloat(q.length) || 4,
            iterations: parseInt(q.iterations) || 10,
            splice: parseInt(q.splice) || 45,
        },
    };

    const jobId = uuidv4();
    const job = {
        id: jobId,
        files,
        options,
        status: 'queued',
        progress: files.map(f => ({ name: f.name, status: 'pending' })),
        zipPath: null,
        doneAt: null,
    };
    batchJobs.set(jobId, job);

    processBatchJob(job).catch(err => {
        app.log.error(err);
        job.status = 'error';
    });

    reply.send({ jobId });
});

app.get('/batch/progress/:jobId', (request, reply) => {
    const jobId = request.params.jobId;
    const job = batchJobs.get(jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });

    reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    const interval = setInterval(() => {
        const payload = { status: job.status, progress: job.progress };
        reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);

        if (job.status === 'done' || job.status === 'error') {
            clearInterval(interval);
            reply.raw.end();
        }
    }, 300);

    request.raw.on('close', () => clearInterval(interval));
});

app.get('/batch/download/:jobId', (request, reply) => {
    const job = batchJobs.get(request.params.jobId);
    if (!job || !job.zipPath) {
        return reply.code(404).send({ error: 'File not ready or job not found' });
    }
    const stream = fs.createReadStream(job.zipPath);
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', 'attachment; filename="pixvert-batch.zip"');
    return reply.send(stream);
});

const PORT = process.env.PORT || 3001;
await app.listen({ port: PORT, host: '0.0.0.0' });
console.log(`Pixvert server running on port ${PORT}`);
