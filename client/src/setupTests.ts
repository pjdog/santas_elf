// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Silence noisy framework warnings and expected error-path logs to keep test output readable.
const originalWarn = console.warn;
const originalError = console.error;
const originalLog = console.log;

// jsdom does not implement scrollIntoView, so stub it to avoid crashing effects.
Element.prototype.scrollIntoView = jest.fn();

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
  console.log = originalLog;
});
