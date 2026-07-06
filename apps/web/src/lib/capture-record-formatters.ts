const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export function getCaptureDetailHref(recordId: string): string {
  return `/registros/${encodeURIComponent(recordId)}`;
}

export function getCaptureResumeHref(recordId: string): string {
  return `/captura/${encodeURIComponent(recordId)}`;
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
