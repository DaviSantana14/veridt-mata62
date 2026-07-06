import type {
  CaptureRecordDetailsResponse,
  UserResponse,
} from "@veridit/contracts";

import {
  formatCaptureDateTime,
  getCaptureDataTypeLabel,
  getCaptureResumeHref,
} from "@/lib/capture-record-formatters";

export type CaptureRecordDetailView = {
  id: string;
  title: string;
  siteUrl: string;
  status: CaptureRecordDetailsResponse["status"];
  statusLabel: string;
  startedAtLabel: string;
  finishedAtLabel: string;
  dataTypeLabel: string;
  imageCountLabel: string;
  videoCountLabel: string;
  responsibleName: string;
  responsibleEmail: string;
  responsibleUserId: string;
  hasResponsibleUserProfile: boolean;
  resumeHref?: string;
};

const STATUS_LABELS: Record<CaptureRecordDetailsResponse["status"], string> = {
  STARTED: "Em andamento",
  COMPLETED: "Concluido",
  FAILED: "Falhou",
};

export function toCaptureRecordDetailView(
  record: CaptureRecordDetailsResponse,
  responsibleUser?: UserResponse,
): CaptureRecordDetailView {
  const isStarted = record.status === "STARTED";

  return {
    id: record.id,
    title: record.title,
    siteUrl: record.siteUrl,
    status: record.status,
    statusLabel: STATUS_LABELS[record.status],
    startedAtLabel: formatCaptureDateTime(record.startedAt),
    finishedAtLabel: formatCaptureDateTime(record.finishedAt),
    dataTypeLabel: getCaptureDataTypeLabel(record),
    imageCountLabel: String(record.imageCount),
    videoCountLabel: String(record.videoCount),
    responsibleName: responsibleUser?.fullName ?? "Usuario nao carregado",
    responsibleEmail: responsibleUser?.email ?? "-",
    responsibleUserId: record.userId,
    hasResponsibleUserProfile: Boolean(responsibleUser),
    resumeHref: isStarted ? getCaptureResumeHref(record.id) : undefined,
  };
}
