import type { VeriditRecord } from "@/lib/mock-data";
import type { Evidence } from "../zip/types";

export function createEvidenceList(record: VeriditRecord): Evidence[] {
  const evidences: Evidence[] = [
    {
      type: "context",
      record,
    },
  ];

  if (record.kind === "screenshot") {
    evidences.push({
      type: "screenshot",
      data: "mock-screenshot",
    });
  }

  if (record.kind === "video") {
    evidences.push({
      type: "video",
      duration: record.duration ?? "00:00",
    });
  }

  return evidences;
}