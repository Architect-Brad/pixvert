<script>
  export let traceOptions;
  export let svgMode;
</script>

{#if svgMode === 'trace'}
  <div class="p-4 bg-gray-800 rounded-xl space-y-3 border border-gray-700">
    <h3 class="text-md font-semibold text-cyan-400">Trace Settings</h3>

    <label class="flex items-center gap-2">
      <span>Mode</span>
      <select bind:value={traceOptions.mode} class="bg-gray-700 rounded ml-auto p-1">
        <option value="color">Color</option>
        <option value="bw">Black & White</option>
      </select>
    </label>

    {#if traceOptions.mode === 'color'}
      <label class="flex items-center gap-2">
        <span>Colors: {traceOptions.colors}</span>
        <input type="range" min="2" max="256" bind:value={traceOptions.colors} class="ml-auto w-1/2 accent-cyan-400" />
      </label>
    {/if}

    <label class="flex items-center gap-2">
      <span>Speckle: {traceOptions.filterSpeckle}</span>
      <input type="range" min="0" max="20" bind:value={traceOptions.filterSpeckle} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
    <label class="flex items-center gap-2">
      <span>Precision: {traceOptions.pathPrecision}</span>
      <input type="range" min="1" max="10" bind:value={traceOptions.pathPrecision} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
    <label class="flex items-center gap-2">
      <span>Layer diff: {traceOptions.layerDiff}</span>
      <input type="range" min="1" max="50" bind:value={traceOptions.layerDiff} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
    <label class="flex items-center gap-2">
      <span>Corner: {traceOptions.corner}</span>
      <input type="range" min="0" max="180" bind:value={traceOptions.corner} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
    <label class="flex items-center gap-2">
      <span>Length: {traceOptions.length}</span>
      <input type="range" min="1" max="20" step="0.5" bind:value={traceOptions.length} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
    <label class="flex items-center gap-2">
      <span>Iterations: {traceOptions.iterations}</span>
      <input type="range" min="1" max="50" bind:value={traceOptions.iterations} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
    <label class="flex items-center gap-2">
      <span>Splice: {traceOptions.splice}</span>
      <input type="range" min="0" max="180" bind:value={traceOptions.splice} class="ml-auto w-1/2 accent-cyan-400" />
    </label>
  </div>
{/if}
