import sharp from 'sharp';
import { optimize } from 'svgo';

const MAGIC_BYTES = [
    { bytes: [0x89, 0x50, 0x4E, 0x47] },
    { bytes: [0xFF, 0xD8] },
    { bytes: [0x47, 0x49, 0x46] },
    { bytes: [0x42, 0x4D] },
    { bytes: [0x49, 0x49] },
    { bytes: [0x4D, 0x4D] },
    { bytes: [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66] },
];

export function validateImage(buffer) {
    if (!buffer || typeof buffer === 'undefined' || buffer.length === 0) {
        throw new Error('Empty image buffer');
    }

    if (buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return;
    }

    const valid = MAGIC_BYTES.some(({ bytes }) => {
        if (buffer.length < bytes.length) return false;
        return bytes.every((b, i) => buffer[i] === b);
    });

    if (!valid) {
        throw new Error('Unrecognized image format or invalid image file');
    }
}

async function optimizeSvg(svgString) {
    const result = optimize(svgString, {
        multipass: true,
        plugins: [
            'preset-default',
            'removeDimensions',
            'removeXMLNS',
        ],
    });
    return result.data;
}

export async function convertImage(buffer, options) {
    validateImage(buffer);

    const { targetFormat, width, height, quality, trace, traceOptions, crop, rotate, flip, compressionLevel, tiffCompression, preserveMetadata } = options;

    if (targetFormat === 'svg') {
        if (trace) {
            const svgString = await rasterToSvgTrace(buffer, traceOptions || {}, options.optimizeSvg);
            return { buffer: Buffer.from(svgString), mime: 'image/svg+xml' };
        }
        const svgString = await rasterToSvgEmbed(buffer, width, height);
        return { buffer: Buffer.from(svgString), mime: 'image/svg+xml' };
    }

    let img = sharp(buffer);
    img = img.rotate();

    if (crop) {
        img = img.extract({
            left: Math.round(crop.x), top: Math.round(crop.y),
            width: Math.round(crop.w), height: Math.round(crop.h),
        });
    }

    if (rotate && rotate !== 0) {
        img = img.rotate(rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }

    if (flip === 'h') img = img.flop();
    else if (flip === 'v') img = img.flip();
    else if (flip === 'hv') img = img.flip().flop();

    if (width || height) {
        img = img.resize(width || null, height || null, { fit: 'inside', withoutEnlargement: false });
    }

    const formatConfigs = {
        png:  { format: 'png', compressionLevel: compressionLevel ?? 6 },
        jpeg: { format: 'jpeg', quality: quality ?? 90 },
        webp: { format: 'webp', quality: quality ?? 90 },
        avif: { format: 'avif', quality: quality ?? 90 },
        tiff: { format: 'tiff', compression: tiffCompression || 'lzw' },
        bmp:  { format: 'bmp' },
        heic: { format: 'heif', quality: quality ?? 90 },
    };

    const mimeMap = {
        png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp',
        avif: 'image/avif', tiff: 'image/tiff', bmp: 'image/bmp',
        heic: 'image/heic',
    };

    const fmt = formatConfigs[targetFormat];
    if (!fmt) throw new Error(`Unsupported format: ${targetFormat}`);

    if (preserveMetadata) {
        img = img.withMetadata();
    }

    const result = await img.toFormat(fmt.format, fmt).toBuffer();
    return { buffer: result, mime: mimeMap[targetFormat], size: result.length };
}

export async function rasterToSvgEmbed(buffer, width, height) {
    const img = sharp(buffer);
    const meta = await img.metadata();
    const w = width || meta.width;
    const h = height || meta.height;

    const png = await img.resize(w, h, { fit: 'inside' }).png().toBuffer();
    const b64 = png.toString('base64');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <image href="data:image/png;base64,${b64}" width="100%" height="100%"/>
</svg>`;
}

export async function rasterToSvgTrace(buffer, options, optimizeSvgFlag) {
    const init = (await import('vtracer-wasm')).default;
    const { to_svg } = await import('vtracer-wasm');
    await init();

    const meta = await sharp(buffer).metadata();
    const { width, height } = meta;

    const rgba = await sharp(buffer).ensureAlpha().raw().toBuffer();

    const svg = to_svg(new Uint8Array(rgba), width, height, {
        mode: options.mode || 'color',
        color_precision: options.colors || 16,
        layer_difference: options.layerDiff || 16,
        corner_threshold: options.corner || 60,
        length_threshold: options.length || 4.0,
        max_iterations: options.iterations || 10,
        splice_threshold: options.splice || 45,
        path_precision: options.pathPrecision || 5,
        filter_speckle: options.filterSpeckle || 4,
    });

    if (optimizeSvgFlag) {
        return await optimizeSvg(svg);
    }
    return svg;
}

export async function fetchImage(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || 'image/png';
    return { buffer, type };
}

export function parseCrop(url) {
    const x = parseInt(url.searchParams.get('crop_x'));
    const y = parseInt(url.searchParams.get('crop_y'));
    const w = parseInt(url.searchParams.get('crop_w'));
    const h = parseInt(url.searchParams.get('crop_h'));
    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) return { x, y, w, h };
    return null;
}

export function buildConvertOptions(url) {
    const rawCompression = url.searchParams.get('compressionLevel');
    return {
        targetFormat: url.searchParams.get('format') || 'png',
        width: parseInt(url.searchParams.get('width')) || null,
        height: parseInt(url.searchParams.get('height')) || null,
        quality: parseInt(url.searchParams.get('quality')) || 90,
        trace: url.searchParams.get('trace') === 'true',
        rotate: parseFloat(url.searchParams.get('rotate')) || 0,
        flip: url.searchParams.get('flip') || null,
        crop: parseCrop(url),
        traceOptions: {
            mode: url.searchParams.get('mode') || 'color',
            colors: parseInt(url.searchParams.get('colors')) || 16,
            filterSpeckle: parseInt(url.searchParams.get('filterSpeckle')) || 4,
            pathPrecision: parseInt(url.searchParams.get('pathPrecision')) || 5,
            layerDiff: parseInt(url.searchParams.get('layerDiff')) || 16,
            corner: parseInt(url.searchParams.get('corner')) || 60,
            length: parseFloat(url.searchParams.get('length')) || 4,
            iterations: parseInt(url.searchParams.get('iterations')) || 10,
            splice: parseInt(url.searchParams.get('splice')) || 45,
        },
        compressionLevel: rawCompression !== null ? parseInt(rawCompression) : undefined,
        tiffCompression: url.searchParams.get('tiffCompression') || undefined,
        preserveMetadata: url.searchParams.get('preserveMetadata') === 'true',
        optimizeSvg: url.searchParams.get('optimizeSvg') === 'true',
    };
}
