import JSZip from "jszip";

import type { RecordZipInput } from "@/lib/zip/types";

export async function buildRecordZip(input: RecordZipInput): Promise<Uint8Array> {
  const zip = new JSZip();
  const usedFileNames = new Set<string>();

  zip.file("metadata.json", JSON.stringify(toMetadata(input), null, 2));

  for (const file of input.files) {
    zip.file(
      `assets/${getUniqueFileName(file.asset.fileName, usedFileNames)}`,
      file.bytes,
      {
        binary: true,
      },
    );
  }

  return zip.generateAsync({ type: "uint8array" });
}

function toMetadata(input: RecordZipInput) {
  return {
    generatedAt: input.generatedAt,
    record: {
      id: input.record.id,
      userId: input.record.userId,
      title: input.record.title,
      siteUrl: input.record.siteUrl,
      status: input.record.status,
      startedAt: input.record.startedAt,
      finishedAt: input.record.finishedAt,
      imageCount: input.record.imageCount,
      videoCount: input.record.videoCount,
    },
    responsibleUser: input.responsibleUser
      ? {
          id: input.responsibleUser.id,
          fullName: input.responsibleUser.fullName,
          email: input.responsibleUser.email,
          cpf: input.responsibleUser.cpf,
          profile: input.responsibleUser.profile,
        }
      : null,
    assets: input.assets.map((asset) => ({
      id: asset.id,
      recordId: asset.recordId,
      type: asset.type,
      fileName: asset.fileName,
      fileSizeBytes: asset.fileSizeBytes,
      sourceUrl: asset.sourceUrl,
      createdAt: asset.createdAt,
    })),
  };
}

function getUniqueFileName(fileName: string, usedFileNames: Set<string>): string {
  if (!usedFileNames.has(fileName)) {
    usedFileNames.add(fileName);
    return fileName;
  }

  const extensionIndex = fileName.lastIndexOf(".");
  const baseName =
    extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : "";
  let index = 2;

  while (usedFileNames.has(`${baseName}-${index}${extension}`)) {
    index += 1;
  }

  const uniqueFileName = `${baseName}-${index}${extension}`;
  usedFileNames.add(uniqueFileName);

  return uniqueFileName;
}
