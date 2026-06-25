// ESPN Provider — no API key required
// Normalizes all ESPN responses into common Match/Team/News/Standing shapes

const BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const BASE_V2 = 'https://site.api.espn.com/apis/v2/sports';

const SPORTS = {
  nba:  { path: 'basketball/nba',   label: 'NBA' },
  nfl:  { path: 'football/nfl',     label: 'NFL' },
  mlb:  { path: 'baseball/mlb',     label: 'MLB' },
  nhl:  { path: 'hockey/nhl',       label: 'NHL' },
  epl:  { path: 'soccer/eng.1',     label: 'EPL' },
};

export const SPORT_KEYS = Object.keys(SPORTS);

async function espnFetch(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`ESPN ${res.status}: ${url}`);
  return res.json();
}

// ── Normalizers ──────────────────────────────────────────────────────────────

function normalizeEvent(event, sport) {
  const comp = event.competitions?.[0];
  const home = comp?.competitors?.find(c => c.homeAway === 'home');
  const away = comp?.competitors?.find(c => c.homeAway === 'away');
  const status = event.status?.type;

  return {
    id:          event.id,
    sport,
    name:        event.name,
    shortName:   event.shortName,
    date:        event.date,
    status:      status?.name ?? 'scheduled',          // 'STATUS_IN_PROGRESS' etc
    statusShort: status?.shortDetail ?? '',
    clock:       event.status?.displayClock ?? '',
    period:      event.status?.period ?? 0,
    isLive:      status?.state === 'in',
    isFinished:  status?.state === 'post',
    venue:       comp?.venue?.fullName ?? null,
    home: home ? {
      id:     home.team?.id,
      name:   home.team?.displayName,
      abbr:   home.team?.abbreviation,
      logo:   home.team?.logo,
      score:  parseInt(home.score ?? 0),
      winner: home.winner ?? false,
      record: home.records?.[0]?.summary ?? null,
    } : null,
    away: away ? {
      id:     away.team?.id,
      name:   away.team?.displayName,
      abbr:   away.team?.abbreviation,
      logo:   away.team?.logo,
      score:  parseInt(away.score ?? 0),
      winner: away.winner ?? false,
      record: away.records?.[0]?.summary ?? null,
    } : null,
    broadcasts: comp?.broadcasts?.map(b => b.names?.[0]).filter(Boolean) ?? [],
    odds:       comp?.odds?.[0]?.details ?? null,
  };
}

function normalizeNewsItem(article) {
  return {
    id:          article.dataSourceIdentifier ?? article.id,
    headline:    article.headline,
    description: article.description,
    published:   article.published,
    sport:       article.categories?.find(c => c.type === 'sport')?.description ?? null,
    image:       article.images?.[0]?.url ?? null,
    url:         article.links?.web?.href ?? null,
    author:      article.byline ?? null,
  };
}

function normalizeStanding(entry, sport) {
  const team = entry.team;
  const stats = {};
  entry.stats?.forEach(s => { stats[s.name] = s.value; });
  return {
    sport,
    teamId:    team?.id,
    teamName:  team?.displayName,
    abbr:      team?.abbreviation,
    logo:      team?.logos?.[0]?.href ?? null,
    wins:      stats.wins ?? stats.wins ?? 0,
    losses:    stats.losses ?? 0,
    pct:       stats.winPercent ?? stats.pointsPercentage ?? 0,
    gamesBack: stats.gamesBehind ?? null,
    streak:    stats.streak ?? null,
    raw:       stats,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export const ESPNProvider = {

  async getLiveMatches() {
    const results = await Promise.allSettled(
      SPORT_KEYS.map(async sport => {
        const { path } = SPORTS[sport];
        const data = await espnFetch(`${BASE}/${path}/scoreboard`);
        return (data.events ?? [])
          .filter(e => e.status?.type?.state === 'in')
          .map(e => normalizeEvent(e, sport));
      })
    );
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  },

  async getMatches(sport) {
    const key = sport?.toLowerCase();
    const sports = key && SPORTS[key] ? [key] : SPORT_KEYS;

    const results = await Promise.allSettled(
      sports.map(async s => {
        const data = await espnFetch(`${BASE}/${SPORTS[s].path}/scoreboard`);
        return (data.events ?? []).map(e => normalizeEvent(e, s));
      })
    );
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  },

  async getMatchDetails(sport, eventId) {
    const key = sport?.toLowerCase();
    if (!SPORTS[key]) throw new Error(`Unknown sport: ${sport}`);
    const data = await espnFetch(`${BASE}/${SPORTS[key].path}/summary?event=${eventId}`);
    const event = data.header?.competitions?.[0];
    if (!event) return null;

    return {
      ...normalizeEvent({ ...data.header, competitions: [event], status: event.status }, key),
      boxscore:   data.boxscore ?? null,
      leaders:    data.leaders ?? null,
      standings:  data.standings ?? null,
    };
  },

  async getNews(sport) {
    const key = sport?.toLowerCase();
    const sports = key && SPORTS[key] ? [key] : SPORT_KEYS;

    const results = await Promise.allSettled(
      sports.map(async s => {
        const data = await espnFetch(`${BASE}/${SPORTS[s].path}/news`);
        return (data.articles ?? []).map(a => ({ ...normalizeNewsItem(a), sport: s }));
      })
    );
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  },

  async getStandings(sport) {
    const key = sport?.toLowerCase();
    const sports = key && SPORTS[key] ? [key] : SPORT_KEYS;

    const results = await Promise.allSettled(
      sports.map(async s => {
        // v2 base returns full standings; site/v2 returns stub with only fullViewLink
        const data = await espnFetch(`${BASE_V2}/${SPORTS[s].path}/standings`);

        // ESPN returns standings in different shapes per sport — handle all of them
        let entries = [];

        if (data.standings?.entries?.length) {
          // flat shape
          entries = data.standings.entries;
        } else if (data.children?.length) {
          // grouped by conference/division — flatten all
          entries = data.children.flatMap(c =>
            c.standings?.entries ??
            c.children?.flatMap(cc => cc.standings?.entries ?? []) ??
            []
          );
        } else if (data.entries?.length) {
          entries = data.entries;
        }

        return entries.map(e => normalizeStanding(e, s));
      })
    );
    return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
  },

  async getTeam(sport, teamId) {
    const key = sport?.toLowerCase();
    if (!SPORTS[key]) throw new Error(`Unknown sport: ${sport}`);
    const data = await espnFetch(`${BASE}/${SPORTS[key].path}/teams/${teamId}`);
    const t = data.team;
    return {
      id:       t.id,
      sport:    key,
      name:     t.displayName,
      abbr:     t.abbreviation,
      location: t.location,
      color:    t.color,
      logo:     t.logos?.[0]?.href ?? null,
      record:   t.record?.items?.[0]?.summary ?? null,
    };
  },

  async getTeamRoster(sport, teamId) {
    const key = sport?.toLowerCase();
    if (!SPORTS[key]) throw new Error(`Unknown sport: ${sport}`);
    const data = await espnFetch(`${BASE}/${SPORTS[key].path}/teams/${teamId}/roster`);
    return (data.athletes ?? []).flatMap(group =>
      (group.items ?? []).map(p => ({
        id:       p.id,
        name:     p.fullName,
        position: p.position?.abbreviation,
        jersey:   p.jersey,
        headshot: p.headshot?.href ?? null,
      }))
    );
  },

  async getTeamSchedule(sport, teamId) {
    const key = sport?.toLowerCase();
    if (!SPORTS[key]) throw new Error(`Unknown sport: ${sport}`);
    const data = await espnFetch(`${BASE}/${SPORTS[key].path}/teams/${teamId}/schedule`);
    return (data.events ?? []).map(e => normalizeEvent(e, key));
  },

  async search(query) {
    if (!query?.trim()) return [];
    const data = await espnFetch(
      `https://site.api.espn.com/apis/common/v3/search?query=${encodeURIComponent(query)}&limit=20`
    );
    return data.results ?? [];
  },
};