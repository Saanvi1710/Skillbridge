import '@testing-library/jest-dom';

// Global mocks if any
globalThis.matchMedia = globalThis.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};
