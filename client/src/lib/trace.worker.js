// Vector tracing worker powered by vtracer-wasm.
// We load the WASM module once and keep it hot.
import init, { to_svg } from 'vtracer-wasm';

let ready = init();

self.onmessage = async (e) => {
    await ready;
    const { buffer, options } = e.data;
    const uint8 = new Uint8Array(buffer);

    const img = await createImageBitmap(new Blob([buffer]));
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (options.crop) {
        sx = options.crop.x; sy = options.crop.y;
        sw = options.crop.w; sh = options.crop.h;
    }
    const canvas = new OffscreenCanvas(sw, sh);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const imageData = ctx.getImageData(0, 0, sw, sh);

    const svgString = to_svg(imageData.data, img.width, img.height, {
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

    self.postMessage({ svg: svgString });
};
