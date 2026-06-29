<script>
  export let livePreviewUrl = '';
  export let liveFormat = '';
  export let convertedUrl = '';
  export let convertedSize = null;
  export let originalSize = null;
  export let targetFormat = 'webp';
  export let compareMode = 'side';

  function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }
</script>

{#if compareMode !== 'off' && livePreviewUrl && convertedUrl}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
    <div>
      <h2 class="text-xl mb-3 text-gray-300">
        Live Preview
        {#if liveFormat}
          <span class="text-sm text-gray-500">({liveFormat.toUpperCase()}) {convertedSize ? formatSize(convertedSize) : ''}</span>
        {/if}
      </h2>
      <img src={livePreviewUrl} alt="live preview" class="max-h-96 mx-auto rounded-lg border border-gray-700 shadow-xl" />
      {#if originalSize && convertedSize}
        <p class="text-center mt-2 text-sm text-gray-400">
          Original: {formatSize(originalSize)} → Preview: {formatSize(convertedSize)}
          ({((1 - convertedSize / originalSize) * 100).toFixed(1)}%)
        </p>
      {/if}
    </div>
    <div>
      <h2 class="text-xl mb-3 text-gray-300">Server Result</h2>
      <img src={convertedUrl} alt="converted" class="max-h-96 mx-auto rounded-lg border border-cyan-700 shadow-xl" />
      <div class="text-center mt-4">
        <a href={convertedUrl} download="converted.{targetFormat}"
           class="inline-block px-8 py-3 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition">
          Download {targetFormat.toUpperCase()}
        </a>
      </div>
    </div>
  </div>
{:else if livePreviewUrl}
  <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
    <div>
      <h2 class="text-xl mb-3 text-gray-300">
        Live Preview
        {#if liveFormat}
          <span class="text-sm text-gray-500">({liveFormat.toUpperCase()})</span>
        {/if}
      </h2>
      <img src={livePreviewUrl} alt="live preview" class="max-h-96 mx-auto rounded-lg border border-gray-700 shadow-xl" />
    </div>
    <div>
      <h2 class="text-xl mb-3 text-gray-300">Server Download</h2>
      {#if convertedUrl}
        <img src={convertedUrl} alt="converted" class="max-h-96 mx-auto rounded-lg border border-cyan-700 shadow-xl" />
        <div class="text-center mt-4">
          {#if originalSize && convertedSize}
            <p class="text-sm text-gray-400 mb-2">
              {formatSize(originalSize)} → {formatSize(convertedSize)}
              ({((1 - convertedSize / originalSize) * 100).toFixed(1)}% reduction)
            </p>
          {/if}
          <a href={convertedUrl} download="converted.{targetFormat}"
             class="inline-block px-8 py-3 bg-cyan-600 rounded-lg hover:bg-cyan-700 transition">
            Download {targetFormat.toUpperCase()}
          </a>
        </div>
      {:else}
        <div class="text-gray-500 text-center">Click "Convert & Download" to get the final file</div>
      {/if}
    </div>
  </div>
{/if}
