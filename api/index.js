const { createRequestHandler } = require('expo-server/adapter/vercel');
const path = require('path');
const fs = require('fs');

const expoHandler = createRequestHandler({
  build: path.join(process.cwd(), 'dist', 'server'),
});

module.exports = async (req, res) => {
  // Handle .well-known files
  if (req.url === '/.well-known/assetlinks.json') {
    const filePath = path.join(process.cwd(), 'public', '.well-known', 'assetlinks.json');
    
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.status(200).send(fileContent);
      return;
    } catch (error) {
      console.error('Error serving assetlinks.json:', error);
      res.status(404).send('Not found');
      return;
    }
  }

  // Pass everything else to Expo handler
  return expoHandler(req, res);
};