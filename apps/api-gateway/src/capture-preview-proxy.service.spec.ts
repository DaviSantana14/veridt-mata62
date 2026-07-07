import { EventEmitter } from 'node:events';
import type { IncomingMessage, Server } from 'node:http';
import type { Socket } from 'node:net';
import type { CapturePreviewProxyService as CapturePreviewProxyServiceType } from './capture-preview-proxy.service';

class MockWebSocket extends EventEmitter {
  readyState = 1;
  bufferedAmount = 0;
  send = jest.fn();
  close = jest.fn();
}

const mockFrontend = new MockWebSocket();
const mockDownstream = new MockWebSocket();
const mockWebSocketServer = {
  handleUpgrade: jest.fn(
    (
      _request: IncomingMessage,
      _socket: Socket,
      _head: Buffer,
      callback: (socket: MockWebSocket) => void,
    ) => callback(mockFrontend),
  ),
};

const mockWebSocketClient = jest.fn(() => mockDownstream);
let CapturePreviewProxyService: typeof CapturePreviewProxyServiceType;

jest.doMock('ws', () => ({
  WebSocketServer: jest.fn(() => mockWebSocketServer),
  WebSocket: Object.assign(mockWebSocketClient, {
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }),
}));

describe('CapturePreviewProxyService', () => {
  const originalCaptureServiceWsUrl = process.env.CAPTURE_SERVICE_WS_URL;

  beforeAll(() => {
    ({ CapturePreviewProxyService } =
      require('./capture-preview-proxy.service') as typeof import('./capture-preview-proxy.service'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrontend.removeAllListeners();
    mockFrontend.readyState = 1;
    mockFrontend.bufferedAmount = 0;
    mockDownstream.removeAllListeners();
    mockDownstream.readyState = 1;
    mockDownstream.bufferedAmount = 0;
    delete process.env.CAPTURE_SERVICE_WS_URL;
  });

  afterAll(() => {
    process.env.CAPTURE_SERVICE_WS_URL = originalCaptureServiceWsUrl;
  });

  it('builds the downstream preview URL from the configured base', () => {
    process.env.CAPTURE_SERVICE_WS_URL = 'ws://capture.internal:4010';

    expect(
      new CapturePreviewProxyService().buildDownstreamUrl('record 1'),
    ).toBe('ws://capture.internal:4010/preview?recordId=record+1');
  });

  it('sends a policy error and does not connect downstream when recordId is missing', () => {
    const service = new CapturePreviewProxyService();
    const server = new EventEmitter() as Server;

    service.attach(server);
    server.emit(
      'upgrade',
      { url: '/capture/preview' } as IncomingMessage,
      {} as Socket,
      Buffer.alloc(0),
    );

    expect(mockWebSocketClient).not.toHaveBeenCalled();
    expect(mockFrontend.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'error',
        message: 'recordId is required',
        status: 400,
      }),
    );
    expect(mockFrontend.close).toHaveBeenCalledWith(1008);
  });

  it('reports downstream connection errors and closes the frontend with 1011', () => {
    const service = new CapturePreviewProxyService();
    const server = new EventEmitter() as Server;

    service.attach(server);
    server.emit(
      'upgrade',
      { url: '/capture/preview?recordId=record-1' } as IncomingMessage,
      {} as Socket,
      Buffer.alloc(0),
    );
    mockDownstream.emit('error', new Error('connection refused'));

    expect(mockWebSocketClient).toHaveBeenCalledWith(
      'ws://127.0.0.1:3103/preview?recordId=record-1',
    );
    expect(mockFrontend.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'error',
        message: 'capture preview connection failed',
        status: 502,
      }),
    );
    expect(mockFrontend.close).toHaveBeenCalledWith(1011);
  });

  it('drops downstream frames when the public client buffer is high', () => {
    const service = new CapturePreviewProxyService();
    const server = new EventEmitter() as Server;

    mockFrontend.bufferedAmount = 3 * 1024 * 1024;

    service.attach(server);
    server.emit(
      'upgrade',
      { url: '/capture/preview?recordId=record-1' } as IncomingMessage,
      {} as Socket,
      Buffer.alloc(0),
    );
    mockDownstream.emit('message', Buffer.from('frame'), true);

    expect(mockFrontend.send).not.toHaveBeenCalled();
  });
});
