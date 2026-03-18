import { SetMetadata } from '@nestjs/common';

export const THROTTLE_EMAIL_METADATA = 'throttle_email_metadata';

export interface ThrottleEmailOptions {
  limit: number;
  ttl: number; // in seconds
}

export const ThrottleEmail = (options: ThrottleEmailOptions) =>
  SetMetadata(THROTTLE_EMAIL_METADATA, options);
