<script>
  import { onMount, onDestroy } from 'svelte';
  import { apiUrl } from '$lib/api';
  import UploadZone from '$lib/components/UploadZone.svelte';
  import UrlInput from '$lib/components/UrlInput.svelte';
  import OptionsPanel from '$lib/components/OptionsPanel.svelte';
  import TraceSettings from '$lib/components/TraceSettings.svelte';
  import TransformPanel from '$lib/components/TransformPanel.svelte';
  import PreviewPane from '$lib/components/PreviewPane.svelte';
  import BatchSection from '$lib/components/BatchSection.svelte';
  import CropOverlay from '$lib/components/CropOverlay.svelte';

  let originalFile = null;
  let originalPreviewUrl = '';
  let originalBuffer = null;
  let originalSize = null;
  let imageBitmap = null;
  let convertedUrl = '';
  let livePreviewUrl = '';
  let liveFormat = '';
  let targetFormat = 'webp';
  let width = 0;
  let height = 0;
  let quality = 85;
  let svgMode = 'embed';
  let converting = false;
  let errorMsg = '';
  let convertedSize = null;
  let tab = 'file';

  let cropActive = false;
  let cropX = 0, cropY = 0, cropW = 0, cropH = 0;
  let rotateAngle = 0;
  let flipMode = 'none';
  let showCropOverlay = false;

  let compareMode = 'side';

  let convertWorker;
  let traceWorker;
  let timer = null;

  const traceOptions = {
    mode: 'color',
    colors: 16,
    filterSpeckle: 4,
    pathPrecision: 5,
    layerDiff: 16,
    corner: 60,
    length: 4,
    iterations: 10,
    splice: 45,
  };

  onMount(async () => {
    const ConvertWorker = (await import('$lib/convert.worker.js?worker')).default;
    convertWorker = new ConvertWorker();
    convertWorker.onmessage = (e) => {
      const blob = e.data.blob;
      liveFormat = e.data.format;
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
      livePreviewUrl = URL.createObjectURL(blob);
    };

    const TraceWorker = (await import('$lib/trace.worker.js?worker')).default;
    traceWorker = new TraceWorker();
    traceWorker.onmessage = (e) => {
      const svgString = e.data.svg;
      liveFormat = 'svg';
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
      livePreviewUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }));
    };
  });

  onDestroy(() => {
    convertWorker?.terminate();
    traceWorker?.terminate();
    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    if (convertedUrl) URL.revokeObjectURL(convertedUrl);
    if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
  });

  async function loadFile(file) {
    originalFile = file;
    if (originalPreviewUrl) URL.revokeObjectURL(originalPreviewUrl);
    originalPreviewUrl = URL.createObjectURL(file);
    originalBuffer = await file.arrayBuffer();
    originalSize = file.size;
    convertedUrl = '';
    convertedSize = null;
    errorMsg = '';

    try {
      if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
        const img = new Image();
        const url = URL.createObjectURL(new Blob([originalBuffer], { type: 'image/svg+xml' }));
        img.src = url;
        await new Promise(resolve => img.onload = resolve);
        imageBitmap = await createImageBitmap(img);
        URL.revokeObjectURL(url);
      } else {
        imageBitmap = await createImageBitmap(file);
      }
      cropW = imageBitmap.width;
      cropH = imageBitmap.height;
    } catch {
      errorMsg = 'Unsupported image format for preview. Use "Convert & Download" to process server-side.';
      imageBitmap = null;
    }
    updatePreview();
  }

  async function updatePreview() {
    if (!convertWorker) return;

    if (targetFormat === 'svg' && svgMode === 'trace') {
      if (originalBuffer && traceWorker) {
        traceWorker.postMessage({
          buffer: originalBuffer,
          options: {
            ...traceOptions,
            crop: cropActive && cropW > 0 && cropH > 0 ? { x: cropX, y: cropY, w: cropW, h: cropH } : null,
          },
        });
      }
      return;
    }

    if (!imageBitmap) return;

    if (targetFormat === 'svg' && svgMode === 'embed') {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      let sw = imageBitmap.width, sh = imageBitmap.height;
      let sx = 0, sy = 0;
      if (cropActive && cropW > 0 && cropH > 0) { sx = cropX; sy = cropY; sw = cropW; sh = cropH; }
      c.width = sw; c.height = sh;
      ctx.drawImage(imageBitmap, sx, sy, sw, sh, 0, 0, sw, sh);
      const dataUrl = c.toDataURL('image/png');
      const svgEmbed = `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}"><image href="${dataUrl}" width="100%" height="100%"/></svg>`;
      if (livePreviewUrl) URL.revokeObjectURL(livePreviewUrl);
      livePreviewUrl = URL.createObjectURL(new Blob([svgEmbed], { type: 'image/svg+xml' }));
      liveFormat = 'svg';
      return;
    }

    convertWorker.postMessage({
      imageBitmap,
      targetFormat,
      width: width || 0,
      height: height || 0,
      quality,
      crop: cropActive && cropW > 0 && cropH > 0 ? { x: cropX, y: cropY, w: cropW, h: cropH } : null,
      rotate: rotateAngle,
      flip: flipMode !== 'none' ? flipMode : null,
    });
  }

  $: if (imageBitmap && originalFile && tab === 'file') {
    targetFormat; svgMode; JSON.stringify(traceOptions); width; height; quality;
    cropX; cropY; cropW; cropH; cropActive; rotateAngle; flipMode;
    clearTimeout(timer);
    timer = setTimeout(updatePreview, targetFormat === 'svg' && svgMode === 'trace' ? 100 : 200);
  }

  function buildConvertUrl() {
    let url = apiUrl(`/convert?format=${targetFormat}&width=${width || ''}&height=${height || ''}&quality=${quality}`);
    if (targetFormat === 'svg' && svgMode === 'trace') {
      const t = traceOptions;
      url += `&trace=true&mode=${t.mode}&colors=${t.colors}&filterSpeckle=${t.filterSpeckle}&pathPrecision=${t.pathPrecision}&layerDiff=${t.layerDiff}&corner=${t.corner}&length=${t.length}&iterations=${t.iterations}&splice=${t.splice}`;
    }
    if (cropActive && cropW > 0 && cropH > 0) {
      url += `&crop_x=${cropX}&crop_y=${cropY}&crop_w=${cropW}&crop_h=${cropH}`;
    }
    if (rotateAngle) url += `&rotate=${rotateAngle}`;
    if (flipMode !== 'none') url += `&flip=${flipMode}`;
    return url;
  }

  async function convertNow() {
    if (!originalFile) return;
    converting = true;
    errorMsg = '';
    const formData = new FormData();
    formData.append('file', originalFile);

    try {
      const res = await fetch(buildConvertUrl(), { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Conversion failed');
      const size = parseInt(res.headers.get('X-Converted-Size'));
      if (size) convertedSize = size;
      const blob = await res.blob();
      if (convertedUrl) URL.revokeObjectURL(convertedUrl);
      convertedUrl = URL.createObjectURL(blob);
    } catch (err) {
      errorMsg = err.message;
    } finally {
      converting = false;
    }
  }

  function handleCropResult(e) {
    const { x, y, w, h } = e.detail;
    cropX = x; cropY = y; cropW = w; cropH = h;
    cropActive = true;
  }
</script>

<main class="min-h-screen bg-gray-900 text-white p-6 md:p-10 font-sans">
  <h1 class="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
    Pixvert
  </h1>
  <p class="text-lg text-gray-400 mb-8">Real‑time previews, vector tracing, batch processing, crop, rotate, flip.</p>

  <div class="flex gap-4 mb-6">
    <button class="px-5 py-2 rounded-lg transition {tab === 'file' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}"
            on:click={() => tab = 'file'}>File Upload</button>
    <button class="px-5 py-2 rounded-lg transition {tab === 'url' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}"
            on:click={() => tab = 'url'}>From URL</button>
  </div>

  {#if tab === 'url'}
    <UrlInput on:file={(e) => { tab = 'file'; loadFile(e.detail); }} />
  {/if}

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
    <UploadZone
      previewUrl={originalPreviewUrl}
      fileName={originalFile?.name}
      fileSize={originalSize}
      on:file={(e) => loadFile(e.detail)}
    />

    <div class="space-y-4">
      {#if targetFormat === 'svg'}
        <div>
          <label class="block text-sm mb-1" for="svgmode">SVG Mode</label>
          <select id="svgmode" bind:value={svgMode} class="w-full bg-gray-800 rounded p-3 border border-gray-700">
            <option value="embed">Embed (lossless wrapper)</option>
            <option value="trace">Vector Trace (true paths)</option>
          </select>
        </div>
        <TraceSettings {traceOptions} {svgMode} />
      {/if}

      <OptionsPanel
        bind:targetFormat bind:width bind:height bind:quality
        {converting}
        hasFile={!!originalFile}
        {errorMsg}
        on:convert={convertNow}
      />

      <TransformPanel
        bind:cropActive bind:cropX bind:cropY bind:cropW bind:cropH
        bind:rotateAngle bind:flipMode
        on:cropInteractive={() => showCropOverlay = true}
      />

      <details class="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <summary class="cursor-pointer text-cyan-400 font-semibold">Comparison View</summary>
        <div class="mt-3 space-y-2">
          <label class="flex items-center gap-2">
            <input type="radio" name="compare" bind:group={compareMode} value="off" /><span>Off</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" name="compare" bind:group={compareMode} value="side" /><span>Side by side</span>
          </label>
        </div>
      </details>
    </div>
  </div>

  <PreviewPane
    {livePreviewUrl} {liveFormat}
    {convertedUrl} {convertedSize} {originalSize}
    {targetFormat} {compareMode}
  />

  <BatchSection
    {targetFormat} {width} {height} {quality}
    {svgMode} {traceOptions}
    {cropActive} {cropX} {cropY} {cropW} {cropH}
    {rotateAngle} {flipMode}
  />

  <p class="mt-12 text-center text-gray-500 text-sm">Pixvert — built with Rust, WASM, and love.</p>
</main>

{#if showCropOverlay && originalPreviewUrl && imageBitmap}
  <CropOverlay
    imageUrl={originalPreviewUrl}
    imageWidth={imageBitmap?.width || 0}
    imageHeight={imageBitmap?.height || 0}
    on:crop={handleCropResult}
    on:close={() => showCropOverlay = false}
  />
{/if}
