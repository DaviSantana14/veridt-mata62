import { config } from 'dotenv';
import { resolve } from 'node:path';

const captureServiceEnvPath = resolve(__dirname, '..', '..', '.env');

config({
  path: captureServiceEnvPath,
  override: false,
});
