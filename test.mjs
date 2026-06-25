const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/standings');
const d = await r.json();
console.log('top keys:', Object.keys(d));
console.log('children?', d.children?.length);
console.log('children[0] keys:', d.children ? Object.keys(d.children[0]) : 'none');
console.log('standings?', d.standings?.entries?.length);
console.log('children[0].standings entries:', d.children?.[0]?.standings?.entries?.length);
console.log('sample entry:', JSON.stringify(d.children?.[0]?.standings?.entries?.[0])?.slice(0, 300));