import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import type { StartCaptureRequest } from '@veridit/contracts';

export class StartCaptureDto implements StartCaptureRequest {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsUrl({ require_tld: false })
  siteUrl!: string;

  @IsOptional()
  @IsString()
  title?: string;
}
