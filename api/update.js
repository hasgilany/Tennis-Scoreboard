// api/update.js
import { getScore, setScore } from './dataStore';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const AUTH_TOKEN = process.env.API_SECRET || 'my_secret_key';
  const providedToken = req.headers['x-api-key'];

  if (providedToken !== AUTH_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const data = req.body;
  if (!data) return res.status(400).json({ error: 'Missing body' });

  // Validate expected fields or accept partial updates
  const allowed = {};
  if (data.player1 !== undefined) allowed.player1 = Number(data.player1);
  if (data.player2 !== undefined) allowed.player2 = Number(data.player2);
  if (data.totalGames !== undefined) allowed.totalGames = Number(data.totalGames);
  if (data.advantage !== undefined) allowed.advantage = Number(data.advantage);
  if (data.isTiebreak !== undefined) allowed.isTiebreak = Boolean(data.isTiebreak);

  const updated = setScore(allowed);

  // Return updated canonical score so caller can sync
  return res.status(200).json({ message: 'Score updated via ESP', score: updated });
}
