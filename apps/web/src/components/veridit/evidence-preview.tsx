import { Camera, LockKeyhole, Play, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { RecordKind, RecordStatus } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export function EvidencePreview({
  title,
  url,
  kind,
  status,
  className,
}: {
  title: string;
  url: string;
  kind: RecordKind;
  status?: RecordStatus;
  className?: string;
}) {
  const MediaIcon = kind === "video" ? Video : Camera;

  return (
    <div className={cn("overflow-hidden rounded-2xl border bg-[#071526] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]", className)}>
      <div className="flex min-h-12 items-center gap-2 border-b border-white/10 bg-white/[0.06] px-4">
        <span className="size-3 rounded-full bg-[#ff6b6b]" aria-hidden="true" />
        <span className="size-3 rounded-full bg-[#ffd166]" aria-hidden="true" />
        <span className="size-3 rounded-full bg-[#06d6a0]" aria-hidden="true" />
        <div className="ml-3 flex min-w-0 flex-1 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70">
          <LockKeyhole aria-hidden="true" />
          <span className="truncate">{url}</span>
        </div>
      </div>

      <div className="surface-grid min-h-[360px] p-5 sm:min-h-[460px]">
        <div className="grid h-full min-h-[320px] place-items-center rounded-xl border border-white/10 bg-[#0b1b31]/90 p-6 text-center">
          <div>
            <span className="mx-auto flex size-20 items-center justify-center rounded-full border border-white/[0.14] bg-white/10">
              {kind === "video" ? (
                <Play className="size-9 fill-current" aria-hidden="true" />
              ) : (
                <MediaIcon className="size-9" aria-hidden="true" />
              )}
            </span>
            <h3 className="mt-6 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-white/[0.62]">
              {kind === "video" ? "Registro em vídeo com rastreio de navegação" : "Screenshot com metadados técnicos"}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Badge className="rounded-full bg-white/10 text-white">
                <MediaIcon aria-hidden="true" />
                {kind === "video" ? "Vídeo" : "Screenshot"}
              </Badge>
              {status ? (
                <Badge className="rounded-full bg-[#dff7ec] text-[#047857]">
                  Integridade preservada
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
