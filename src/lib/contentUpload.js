import { isSupabaseConfigured, supabase } from './supabase';

const IMAGEKIT_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
const CONTENT_BUCKET = 'content-assets';

export async function uploadContentFile(file, { folder = 'content', fallback = true } = {}) {
  if (!file) return emptyUpload();

  if (IMAGEKIT_ENDPOINT) {
    try {
      return await uploadToImageKit(file, folder);
    } catch (error) {
      console.warn('ImageKit upload failed, trying Supabase fallback:', error);
      if (!fallback) throw error;
    }
  }

  return uploadToSupabase(file, folder);
}

export function withDownloadDisposition(url) {
  if (!url) return '';
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}ik-attachment=true`;
}

async function uploadToImageKit(file, folder) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('imagekit-auth');
  if (error) throw error;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('fileName', safeFileName(file.name));
  formData.append('folder', normalizeFolder(folder));
  formData.append('useUniqueFileName', 'true');
  formData.append('publicKey', data.publicKey);
  formData.append('token', data.token);
  formData.append('expire', String(data.expire));
  formData.append('signature', data.signature);

  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result?.message || 'ImageKit upload failed.');
  }

  return {
    provider: 'imagekit',
    url: result.url,
    path: result.filePath || result.name || null,
    fileId: result.fileId || null,
    fileName: file.name,
    mimeType: file.type || null,
    fileSize: file.size || null,
  };
}

async function uploadToSupabase(file, folder) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const path = `${normalizeFolder(folder).replace(/^\//, '')}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(CONTENT_BUCKET)
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(CONTENT_BUCKET).getPublicUrl(path);
  return {
    provider: 'supabase',
    url: data.publicUrl,
    path,
    fileId: null,
    fileName: file.name,
    mimeType: file.type || null,
    fileSize: file.size || null,
  };
}

function emptyUpload() {
  return {
    provider: null,
    url: null,
    path: null,
    fileId: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
  };
}

function normalizeFolder(folder) {
  return `/${String(folder || 'content')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-')}`;
}

function safeFileName(name) {
  return String(name || `upload-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `upload-${Date.now()}`;
}
