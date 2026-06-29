import { convertImage, buildConvertOptions, validateImage } from '$lib/server/convert';

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST({ request, url }) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        if (buffer.length > 50 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'File too large (max 50MB)' }), {
                status: 413,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        validateImage(buffer);

        const options = buildConvertOptions(url);
        const result = await convertImage(buffer, options);

        return new Response(result.buffer, {
            headers: {
                'Content-Type': result.mime,
                'Content-Disposition': `attachment; filename="converted.${options.targetFormat}"`,
                'X-Converted-Size': String(result.size),
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
            },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
