import JSZip from "jszip";
import type { VeriditRecord } from "@/lib/mock-data";
import { createEvidenceList } from "./evidence-factory";
import { mapEvidenceToFiles } from "./evidence-mapper";


export async function buildRecordZip(record: VeriditRecord) {
  const zip = new JSZip();

  const evidences = createEvidenceList(record);

  evidences.forEach((evidence) => {
    const files = mapEvidenceToFiles(evidence);

    files.forEach((file) => {
      zip.file(file.name, file.content);
    });
  });

  return zip;
}