import '@testing-library/jest-dom';

// Polyfills for browser environment in jsdom
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  // Mock URL.createObjectURL and revokeObjectURL
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => 'blob:mock-url-' + Math.random().toString(36).substring(7);
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
}
