import { env } from '../../../config/env.js';
import { metaSocialProvider } from './meta.provider.js';
import { sandboxSocialProvider } from './sandbox.provider.js';

export function socialProvider() {
  return env.socialProviderMode === 'meta' ? metaSocialProvider : sandboxSocialProvider;
}

