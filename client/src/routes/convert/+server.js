import { convertImage, buildConvertOptions } from '$lib/server/convert';

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST({ request, url }) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
        return new Response('No file uploaded', { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const options = buildConvertOptions(url);
    const result = await convertImage(buffer, options);

    return new Response(result.buffer, {
        headers: {
            'Content-Type': result.mime,
            'Content-Disposition': `attachment; filename="converted.${options.targetFormat}"`,
            'X-Converted-Size': String(result.size),
        },
    });
}
