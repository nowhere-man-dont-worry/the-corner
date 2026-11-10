// Short buzz cut — just a thin band on the top of the head.
export default {
  name: 'buzz',
  label: 'buzz',
  shape: (H) =>
    `<rect x="5" y="3" width="10" height="4" fill="${H}"/>` +
    `<rect x="4" y="5" width="12" height="3" fill="${H}"/>`,
};
