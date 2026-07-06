import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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

  it('opens an existing asset inside a record directory', async () => {
    const { fileName, filePath } = await service.createAssetPath(
      'record-1',
      'IMAGE',
      new Date('2026-01-02T03:04:05.006Z'),
    );
    await writeFile(filePath, Buffer.from('abc'));

    const openedAsset = await service.openAsset('record-1', fileName);

    expect(openedAsset.size).toBe(3);
    expect(openedAsset.stream.path).toBe(filePath);
    openedAsset.stream.destroy();
  });

  it('throws not found for missing asset files', async () => {
    await expect(service.openAsset('record-1', 'missing.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws not found when the asset path points to a directory', async () => {
    const recordDir = await service.getRecordDir('record-1');
    await mkdir(join(recordDir, 'folder'));

    await expect(service.openAsset('record-1', 'folder')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects symlinked asset files', async () => {
    const recordDir = await service.getRecordDir('record-1');
    const externalPath = join(storageRoot, 'external.png');
    const symlinkPath = join(recordDir, 'linked.png');
    await writeFile(externalPath, Buffer.from('abc'));

    try {
      await symlink(externalPath, symlinkPath);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'EPERM'
      ) {
        return;
      }

      throw error;
    }

    await expect(service.openAsset('record-1', 'linked.png')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects asset file names that traverse outside the record directory', async () => {
    const invalidFileNames = [
      '',
      ' ',
      '../escape.png',
      'folder/asset.png',
      'folder\\asset.png',
      'asset\0.png',
    ];

    await Promise.all(
      invalidFileNames.map((fileName) =>
        expect(service.openAsset('record-1', fileName)).rejects.toBeInstanceOf(
          BadRequestException,
        ),
      ),
    );
  });

  it('rejects record IDs that traverse outside storage', async () => {
    await expect(service.getRecordDir('../escape')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
