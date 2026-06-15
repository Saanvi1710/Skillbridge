import '@testing-library/jest-dom';

// Global mocks if any
global.matchMedia = global.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};
