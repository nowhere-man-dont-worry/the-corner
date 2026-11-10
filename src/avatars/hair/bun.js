// Top knot / bun — small bump on top plus the headband.
export default {
  name: 'bun',
  label: 'bun',
  shape: (H) =>
    `<rect x="7" y="1" width="6" height="3" fill="${H}"/>` +
    `<rect x="5" y="3" width="10" height="4" fill="${H}"/>`,
};
