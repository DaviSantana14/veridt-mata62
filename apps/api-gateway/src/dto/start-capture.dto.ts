import { IsOptional, IsString, IsUrl } from 'class-validator';
import type { StartCaptureRequest } from '@veridit/contracts';

export class StartCaptureDto implements StartCaptureRequest {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsUrl({ require_tld: false })
  siteUrl!: string;
}
