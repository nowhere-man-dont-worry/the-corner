// The MSCI 1 cohort. Add yourself with a PR — fields:
//   name:    lowercase handle shown everywhere
//   origin:  "🇨🇴 Bogotá → XI" (country flag, city → Paris arrondissement)
//   bio:     one-liner in quotes, under ~45 chars
//   tags:    short labels shown on your member card
//   hair/skin/top/bottom: hex colors for your pixel avatar
//   online, away: optional booleans for status dot
//   me: leave false unless you're Noa

export const MEMBERS = [
  { name: 'noa', origin: '🇮🇱 Tel Aviv → XIII', bio: 'baking bread, failing french', tags: ['YOU','COOKS','OPEN'], hair: '#3d2a1f', skin: '#f5c9a0', top: '#c589e8', bottom: '#241b2e', online: true, me: true },
  { name: 'lena', origin: '🇩🇪 Berlin → XX', bio: 'ask me about the Navigo. not kidding.', tags: ['GUIDE','OPEN'], hair: '#ffd166', skin: '#e8b899', top: '#7fd4a8', bottom: '#1e3a5f', online: true },
  { name: 'arjun', origin: '🇮🇳 Mumbai → XI', bio: 'writing fanfic about my linter', tags: ['DEFENSE','OPEN'], hair: '#1a1420', skin: '#d9a76a', top: '#ff6b4a', bottom: '#241b2e', online: true },
  { name: 'mika', origin: '🇧🇷 São Paulo → XVIII', bio: "guitar + capoeira. don't ask.", tags: ['MUSICIAN'], hair: '#5c3a28', skin: '#f5c9a0', top: '#4a90c7', bottom: '#1e3a5f', online: true },
  { name: 'sana', origin: '🇵🇰 Karachi → XV', bio: 'french is my fourth language and also my worst', tags: ['NEW','OPEN'], hair: '#1a1420', skin: '#d9a76a', top: '#ffd166', bottom: '#241b2e', online: true },
  { name: 'priya', origin: '🇮🇳 Bangalore → XIX', bio: "in the cinema. we're voting.", tags: ['COUNCIL','COOKS'], hair: '#a06e3e', skin: '#e8b899', top: '#c589e8', bottom: '#1e3a5f', online: false, away: true },
  { name: 'danilo', origin: '🇵🇹 Lisbon → X', bio: 'open mic tonight, bring beer', tags: ['MUSICIAN'], hair: '#2a1f38', skin: '#d9a76a', top: '#3d3050', bottom: '#241b2e', online: false, away: true },
  { name: 'yuki', origin: '🇯🇵 Tokyo → VI', bio: 'printer lives in my room. come use it.', tags: ['GUIDE','OPEN'], hair: '#3d2a1f', skin: '#d9a76a', top: '#7fd4a8', bottom: '#241b2e', online: true },
];
