import { Archiver } from 'archiver';
import { PassThrough } from 'stream';
import { convertImage, buildConvertOptions } from '$lib/server/convert';

export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST({ request, url }) {
    const formData = await request.formData();
    const files = formData.getAll('files');
    if (!files || files.length === 0) {
        return new Response('No files uploaded', { status: 400 });
    }

    const options = buildConvertOptions(url);
    const zip = new Archiver('zip', { zlib: { level: 9 } });
    const pass = new PassThrough();

    zip.pipe(pass);

    for (const file of files) {
        try {
            const buffer = Buffer.from(await file.arrayBuffer());
            const result = await convertImage(buffer, options);
            const newName = file.name.replace(/\.[^.]+$/, `.${options.targetFormat}`);
            zip.append(result.buffer, { name: newName });
        } catch (err) {
            const newName = file.name.replace(/\.[^.]+$/, '') + `.error.txt`;
            zip.append(`Conversion failed: ${err.message}`, { name: newName });
        }
    }

    zip.finalize();

    return new Response(pass, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="pixvert-batch.zip"',
        },
    });
}
