import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

interface ResolvedAddress {
  address: string;
  family: number;
}

@Injectable()
export class UrlPolicyService {
  async validatePublicHttpUrl(rawUrl: string): Promise<string> {
    const url = this.parseHttpUrl(rawUrl);
    const hostname = this.normalizeHostname(url.hostname);
    const allowPrivateHosts =
      process.env.CAPTURE_ALLOW_PRIVATE_HOSTS === 'true';

    if (!allowPrivateHosts && this.isLocalHostname(hostname)) {
      throw new BadRequestException('Capture URL host is not public');
    }

    const addresses = await this.resolveHostname(hostname);

    if (
      !allowPrivateHosts &&
      addresses.some((entry) => !this.isPublicIp(entry.address))
    ) {
      throw new BadRequestException('Capture URL host is not public');
    }

    return url.toString();
  }

  private parseHttpUrl(rawUrl: string): URL {
    let url: URL;

    try {
      url = new URL(rawUrl.trim());
    } catch {
      throw new BadRequestException('Capture URL is invalid');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('Capture URL must use HTTP or HTTPS');
    }

    if (!url.hostname) {
      throw new BadRequestException('Capture URL must include a hostname');
    }

    return url;
  }

  private async resolveHostname(hostname: string): Promise<ResolvedAddress[]> {
    try {
      const addresses = (await lookup(hostname, {
        all: true,
        verbatim: true,
      })) as ResolvedAddress[];

      if (addresses.length === 0) {
        throw new BadRequestException('Capture URL host has no DNS records');
      }

      return addresses;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Capture URL host could not be resolved');
    }
  }

  private normalizeHostname(hostname: string): string {
    const lowerHostname = hostname.toLowerCase();

    if (lowerHostname.startsWith('[') && lowerHostname.endsWith(']')) {
      return lowerHostname.slice(1, -1);
    }

    return lowerHostname;
  }

  private isLocalHostname(hostname: string): boolean {
    return hostname === 'localhost' || hostname.endsWith('.localhost');
  }

  private isPublicIp(address: string): boolean {
    const normalizedAddress = this.normalizeHostname(address);
    const family = isIP(normalizedAddress);

    if (family === 4) {
      return this.isPublicIpv4(normalizedAddress);
    }

    if (family === 6) {
      return this.isPublicIpv6(normalizedAddress);
    }

    return false;
  }

  private isPublicIpv4(address: string): boolean {
    const octets = address.split('.').map((part) => Number(part));

    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part))) {
      return false;
    }

    const [first, second] = octets;

    if (
      first === undefined ||
      second === undefined ||
      octets.some((part) => part < 0 || part > 255)
    ) {
      return false;
    }

    if (first === 0 || first === 10 || first === 127 || first >= 224) {
      return false;
    }

    if (first === 100 && second >= 64 && second <= 127) {
      return false;
    }

    if (first === 169 && second === 254) {
      return false;
    }

    if (first === 172 && second >= 16 && second <= 31) {
      return false;
    }

    if (first === 192 && second === 168) {
      return false;
    }

    if (first === 198 && (second === 18 || second === 19)) {
      return false;
    }

    return !(first === 255 && second === 255);
  }

  private isPublicIpv6(address: string): boolean {
    const ipv4Suffix = this.getIpv4Suffix(address);

    if (ipv4Suffix) {
      return this.isPublicIpv4(ipv4Suffix);
    }

    const groups = this.expandIpv6(address);

    if (!groups) {
      return false;
    }

    const [first = 0, second = 0] = groups;
    const isUnspecified = groups.every((group) => group === 0);
    const isLoopback =
      groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;

    if (isUnspecified || isLoopback) {
      return false;
    }

    if ((first & 0xffc0) === 0xfe80) {
      return false;
    }

    if ((first & 0xfe00) === 0xfc00) {
      return false;
    }

    if ((first & 0xff00) === 0xff00) {
      return false;
    }

    if (first === 0x2001 && second === 0x0db8) {
      return false;
    }

    return true;
  }

  private getIpv4Suffix(address: string): string | undefined {
    const lastColonIndex = address.lastIndexOf(':');

    if (lastColonIndex === -1) {
      return undefined;
    }

    const suffix = address.slice(lastColonIndex + 1);

    return isIP(suffix) === 4 ? suffix : undefined;
  }

  private expandIpv6(address: string): number[] | undefined {
    const parts = address.toLowerCase().split('::');

    if (parts.length > 2) {
      return undefined;
    }

    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missingGroups = 8 - left.length - right.length;

    if (parts.length === 1 && missingGroups !== 0) {
      return undefined;
    }

    if (parts.length === 2 && missingGroups < 1) {
      return undefined;
    }

    const groups = [
      ...left,
      ...Array<string>(Math.max(missingGroups, 0)).fill('0'),
      ...right,
    ];

    if (groups.length !== 8) {
      return undefined;
    }

    const parsedGroups = groups.map((group) => Number.parseInt(group, 16));

    if (
      parsedGroups.some(
        (group, index) =>
          !Number.isInteger(group) ||
          group < 0 ||
          group > 0xffff ||
          groups[index] === '',
      )
    ) {
      return undefined;
    }

    return parsedGroups;
  }
}
