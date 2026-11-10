// Stuff classmates have dropped in the suggestions box. Fields:
//   id:       unique integer (just increment)
//   hot:      true = show with raised background
//   status:   'raised' | 'new' | 'done' | 'no'
//   tag/tagColor: short label and CSS var
//   time:     human-readable "2 days ago · 4 comments"
//   votes:    initial net score (upvotes - downvotes)
//   voted:    whether Noa (the default user) voted on it
//   h:        headline (one line)
//   body, note, noBody: optional subtext

export const SUGGESTIONS = [
  { id: 1, hot: true, status: 'raised', tag: 'campus', tagColor: 'var(--butter)', time: '3 days ago · 12 comments', votes: 42, voted: true,
    h: 'A microwave in the Hub. Please. Just one.',
    body: "We eat cold tupperware at 2pm and pretend it's fine. It is not fine. — anonymous",
    note: 'pedagogy says: "we\'ll find budget by Dec." (posted Mon)' },

  { id: 2, hot: true, status: 'new', tag: 'events', tagColor: 'var(--lilac)', time: 'arjun · yesterday · 8 comments', votes: 31, voted: false,
    h: "Monthly Paris food crawl — rotate neighbourhoods, whoever's from there picks the spots.",
    body: 'Belleville dumplings, then Little Tokyo in Opéra, then couscous in Belleville again because obviously.' },

  { id: 3, hot: false, status: 'done', tag: 'events', tagColor: 'var(--mint)', time: 'lena · 2 weeks ago', votes: 28, voted: true,
    h: 'Weekly movie night, voted on a shared list.',
    body: null, note: '→ running since Oct 18. Next: In Bruges, Fri 20:30.', mutedH: true },

  { id: 4, hot: false, status: 'new', tag: 'events', tagColor: 'var(--lilac)', time: 'anonymous · 2 days ago · 4 comments', votes: 19, voted: false,
    h: 'Language exchange night — everyone teaches 5 phrases from their language.',
    body: 'We have 11 languages in this class, we should probably use that.' },

  { id: 5, hot: false, status: 'no', tag: 'pedagogy', tagColor: 'var(--muted)', time: '3 weeks ago', votes: 11, voted: false,
    h: 'Move Friday defenses to Wednesdays so the weekend starts earlier.',
    body: null,
    noBody: 'pedagogy said no: jury availability is locked for the year.' },
];
