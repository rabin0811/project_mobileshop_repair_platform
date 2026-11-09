import { app } from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 MobileFix API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`   Health: http://localhost:${env.PORT}/api/v1/health`);
});

function shutdown() {
  console.log('Shutting down…');
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
