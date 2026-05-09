const defaultApiBaseUrl = import.meta.env.DEV
  ? 'http://localhost:5264/api'
  : 'https://trexaapi.xoft.in/api';

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const rawBaseUrl = configuredApiBaseUrl || defaultApiBaseUrl;

export const apiBaseUrl = rawBaseUrl.replace(/\/$/, '');

export const apiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};
