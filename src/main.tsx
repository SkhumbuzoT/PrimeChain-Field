import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure any previously cached Workbox Service Worker bundles are cleared so live updates and captured photos always render immediately
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      for (const reg of registrations) {
        reg.unregister();
      }
    })
    .catch(() => {});
  if ('caches' in window) {
    caches
      .keys()
      .then((keys) => {
        for (const key of keys) {
          caches.delete(key);
        }
      })
      .catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
