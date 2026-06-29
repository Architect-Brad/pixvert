import { fetchImage, validateImage } from '$lib/server/convert';

export async function GET({ url }) {
    const imageUrl = url.searchParams.get('url');
    if (!imageUrl) {
        return new Response(JSON.stringify({ error: 'Missing url query param' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { buffer, type } = await fetchImage(imageUrl);
        validateImage(buffer);
        return new Response(buffer, {
            headers: {
                'Content-Type': type,
                'X-Image-Size': String(buffer.length),
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
