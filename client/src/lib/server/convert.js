import sharp from 'sharp';

export async function convertImage(buffer, options) {
    const { targetFormat, width, height, quality, trace, traceOptions, crop, rotate, flip } = options;

    if (targetFormat === 'svg') {
        if (trace) {
            const svgString = await rasterToSvgTrace(buffer, traceOptions || {});
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
        png:  { format: 'png' },
        jpeg: { format: 'jpeg', quality: quality ?? 90 },
        webp: { format: 'webp', quality: quality ?? 90 },
        avif: { format: 'avif', quality: quality ?? 90 },
        tiff: { format: 'tiff' },
        bmp:  { format: 'bmp' },
    };

    const mimeMap = {
        png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp',
        avif: 'image/avif', tiff: 'image/tiff', bmp: 'image/bmp',
    };

    const fmt = formatConfigs[targetFormat];
    if (!fmt) throw new Error(`Unsupported format: ${targetFormat}`);

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

export async function rasterToSvgTrace(buffer, options) {
    const init = (await import('vtracer-wasm')).default;
    const { to_svg } = await import('vtracer-wasm');
    await init();

    const meta = await sharp(buffer).metadata();
    const { width, height } = meta;

    const rgba = await sharp(buffer).ensureAlpha().raw().toBuffer();

    return to_svg(new Uint8Array(rgba), width, height, {
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
}

export async function fetchImage(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get('content-type') || 'image/png';
    return { buffer, type };
}

function parseCrop(url) {
    const x = parseInt(url.searchParams.get('crop_x'));
    const y = parseInt(url.searchParams.get('crop_y'));
    const w = parseInt(url.searchParams.get('crop_w'));
    const h = parseInt(url.searchParams.get('crop_h'));
    if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) return { x, y, w, h };
    return null;
}

export function buildConvertOptions(url) {
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
    };
}
