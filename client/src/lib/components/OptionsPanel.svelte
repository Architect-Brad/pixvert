<script>
  export let targetFormat;
  export let width;
  export let height;
  export let quality;
  export let converting;
  export let hasFile;
  export let errorMsg = '';
  export let compressionLevel = 6;
  export let tiffCompression = 'lzw';
  export let optimizeSvg = false;
  export let preserveMetadata = false;

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<div class="space-y-4">
  <div>
    <label class="block text-sm mb-1" for="fmt">Target Format</label>
    <select id="fmt" bind:value={targetFormat} class="w-full bg-gray-800 rounded p-3 border border-gray-700 focus:border-cyan-400">
      <option value="png">PNG</option>
      <option value="jpeg">JPEG</option>
      <option value="webp">WebP</option>
      <option value="avif">AVIF</option>
      <option value="tiff">TIFF</option>
      <option value="bmp">BMP</option>
      <option value="heic">HEIC</option>
      <option value="svg">SVG</option>
    </select>
  </div>

  <div class="flex gap-4">
    <div class="flex-1">
      <label class="block text-sm mb-1" for="w">Width (px)</label>
      <input id="w" type="number" bind:value={width} placeholder="Auto" class="w-full bg-gray-800 rounded p-3 border border-gray-700" />
    </div>
    <div class="flex-1">
      <label class="block text-sm mb-1" for="h">Height (px)</label>
      <input id="h" type="number" bind:value={height} placeholder="Auto" class="w-full bg-gray-800 rounded p-3 border border-gray-700" />
    </div>
  </div>

  {#if targetFormat !== 'png' && targetFormat !== 'svg' && targetFormat !== 'bmp' && targetFormat !== 'tiff'}
    <div>
      <label class="block text-sm mb-1" for="qual">Quality: {quality}%</label>
      <input id="qual" type="range" min="1" max="100" bind:value={quality} class="w-full accent-cyan-400" />
    </div>
  {/if}

  {#if targetFormat === 'png'}
    <div>
      <label class="block text-sm mb-1" for="compression">Compression Level: {compressionLevel}</label>
      <input id="compression" type="range" min="0" max="9" bind:value={compressionLevel} class="w-full accent-cyan-400" />
    </div>
  {/if}

  {#if targetFormat === 'tiff'}
    <div>
      <label class="block text-sm mb-1" for="tiffCompression">TIFF Compression</label>
      <select id="tiffCompression" bind:value={tiffCompression} class="w-full bg-gray-800 rounded p-3 border border-gray-700 focus:border-cyan-400">
        <option value="none">None</option>
        <option value="lzw">LZW</option>
        <option value="zip">ZIP</option>
        <option value="jpeg">JPEG</option>
      </select>
    </div>
  {/if}

  {#if targetFormat === 'svg'}
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={optimizeSvg} class="accent-cyan-400" />
      <span>Optimize SVG output</span>
    </label>
  {/if}

  {#if targetFormat !== 'svg'}
    <label class="flex items-center gap-2 mb-2">
      <input type="checkbox" bind:checked={preserveMetadata} class="accent-cyan-400" />
      <span>Preserve metadata (EXIF/etc)</span>
    </label>
  {/if}

  <button
    on:click={() => dispatch('convert')}
    disabled={converting || !hasFile}
    class="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
  >
    {converting ? 'Converting...' : 'Convert & Download'}
  </button>
  {#if errorMsg}
    <p class="text-red-400">{errorMsg}</p>
  {/if}
</div>
