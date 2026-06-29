<script>
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let previewUrl = '';
  export let fileName = '';
  export let fileSize = null;

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) dispatch('file', file);
  }

  function handleInput(e) {
    const file = e.target.files[0];
    if (file) dispatch('file', file);
  }
</script>

<div
  class="border-2 border-dashed border-gray-600 rounded-2xl p-8 text-center hover:border-cyan-400 transition cursor-pointer"
  on:dragover|preventDefault on:drop={handleDrop}
  role="button" tabindex="0"
>
  <input type="file" id="singleFileInput" class="hidden" on:change={handleInput}
         accept="image/png,image/jpeg,image/webp,image/avif,image/svg+xml,image/tiff,image/bmp,.heic,.heif,.raw,.cr2,.nef,.arw,.dng" />
  <label for="singleFileInput" class="cursor-pointer block">
    {#if previewUrl}
      <img src={previewUrl} alt="original" class="max-h-64 mx-auto rounded-lg shadow-lg" />
      <p class="mt-4 text-gray-300">{fileName} ({formatSize(fileSize)})</p>
    {:else}
      <span class="text-6xl">⬆️</span>
      <p class="mt-4 text-gray-400">Drop or click to browse<br/><span class="text-sm text-gray-500">PNG, JPEG, WebP, AVIF, SVG, TIFF, BMP, HEIC, RAW</span></p>
    {/if}
  </label>
</div>
