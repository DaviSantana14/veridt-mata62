import type { VeriditRecord } from "@/lib/mock-data";

export type Evidence =
  | { type: "context"; record: VeriditRecord }
  | { type: "screenshot"; data: string }
  | { type: "video"; duration: string };