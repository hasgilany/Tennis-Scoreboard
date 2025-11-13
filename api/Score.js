// api/score.js
// Self-contained version without external dependencies

// In-memory store (resets on cold starts, but works for testing)
let scoreData = {
  player1: 0,
  player2: 0,
  totalGames: 0,
  advantage: 0,
  isTiebreak: false,
  lastUpdate: new Date().toISOString()
};

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Return current score
  if (req.method === 'GET') {
    console.log('GET /api/score - Returning:', scoreData);
    return res.status(200).json(scoreData);
  }

  // POST: Update score
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      console.log('POST /api/score - Received:', body);
      
      const { player1, player2, totalGames, advantage, isTiebreak } = body;

      // Validate required fields
      if (player1 === undefined || player2 === undefined || totalGames === undefined) {
        console.error('Missing required fields');
        return res.status(400).json({ 
          error: 'Missing score data (player1, player2, totalGames required)' 
        });
      }

      // Update score
      scoreData = {
        player1: Number(player1),
        player2: Number(player2),
        totalGames: Number(totalGames),
        advantage: Number(advantage || 0),
        isTiebreak: Boolean(isTiebreak),
        lastUpdate: new Date().toISOString()
      };

      console.log('Score updated:', scoreData);
      return res.status(200).json({ 
        message: 'Score updated successfully', 
        score: scoreData 
      });
      
    } catch (err) {
      console.error('POST error:', err);
      return res.status(500).json({ 
        error: 'Failed to update score',
        details: err.message 
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}