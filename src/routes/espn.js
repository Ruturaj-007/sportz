import { Router } from 'express';
import { ESPNProvider } from '../providers/espn.js';

export const espnRouter = Router();

// Simple in-memory cache (TTL-based, no Redis needed yet)
const cache = new Map();
function withCache(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data);
  return fn().then(data => { cache.set(key, { data, ts: Date.now() }); return data; });
}

const TTL = { live: 30_000, matches: 60_000, news: 120_000, standings: 300_000 };

function ok(res, data) { res.json({ data }); }
function err(res, e, status = 500) {
  console.error(e);
  res.status(status).json({ error: e.message });
}

// GET /api/v1/matches/live
espnRouter.get('/matches/live', async (req, res) => {
  try {
    const data = await withCache('live', TTL.live, () => ESPNProvider.getLiveMatches());
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/matches?sport=nba
espnRouter.get('/matches', async (req, res) => {
  const sport = req.query.sport;
  try {
    const data = await withCache(`matches:${sport ?? 'all'}`, TTL.matches,
      () => ESPNProvider.getMatches(sport));
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/matches/:sport/:eventId
espnRouter.get('/matches/:sport/:eventId', async (req, res) => {
  const { sport, eventId } = req.params;
  try {
    const data = await withCache(`match:${sport}:${eventId}`, TTL.live,
      () => ESPNProvider.getMatchDetails(sport, eventId));
    if (!data) return res.status(404).json({ error: 'Match not found' });
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/teams/:sport/:teamId
espnRouter.get('/teams/:sport/:teamId', async (req, res) => {
  const { sport, teamId } = req.params;
  try {
    const data = await withCache(`team:${sport}:${teamId}`, TTL.standings,
      () => ESPNProvider.getTeam(sport, teamId));
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/teams/:sport/:teamId/roster
espnRouter.get('/teams/:sport/:teamId/roster', async (req, res) => {
  const { sport, teamId } = req.params;
  try {
    const data = await withCache(`roster:${sport}:${teamId}`, TTL.standings,
      () => ESPNProvider.getTeamRoster(sport, teamId));
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/teams/:sport/:teamId/schedule
espnRouter.get('/teams/:sport/:teamId/schedule', async (req, res) => {
  const { sport, teamId } = req.params;
  try {
    const data = await withCache(`schedule:${sport}:${teamId}`, TTL.matches,
      () => ESPNProvider.getTeamSchedule(sport, teamId));
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/news?sport=nba
espnRouter.get('/news', async (req, res) => {
  const sport = req.query.sport;
  try {
    const data = await withCache(`news:${sport ?? 'all'}`, TTL.news,
      () => ESPNProvider.getNews(sport));
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/standings?sport=nba
espnRouter.get('/standings', async (req, res) => {
  const sport = req.query.sport;
  try {
    const data = await withCache(`standings:${sport ?? 'all'}`, TTL.standings,
      () => ESPNProvider.getStandings(sport));
    ok(res, data);
  } catch (e) { err(res, e); }
});

// GET /api/v1/search?q=...
espnRouter.get('/search', async (req, res) => {
  const q = req.query.q?.trim();
  if (!q) return res.status(400).json({ error: 'q is required' });
  try {
    const data = await ESPNProvider.search(q);
    ok(res, data);
  } catch (e) { err(res, e); }
});