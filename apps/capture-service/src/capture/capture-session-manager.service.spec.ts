import { ConflictException, NotFoundException } from '@nestjs/common';
import type { BrowserInputRequest } from '@veridit/contracts';
import { CaptureSessionManagerService } from './capture-session-manager.service';
import type { PlaywrightBrowserService } from './playwright-browser.service';

const originalEnv = { ...process.env };
type CloseMock = jest.MockedFunction<() => Promise<void>>;
type BrowserStartMock = jest.MockedFunction<PlaywrightBrowserService['start']>;
type BrowserSession = Awaited<ReturnType<PlaywrightBrowserService['start']>>;

function createPageMock() {
  return {
    goto: jest.fn(),
    url: jest.fn().mockReturnValue('https://example.com/current'),
    screenshot: jest.fn().mockResolvedValue(Buffer.from('frame')),
    mouse: {
      click: jest.fn(),
      wheel: jest.fn(),
    },
    keyboard: {
      down: jest.fn(),
      up: jest.fn(),
      press: jest.fn(),
      insertText: jest.fn(),
    },
    screencast: {
      start: jest.fn(),
      stop: jest.fn(),
    },
  };
}

describe('CaptureSessionManagerService', () => {
  let page: ReturnType<typeof createPageMock>;
  let context: { close: CloseMock };
  let startBrowser: BrowserStartMock;
  let closeContext: CloseMock;
  let browserService: PlaywrightBrowserService;
  let service: CaptureSessionManagerService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-02T03:04:05.006Z'));
    process.env = { ...originalEnv };
    delete process.env.CAPTURE_VIEWPORT_WIDTH;
    delete process.env.CAPTURE_VIEWPORT_HEIGHT;
    delete process.env.CAPTURE_FRAME_QUALITY;
    delete process.env.CAPTURE_PREVIEW_FPS;
    delete process.env.CAPTURE_PREVIEW_QUALITY;
    delete process.env.CAPTURE_PREVIEW_MAX_WIDTH;
    delete process.env.CAPTURE_PREVIEW_MAX_HEIGHT;
    delete process.env.CAPTURE_PREVIEW_METADATA_INTERVAL_MS;
    page = createPageMock();
    closeContext = jest.fn<() => Promise<void>>();
    closeContext.mockResolvedValue(undefined);
    context = { close: closeContext };
    startBrowser = jest.fn<PlaywrightBrowserService['start']>();
    startBrowser.mockResolvedValue({
      context,
      page,
    } as BrowserSession);
    browserService = {
      start: startBrowser,
    };
    service = new CaptureSessionManagerService(browserService);
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it('starts a browser session with default viewport', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    expect(startBrowser).toHaveBeenCalledWith(
      'https://example.com',
      {
        width: 1366,
        height: 768,
      },
      'user-1',
    );
  });

  it('captures a jpeg frame from an existing session', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(service.getFrame('record-1')).resolves.toEqual({
      imageBase64: Buffer.from('frame').toString('base64'),
      currentUrl: 'https://example.com/current',
      capturedAt: '2026-01-02T03:04:05.006Z',
      viewport: { width: 1366, height: 768 },
    });
    expect(page.screenshot).toHaveBeenCalledWith({
      type: 'jpeg',
      quality: 72,
      fullPage: false,
    });
  });

  it('maps closed Playwright pages during frame capture to conflict', async () => {
    page.screenshot.mockRejectedValue(new Error('Target page has been closed'));
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(service.getFrame('record-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('sends click input to the remote mouse', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(
      service.sendInput('record-1', { type: 'click', x: 10, y: 20 }),
    ).resolves.toBe('https://example.com/current');
    expect(page.mouse.click).toHaveBeenCalledWith(10, 20);
  });

  it('sends wheel input to the remote mouse', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(
      service.sendInput('record-1', { type: 'wheel', deltaX: 1, deltaY: 2 }),
    ).resolves.toBe('https://example.com/current');
    expect(page.mouse.wheel).toHaveBeenCalledWith(1, 2);
  });

  it('sends text input to the remote keyboard', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(
      service.sendInput('record-1', { type: 'text', value: 'hello' }),
    ).resolves.toBe('https://example.com/current');
    expect(page.keyboard.insertText).toHaveBeenCalledWith('hello');
  });

  it('sends key input with modifiers to the remote keyboard', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    const input: BrowserInputRequest = {
      type: 'key',
      key: 'A',
      ctrlKey: true,
      shiftKey: true,
    };

    await expect(service.sendInput('record-1', input)).resolves.toBe(
      'https://example.com/current',
    );
    expect(page.keyboard.down).toHaveBeenCalledWith('Control');
    expect(page.keyboard.down).toHaveBeenCalledWith('Shift');
    expect(page.keyboard.press).toHaveBeenCalledWith('A');
    expect(page.keyboard.up).toHaveBeenCalledWith('Shift');
    expect(page.keyboard.up).toHaveBeenCalledWith('Control');
  });

  it('navigates the existing page and returns the current URL', async () => {
    page.url.mockReturnValue('https://www.ufba.br/');
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(
      service.navigate('record-1', 'https://www.ufba.br/'),
    ).resolves.toBe('https://www.ufba.br/');

    expect(page.goto).toHaveBeenCalledWith('https://www.ufba.br/', {
      waitUntil: 'domcontentloaded',
    });
  });

  it('keeps a session usable after direct navigation', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await service.navigate('record-1', 'https://www.ufba.br/');

    await expect(service.getFrame('record-1')).resolves.toMatchObject({
      imageBase64: Buffer.from('frame').toString('base64'),
      viewport: { width: 1366, height: 768 },
    });
  });

  it('captures screenshots and controls video recording state', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await expect(
      service.captureScreenshot('record-1', 'capture.png'),
    ).resolves.toBe('capture.png');
    expect(page.screenshot).toHaveBeenCalledWith({
      path: 'capture.png',
      type: 'png',
      fullPage: false,
    });

    await service.startVideo('record-1', 'capture.webm');
    expect(page.screencast.start).toHaveBeenCalledWith({
      path: 'capture.webm',
      size: { width: 960, height: 540 },
      quality: 55,
      onFrame: expect.any(Function),
    });
    await expect(
      service.startVideo('record-1', 'again.webm'),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(service.stopVideo('record-1')).resolves.toEqual({
      recording: false,
    });
    await expect(service.stopVideo('record-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('streams preview frames through a shared screencast subscriber', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    const subscriber = {
      sendFrame: jest.fn(),
      sendMessage: jest.fn(),
    };
    const cleanup = await service.subscribePreview('record-1', subscriber);

    expect(subscriber.sendMessage).toHaveBeenCalledWith({
      type: 'ready',
      recordId: 'record-1',
      targetFps: 15,
      viewport: { width: 960, height: 540 },
    });
    expect(subscriber.sendMessage).toHaveBeenCalledWith({
      type: 'metadata',
      recordId: 'record-1',
      currentUrl: 'https://example.com/current',
      viewport: { width: 960, height: 540 },
      capturedAt: '2026-01-02T03:04:05.006Z',
    });
    expect(page.screencast.start).toHaveBeenCalledWith({
      quality: 55,
      size: { width: 960, height: 540 },
      onFrame: expect.any(Function),
    });

    const onFrame = page.screencast.start.mock.calls[0][0].onFrame;
    onFrame({
      data: Buffer.from('preview-frame'),
      timestamp: Date.parse('2026-01-02T03:04:06.000Z'),
      viewportWidth: 960,
      viewportHeight: 540,
    });

    expect(subscriber.sendFrame).toHaveBeenCalledWith(
      Buffer.from('preview-frame'),
    );
    expect(subscriber.sendMessage).toHaveBeenLastCalledWith({
      type: 'metadata',
      recordId: 'record-1',
      currentUrl: 'https://example.com/current',
      viewport: { width: 960, height: 540 },
      capturedAt: '2026-01-02T03:04:06.000Z',
    });

    await cleanup();
    expect(page.screencast.stop).toHaveBeenCalled();
  });

  it('serializes concurrent preview subscriptions into one screencast', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    const [cleanupFirst, cleanupSecond] = await Promise.all([
      service.subscribePreview('record-1', {
        sendFrame: jest.fn(),
        sendMessage: jest.fn(),
      }),
      service.subscribePreview('record-1', {
        sendFrame: jest.fn(),
        sendMessage: jest.fn(),
      }),
    ]);

    expect(page.screencast.start).toHaveBeenCalledTimes(1);

    await cleanupFirst();
    expect(page.screencast.stop).not.toHaveBeenCalled();

    await cleanupSecond();
    expect(page.screencast.stop).toHaveBeenCalledTimes(1);
  });

  it('does not keep a preview subscriber when screencast start fails', async () => {
    page.screencast.start.mockRejectedValueOnce(new Error('screencast failed'));
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });
    const failedSubscriber = {
      sendFrame: jest.fn(),
      sendMessage: jest.fn(),
    };

    await expect(
      service.subscribePreview('record-1', failedSubscriber),
    ).rejects.toThrow('screencast failed');

    const activeSubscriber = {
      sendFrame: jest.fn(),
      sendMessage: jest.fn(),
    };
    const cleanup = await service.subscribePreview(
      'record-1',
      activeSubscriber,
    );
    const onFrame = page.screencast.start.mock.calls[1][0].onFrame;
    onFrame({
      data: Buffer.from('preview-frame'),
      timestamp: Date.parse('2026-01-02T03:04:06.000Z'),
      viewportWidth: 960,
      viewportHeight: 540,
    });

    expect(failedSubscriber.sendFrame).not.toHaveBeenCalled();
    expect(activeSubscriber.sendFrame).toHaveBeenCalledWith(
      Buffer.from('preview-frame'),
    );

    await cleanup();
  });

  it('restarts preview-only screencast as recording screencast when video starts', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });
    await service.subscribePreview('record-1', {
      sendFrame: jest.fn(),
      sendMessage: jest.fn(),
    });

    await service.startVideo('record-1', 'capture.webm');

    expect(page.screencast.stop).toHaveBeenCalledTimes(1);
    expect(page.screencast.start).toHaveBeenLastCalledWith({
      path: 'capture.webm',
      quality: 55,
      size: { width: 960, height: 540 },
      onFrame: expect.any(Function),
    });
  });

  it('restores preview screencast when starting video fails after preview stop', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });
    await service.subscribePreview('record-1', {
      sendFrame: jest.fn(),
      sendMessage: jest.fn(),
    });
    page.screencast.start.mockRejectedValueOnce(new Error('recording failed'));

    await expect(
      service.startVideo('record-1', 'capture.webm'),
    ).rejects.toThrow('recording failed');

    expect(page.screencast.stop).toHaveBeenCalledTimes(1);
    expect(page.screencast.start).toHaveBeenLastCalledWith({
      quality: 55,
      size: { width: 960, height: 540 },
      onFrame: expect.any(Function),
    });
    await expect(service.stopVideo('record-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps closed Playwright pages during screenshots to conflict', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });
    page.screenshot.mockRejectedValue(new Error('Page is closed'));

    await expect(
      service.captureScreenshot('record-1', 'capture.png'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws NotFoundException for missing sessions', async () => {
    await expect(service.getFrame('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('closes sessions and idle sessions', async () => {
    process.env.CAPTURE_IDLE_TTL_MS = '1000';
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });
    jest.advanceTimersByTime(1001);

    await expect(service.closeIdleSessions()).resolves.toBe(1);
    expect(closeContext).toHaveBeenCalled();
  });

  it('closes a session directly and removes it from memory', async () => {
    await service.startSession({
      recordId: 'record-1',
      userId: 'user-1',
      siteUrl: 'https://example.com',
    });

    await service.closeSession('record-1');

    expect(closeContext).toHaveBeenCalled();
    await expect(service.getFrame('record-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
