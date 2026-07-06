import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import type { CaptureAssetType } from '@veridit/contracts';

interface AssetPath {
  fileName: string;
  filePath: string;
}

@Injectable()
export class CaptureStorageService {
  private readonly storageRoot = resolve(
    process.env.CAPTURE_STORAGE_DIR ?? 'storage/captures',
  );

  async getRecordDir(recordId: string): Promise<string> {
    if (!recordId.trim() || recordId.includes('\0')) {
      throw new BadRequestException('Invalid capture record ID');
    }

    const recordDir = resolve(this.storageRoot, recordId);
    this.assertInsideStorage(recordDir);

    if (recordDir === this.storageRoot) {
      throw new BadRequestException('Invalid capture record ID');
    }

    await mkdir(recordDir, { recursive: true });

    return recordDir;
  }

  async createAssetPath(
    recordId: string,
    type: CaptureAssetType,
    date = new Date(),
  ): Promise<AssetPath> {
    const recordDir = await this.getRecordDir(recordId);
    const uniqueSuffix = randomUUID().slice(0, 8);
    const fileName =
      type === 'IMAGE'
        ? `screenshot-${this.formatDate(date)}-${uniqueSuffix}.png`
        : `video-${this.formatDate(date)}-${uniqueSuffix}.webm`;
    const filePath = join(recordDir, fileName);

    this.assertInsideStorage(filePath);

    return {
      fileName,
      filePath,
    };
  }

  async getFileSize(filePath: string): Promise<number | undefined> {
    const absolutePath = resolve(filePath);
    this.assertInsideStorage(absolutePath);

    try {
      const stats = await stat(absolutePath);
      return stats.size;
    } catch (error) {
      if (this.isNodeError(error) && error.code === 'ENOENT') {
        return undefined;
      }

      throw error;
    }
  }

  private assertInsideStorage(targetPath: string): void {
    const relativePath = relative(this.storageRoot, targetPath);

    if (
      relativePath === '' ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath)
    ) {
      throw new BadRequestException('Capture storage path is invalid');
    }
  }

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const hour = date.getUTCHours().toString().padStart(2, '0');
    const minute = date.getUTCMinutes().toString().padStart(2, '0');
    const second = date.getUTCSeconds().toString().padStart(2, '0');
    const millisecond = date.getUTCMilliseconds().toString().padStart(3, '0');

    return `${year}${month}${day}-${hour}${minute}${second}-${millisecond}`;
  }

  private isNodeError(error: unknown): error is NodeJS.ErrnoException {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as NodeJS.ErrnoException).code === 'string'
    );
  }
}
