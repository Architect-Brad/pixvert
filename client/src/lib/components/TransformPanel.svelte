<script>
  export let cropActive;
  export let cropX;
  export let cropY;
  export let cropW;
  export let cropH;
  export let rotateAngle;
  export let flipMode;

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<details class="bg-gray-800 rounded-xl p-4 border border-gray-700">
  <summary class="cursor-pointer text-cyan-400 font-semibold">Crop / Rotate / Flip</summary>
  <div class="mt-4 space-y-3">
    <label class="flex items-center gap-2">
      <input type="checkbox" bind:checked={cropActive} class="accent-cyan-400" />
      <span>Crop</span>
    </label>
    {#if cropActive}
      <button
        on:click={() => dispatch('cropInteractive')}
        class="text-sm text-cyan-400 underline hover:text-cyan-300 ml-6 mb-2"
      >
        Use interactive crop on preview
      </button>
      <div class="grid grid-cols-2 gap-2 ml-6">
        <label>X: <input type="number" bind:value={cropX} min="0" class="w-full bg-gray-700 rounded p-2" /></label>
        <label>Y: <input type="number" bind:value={cropY} min="0" class="w-full bg-gray-700 rounded p-2" /></label>
        <label>W: <input type="number" bind:value={cropW} min="1" class="w-full bg-gray-700 rounded p-2" /></label>
        <label>H: <input type="number" bind:value={cropH} min="1" class="w-full bg-gray-700 rounded p-2" /></label>
      </div>
    {/if}
    <label class="flex items-center gap-2">
      <span>Rotate:</span>
      <select bind:value={rotateAngle} class="bg-gray-700 rounded p-2">
        <option value={0}>0°</option>
        <option value={90}>90°</option>
        <option value={180}>180°</option>
        <option value={270}>270°</option>
      </select>
    </label>
    <label class="flex items-center gap-2">
      <span>Flip:</span>
      <select bind:value={flipMode} class="bg-gray-700 rounded p-2">
        <option value="none">None</option>
        <option value="h">Horizontal</option>
        <option value="v">Vertical</option>
        <option value="hv">Both</option>
      </select>
    </label>
  </div>
</details>
