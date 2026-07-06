import type {
  CaptureAssetResponse,
  CaptureRecordDetailsResponse,
  UserResponse,
} from "@veridit/contracts";

export type RecordZipAssetFile = {
  asset: CaptureAssetResponse;
  bytes: Uint8Array;
  contentType: string;
};

export type RecordZipInput = {
  record: CaptureRecordDetailsResponse;
  responsibleUser?: UserResponse;
  assets: CaptureAssetResponse[];
  files: RecordZipAssetFile[];
  generatedAt: string;
};
