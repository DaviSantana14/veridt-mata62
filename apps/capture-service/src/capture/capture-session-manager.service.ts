import {
  ConflictException,
  Injectable,
  NotFoundException,
  type OnModuleDestroy,
} from '@nestjs/common';
import type {
  BrowserInputRequest,
  CapturePreviewSocketMessage,
  CaptureViewport,
} from '@veridit/contracts';
import type { BrowserContext, Page } from 'playwright';
import { PlaywrightBrowserService } from './playwright-browser.service';

interface StartSessionInput {
  recordId: string;
  userId: string;
  siteUrl: string;
}

interface StartSessionResult {
  recordId: string;
  userId: string;
  siteUrl: string;
  currentUrl: string;
  viewport: CaptureViewport;
}

interface CaptureFrameResult {
  imageBase64: string;
  currentUrl: string;
  capturedAt: string;
  viewport: CaptureViewport;
}

interface PreviewSubscriber {
  sendFrame(frame: Buffer): void;
  sendMessage(message: CapturePreviewSocketMessage): void;
}

type ScreencastMode = 'none' | 'preview' | 'recording';

interface CaptureSession {
  recordId: string;
  userId: string;
  siteUrl: string;
  context: BrowserContext;
  page: Page;
  viewport: CaptureViewport;
  recording: boolean;
  lastActivityAt: number;
  previewSubscribers: Set<PreviewSubscriber>;
  screencastMode: ScreencastMode;
  lastPreviewFrameAt: number;
  lastPreviewMetadataAt: number;
}

@Injectable()
export class CaptureSessionManagerService implements OnModuleDestroy {
  private readonly sessions = new Map<string, CaptureSession>();
  private readonly startingRecordIds = new Set<string>();
  private readonly screencastOperationQueues = new Map<string, Promise<void>>();

  constructor(private readonly browserService: PlaywrightBrowserService) {}

  async startSession(input: StartSessionInput): Promise<StartSessionResult> {
    if (
      this.sessions.has(input.recordId) ||
      this.startingRecordIds.has(input.recordId)
    ) {
      throw new ConflictException('Capture session already exists');
    }

    this.startingRecordIds.add(input.recordId);
    const viewport = this.getDefaultViewport();

    try {
      const { context, page } = await this.browserService.start(
        input.siteUrl,
        viewport,
        input.userId,
      );

      this.sessions.set(input.recordId, {
        recordId: input.recordId,
        userId: input.userId,
        siteUrl: input.siteUrl,
        context,
        page,
        viewport,
        recording: false,
        lastActivityAt: Date.now(),
        previewSubscribers: new Set<PreviewSubscriber>(),
        screencastMode: 'none',
        lastPreviewFrameAt: 0,
        lastPreviewMetadataAt: 0,
      });

      return {
        recordId: input.recordId,
        userId: input.userId,
        siteUrl: input.siteUrl,
        currentUrl: page.url(),
        viewport,
      };
    } finally {
      this.startingRecordIds.delete(input.recordId);
    }
  }

  async getFrame(recordId: string): Promise<CaptureFrameResult> {
    const session = this.getSession(recordId);
    const screenshot = await this.withPageOperation(() =>
      session.page.screenshot({
        type: 'jpeg',
        quality: this.getJpegQuality(),
        fullPage: false,
      }),
    );
    this.touch(session);

    return {
      imageBase64: screenshot.toString('base64'),
      currentUrl: session.page.url(),
      capturedAt: new Date().toISOString(),
      viewport: session.viewport,
    };
  }

  async sendInput(
    recordId: string,
    input: BrowserInputRequest,
  ): Promise<string> {
    const session = this.getSession(recordId);

    await this.withPageOperation(async () => {
      switch (input.type) {
        case 'click':
          await session.page.mouse.click(input.x, input.y);
          break;
        case 'wheel':
          await session.page.mouse.wheel(input.deltaX, input.deltaY);
          break;
        case 'text':
          await session.page.keyboard.insertText(input.value);
          break;
        case 'key':
          await this.pressKey(session.page, input);
          break;
      }
    });

    this.touch(session);

    return session.page.url();
  }

  async navigate(recordId: string, siteUrl: string): Promise<string> {
    const session = this.getSession(recordId);

    await this.withPageOperation(() =>
      session.page.goto(siteUrl, {
        waitUntil: 'domcontentloaded',
      }),
    );
    this.touch(session);

    return session.page.url();
  }

  async captureScreenshot(recordId: string, filePath: string): Promise<string> {
    const session = this.getSession(recordId);

    await this.withPageOperation(() =>
      session.page.screenshot({
        path: filePath,
        type: 'png',
        fullPage: false,
      }),
    );
    this.touch(session);

    return filePath;
  }

  async startVideo(recordId: string, filePath: string): Promise<void> {
    await this.withScreencastOperation(recordId, async () => {
      const session = this.getSession(recordId);

      if (session.recording) {
        throw new ConflictException(
          'Capture video recording is already active',
        );
      }

      if (session.screencastMode === 'preview') {
        await session.page.screencast.stop();
        session.screencastMode = 'none';
      }

      try {
        await this.startRecordingScreencast(session, filePath);
      } catch (error) {
        if (session.previewSubscribers.size > 0) {
          await this.startPreviewScreencast(session);
        }

        throw error;
      }

      session.recording = true;
      this.touch(session);
    });
  }

  async stopVideo(recordId: string): Promise<{ recording: false }> {
    return this.withScreencastOperation(recordId, async () => {
      const session = this.getSession(recordId);

      if (!session.recording) {
        throw new ConflictException('Capture video recording is not active');
      }

      await session.page.screencast.stop();
      session.recording = false;
      session.screencastMode = 'none';

      if (session.previewSubscribers.size > 0) {
        await this.startPreviewScreencast(session);
      }

      this.touch(session);

      return { recording: false };
    });
  }

  async subscribePreview(
    recordId: string,
    subscriber: PreviewSubscriber,
  ): Promise<() => Promise<void>> {
    return this.withScreencastOperation(recordId, async () => {
      const session = this.getSession(recordId);

      session.previewSubscribers.add(subscriber);

      try {
        subscriber.sendMessage({
          type: 'ready',
          recordId,
          targetFps: this.getPreviewTargetFps(),
          viewport: this.getPreviewSize(session.viewport),
        });
        this.sendPreviewMetadata(
          session,
          this.getPreviewSize(session.viewport),
          {
            only: subscriber,
          },
        );

        if (session.screencastMode === 'none') {
          await this.startPreviewScreencast(session);
        }
      } catch (error) {
        session.previewSubscribers.delete(subscriber);
        throw error;
      }

      this.touch(session);

      return async () => {
        await this.withScreencastOperation(recordId, async () => {
          if (!this.sessions.has(session.recordId)) {
            return;
          }

          session.previewSubscribers.delete(subscriber);

          if (
            session.previewSubscribers.size === 0 &&
            session.screencastMode === 'preview'
          ) {
            await session.page.screencast.stop();
            session.screencastMode = 'none';
          }
        });
      };
    });
  }

  async closeSession(recordId: string): Promise<void> {
    await this.withScreencastOperation(recordId, async () => {
      const session = this.getSession(recordId);
      await this.closeExistingSession(session);
    });
  }

  async closeIdleSessions(): Promise<number> {
    const idleTimeoutMs = this.getIdleTimeoutMs();
    const now = Date.now();
    const idleSessions = Array.from(this.sessions.values()).filter(
      (session) => now - session.lastActivityAt >= idleTimeoutMs,
    );

    for (const session of idleSessions) {
      await this.closeSession(session.recordId);
    }

    return idleSessions.length;
  }

  async onModuleDestroy(): Promise<void> {
    const sessions = Array.from(this.sessions.values());

    await Promise.allSettled(
      sessions.map((session) => this.closeSession(session.recordId)),
    );
  }

  private getSession(recordId: string): CaptureSession {
    const session = this.sessions.get(recordId);

    if (!session) {
      throw new NotFoundException('Capture session not found');
    }

    return session;
  }

  private async withScreencastOperation<T>(
    recordId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous =
      this.screencastOperationQueues.get(recordId) ?? Promise.resolve();
    let releaseCurrentOperation: () => void = () => undefined;
    const currentOperation = new Promise<void>((resolve) => {
      releaseCurrentOperation = resolve;
    });
    const nextOperation = previous
      .catch(() => undefined)
      .then(() => currentOperation);

    this.screencastOperationQueues.set(recordId, nextOperation);
    await previous.catch(() => undefined);

    try {
      return await operation();
    } finally {
      releaseCurrentOperation();

      if (this.screencastOperationQueues.get(recordId) === nextOperation) {
        this.screencastOperationQueues.delete(recordId);
      }
    }
  }

  private async closeExistingSession(session: CaptureSession): Promise<void> {
    try {
      session.previewSubscribers.clear();
      await session.context.close();
    } finally {
      this.sessions.delete(session.recordId);
    }
  }

  private async startPreviewScreencast(session: CaptureSession): Promise<void> {
    await session.page.screencast.start({
      quality: this.getPreviewQuality(),
      size: this.getPreviewSize(session.viewport),
      onFrame: (frame) => this.dispatchPreviewFrame(session, frame),
    });
    session.screencastMode = 'preview';
  }

  private async startRecordingScreencast(
    session: CaptureSession,
    filePath: string,
  ): Promise<void> {
    await session.page.screencast.start({
      path: filePath,
      quality: this.getPreviewQuality(),
      size: this.getPreviewSize(session.viewport),
      onFrame: (frame) => this.dispatchPreviewFrame(session, frame),
    });
    session.screencastMode = 'recording';
  }

  private dispatchPreviewFrame(
    session: CaptureSession,
    frame: {
      data: Buffer;
      timestamp: number;
      viewportWidth: number;
      viewportHeight: number;
    },
  ): void {
    if (session.previewSubscribers.size === 0) {
      return;
    }

    const now = Date.now();

    if (now - session.lastPreviewFrameAt < this.getPreviewFrameIntervalMs()) {
      return;
    }

    session.lastPreviewFrameAt = now;
    const viewport = {
      width: frame.viewportWidth,
      height: frame.viewportHeight,
    };

    if (
      now - session.lastPreviewMetadataAt >=
      this.getPreviewMetadataIntervalMs()
    ) {
      this.sendPreviewMetadata(session, viewport, {
        capturedAt: new Date(frame.timestamp).toISOString(),
      });
      session.lastPreviewMetadataAt = now;
    }

    const payload = Buffer.from(frame.data);

    for (const subscriber of session.previewSubscribers) {
      subscriber.sendFrame(payload);
    }

    this.touch(session);
  }

  private sendPreviewMetadata(
    session: CaptureSession,
    viewport: CaptureViewport,
    options: { capturedAt?: string; only?: PreviewSubscriber } = {},
  ): void {
    const message: CapturePreviewSocketMessage = {
      type: 'metadata',
      recordId: session.recordId,
      currentUrl: session.page.url(),
      viewport,
      capturedAt: options.capturedAt ?? new Date().toISOString(),
    };

    if (options.only) {
      options.only.sendMessage(message);
      return;
    }

    for (const subscriber of session.previewSubscribers) {
      subscriber.sendMessage(message);
    }
  }

  private async pressKey(
    page: Page,
    input: Extract<BrowserInputRequest, { type: 'key' }>,
  ): Promise<void> {
    const modifiers = this.getPressedModifiers(input);

    for (const modifier of modifiers) {
      await page.keyboard.down(modifier);
    }

    try {
      await page.keyboard.press(input.key);
    } finally {
      for (const modifier of modifiers.toReversed()) {
        await page.keyboard.up(modifier);
      }
    }
  }

  private getPressedModifiers(
    input: Extract<BrowserInputRequest, { type: 'key' }>,
  ): string[] {
    const modifiers: string[] = [];

    if (input.ctrlKey) {
      modifiers.push('Control');
    }

    if (input.shiftKey) {
      modifiers.push('Shift');
    }

    if (input.altKey) {
      modifiers.push('Alt');
    }

    if (input.metaKey) {
      modifiers.push('Meta');
    }

    return modifiers;
  }

  private async withPageOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.isInactivePlaywrightError(error)) {
        throw new ConflictException('Sessao de captura nao esta ativa');
      }

      throw error;
    }
  }

  private isInactivePlaywrightError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    const normalizedMessage = message.toLowerCase();

    return (
      normalizedMessage.includes('target page') ||
      normalizedMessage.includes('page is closed') ||
      normalizedMessage.includes('context closed') ||
      normalizedMessage.includes('browser has been closed')
    );
  }

  private touch(session: CaptureSession): void {
    session.lastActivityAt = Date.now();
  }

  private getDefaultViewport(): CaptureViewport {
    return {
      width: this.getPositiveIntegerEnv('CAPTURE_VIEWPORT_WIDTH', 1366),
      height: this.getPositiveIntegerEnv('CAPTURE_VIEWPORT_HEIGHT', 768),
    };
  }

  private getJpegQuality(): number {
    return this.getClampedIntegerEnv('CAPTURE_FRAME_QUALITY', 72, 1, 100);
  }

  private getPreviewTargetFps(): number {
    return this.getClampedIntegerEnv('CAPTURE_PREVIEW_FPS', 15, 1, 30);
  }

  private getPreviewFrameIntervalMs(): number {
    return Math.round(1000 / this.getPreviewTargetFps());
  }

  private getPreviewQuality(): number {
    return this.getClampedIntegerEnv('CAPTURE_PREVIEW_QUALITY', 55, 1, 100);
  }

  private getPreviewSize(viewport: CaptureViewport): CaptureViewport {
    return {
      width: Math.min(
        viewport.width,
        this.getPositiveIntegerEnv('CAPTURE_PREVIEW_MAX_WIDTH', 960),
      ),
      height: Math.min(
        viewport.height,
        this.getPositiveIntegerEnv('CAPTURE_PREVIEW_MAX_HEIGHT', 540),
      ),
    };
  }

  private getPreviewMetadataIntervalMs(): number {
    return this.getPositiveIntegerEnv(
      'CAPTURE_PREVIEW_METADATA_INTERVAL_MS',
      1000,
    );
  }

  private getIdleTimeoutMs(): number {
    return this.getPositiveIntegerEnv('CAPTURE_IDLE_TTL_MS', 900000);
  }

  private getPositiveIntegerEnv(name: string, fallback: number): number {
    const parsedValue = Number(process.env[name]);

    return Number.isInteger(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }

  private getClampedIntegerEnv(
    name: string,
    fallback: number,
    min: number,
    max: number,
  ): number {
    const parsedValue = this.getPositiveIntegerEnv(name, fallback);

    return Math.min(max, Math.max(min, parsedValue));
  }
}
