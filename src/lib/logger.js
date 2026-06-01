const isDev = import.meta.env.DEV;

export function logDevError(message, error) {
  if (!isDev) return;
  console.error(message, error);
}

export function logDevWarn(message, detail) {
  if (!isDev) return;
  console.warn(message, detail);
}
