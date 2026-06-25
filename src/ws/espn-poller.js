// Polls ESPN live scores every 30s and broadcasts score_update via WS
import { ESPNProvider } from '../providers/espn.js';

const prevScores = new Map(); // eventId -> { homeScore, awayScore, status }

export function startESPNPoller(broadcastFn) {
  async function poll() {
    try {
      const liveMatches = await ESPNProvider.getLiveMatches();

      for (const match of liveMatches) {
        const prev = prevScores.get(match.id);
        const curr = { home: match.home?.score, away: match.away?.score, status: match.status };

        if (!prev) {
          prevScores.set(match.id, curr);
          broadcastFn({ type: 'match_started', data: match });
          continue;
        }

        if (prev.home !== curr.home || prev.away !== curr.away) {
          prevScores.set(match.id, curr);
          broadcastFn({ type: 'score_update', data: match });
        }
      }

      // Detect finished matches
      for (const [id] of prevScores) {
        const still = liveMatches.find(m => m.id === id);
        if (!still) {
          prevScores.delete(id);
          broadcastFn({ type: 'match_finished', data: { id } });
        }
      }
    } catch (e) {
      console.error('[ESPN Poller]', e.message);
    }
  }

  poll(); // immediate first run
  return setInterval(poll, 30_000);
}