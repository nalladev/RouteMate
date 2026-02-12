import { createRequestHandler } from 'expo-server/adapter/vercel';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default createRequestHandler({
  build: path.join(__dirname, '../dist/server'),
});