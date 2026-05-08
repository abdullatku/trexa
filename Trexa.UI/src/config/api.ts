// const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://trexaapi.xoft.in/api';
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5264/api';

export const apiBaseUrl = rawBaseUrl.replace(/\/$/, '');

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};
