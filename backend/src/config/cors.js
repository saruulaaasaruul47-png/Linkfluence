import { env } from './env.js';

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin === env.clientUrl) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
};
