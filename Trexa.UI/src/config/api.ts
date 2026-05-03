const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'https://trexaapi-env.eba-hxu8rcti.ap-south-1.elasticbeanstalk.com/make-server-2eb59763';

export const apiBaseUrl = rawBaseUrl.replace(/\/$/, '');

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};
