self.onmessage = async (e) => {
    const { imageBitmap, targetFormat, width, height, quality, crop, rotate, flip } = e.data;

    let sx = 0, sy = 0, sw = imageBitmap.width, sh = imageBitmap.height;
    if (crop) { sx = crop.x; sy = crop.y; sw = crop.w; sh = crop.h; }

    let outW = sw, outH = sh;
    if (width && height) { outW = width; outH = height; }
    else if (width) { outH = Math.round(sh * (width / sw)); outW = width; }
    else if (height) { outW = Math.round(sw * (height / sh)); outH = height; }

    let canvas = new OffscreenCanvas(outW, outH);
    let ctx = canvas.getContext('2d');

    if (rotate && rotate !== 0) {
        const rad = (rotate * Math.PI) / 180;
        const cos = Math.abs(Math.cos(rad));
        const sin = Math.abs(Math.sin(rad));
        const rw = Math.ceil(outW * cos + outH * sin);
        const rh = Math.ceil(outW * sin + outH * cos);
        canvas = new OffscreenCanvas(rw, rh);
        ctx = canvas.getContext('2d');
        ctx.translate(rw / 2, rh / 2);
        ctx.rotate(rad);
        ctx.drawImage(imageBitmap, sx, sy, sw, sh, -outW / 2, -outH / 2, outW, outH);
    } else {
        ctx.save();
        let dx = 0, dy = 0;
        if (flip === 'h' || flip === 'hv') { ctx.scale(-1, 1); dx = -outW; }
        if (flip === 'v' || flip === 'hv') { ctx.scale(1, -1); dy = -outH; }
        ctx.drawImage(imageBitmap, sx, sy, sw, sh, dx, dy, outW, outH);
        ctx.restore();
    }

    let mimeType = `image/${targetFormat === 'jpeg' ? 'jpeg' : targetFormat}`;
    let qualityOpt = (targetFormat !== 'png' && targetFormat !== 'bmp' && targetFormat !== 'tiff')
        ? quality / 100 : undefined;

    let blob;
    try {
        blob = await canvas.convertToBlob({ type: mimeType, quality: qualityOpt });
        if (blob.type === 'image/avif' && targetFormat !== 'avif') throw '';
    } catch {
        blob = await canvas.convertToBlob({ type: 'image/png' });
    }

    self.postMessage({ blob, size: blob.size, format: blob.type.replace('image/', '') });
};
