import { ClientProxyFactory } from '@nestjs/microservices';
import { RMQ_QUEUES, VERIDIT_EVENTS } from '@veridit/contracts';
import { CaptureEventsPublisher } from './capture-events.publisher';

jest.mock('@nestjs/microservices', () => ({
  ClientProxyFactory: {
    create: jest.fn(),
  },
  Transport: {
    RMQ: 5,
  },
}));

function createClientProxyMock() {
  return {
    emit: jest.fn().mockReturnValue({
      subscribe: jest.fn(),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

describe('CaptureEventsPublisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes capture completion events to reports and notifications queues', () => {
    const reportsClient = createClientProxyMock();
    const notificationsClient = createClientProxyMock();
    jest
      .mocked(ClientProxyFactory.create)
      .mockReturnValueOnce(reportsClient as never)
      .mockReturnValueOnce(notificationsClient as never);
    const event = {
      recordId: 'record-1',
      userId: 'user-1',
      title: 'Captura',
      siteUrl: 'https://example.com',
      imageCount: 1,
      videoCount: 1,
      occurredAt: '2026-01-02T03:08:09.000Z',
    };

    const publisher = new CaptureEventsPublisher();

    publisher.publishCaptureCompleted(event);

    expect(ClientProxyFactory.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        options: expect.objectContaining({
          queue: RMQ_QUEUES.reports,
        }),
      }),
    );
    expect(ClientProxyFactory.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        options: expect.objectContaining({
          queue: RMQ_QUEUES.notifications,
        }),
      }),
    );
    expect(reportsClient.emit).toHaveBeenCalledWith(
      VERIDIT_EVENTS.captureCompleted,
      event,
    );
    expect(notificationsClient.emit).toHaveBeenCalledWith(
      VERIDIT_EVENTS.captureCompleted,
      event,
    );
  });

  it('closes both RabbitMQ clients on module destroy', async () => {
    const reportsClient = createClientProxyMock();
    const notificationsClient = createClientProxyMock();
    jest
      .mocked(ClientProxyFactory.create)
      .mockReturnValueOnce(reportsClient as never)
      .mockReturnValueOnce(notificationsClient as never);
    const publisher = new CaptureEventsPublisher();

    await publisher.onModuleDestroy();

    expect(reportsClient.close).toHaveBeenCalledTimes(1);
    expect(notificationsClient.close).toHaveBeenCalledTimes(1);
  });
});
