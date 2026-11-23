export default {
  testEnvironment: 'node',
  // Le backend est en ESM natif (« type: module ») : pas de transform Babel,
  // tests exécutés avec --experimental-vm-modules (voir script npm « test »).
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 20000,
};
