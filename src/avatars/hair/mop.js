// Shaggy mop — fills the top and droops to the ears.
export default {
  name: 'mop',
  label: 'mop',
  shape: (H) =>
    `<rect x="4" y="2" width="12" height="5" fill="${H}"/>` +
    `<rect x="3" y="4" width="14" height="3" fill="${H}"/>` +
    `<rect x="5" y="7" width="2" height="2" fill="${H}"/>` +
    `<rect x="13" y="7" width="2" height="2" fill="${H}"/>`,
};
