import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { UrlPolicyService } from './url-policy.service';

jest.mock('node:dns/promises', () => ({
  lookup: jest.fn(),
}));

const mockedLookup = jest.mocked(lookup);
const originalEnv = { ...process.env };

describe('UrlPolicyService', () => {
  let service: UrlPolicyService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CAPTURE_ALLOW_PRIVATE_HOSTS;
    service = new UrlPolicyService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it.each([
    ['https://example.com', 'https://example.com/'],
    ['http://example.com/path?x=1', 'http://example.com/path?x=1'],
    ['https://sub.example.org', 'https://sub.example.org/'],
  ])('normalizes public HTTP URL %s', async (url, expected) => {
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

    await expect(service.validatePublicHttpUrl(url)).resolves.toBe(expected);
  });

  it('normalizes hostname casing', async () => {
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

    await expect(
      service.validatePublicHttpUrl('HTTPS://Example.com/docs?q=1'),
    ).resolves.toBe('https://example.com/docs?q=1');

    expect(mockedLookup).toHaveBeenCalledWith('example.com', {
      all: true,
      verbatim: true,
    });
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,hello',
    'file:///etc/passwd',
    'ftp://example.com',
  ])('rejects non HTTP protocol URL %s', async (url) => {
    await expect(service.validatePublicHttpUrl(url)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it('rejects localhost by default', async () => {
    await expect(
      service.validatePublicHttpUrl('http://localhost:3000'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mockedLookup).not.toHaveBeenCalled();
  });

  it.each(['127.0.0.1', '10.0.0.1', '172.16.0.10', '192.168.0.10'])(
    'rejects private DNS result %s by default',
    async (address) => {
      mockedLookup.mockResolvedValue([{ address, family: 4 }]);

      await expect(
        service.validatePublicHttpUrl('https://private.example'),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects hosts without public DNS', async () => {
    mockedLookup.mockRejectedValue(
      Object.assign(new Error('not found'), {
        code: 'ENOTFOUND',
      }),
    );

    await expect(
      service.validatePublicHttpUrl('https://missing.example.test'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows private hosts when explicitly enabled', async () => {
    process.env.CAPTURE_ALLOW_PRIVATE_HOSTS = 'true';
    mockedLookup.mockResolvedValue([{ address: '192.168.0.10', family: 4 }]);

    await expect(
      service.validatePublicHttpUrl('http://device.local/path'),
    ).resolves.toBe('http://device.local/path');
  });
});
