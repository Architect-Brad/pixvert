import { describe, it, expect, vi, beforeAll } from 'vitest';

vi.mock('sharp', () => ({
  default: () => ({
    metadata: vi.fn().mockResolvedValue({ width: 100, height: 100, format: 'png' }),
    resize: vi.fn().mockReturnThis(),
    rotate: vi.fn().mockReturnThis(),
    flop: vi.fn().mockReturnThis(),
    flip: vi.fn().mockReturnThis(),
    extract: vi.fn().mockReturnThis(),
    ensureAlpha: vi.fn().mockReturnThis(),
    raw: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock')),
    toFormat: vi.fn().mockReturnThis(),
    withMetadata: vi.fn().mockReturnThis(),
  }),
}));

vi.mock('svgo', () => ({
  optimize: vi.fn((str) => ({ data: str })),
}));

vi.mock('vtracer-wasm', () => ({
  default: vi.fn(),
  to_svg: vi.fn(() => '<svg></svg>'),
}));

let mod;
let MyURL;

beforeAll(async () => {
  mod = await import('./convert.js');
  MyURL = (await import('url')).URL;
});

describe('parseCrop', () => {
  it('returns null when no crop params', () => {
    const url = new MyURL('http://localhost/convert');
    expect(mod.parseCrop(url)).toBeNull();
  });
});

describe('validateImage', () => {
  it('accepts valid PNG', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(() => mod.validateImage(buf)).not.toThrow();
  });

  it('throws on empty buffer', () => {
    expect(() => mod.validateImage(Buffer.from([]))).toThrow('Empty image buffer');
  });
});

describe('buildConvertOptions', () => {
  it('uses defaults for missing params', () => {
    const url = new MyURL('http://localhost/convert');
    const opts = mod.buildConvertOptions(url);
    expect(opts.targetFormat).toBe('png');
  });

  it('parses all params from URL', () => {
    const url = new MyURL('http://localhost/convert?format=webp&quality=80&width=200&height=300&trace=true&rotate=90&flip=h&crop_x=0&crop_y=0&crop_w=50&crop_h=50&compressionLevel=8&tiffCompression=zip&optimizeSvg=true&preserveMetadata=true');
    const opts = mod.buildConvertOptions(url);
    expect(opts.targetFormat).toBe('webp');
    expect(opts.quality).toBe(80);
    expect(opts.tiffCompression).toBe('zip');
    expect(opts.optimizeSvg).toBe(true);
    expect(opts.preserveMetadata).toBe(true);
  });
});

describe('convertImage', () => {
  it('throws on empty buffer', async () => {
    await expect(mod.convertImage(Buffer.from([]), { targetFormat: 'png' })).rejects.toThrow('Empty image buffer');
  });
});

describe('fetchImage', () => {
  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(mod.fetchImage('http://example.com/img.png')).rejects.toThrow('Failed to fetch image: 404');
  });
});
