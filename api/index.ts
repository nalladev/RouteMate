import { createRequestHandler } from 'expo-server/adapter/vercel';
import path from 'path';

export default createRequestHandler({
  build: path.join(process.cwd(), 'dist/server'),
});