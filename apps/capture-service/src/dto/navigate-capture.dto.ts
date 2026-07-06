import { IsUrl } from 'class-validator';
import type { NavigateCaptureRequest } from '@veridit/contracts';

export class NavigateCaptureDto implements NavigateCaptureRequest {
  @IsUrl({ require_tld: false })
  siteUrl!: string;
}
