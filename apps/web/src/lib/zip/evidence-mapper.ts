import type { Evidence } from "../zip/types";

export type ZipFile = {
  name: string;
  content: string;
};

export function mapEvidenceToFiles(evidence: Evidence): ZipFile[] {
  switch (evidence.type) {
    case "context":
      return [
        {
          name: "metadata.json",
          content: JSON.stringify(evidence.record, null, 2),
        },
      ];

    case "screenshot":
      return [
        {
          name: "evidencias/screenshot.txt",
          content: evidence.data,
        },
      ];

    case "video":
      return [
        {
          name: "evidencias/video.txt",
          content: `Duração: ${evidence.duration}`,
        },
      ];
  }
}