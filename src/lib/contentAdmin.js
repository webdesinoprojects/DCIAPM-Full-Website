export function friendlyContentError(message = '', label = 'entry') {
  const normalized = message.toLowerCase();
  if (normalized.includes('row-level security')) return `You do not have permission to manage this ${label}.`;
  if (normalized.includes('duplicate') || normalized.includes('unique')) return `A ${label} with that slug already exists.`;
  if (normalized.includes('storage') || normalized.includes('bucket') || normalized.includes('upload')) return 'Upload failed. ImageKit was tried first, then Supabase fallback.';
  return `The ${label} could not be saved. Please check the form and try again.`;
}
