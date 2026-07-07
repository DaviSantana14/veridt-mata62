import { NextResponse } from "next/server";

import {
  downloadCaptureAssetBytes,
  getCaptureRecord,
  getUserProfile,
  listCaptureAssets,
} from "@/lib/gateway";
import { buildRecordZip } from "@/lib/zip/build-record-zip";
import type { RecordZipAssetFile } from "@/lib/zip/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const recordResult = await getCaptureRecord(id);

  if (!recordResult.ok) {
    return NextResponse.json(
      { message: recordResult.message },
      { status: recordResult.status === 404 ? 404 : 502 },
    );
  }

  const [responsibleResult, assetsResult] = await Promise.all([
    getUserProfile(recordResult.data.userId),
    listCaptureAssets(id),
  ]);

  if (!assetsResult.ok) {
    return NextResponse.json(
      { message: assetsResult.message },
      { status: 502 },
    );
  }

  const files: RecordZipAssetFile[] = [];

  for (const asset of assetsResult.data.assets) {
    const downloadResult = await downloadCaptureAssetBytes(id, asset.id);

    if (!downloadResult.ok) {
      return NextResponse.json(
        {
          message: downloadResult.message,
          assetId: asset.id,
        },
        { status: 502 },
      );
    }

    files.push({
      asset,
      bytes: downloadResult.data.bytes,
      contentType: downloadResult.data.contentType,
    });
  }

  const zipBytes = await buildRecordZip({
    record: recordResult.data,
    responsibleUser: responsibleResult.ok ? responsibleResult.data : undefined,
    assets: assetsResult.data.assets,
    files,
    generatedAt: new Date().toISOString(),
  });
  const fileName = `registro-${recordResult.data.id}.zip`;
  const zipBody = zipBytes.buffer.slice(
    zipBytes.byteOffset,
    zipBytes.byteOffset + zipBytes.byteLength,
  ) as ArrayBuffer;

  return new Response(zipBody, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(zipBytes.byteLength),
    },
  });
}
