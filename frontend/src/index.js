import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Comprehensive ResizeObserver error suppression
// This error is benign and comes from Radix UI components
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ResizeObserver loop') ||
     args[0].includes('ResizeObserver'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ResizeObserver loop') ||
     args[0].includes('ResizeObserver'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Suppress the error at the window level
window.addEventListener('error', (e) => {
  if (e.message && e.message.includes('ResizeObserver loop')) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return false;
  }
});

// Override ResizeObserver to catch and ignore the loop error
if (typeof window.ResizeObserver !== 'undefined') {
  const OriginalResizeObserver = window.ResizeObserver;
  
  window.ResizeObserver = class extends OriginalResizeObserver {
    constructor(callback) {
      super((entries, observer) => {
        requestAnimationFrame(() => {
          callback(entries, observer);
        });
      });
    }
  };
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
