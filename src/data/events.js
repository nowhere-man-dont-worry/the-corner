// This week's events — one object per day column.
// `color`: visual stripe (coral / mint / butter / lilac)
// Inside `events`, each entry can also override `color`.
// `rsvps`: names that match MEMBERS, or '+' for an anonymous seat.
// `live`, `featured`, `today`: optional booleans for special styling.

export const EVENTS = [
  { day: 'MON 9', color: 'lilac', events: [
    { when: '19:00', what: 'Defense rehearsal', where: 'Room A12', rsvps: ['noa','mika','yuki'] }
  ] },
  { day: 'TUE 10', color: 'mint', events: [
    { when: '14:00', what: 'Montreuil market run', where: 'meet @ métro', rsvps: ['lena','noa'] },
    { when: '21:00', what: 'Chess + bar · Le Baromètre', where: 'bring board if you have one', rsvps: ['arjun','sana','mika','danilo','yuki','lena','priya','noa'], color: 'butter' }
  ] },
  { day: 'WED 11 · TODAY', today: true, color: 'lilac', events: [
    { when: 'LIVE NOW', what: 'Open mic in the Garden', where: "danilo's playing. 3 listening.", live: true },
    { when: '22:30', what: 'Film club: Chungking Express', where: 'Grand Action' }
  ] },
  { day: 'THU 12', color: 'coral', events: [
    { when: '15:00', what: 'Council sit-in', where: 'A12 · pedagogy there' }
  ] },
  { day: 'FRI 13', color: 'coral', events: [
    { when: '20:30 · MOVIE NIGHT', what: 'In Bruges', where: 'cinema room · byob',
      rsvps: ['noa','lena','arjun','mika','sana','priya','danilo','yuki','+','+','+','+','+'], featured: true },
    { when: '23:30', what: 'Going out · Oberkampf', color: 'butter' }
  ] },
  { day: 'SAT 14', color: 'mint', events: [
    { when: '11:00', what: 'Admin brunch — do your dossier with us', where: 'yuki brings the printer', rsvps: ['noa','mika','arjun'] },
    { when: '15:00', what: 'Buttes-Chaumont picnic', where: 'bring one thing to share', color: 'lilac' }
  ] },
  { day: 'SUN 15', color: 'butter', events: [
    { when: '14:00', what: 'Mario Kart tournament', where: 'winner picks next movie', rsvps: ['lena','arjun','mika','+','+','+','+'] },
    { when: '22:00', what: 'Movie vote closes', color: 'mint' }
  ] },
];
