// Baseball cap — flat block + a thin brim across the top row.
export default {
  name: 'cap',
  label: 'cap',
  shape: (H) =>
    `<rect x="4" y="3" width="12" height="4" fill="${H}"/>` +
    `<rect x="3" y="5" width="14" height="2" fill="${H}"/>`,
};
