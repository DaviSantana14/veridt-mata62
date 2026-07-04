import { StatusPill } from "@/components/veridit/status-pill";
import type { RecordStatus } from "@/lib/mock-data";

export function StatusBadge({ status }: { status: RecordStatus }) {
  return <StatusPill status={status} />;
}
