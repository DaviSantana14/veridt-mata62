"use client";

import {
  KeyboardEvent,
  MouseEvent,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Check,
  CircleStop,
  ExternalLink,
  Loader2,
  Monitor,
  RefreshCw,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import type {
  BrowserInputRequest,
  CaptureFrameResponse,
} from "@veridit/contracts";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  captureScreenshot,
  completeCapture,
  getCaptureFrame,
  navigateCapture,
  sendCaptureInput,
  startCaptureVideo,
  stopCaptureVideo,
} from "@/lib/gateway";
import { cn } from "@/lib/utils";

const FRAME_REFRESH_MS = 850;
const POLLING_PAUSE_STATUSES = new Set([404, 409, 500, 502]);

export function CaptureBrowserClient({ recordId }: { recordId: string }) {
  const router = useRouter();
  const [frame, setFrame] = useState<CaptureFrameResponse | null>(null);
  const [loadingFrame, setLoadingFrame] = useState(true);
  const [frameError, setFrameError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [pollingPaused, setPollingPaused] = useState(false);
  const [consecutiveFrameErrors, setConsecutiveFrameErrors] = useState(0);
  const [actionPending, setActionPending] = useState<
    "navigate" | "screenshot" | "video" | "complete" | null
  >(null);
  const [addressValue, setAddressValue] = useState("");
  const [addressDirty, setAddressDirty] = useState(false);
  const fetchingFrame = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sessionUnavailable = pollingPaused || Boolean(frameError && !frame);

  const resumePolling = useCallback(() => {
    setPollingPaused(false);
    setConsecutiveFrameErrors(0);
    setFrameError(null);
  }, []);

  const refreshFrame = useCallback(
    async (showLoading = false) => {
      if (fetchingFrame.current) {
        return;
      }

      fetchingFrame.current = true;

      if (showLoading) {
        setLoadingFrame(true);
      }

      const result = await getCaptureFrame(recordId);

      fetchingFrame.current = false;
      setLoadingFrame(false);

      if (!result.ok) {
        setConsecutiveFrameErrors((current) => current + 1);
        setFrameError(result.message);

        if (
          result.status === undefined ||
          POLLING_PAUSE_STATUSES.has(result.status)
        ) {
          setPollingPaused(true);
        }

        return;
      }

      setPollingPaused(false);
      setConsecutiveFrameErrors(0);
      setFrame(result.data);
      if (!addressDirty) {
        setAddressValue(result.data.currentUrl);
      }
      setFrameError(null);
    },
    [addressDirty, recordId],
  );

  useEffect(() => {
    let active = true;

    async function tick() {
      if (active && !pollingPaused) {
        await refreshFrame();
      }
    }

    const initialFrameId = window.setTimeout(() => {
      if (!pollingPaused) {
        void refreshFrame();
      }
    }, 0);
    const intervalId = window.setInterval(() => {
      void tick();
    }, FRAME_REFRESH_MS);

    return () => {
      active = false;
      window.clearTimeout(initialFrameId);
      window.clearInterval(intervalId);
    };
  }, [pollingPaused, recordId, refreshFrame]);

  const sendInput = useCallback(
    async (payload: BrowserInputRequest) => {
      if (sessionUnavailable) {
        return;
      }

      const result = await sendCaptureInput(recordId, payload);

      if (!result.ok) {
        toast.error("Não foi possível enviar a ação.", {
          description: result.message,
        });
        return;
      }

      resumePolling();
      void refreshFrame();
    },
    [recordId, refreshFrame, resumePolling, sessionUnavailable],
  );

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    function onWheel(event: globalThis.WheelEvent) {
      event.preventDefault();

      if (sessionUnavailable) {
        return;
      }

      void sendInput({
        type: "wheel",
        deltaX: Math.round(event.deltaX),
        deltaY: Math.round(event.deltaY),
      });
    }

    viewport.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      viewport.removeEventListener("wheel", onWheel);
    };
  }, [sendInput, sessionUnavailable]);

  async function onManualRefresh() {
    resumePolling();
    await refreshFrame(true);
  }

  async function onNavigate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const siteUrl = addressValue.trim();

    if (!siteUrl) {
      toast.error("Informe uma URL para navegar.");
      return;
    }

    setActionPending("navigate");
    const result = await navigateCapture(recordId, { siteUrl });
    setActionPending(null);

    if (!result.ok) {
      toast.error("Não foi possível navegar para a URL.", {
        description: result.message,
      });
      return;
    }

    setAddressValue(result.data.currentUrl);
    setAddressDirty(false);
    resumePolling();
    toast.success("Página carregada na sessão.");
    void refreshFrame(true);
  }

  function getFrameCoordinates(event: MouseEvent<HTMLDivElement>) {
    if (!frame || !viewportRef.current) {
      return null;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const x = Math.round(
      ((event.clientX - rect.left) / rect.width) * frame.viewport.width,
    );
    const y = Math.round(
      ((event.clientY - rect.top) / rect.height) * frame.viewport.height,
    );

    return {
      x: Math.max(0, Math.min(frame.viewport.width, x)),
      y: Math.max(0, Math.min(frame.viewport.height, y)),
    };
  }

  function onViewportClick(event: MouseEvent<HTMLDivElement>) {
    if (sessionUnavailable) {
      return;
    }

    const coordinates = getFrameCoordinates(event);

    if (!coordinates) {
      return;
    }

    viewportRef.current?.focus();
    void sendInput({
      type: "click",
      ...coordinates,
    });
  }

  function onViewportKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (sessionUnavailable) {
      return;
    }

    if (event.key === "Tab") {
      return;
    }

    event.preventDefault();

    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      void sendInput({
        type: "text",
        value: event.key,
      });
      return;
    }

    void sendInput({
      type: "key",
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    });
  }

  async function onScreenshot() {
    setActionPending("screenshot");
    const result = await captureScreenshot(recordId);
    setActionPending(null);

    if (!result.ok) {
      toast.error("Não foi possível tirar o print.", {
        description: result.message,
      });
      return;
    }

    toast.success("Print registrado.", {
      description: result.data.fileName,
    });
    resumePolling();
    void refreshFrame();
  }

  async function onToggleVideo() {
    setActionPending("video");
    const result = recording
      ? await stopCaptureVideo(recordId)
      : await startCaptureVideo(recordId);
    setActionPending(null);

    if (!result.ok) {
      toast.error("Não foi possível alterar a gravação.", {
        description: result.message,
      });
      return;
    }

    setRecording(result.data.recording);
    resumePolling();
    toast.success(
      result.data.recording ? "Gravação iniciada." : "Vídeo salvo.",
    );
  }

  async function onComplete() {
    setActionPending("complete");
    const result = await completeCapture(recordId);
    setActionPending(null);

    if (!result.ok) {
      toast.error("Não foi possível finalizar o registro.", {
        description: result.message,
      });
      return;
    }

    toast.success("Registro finalizado.", {
      description: `${result.data.imageCount} print(s), ${result.data.videoCount} video(s).`,
    });
    setPollingPaused(true);
    setFrameError(null);
    router.push(`/captura/concluida?recordId=${encodeURIComponent(recordId)}`);
  }

  const frameSource = frame
    ? `data:${frame.mimeType};base64,${frame.imageBase64}`
    : null;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_88px]">
      <section className="min-w-0 overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid min-h-14 gap-3 border-b bg-background px-4 py-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)_auto] lg:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Monitor className="shrink-0 text-[color:var(--evidence)]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Navegador de captura</p>
              <p className="truncate text-xs text-muted-foreground">
                {frame?.currentUrl ?? "Carregando conteudo..."}
              </p>
            </div>
          </div>
          <form
            onSubmit={onNavigate}
            className="flex min-w-0 items-center gap-2"
          >
            <Input
              type="url"
              inputMode="url"
              value={addressValue}
              onChange={(event) => {
                setAddressValue(event.target.value);
                setAddressDirty(true);
              }}
              placeholder="https://www.ufba.br"
              aria-label="URL para navegar na sessão"
              className="h-9 min-w-0"
              disabled={actionPending === "navigate" || sessionUnavailable}
              required
            />
            <Button
              type="submit"
              size="icon-lg"
              aria-label="Navegar para URL"
              disabled={actionPending !== null || sessionUnavailable}
            >
              {actionPending === "navigate" ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <ExternalLink aria-hidden="true" />
              )}
            </Button>
          </form>
          <Badge
            variant={recording ? "default" : "secondary"}
            className="w-fit rounded-full lg:justify-self-end"
          >
            {recording ? "Gravando" : "Pronto"}
          </Badge>
        </div>

        {frameError ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertTitle>Sessão indisponível</AlertTitle>
              <AlertDescription>
                {frameError}
                {pollingPaused ? (
                  <>
                    {" "}
                    A atualização automática foi pausada após{" "}
                    {consecutiveFrameErrors} falha(s). Use atualizar para tentar
                    novamente.
                  </>
                ) : null}
              </AlertDescription>
            </Alert>
          </div>
        ) : null}

        <div
          ref={viewportRef}
          role="application"
          aria-label="Conteúdo navegável da captura"
          tabIndex={0}
          onClick={onViewportClick}
          onKeyDown={onViewportKeyDown}
          className={cn(
            "relative grid aspect-video w-full place-items-center bg-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-ring",
            !frameSource && "min-h-[420px]",
          )}
        >
          {frameSource ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frameSource}
              alt="Conteúdo remoto renderizado para captura"
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-white/78">
              <Loader2 className="animate-spin" aria-hidden="true" />
              Preparando navegador
            </div>
          )}

          {loadingFrame ? (
            <div className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              Atualizando
            </div>
          ) : null}
        </div>
      </section>

      <aside className="grid grid-cols-4 gap-2 xl:grid-cols-1 xl:content-start">
        <ToolbarButton
          label="Atualizar frame"
          disabled={loadingFrame}
          onClick={() => void onManualRefresh()}
        >
          {loadingFrame ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
        </ToolbarButton>
        <ToolbarButton
          label="Tirar print"
          disabled={actionPending !== null || sessionUnavailable}
          onClick={onScreenshot}
        >
          {actionPending === "screenshot" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Camera aria-hidden="true" />
          )}
        </ToolbarButton>
        <ToolbarButton
          label={recording ? "Parar vídeo" : "Gravar vídeo"}
          disabled={actionPending !== null || sessionUnavailable}
          onClick={onToggleVideo}
          active={recording}
        >
          {actionPending === "video" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : recording ? (
            <CircleStop aria-hidden="true" />
          ) : (
            <Video aria-hidden="true" />
          )}
        </ToolbarButton>
        <ToolbarButton
          label="Finalizar registro"
          disabled={actionPending !== null || sessionUnavailable}
          onClick={onComplete}
        >
          {actionPending === "complete" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
        </ToolbarButton>
      </aside>
    </div>
  );
}

function ToolbarButton({
  label,
  active = false,
  children,
  disabled,
  onClick,
}: {
  label: string;
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          variant={active ? "default" : "outline"}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="size-12 xl:size-14"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="left">{label}</TooltipContent>
    </Tooltip>
  );
}
