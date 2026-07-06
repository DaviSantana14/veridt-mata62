import type {
  CaptureAssetResponse,
  CaptureRecordDetailsResponse,
  UserResponse,
} from "@veridit/contracts";

import { formatCaptureDateTime } from "@/lib/capture-record-formatters";

export type RecordReportAssetView = {
  id: string;
  type: CaptureAssetResponse["type"];
  fileName: string;
  fileSizeLabel: string;
  sourceUrlLabel: string;
  createdAtLabel: string;
};

export type RecordReportView = {
  id: string;
  title: string;
  siteUrl: string;
  status: CaptureRecordDetailsResponse["status"];
  statusLabel: string;
  startedAtLabel: string;
  finishedAtLabel: string;
  durationLabel: string;
  responsibleName: string;
  responsibleEmail: string;
  responsibleCpf: string;
  responsibleUserId: string;
  imageAssets: RecordReportAssetView[];
  videoAssets: RecordReportAssetView[];
  allAssets: RecordReportAssetView[];
};

const STATUS_LABELS: Record<CaptureRecordDetailsResponse["status"], string> = {
  STARTED: "Em andamento",
  COMPLETED: "Concluido",
  FAILED: "Falhou",
};

export function toRecordReportView(
  record: CaptureRecordDetailsResponse,
  responsibleUser: UserResponse | undefined,
  assets: CaptureAssetResponse[],
): RecordReportView {
  const allAssets = assets.map(toRecordReportAssetView);

  return {
    id: record.id,
    title: record.title,
    siteUrl: record.siteUrl,
    status: record.status,
    statusLabel: STATUS_LABELS[record.status],
    startedAtLabel: formatCaptureDateTime(record.startedAt),
    finishedAtLabel: formatCaptureDateTime(record.finishedAt),
    durationLabel: formatDuration(record.startedAt, record.finishedAt),
    responsibleName: responsibleUser?.fullName ?? "Usuario nao carregado",
    responsibleEmail: responsibleUser?.email ?? "-",
    responsibleCpf: responsibleUser?.cpf ?? "-",
    responsibleUserId: record.userId,
    imageAssets: allAssets.filter((asset) => asset.type === "IMAGE"),
    videoAssets: allAssets.filter((asset) => asset.type === "VIDEO"),
    allAssets,
  };
}

function toRecordReportAssetView(
  asset: CaptureAssetResponse,
): RecordReportAssetView {
  return {
    id: asset.id,
    type: asset.type,
    fileName: asset.fileName,
    fileSizeLabel: formatFileSize(asset.fileSizeBytes),
    sourceUrlLabel: asset.sourceUrl ?? "-",
    createdAtLabel: formatCaptureDateTime(asset.createdAt),
  };
}

function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) {
    return "Em andamento";
  }

  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return "-";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
}

function formatFileSize(bytes?: number): string {
  if (bytes === undefined) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`;
}
