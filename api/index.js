const ALLOWED_ORIGIN = process.env.CORS_ALLOW_ORIGIN || 'https://odia.dev';

function setCors(res) {
  if (ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
}

export default async function handler(req, res) {
  setCors(res);
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.status(200).json({
    message: 'Welcome to ODIADEV - Nigeria AI Infrastructure',
    company: 'ODIADEV',
    version: '3.1.0',
    status: 'operational'
  });
}
