import { IsString, IsUrl } from 'class-validator';
import type { StartCaptureRequest } from '@veridit/contracts';

export class MockCaptureDto implements StartCaptureRequest {
  @IsString()
  userId!: string;

  @IsString()
  title!: string;

  @IsUrl({ require_tld: false })
  siteUrl!: string;
}
