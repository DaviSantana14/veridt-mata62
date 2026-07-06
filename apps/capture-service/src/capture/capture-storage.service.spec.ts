import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { CaptureStorageService } from './capture-storage.service';

const originalEnv = { ...process.env };

describe('CaptureStorageService', () => {
  let storageRoot: string;
  let service: CaptureStorageService;

  beforeEach(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'capture-storage-'));
    process.env = {
      ...originalEnv,
      CAPTURE_STORAGE_DIR: storageRoot,
    };
    service = new CaptureStorageService();
  });

  afterEach(async () => {
    process.env = originalEnv;
    await rm(storageRoot, { recursive: true, force: true });
  });

  it('creates an absolute record directory inside storage', async () => {
    const recordDir = await service.getRecordDir('record-1');

    expect(recordDir).toBe(join(storageRoot, 'record-1'));
    expect(relative(storageRoot, recordDir)).toBe('record-1');
  });

  it('creates unique screenshot and video asset paths', async () => {
    const date = new Date('2026-01-02T03:04:05.006Z');

    const image = await service.createAssetPath('record-1', 'IMAGE', date);
    const video = await service.createAssetPath('record-1', 'VIDEO', date);

    expect(image.fileName).toMatch(
      /^screenshot-20260102-030405-006-[a-f0-9]{8}\.png$/,
    );
    expect(image.filePath).toBe(join(storageRoot, 'record-1', image.fileName));
    expect(video.fileName).toMatch(
      /^video-20260102-030405-006-[a-f0-9]{8}\.webm$/,
    );
    expect(video.filePath).toBe(join(storageRoot, 'record-1', video.fileName));
    expect(image.fileName).not.toBe(video.fileName);
  });

  it('returns file size or undefined for missing files', async () => {
    const { filePath } = await service.createAssetPath(
      'record-1',
      'IMAGE',
      new Date('2026-01-02T03:04:05.006Z'),
    );

    await expect(service.getFileSize(filePath)).resolves.toBeUndefined();

    await writeFile(filePath, Buffer.from('abc'));

    await expect(service.getFileSize(filePath)).resolves.toBe(3);
  });

  it('rejects record IDs that traverse outside storage', async () => {
    await expect(service.getRecordDir('../escape')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
