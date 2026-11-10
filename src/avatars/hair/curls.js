// Big curly hair — fills a wide block plus ear tabs.
export default {
  name: 'curls',
  label: 'curls',
  shape: (H) =>
    `<rect x="4" y="1" width="12" height="7" fill="${H}"/>` +
    `<rect x="3" y="4" width="2" height="4" fill="${H}"/>` +
    `<rect x="15" y="4" width="2" height="4" fill="${H}"/>`,
};
