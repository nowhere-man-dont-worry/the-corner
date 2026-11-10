// Prefilled mock conversations per room, so the chat drawer looks lived-in
// when someone opens it for the first time.
//
// Each message: { name, avatar: {hair, hairColor, skin, top, bottom}, text, ts }
// Timestamps are relative to when the page loads so "5m ago" stays plausible.

export const SEED_CHATS = {
  plaza: [
    { name: 'lena', avatar: { hair: 'mop', hairColor: '#ffd166', skin: '#e8b899', top: '#7fd4a8', bottom: '#1e3a5f' }, text: 'anyone up for buttes-chaumont saturday? bringing sourdough', ts: Date.now() - 1000 * 60 * 58 },
    { name: 'arjun', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ff6b4a', bottom: '#241b2e' }, text: "in. bringing hummus (store-bought, don't @ me)", ts: Date.now() - 1000 * 60 * 52 },
    { name: 'yuki', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#d9a76a', top: '#7fd4a8', bottom: '#241b2e' }, text: 'onigiri from me 🍙', ts: Date.now() - 1000 * 60 * 47 },
    { name: 'sana', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ffd166', bottom: '#241b2e' }, text: 'what time does the open mic start again', ts: Date.now() - 1000 * 60 * 22 },
    { name: 'danilo', avatar: { hair: 'mop', hairColor: '#2a1f38', skin: '#d9a76a', top: '#3d3050', bottom: '#241b2e' }, text: 'now-ish. come over', ts: Date.now() - 1000 * 60 * 18 },
    { name: 'mika', avatar: { hair: 'mop', hairColor: '#5c3a28', skin: '#f5c9a0', top: '#4a90c7', bottom: '#1e3a5f' }, text: 'otw', ts: Date.now() - 1000 * 60 * 4 },
  ],
  council: [
    { name: 'priya', avatar: { hair: 'mop', hairColor: '#a06e3e', skin: '#e8b899', top: '#c589e8', bottom: '#1e3a5f' }, text: 'raised the métro strike motion — vote closes thu 20:00', ts: Date.now() - 1000 * 60 * 125 },
    { name: 'lena', avatar: { hair: 'mop', hairColor: '#ffd166', skin: '#e8b899', top: '#7fd4a8', bottom: '#1e3a5f' }, text: 'yes from me, that slot has been cursed all semester', ts: Date.now() - 1000 * 60 * 118 },
    { name: 'arjun', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ff6b4a', bottom: '#241b2e' }, text: "what about the thursday 2pm cohort though, won't it clash with them", ts: Date.now() - 1000 * 60 * 110 },
    { name: 'priya', avatar: { hair: 'mop', hairColor: '#a06e3e', skin: '#e8b899', top: '#c589e8', bottom: '#1e3a5f' }, text: 'wasi is checking with them separately', ts: Date.now() - 1000 * 60 * 103 },
    { name: 'wasi', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#d9a76a', top: '#c589e8', bottom: '#241b2e' }, text: 'confirmed — 2pm cohort is OK with the shift. just waiting on pedagogy for room A14 availability.', ts: Date.now() - 1000 * 60 * 48 },
    { name: 'yuki', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#d9a76a', top: '#7fd4a8', bottom: '#241b2e' }, text: 'thanks wasi 🙏', ts: Date.now() - 1000 * 60 * 42 },
  ],
  suggestions: [
    { name: 'anonymous', avatar: { hair: 'mop', hairColor: '#6b5f7a', skin: '#9a8ca8', top: '#3d3050', bottom: '#2a1f38' }, text: 'the kettle suggestion is lowkey dumb, we need a full microwave', ts: Date.now() - 1000 * 60 * 68 },
    { name: 'noa', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#f5c9a0', top: '#c589e8', bottom: '#241b2e' }, text: 'ok but why not both??', ts: Date.now() - 1000 * 60 * 61 },
    { name: 'lena', avatar: { hair: 'mop', hairColor: '#ffd166', skin: '#e8b899', top: '#7fd4a8', bottom: '#1e3a5f' }, text: 'the microwave is actually happening btw. pedagogy confirmed yesterday. budget line signed off.', ts: Date.now() - 1000 * 60 * 31 },
    { name: 'arjun', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ff6b4a', bottom: '#241b2e' }, text: 'LETS GOOOO', ts: Date.now() - 1000 * 60 * 29 },
  ],
  events: [
    { name: 'danilo', avatar: { hair: 'mop', hairColor: '#2a1f38', skin: '#d9a76a', top: '#3d3050', bottom: '#241b2e' }, text: "open mic tonight who's in", ts: Date.now() - 1000 * 60 * 26 },
    { name: 'mika', avatar: { hair: 'mop', hairColor: '#5c3a28', skin: '#f5c9a0', top: '#4a90c7', bottom: '#1e3a5f' }, text: 'me, bringing the guitar', ts: Date.now() - 1000 * 60 * 19 },
    { name: 'sana', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ffd166', bottom: '#241b2e' }, text: 'playing or just listening?', ts: Date.now() - 1000 * 60 * 16 },
    { name: 'mika', avatar: { hair: 'mop', hairColor: '#5c3a28', skin: '#f5c9a0', top: '#4a90c7', bottom: '#1e3a5f' }, text: 'depends on how many beers tbh', ts: Date.now() - 1000 * 60 * 14 },
  ],
  guide: [
    { name: 'arjun', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ff6b4a', bottom: '#241b2e' }, text: "adding la cave à michel. it's SO GOOD you have to trust me", ts: Date.now() - 1000 * 60 * 215 },
    { name: 'yuki', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#d9a76a', top: '#7fd4a8', bottom: '#241b2e' }, text: 'le palais du pho — my single greatest discovery in paris', ts: Date.now() - 1000 * 60 * 198 },
    { name: 'lena', avatar: { hair: 'mop', hairColor: '#ffd166', skin: '#e8b899', top: '#7fd4a8', bottom: '#1e3a5f' }, text: "can someone pls add a decent falafel spot. l'as is overrated.", ts: Date.now() - 1000 * 60 * 95 },
    { name: 'sana', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ffd166', bottom: '#241b2e' }, text: "the window next to l'as is actually better and has no queue", ts: Date.now() - 1000 * 60 * 88 },
  ],
  members: [
    { name: 'sana', avatar: { hair: 'mop', hairColor: '#1a1420', skin: '#d9a76a', top: '#ffd166', bottom: '#241b2e' }, text: 'who else just moved here last month? still finding my feet', ts: Date.now() - 1000 * 60 * 185 },
    { name: 'noa', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#f5c9a0', top: '#c589e8', bottom: '#241b2e' }, text: 'me! still looking for a decent coffee spot in the 13th', ts: Date.now() - 1000 * 60 * 178 },
    { name: 'mika', avatar: { hair: 'mop', hairColor: '#5c3a28', skin: '#f5c9a0', top: '#4a90c7', bottom: '#1e3a5f' }, text: 'coutume in XVIIIth is the one', ts: Date.now() - 1000 * 60 * 172 },
    { name: 'yuki', avatar: { hair: 'mop', hairColor: '#3d2a1f', skin: '#d9a76a', top: '#7fd4a8', bottom: '#241b2e' }, text: 'matcha meeting at my place sunday if anyone wants', ts: Date.now() - 1000 * 60 * 45 },
  ],
};
