import { BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { PlaywrightBrowserService } from './playwright-browser.service';
import type { UrlPolicyService } from './url-policy.service';

interface RouteMock {
  request: () => { url: () => string };
  continue: jest.Mock<Promise<void>>;
  abort: jest.Mock<Promise<void>>;
}

type RouteHandler = (route: RouteMock) => Promise<void>;

jest.mock('playwright', () => ({
  chromium: {
    launchPersistentContext: jest.fn(),
  },
}));

const mockedChromium = jest.mocked(chromium);
const originalEnv = { ...process.env };

describe('PlaywrightBrowserService', () => {
  let profileRoot: string;
  let context: {
    route: jest.Mock;
    pages: jest.Mock;
    newPage: jest.Mock;
    close: jest.Mock;
  };
  let page: { goto: jest.Mock };
  let urlPolicy: { validatePublicHttpUrl: jest.Mock };
  let service: PlaywrightBrowserService;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CAPTURE_BROWSER_CHANNEL;
    delete process.env.CAPTURE_BROWSER_HEADLESS;
    delete process.env.CAPTURE_BROWSER_LOCALE;
    delete process.env.CAPTURE_BROWSER_TIMEZONE;
    profileRoot = join(tmpdir(), `veridit-browser-profiles-${randomUUID()}`);
    process.env.CAPTURE_BROWSER_USER_DATA_DIR = profileRoot;
    page = {
      goto: jest.fn().mockResolvedValue(undefined),
    };
    context = {
      route: jest.fn().mockResolvedValue(undefined),
      pages: jest.fn().mockReturnValue([]),
      newPage: jest.fn().mockResolvedValue(page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    urlPolicy = {
      validatePublicHttpUrl: jest
        .fn()
        .mockResolvedValue('https://example.com/'),
    };
    mockedChromium.launchPersistentContext.mockResolvedValue(context as never);
    service = new PlaywrightBrowserService(
      urlPolicy as unknown as UrlPolicyService,
    );
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    process.env = originalEnv;
  });

  function getRouteHandler(): RouteHandler {
    const calls = context.route.mock.calls as unknown as Array<
      [string, RouteHandler]
    >;

    return calls[0][1];
  }

  it('registers request filtering before navigating', async () => {
    await expect(
      service.start(
        'https://example.com',
        { width: 800, height: 600 },
        'user-1',
      ),
    ).resolves.toEqual({
      context,
      page,
    });

    const [userDataDir, options] =
      mockedChromium.launchPersistentContext.mock.calls[0];
    expect(userDataDir).toContain('user-1');
    expect(existsSync(userDataDir as string)).toBe(true);
    expect(options).toMatchObject({
      headless: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      viewport: { width: 800, height: 600 },
    });
    expect(options?.channel).toBeUndefined();
    expect(context.route).toHaveBeenCalledWith('**/*', expect.any(Function));
    expect(page.goto).toHaveBeenCalledWith('https://example.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  });

  it('passes browser environment configuration to the persistent context', async () => {
    process.env.CAPTURE_BROWSER_HEADLESS = 'false';
    process.env.CAPTURE_BROWSER_CHANNEL = 'chrome';
    process.env.CAPTURE_BROWSER_LOCALE = 'en-US';
    process.env.CAPTURE_BROWSER_TIMEZONE = 'UTC';

    await service.start(
      'https://example.com',
      { width: 1024, height: 768 },
      'lawyer@example.com',
    );

    const [userDataDir, options] =
      mockedChromium.launchPersistentContext.mock.calls[0];
    expect(userDataDir).toContain('lawyer_example.com');
    expect(options).toMatchObject({
      channel: 'chrome',
      headless: false,
      locale: 'en-US',
      timezoneId: 'UTC',
      viewport: { width: 1024, height: 768 },
    });
  });

  it.each(['false', 'False', 'FALSE', '0'])(
    'parses CAPTURE_BROWSER_HEADLESS=%s as headed mode',
    async (value) => {
      process.env.CAPTURE_BROWSER_HEADLESS = value;

      await service.start(
        'https://example.com',
        { width: 800, height: 600 },
        'user-1',
      );

      const [, options] = mockedChromium.launchPersistentContext.mock.calls[0];
      expect(options?.headless).toBe(false);
    },
  );

  it('aborts blocked requests through the URL policy', async () => {
    await service.start(
      'https://example.com',
      { width: 800, height: 600 },
      'user-1',
    );
    const routeHandler = getRouteHandler();
    const route = {
      request: () => ({ url: () => 'http://127.0.0.1/' }),
      continue: jest.fn<() => Promise<void>>(),
      abort: jest.fn<() => Promise<void>>(),
    };
    urlPolicy.validatePublicHttpUrl.mockRejectedValue(
      new BadRequestException('blocked'),
    );

    await routeHandler(route);

    expect(route.abort).toHaveBeenCalledWith('blockedbyclient');
    expect(route.continue).not.toHaveBeenCalled();
  });

  it('continues allowed requests through the URL policy', async () => {
    await service.start(
      'https://example.com',
      { width: 800, height: 600 },
      'user-1',
    );
    const routeHandler = getRouteHandler();
    const route = {
      request: () => ({ url: () => 'https://example.com/app.js' }),
      continue: jest.fn<() => Promise<void>>(),
      abort: jest.fn<() => Promise<void>>(),
    };

    await routeHandler(route);

    expect(urlPolicy.validatePublicHttpUrl).toHaveBeenCalledWith(
      'https://example.com/app.js',
    );
    expect(route.continue).toHaveBeenCalled();
    expect(route.abort).not.toHaveBeenCalled();
  });

  it('closes the persistent context when navigation fails', async () => {
    page.goto.mockRejectedValue(new Error('navigation failed'));

    await expect(
      service.start(
        'https://example.com',
        { width: 800, height: 600 },
        'user-1',
      ),
    ).rejects.toThrow('navigation failed');

    expect(context.close).toHaveBeenCalled();
  });
});
