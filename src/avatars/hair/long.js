// Long hair — reaches past the shoulders down the sides.
export default {
  name: 'long',
  label: 'long',
  shape: (H) =>
    `<rect x="5" y="2" width="10" height="4" fill="${H}"/>` +
    `<rect x="4" y="4" width="12" height="3" fill="${H}"/>` +
    `<rect x="3" y="5" width="2" height="8" fill="${H}"/>` +
    `<rect x="15" y="5" width="2" height="8" fill="${H}"/>`,
};
