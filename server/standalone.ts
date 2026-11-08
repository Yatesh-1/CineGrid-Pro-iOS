import http from 'http';
import { handleLicenseApiRequest } from './licenseApi';

const PORT = parseInt(process.env.LICENSE_SERVER_PORT || '5175', 10);

const server = http.createServer(async (req, res) => {
  const handled = await handleLicenseApiRequest(req, res);
  if (!handled) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[CineGrid Pro License Server] Running on http://0.0.0.0:${PORT}`);
});
