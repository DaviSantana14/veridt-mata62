import type {
  CaptureRecordListItemResponse,
  CaptureRecordStatus,
} from "@veridit/contracts";

import {
  formatCaptureDateTime,
  getCaptureDataTypeLabel,
  getCaptureDetailHref,
  getCaptureResumeHref,
} from "@/lib/capture-record-formatters";

export type CaptureRecordView = {
  id: string;
  title: string;
  siteUrl: string;
  status: CaptureRecordStatus;
  startedAtLabel: string;
  finishedAtLabel: string;
  dataTypeLabel: string;
  detailsLabel: string;
  detailHref: string;
  resumeHref?: string;
  actionHref: string;
  actionLabel: string;
  imageCount: number;
  videoCount: number;
  searchableText: string;
};

export function toCaptureRecordView(
  record: CaptureRecordListItemResponse,
): CaptureRecordView {
  const startedAtLabel = formatCaptureDateTime(record.startedAt);
  const finishedAtLabel = formatCaptureDateTime(record.finishedAt);
  const dataTypeLabel = getCaptureDataTypeLabel(record);
  const detailsLabel = record.details ?? "Abrir detalhes";
  const isStarted = record.status === "STARTED";
  const detailHref = getCaptureDetailHref(record.id);
  const resumeHref = isStarted ? getCaptureResumeHref(record.id) : undefined;
  const actionHref = resumeHref ?? detailHref;
  const actionLabel = isStarted ? "Continuar" : "Abrir";

  return {
    id: record.id,
    title: record.title,
    siteUrl: record.siteUrl,
    status: record.status,
    startedAtLabel,
    finishedAtLabel,
    dataTypeLabel,
    detailsLabel,
    detailHref,
    resumeHref,
    actionHref,
    actionLabel,
    imageCount: record.imageCount,
    videoCount: record.videoCount,
    searchableText: [
      record.title,
      record.siteUrl,
      record.status,
      startedAtLabel,
      finishedAtLabel,
      dataTypeLabel,
      detailsLabel,
    ].join(" "),
  };
}
