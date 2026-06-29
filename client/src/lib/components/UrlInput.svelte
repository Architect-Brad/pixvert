<script>
  import { createEventDispatcher } from 'svelte';
  import { apiUrl } from '$lib/api';
  const dispatch = createEventDispatcher();

  export let fetchingUrl = false;

  let urlInput = '';
  let errorMsg = '';

  async function handleFetch() {
    if (!urlInput) return;
    fetchingUrl = true;
    errorMsg = '';
    try {
      const res = await fetch(apiUrl(`/fetch-image?url=${encodeURIComponent(urlInput)}`));
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const name = urlInput.split('/').pop().split('?')[0] || 'remote-image';
      const file = new File([blob], name, { type: blob.type });
      dispatch('file', file);
    } catch (err) {
      errorMsg = err.message;
    } finally {
      fetchingUrl = false;
    }
  }
</script>

<div class="flex gap-3 mb-8">
  <input type="url" bind:value={urlInput} placeholder="https://example.com/image.jpg"
         class="flex-1 bg-gray-800 rounded-xl p-4 border border-gray-700 focus:border-cyan-400" />
  <button on:click={handleFetch} disabled={fetchingUrl || !urlInput}
          class="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:scale-[1.02] transition disabled:opacity-50">
    {fetchingUrl ? 'Fetching...' : 'Fetch'}
  </button>
</div>
{#if errorMsg}
  <p class="text-red-400 mb-4">{errorMsg}</p>
{/if}
