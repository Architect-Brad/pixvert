<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  const dispatch = createEventDispatcher();

  export let imageUrl = '';
  export let imageWidth = 0;
  export let imageHeight = 0;

  let container;
  let drawing = false;
  let startX = 0, startY = 0;
  let selX = 0, selY = 0, selW = 0, selH = 0;
  let dragging = false;
  let dragOffX = 0, dragOffY = 0;
  let resizing = false;
  let resizeDir = '';
  let resizeStartX = 0, resizeStartY = 0;
  let resizeStartW = 0, resizeStartH = 0, resizeStartSelX = 0, resizeStartSelY = 0;
  let scale = 1;

  function updateScale() {
    if (!container || !imageWidth || !imageHeight) return;
    const rect = container.getBoundingClientRect();
    scale = Math.min(rect.width / imageWidth, rect.height / imageHeight);
    if (scale > 1) scale = 1;
  }

  onMount(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
  });

  onDestroy(() => {
    window.removeEventListener('resize', updateScale);
  });

  function getPos(e) {
    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    return { x: Math.max(0, Math.min(x, imageWidth)), y: Math.max(0, Math.min(y, imageHeight)) };
  }

  function getResizeDir(x, y) {
    const margin = 8 / scale;
    if (selW === 0 || selH === 0) return '';
    const right = selX + selW;
    const bottom = selY + selH;
    let dir = '';
    if (Math.abs(x - selX) < margin) dir += 'w';
    else if (Math.abs(x - right) < margin) dir += 'e';
    if (Math.abs(y - selY) < margin) dir += 'n';
    else if (Math.abs(y - bottom) < margin) dir += 's';
    return dir;
  }

  function handleMouseDown(e) {
    if (e.button !== 0) return;
    const pos = getPos(e);

    if (selW > 0 && selH > 0 && pos.x >= selX && pos.x <= selX + selW && pos.y >= selY && pos.y <= selY + selH) {
      const dir = getResizeDir(pos.x, pos.y);
      if (dir) {
        resizing = true;
        resizeDir = dir;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartW = selW;
        resizeStartH = selH;
        resizeStartSelX = selX;
        resizeStartSelY = selY;
      } else {
        dragging = true;
        dragOffX = pos.x - selX;
        dragOffY = pos.y - selY;
      }
    } else {
      drawing = true;
      startX = pos.x;
      startY = pos.y;
      selX = pos.x;
      selY = pos.y;
      selW = 0;
      selH = 0;
    }
  }

  function handleMouseMove(e) {
    const pos = getPos(e);

    if (drawing) {
      selX = Math.min(startX, pos.x);
      selY = Math.min(startY, pos.y);
      selW = Math.abs(pos.x - startX);
      selH = Math.abs(pos.y - startY);
    } else if (dragging) {
      let nx = pos.x - dragOffX;
      let ny = pos.y - dragOffY;
      nx = Math.max(0, Math.min(nx, imageWidth - selW));
      ny = Math.max(0, Math.min(ny, imageHeight - selH));
      selX = nx;
      selY = ny;
    } else if (resizing) {
      const dx = (e.clientX - resizeStartX) / scale;
      const dy = (e.clientY - resizeStartY) / scale;
      let nx = resizeStartSelX, ny = resizeStartSelY, nw = resizeStartW, nh = resizeStartH;
      if (resizeDir.includes('e')) nw = Math.max(10, resizeStartW + dx);
      if (resizeDir.includes('w')) { nw = Math.max(10, resizeStartW - dx); nx = resizeStartSelX + (resizeStartW - nw); }
      if (resizeDir.includes('s')) nh = Math.max(10, resizeStartH + dy);
      if (resizeDir.includes('n')) { nh = Math.max(10, resizeStartH - dy); ny = resizeStartSelY + (resizeStartH - nh); }
      if (nx + nw > imageWidth) nw = imageWidth - nx;
      if (ny + nh > imageHeight) nh = imageHeight - ny;
      selX = nx; selY = ny; selW = nw; selH = nh;
    }
  }

  function handleMouseUp() {
    if (drawing && selW < 5 && selH < 5) {
      selW = 0; selH = 0;
    }
    drawing = false;
    dragging = false;
    resizing = false;
  }

  function applyCrop() {
    if (selW > 0 && selH > 0) {
      dispatch('crop', { x: Math.round(selX), y: Math.round(selY), w: Math.round(selW), h: Math.round(selH) });
    }
    dispatch('close');
  }

  function cancel() {
    dispatch('close');
  }

  $: if (imageUrl) updateScale();
</script>

{#if imageUrl}
  <div class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" on:click={cancel}>
    <div class="relative bg-gray-900 rounded-2xl p-6 max-w-4xl w-full mx-4" on:click|stopPropagation>
      <h3 class="text-lg font-semibold text-cyan-400 mb-4">Select crop region</h3>
      <div class="relative overflow-hidden rounded-lg" bind:this={container}
           style="max-height: 70vh; aspect-ratio: {imageWidth}/{imageHeight}; cursor: {selW > 0 && selH > 0 ? 'move' : 'crosshair'}"
      >
        <img src={imageUrl} alt="crop source" class="w-full h-full object-contain"
             style="max-width: {imageWidth}px; max-height: 70vh;" />
        {#if selW > 0 && selH > 0}
          <div class="absolute border-2 border-cyan-400 bg-cyan-400/20 pointer-events-none"
               style="left: {selX * scale}px; top: {selY * scale}px; width: {selW * scale}px; height: {selH * scale}px;">
            <div class="absolute -top-7 left-0 text-xs text-white bg-cyan-600 px-1 rounded">{Math.round(selW)}×{Math.round(selH)}</div>
          </div>
        {/if}
        <div class="absolute inset-0"
             on:mousedown={handleMouseDown}
             on:mousemove={handleMouseMove}
             on:mouseup={handleMouseUp}
             on:mouseleave={handleMouseUp}
             role="application"
        ></div>
      </div>
      <div class="flex gap-3 mt-4 justify-end">
        <button on:click={cancel} class="px-5 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition">Cancel</button>
        <button on:click={applyCrop} disabled={!selW || !selH}
                class="px-5 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition disabled:opacity-50">Apply Crop</button>
      </div>
    </div>
  </div>
{/if}
