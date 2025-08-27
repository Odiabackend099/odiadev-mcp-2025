export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://odia.dev');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  res.status(200).json({
    message: 'ODIADEV Payment endpoint ready',
    status: 'configured'
  });
}
