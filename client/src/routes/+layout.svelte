<script>
  import { onMount } from 'svelte';

  onMount(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js');
    }
  });
</script>

<slot />
