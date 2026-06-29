<script>
  import { createEventDispatcher } from 'svelte';
  import { apiUrl } from '$lib/api';
  const dispatch = createEventDispatcher();

  export let targetFormat = 'webp';
  export let width = 0;
  export let height = 0;
  export let quality = 85;
  export let svgMode = 'embed';
  export let traceOptions;
  export let cropActive = false;
  export let cropX = 0;
  export let cropY = 0;
  export let cropW = 0;
  export let cropH = 0;
  export let rotateAngle = 0;
  export let flipMode = 'none';

  let batchFiles = [];
  let batchProgress = [];
  let batchPreviews = [];
  let batchJobId = null;
  let batchRunning = false;
  let batchEventSource = null;
  let dragIndex = null;
  let errorMsg = '';

  function handleBatchSelect(e) {
    batchPreviews.forEach(u => URL.revokeObjectURL(u));
    batchFiles = [...e.target.files];
    batchProgress = batchFiles.map(f => ({ name: f.name, status: 'pending' }));
    batchPreviews = batchFiles.map(f => URL.createObjectURL(f));
  }

  function handleDragStart(e, i) {
    dragIndex = i;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  function handleBatchDrop(e, i) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const files = [...batchFiles];
    const previews = [...batchPreviews];
    const progress = [...batchProgress];
    const [f] = files.splice(dragIndex, 1);
    const [p] = previews.splice(dragIndex, 1);
    const [pr] = progress.splice(dragIndex, 1);
    files.splice(i, 0, f);
    previews.splice(i, 0, p);
    progress.splice(i, 0, pr);
    batchFiles = files;
    batchPreviews = previews;
    batchProgress = progress;
    dragIndex = null;
  }

  async function startBatch() {
    if (!batchFiles.length) return;
    batchRunning = true;
    const formData = new FormData();
    batchFiles.forEach(f => formData.append('files', f));

    const t = traceOptions;
    let url = apiUrl(`/batch?format=${targetFormat}&width=${width || ''}&height=${height || ''}&quality=${quality}&trace=${svgMode === 'trace'}&mode=${t.mode}&colors=${t.colors}&filterSpeckle=${t.filterSpeckle}&pathPrecision=${t.pathPrecision}&layerDiff=${t.layerDiff}&corner=${t.corner}&length=${t.length}&iterations=${t.iterations}&splice=${t.splice}`);
    if (cropActive && cropW > 0 && cropH > 0) {
      url += `&crop_x=${cropX}&crop_y=${cropY}&crop_w=${cropW}&crop_h=${cropH}`;
    }
    if (rotateAngle) url += `&rotate=${rotateAngle}`;
    if (flipMode !== 'none') url += `&flip=${flipMode}`;

    const res = await fetch(url, { method: 'POST', body: formData });
    const { jobId } = await res.json();
    batchJobId = jobId;

    batchEventSource = new EventSource(apiUrl(`/batch/progress/${jobId}`));
    batchEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.progress) batchProgress = data.progress;
      if (data.status === 'done') {
        batchEventSource.close();
        batchRunning = false;
        downloadBatchZip();
      } else if (data.status === 'error') {
        batchEventSource.close();
        batchRunning = false;
        errorMsg = 'Batch failed.';
      }
    };
    batchEventSource.onerror = () => {
      batchEventSource.close();
      batchRunning = false;
      errorMsg = 'Lost connection to server.';
    };
  }

  function downloadBatchZip() {
    const a = document.createElement('a');
    a.href = apiUrl(`/batch/download/${batchJobId}`);
    a.download = 'pixvert-batch.zip';
    a.click();
  }

  function cancelBatch() {
    if (batchEventSource) batchEventSource.close();
    batchRunning = false;
    batchProgress = [];
  }
</script>

<div class="bg-gray-800 rounded-2xl p-6 border border-gray-700">
  <h2 class="text-2xl font-bold mb-4">Batch Conversion</h2>
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <input type="file" id="batchFilesInput" class="hidden" multiple on:change={handleBatchSelect} />
    <label for="batchFilesInput"
           class="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition">
      Select Files
    </label>
    <input type="file" id="batchFolderInput" class="hidden" multiple webkitdirectory on:change={handleBatchSelect} />
    <label for="batchFolderInput"
           class="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 cursor-pointer transition">
      Select Folder
    </label>
    <span class="text-gray-400">{batchFiles.length > 0 ? batchFiles.length + ' files selected' : ''}</span>
  </div>

  {#if batchFiles.length > 0}
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
      {#each batchFiles as file, i}
        <div class="bg-gray-700 p-2 rounded-lg text-center {batchRunning ? '' : 'cursor-grab active:cursor-grabbing'}"
             draggable={!batchRunning}
             on:dragstart={(e) => handleDragStart(e, i)}
             on:dragover={handleDragOver}
             on:drop={(e) => handleBatchDrop(e, i)}
        >
          <img src={batchPreviews[i]} alt="" class="h-16 mx-auto mb-1 rounded" />
          <p class="text-xs truncate">{file.name}</p>
          {#if batchProgress[i]}
            <div class="w-full bg-gray-600 h-1 mt-1 rounded">
              <div class="h-1 rounded transition-all duration-300"
                   style="width: {batchProgress[i].status === 'done' ? '100%' : '50%'}; background: {batchProgress[i].status === 'error' ? '#f87171' : '#22d3ee'}">
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="flex gap-4">
      <button on:click={startBatch} disabled={batchRunning || !batchFiles.length}
              class="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold hover:scale-[1.02] transition disabled:opacity-50 disabled:cursor-not-allowed">
        {batchRunning ? 'Processing...' : 'Convert All & Download ZIP'}
      </button>
      {#if batchRunning}
        <button on:click={cancelBatch} class="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition">Cancel</button>
      {/if}
    </div>

    {#if batchJobId && !batchRunning}
      <p class="mt-3 text-green-400">Batch complete! <button on:click={downloadBatchZip} class="underline">Click here to download again</button></p>
    {/if}
  {/if}
  {#if errorMsg}
    <p class="text-red-400 mt-3">{errorMsg}</p>
  {/if}
</div>
