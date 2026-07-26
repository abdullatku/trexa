const localApiBaseUrl = 'http://localhost:5264/api';
const deployedApiBaseUrl = 'https://trexaapi.xoft.in/api';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const defaultApiBaseUrl = import.meta.env.DEV ? localApiBaseUrl : deployedApiBaseUrl;

const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const configuredIsLocal = configuredApiBaseUrl ? /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?\//i.test(configuredApiBaseUrl) : false;

const rawBaseUrl = configuredIsLocal && isBrowser && !isLocalHost
  ? deployedApiBaseUrl
  : configuredApiBaseUrl || defaultApiBaseUrl;

export const apiBaseUrl = rawBaseUrl.replace(/\/$/, '');

export const apiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};
