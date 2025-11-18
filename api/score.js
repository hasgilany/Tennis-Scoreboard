
// In-memory store (resets on cold starts, but works for this use case)
let scoreData = {
  player1: 0,
  player2: 0,
  totalGames: 0,
  advantage: 0,
  isTiebreak: false,
  lastUpdate: new Date().toISOString()
};

export default function handler(req, res) {
  // Enable CORS for ESP32 to access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // =====================================================================
  // GET: Return current score (for ESP32 to fetch)
  // =====================================================================
  if (req.method === 'GET') {
    console.log('[GET /api/score] Returning score:', scoreData);
    return res.status(200).json(scoreData);
  }

  // =====================================================================
  // POST: Update score (from website or ESP32)
  // =====================================================================
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      console.log('[POST /api/score] Received:', body);
      
      // Optional API key validation (uncomment if you want security)
      const apiKey = req.headers['x-api-key'];
      const expectedKey = process.env.API_SECRET || 'my_secret_key';
      
      // Uncomment these lines to enforce API key authentication:
      // if (apiKey !== expectedKey) {
      //   console.error('[POST /api/score] Unauthorized: Invalid API key');
      //   return res.status(401).json({ error: 'Unauthorized' });
      // }

      const { player1, player2, totalGames, advantage, isTiebreak } = body;

      // Validate that at least one field is provided
      if (player1 === undefined && player2 === undefined && totalGames === undefined) {
        console.error('[POST /api/score] Missing required fields');
        return res.status(400).json({ 
          error: 'Missing score data. Provide at least one of: player1, player2, totalGames' 
        });
      }

      // Update only the fields that were provided
      if (player1 !== undefined) scoreData.player1 = Number(player1);
      if (player2 !== undefined) scoreData.player2 = Number(player2);
      if (totalGames !== undefined) scoreData.totalGames = Number(totalGames);
      if (advantage !== undefined) scoreData.advantage = Number(advantage);
      if (isTiebreak !== undefined) scoreData.isTiebreak = Boolean(isTiebreak);
      
      scoreData.lastUpdate = new Date().toISOString();

      console.log('[POST /api/score] Score updated successfully:', scoreData);
      return res.status(200).json({ 
        message: 'Score updated successfully', 
        score: scoreData 
      });
      
    } catch (err) {
      console.error('[POST /api/score] Error:', err);
      return res.status(500).json({ 
        error: 'Failed to update score',
        details: err.message 
      });
    }
  }

  // =====================================================================
  // PUT: Alternative method to update score
  // =====================================================================
  if (req.method === 'PUT') {
    try {
      const body = req.body || {};
      console.log('[PUT /api/score] Received:', body);
      
      const { player1, player2, totalGames, advantage, isTiebreak } = body;

      // Full update - all fields required
      if (player1 === undefined || player2 === undefined || totalGames === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields (player1, player2, totalGames)' 
        });
      }

      scoreData = {
        player1: Number(player1),
        player2: Number(player2),
        totalGames: Number(totalGames),
        advantage: Number(advantage || 0),
        isTiebreak: Boolean(isTiebreak || false),
        lastUpdate: new Date().toISOString()
      };

      console.log('[PUT /api/score] Score replaced:', scoreData);
      return res.status(200).json({ 
        message: 'Score updated successfully', 
        score: scoreData 
      });
      
    } catch (err) {
      console.error('[PUT /api/score] Error:', err);
      return res.status(500).json({ 
        error: 'Failed to update score',
        details: err.message 
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ 
    error: 'Method not allowed',
    allowed: ['GET', 'POST', 'PUT', 'OPTIONS']
  });
}
