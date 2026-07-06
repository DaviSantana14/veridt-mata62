import { Injectable, Logger } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CaptureViewport } from '@veridit/contracts';
import {
  chromium,
  type BrowserContext,
  type Page,
  type Route,
} from 'playwright';
import { UrlPolicyService } from './url-policy.service';

export interface PlaywrightBrowserSession {
  context: BrowserContext;
  page: Page;
}

type CaptureBrowserLaunchOptions = NonNullable<
  Parameters<typeof chromium.launchPersistentContext>[1]
>;

@Injectable()
export class PlaywrightBrowserService {
  private readonly logger = new Logger(PlaywrightBrowserService.name);

  constructor(private readonly urlPolicy: UrlPolicyService) {}

  async start(
    siteUrl: string,
    viewport: CaptureViewport,
    userId: string,
  ): Promise<PlaywrightBrowserSession> {
    const userDataDir = await this.ensureUserDataDir(userId);
    const launchOptions = this.getLaunchOptions(viewport);
    let context: BrowserContext | undefined;

    try {
      this.logger.log(
        `Starting capture browser headless=${String(
          launchOptions.headless,
        )} channel=${launchOptions.channel ?? 'bundled'} locale=${
          launchOptions.locale
        } timezone=${launchOptions.timezoneId}`,
      );

      context = await chromium.launchPersistentContext(
        userDataDir,
        launchOptions,
      );
      await context.route('**/*', (route) => this.filterPublicRequest(route));
      const page = context.pages()[0] ?? (await context.newPage());

      await page.goto(siteUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      return {
        context,
        page,
      };
    } catch (error) {
      await context?.close();
      throw error;
    }
  }

  private async ensureUserDataDir(userId: string): Promise<string> {
    const rootDir = resolve(
      process.env.CAPTURE_BROWSER_USER_DATA_DIR ?? 'storage/browser-profiles',
    );
    const userDataDir = resolve(rootDir, this.toSafePathSegment(userId));

    await mkdir(userDataDir, { recursive: true });

    return userDataDir;
  }

  private toSafePathSegment(value: string): string {
    const safeSegment = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);

    return safeSegment || 'anonymous';
  }

  private getLaunchOptions(
    viewport: CaptureViewport,
  ): CaptureBrowserLaunchOptions {
    const channel = this.getChannel();
    const options: CaptureBrowserLaunchOptions = {
      headless: this.getHeadless(),
      locale: this.getLocale(),
      timezoneId: this.getTimezoneId(),
      viewport,
    };

    if (channel) {
      options.channel = channel;
    }

    return options;
  }

  private getHeadless(): boolean {
    const value = process.env.CAPTURE_BROWSER_HEADLESS?.trim().toLowerCase();

    if (!value) {
      return true;
    }

    return value !== 'false' && value !== '0';
  }

  private getChannel(): string | undefined {
    const value = process.env.CAPTURE_BROWSER_CHANNEL?.trim();

    return value || undefined;
  }

  private getLocale(): string {
    return process.env.CAPTURE_BROWSER_LOCALE ?? 'pt-BR';
  }

  private getTimezoneId(): string {
    return process.env.CAPTURE_BROWSER_TIMEZONE ?? 'America/Sao_Paulo';
  }

  private async filterPublicRequest(route: Route): Promise<void> {
    try {
      await this.urlPolicy.validatePublicHttpUrl(route.request().url());
      await route.continue();
    } catch {
      await route.abort('blockedbyclient');
    }
  }
}
