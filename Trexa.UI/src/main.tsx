import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { apiUrl } from './config/api';

const nativeFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  if (typeof input === 'string' && input.startsWith('/') && !input.startsWith('//')) {
    return nativeFetch(apiUrl(input), init);
  }

  if (input instanceof Request && input.url.startsWith('/') && !input.url.startsWith('//')) {
    return nativeFetch(new Request(apiUrl(input.url), input), init);
  }

  return nativeFetch(input, init);
};

createRoot(document.getElementById('root')!).render(<App />);
