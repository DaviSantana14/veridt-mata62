import { HttpException, Injectable } from '@nestjs/common';
import type { CapturePreviewSocketMessage } from '@veridit/contracts';
import type { IncomingMessage, Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { CaptureSessionManagerService } from './capture-session-manager.service';

const PREVIEW_PATH = '/preview';
const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;

@Injectable()
export class CapturePreviewWebSocketService {
  private server?: WebSocketServer;

  constructor(private readonly sessions: CaptureSessionManagerService) {}

  attach(httpServer: Server): void {
    if (this.server) {
      return;
    }

    this.server = new WebSocketServer({
      server: httpServer,
      path: PREVIEW_PATH,
    });
    this.server.on('connection', (client, request) => {
      void this.handleConnection(client, request);
    });
  }

  private async handleConnection(
    client: WebSocket,
    request: IncomingMessage,
  ): Promise<void> {
    const recordId = this.getRecordId(request);

    if (!recordId) {
      this.sendMessage(client, {
        type: 'error',
        message: 'recordId is required',
        status: 400,
      });
      client.close(1008, 'recordId is required');
      return;
    }

    let cleanup: (() => Promise<void>) | undefined;
    let closed = false;

    client.on('close', () => {
      closed = true;

      if (cleanup) {
        void cleanup().catch(() => undefined);
        cleanup = undefined;
      }
    });
    client.on('error', () => {
      client.close();
    });

    try {
      cleanup = await this.sessions.subscribePreview(recordId, {
        sendFrame: (frame) => {
          if (
            client.readyState !== WebSocket.OPEN ||
            client.bufferedAmount > MAX_BUFFERED_BYTES
          ) {
            return;
          }

          client.send(frame, { binary: true });
        },
        sendMessage: (message) => {
          this.sendMessage(client, message);
        },
      });
    } catch (error) {
      if (closed) {
        return;
      }

      this.sendMessage(client, this.toErrorMessage(error, recordId));
      client.close(1008, 'preview unavailable');
      return;
    }

    if (closed && cleanup) {
      await cleanup();
      cleanup = undefined;
    }
  }

  private getRecordId(request: IncomingMessage): string | null {
    const url = new URL(request.url ?? PREVIEW_PATH, 'http://localhost');
    const recordId = url.searchParams.get('recordId')?.trim();

    return recordId || null;
  }

  private sendMessage(
    client: WebSocket,
    message: CapturePreviewSocketMessage,
  ): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    client.send(JSON.stringify(message));
  }

  private toErrorMessage(
    error: unknown,
    recordId: string,
  ): CapturePreviewSocketMessage {
    if (error instanceof HttpException) {
      return {
        type: 'error',
        recordId,
        message: error.message,
        status: error.getStatus(),
      };
    }

    return {
      type: 'error',
      recordId,
      message: 'Preview unavailable',
      status: 500,
    };
  }
}
