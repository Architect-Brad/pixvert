<script>
  export let targetFormat;
  export let width;
  export let height;
  export let quality;
  export let converting;
  export let hasFile;
  export let errorMsg = '';

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
