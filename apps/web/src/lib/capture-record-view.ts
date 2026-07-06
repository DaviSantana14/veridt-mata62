import type {
  CaptureRecordListItemResponse,
  CaptureRecordStatus,
} from "@veridit/contracts";

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

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
  const actionHref = isStarted
    ? `/captura/${encodeURIComponent(record.id)}`
    : `/captura/concluida?recordId=${encodeURIComponent(record.id)}`;
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
    detailHref: actionHref,
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

export function getCaptureDataTypeLabel(record: {
  imageCount: number;
  videoCount: number;
}): string {
  if (record.imageCount > 0 && record.videoCount > 0) {
    return "Print + Video";
  }

  if (record.videoCount > 0) {
    return "Video";
  }

  if (record.imageCount > 0) {
    return "Print";
  }

  return "Sem midia";
}

export function formatCaptureDateTime(value?: string): string {
  if (!value) {
    return "-";
  }

  return DATE_TIME_FORMATTER.format(new Date(value));
}
