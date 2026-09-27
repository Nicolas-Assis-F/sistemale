'use client';

import { createAuthClient } from 'better-auth/react';
import { magicLinkClient } from 'better-auth/client/plugins';

export const customerAuthClient = createAuthClient({
  basePath: '/api/cliente',
  plugins: [magicLinkClient()],
});
