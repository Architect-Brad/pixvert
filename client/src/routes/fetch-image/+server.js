import { fetchImage } from '$lib/server/convert';

export async function GET({ url }) {
    const imageUrl = url.searchParams.get('url');
    if (!imageUrl) {
        return new Response('Missing url query param', { status: 400 });
    }

    try {
        const { buffer, type } = await fetchImage(imageUrl);
        return new Response(buffer, {
            headers: {
                'Content-Type': type,
                'X-Image-Size': String(buffer.length),
            },
        });
    } catch (err) {
        return new Response(err.message, { status: 400 });
    }
}
