// The Paris survival guide — a map of classmate-recommended spots.
//
// Categories: eat, shop, party, grocery, admin, study, free
// To add your own spot, drop an object into the matching category below.
//   x / y: map coordinates on a 580×530 grid (eyeball from the SVG)
//   top:   true = highlighted "top pick" marker
//   stars/star: review count + 1-5 rating (star fills)
//   quote: who recommended it and why

export const CAT_COLORS = {
  eat:    '#ff6b4a',
  shop:   '#ffd166',
  party:  '#c589e8',
  grocery:'#7fd4a8',
  admin:  '#4a90c7',
  study:  '#e8b899',
  free:   '#9a8ca8',
};

export const CAT_NAMES = {
  eat:    'Eat cheap',
  shop:   'Shop & flea',
  party:  'Party & drink',
  grocery:'Groceries',
  admin:  'Admin / banks',
  study:  'Study spots',
  free:   'Free & nice',
};

export const CAT_COUNTS = {
  eat: 34, shop: 18, party: 22, grocery: 9, admin: 7, study: 11, free: 14,
};

export const PLACES = {
  eat: [
    { name: 'La Cave à Michel', sub: 'wine bar · III · €11 small plates', stars: 9, star: 5,
      quote: 'arjun: "get there before 19:00 or you\'ll stand outside for an hour. the pâté en croûte is why we moved to france."',
      top: true, x: 310, y: 300 },
    { name: 'Chez Alain Miam Miam', sub: 'sandwiches · Marché des Enfants Rouges · €6', stars: 7, star: 4,
      quote: 'lena: "the comté one is life changing. closed mondays. cash only."',
      x: 205, y: 195 },
    { name: 'Le Palais du Pho', sub: 'vietnamese · XIII · €10 bowl', stars: 6, star: 5,
      quote: 'yuki: "portion sizes insane. cures hangovers. open late."',
      x: 380, y: 215 },
    { name: 'Café Oberkampf', sub: 'brunch · XI · €12 shakshuka', stars: 5, star: 4,
      quote: 'noa: "english menu. good for the admin brunch. small though."',
      x: 270, y: 400 },
    { name: 'Sunken Chip', sub: 'fish & chips · X · €11', stars: 4, star: 4,
      quote: 'danilo: "fried everything, including the vibes."',
      x: 430, y: 360 },
    { name: "L'As du Fallafel", sub: 'falafel · Marais · €9', stars: 4, star: 4,
      quote: 'sana: "worth the queue once. after that use the window next door."',
      x: 150, y: 320 },
  ],
  shop: [
    { name: 'Marché aux Puces', sub: 'flea · Saint-Ouen · Sat-Mon', stars: 6, star: 5,
      quote: 'mika: "get there by 10. Serpette alley for the good stuff."',
      x: 120, y: 150 },
  ],
  party: [
    { name: 'Rituel', sub: 'cocktails · XI · €11-14', stars: 5, star: 5,
      quote: 'arjun: "dark, loud, actually worth it."',
      x: 350, y: 430 },
  ],
  grocery: [
    { name: 'Franprix Oberkampf', sub: 'open late, 11pm weekdays', stars: 3, star: 3,
      quote: 'everyone: "when the fridge is empty at 22:00."',
      x: 300, y: 380 },
  ],
  admin: [
    { name: 'BRED Bastille', sub: 'student account in English', stars: 4, star: 4,
      quote: 'yuki: "ask for Camille. she speaks english."',
      x: 300, y: 300 },
  ],
  study: [
    { name: 'BPI Pompidou', sub: 'library · free · open late', stars: 7, star: 5,
      quote: 'noa: "bring headphones. worth the queue."',
      x: 290, y: 280 },
  ],
  free: [
    { name: 'Parc des Buttes-Chaumont', sub: 'XIX · picnic, cliffs, free', stars: 8, star: 5,
      quote: 'lena: "best view in paris. saturday picnic spot."',
      x: 380, y: 155 },
  ],
};
