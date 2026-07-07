import { Injectable, Logger } from '@nestjs/common';
import { SERVICE_PORTS } from '@veridit/contracts';
import type { IncomingMessage, Server } from 'node:http';
import type { Socket } from 'node:net';
import { WebSocket, WebSocketServer, type RawData } from 'ws';

interface PreviewErrorMessage {
  type: 'error';
  message: string;
  status: number;
}

const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;

@Injectable()
export class CapturePreviewProxyService {
  private readonly logger = new Logger(CapturePreviewProxyService.name);
  private readonly server = new WebSocketServer({ noServer: true });
  private attached = false;

  attach(httpServer: Server): void {
    if (this.attached) {
      return;
    }

    httpServer.on('upgrade', (request, socket, head) => {
      const requestUrl = this.parseRequestUrl(request);

      if (requestUrl?.pathname !== '/capture/preview') {
        return;
      }

      this.server.handleUpgrade(request, socket, head, (frontend) => {
        this.handleConnection(frontend, requestUrl);
      });
    });

    this.attached = true;
  }

  buildDownstreamUrl(recordId: string): string {
    const base =
      process.env.CAPTURE_SERVICE_WS_URL ??
      `ws://127.0.0.1:${SERVICE_PORTS.capture}`;
    const url = new URL('/preview', base.endsWith('/') ? base : `${base}/`);

    url.searchParams.set('recordId', recordId);

    return url.toString();
  }

  private handleConnection(frontend: WebSocket, requestUrl: URL): void {
    const recordId = requestUrl.searchParams.get('recordId');

    if (!recordId) {
      this.sendError(frontend, {
        type: 'error',
        message: 'recordId is required',
        status: 400,
      });
      frontend.close(1008);
      return;
    }

    const downstream = new WebSocket(this.buildDownstreamUrl(recordId));
    let closed = false;

    frontend.on('message', (data: RawData, isBinary: boolean) => {
      if (downstream.readyState === WebSocket.OPEN) {
        downstream.send(data, { binary: isBinary });
      }
    });

    downstream.on('message', (data: RawData, isBinary: boolean) => {
      if (
        frontend.readyState === WebSocket.OPEN &&
        frontend.bufferedAmount <= MAX_BUFFERED_BYTES
      ) {
        frontend.send(data, { binary: isBinary });
      }
    });

    downstream.on('error', (error) => {
      this.logger.warn(`Capture preview downstream error: ${error.message}`);
      this.sendError(frontend, {
        type: 'error',
        message: 'capture preview connection failed',
        status: 502,
      });
      this.closePair(frontend, downstream, 1011);
    });

    frontend.on('error', (error) => {
      this.logger.warn(`Capture preview frontend error: ${error.message}`);
      this.closePair(frontend, downstream, 1011);
    });

    frontend.on('close', () => {
      if (closed) {
        return;
      }

      closed = true;
      this.closeIfOpen(downstream);
    });

    downstream.on('close', (code: number) => {
      if (closed) {
        return;
      }

      closed = true;
      this.closeIfOpen(frontend, code);
    });
  }

  private parseRequestUrl(request: IncomingMessage): URL | null {
    if (!request.url) {
      return null;
    }

    return new URL(request.url, 'ws://api-gateway.local');
  }

  private sendError(socket: WebSocket, payload: PreviewErrorMessage): void {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify(payload));
  }

  private closePair(
    frontend: WebSocket,
    downstream: WebSocket,
    code?: number,
  ): void {
    this.closeIfOpen(frontend, code);
    this.closeIfOpen(downstream, code);
  }

  private closeIfOpen(socket: WebSocket, code?: number): void {
    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close(this.toSendableCloseCode(code));
    }
  }

  private toSendableCloseCode(code?: number): number | undefined {
    if (
      code === 1000 ||
      (code !== undefined &&
        code >= 1001 &&
        code <= 1014 &&
        ![1004, 1005, 1006].includes(code)) ||
      (code !== undefined && code >= 3000 && code <= 4999)
    ) {
      return code;
    }

    return undefined;
  }
}
