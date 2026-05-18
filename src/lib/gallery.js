import { isSupabaseConfigured, supabase } from './supabase';

const BUCKET = 'gallery-assets';

export function slugifyName(value) {
  const slug = String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `item-${Date.now()}`;
}

export async function listGalleryCategories({ admin = false } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('gallery_categories')
    .select('id, slug, name, description, sort_order, is_active, created_at')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!admin) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function listGalleryImages({ admin = false, categoryId } = {}) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('gallery_images')
    .select(`
      id,
      category_id,
      title,
      description,
      image_url,
      image_path,
      imagekit_file_id,
      width,
      height,
      sort_order,
      is_active,
      created_at,
      gallery_categories ( id, slug, name )
    `)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!admin) query = query.eq('is_active', true);
  if (categoryId) query = query.eq('category_id', categoryId);

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    ...row,
    category: row.gallery_categories,
    gallery_categories: undefined,
  }));
}

export async function createGalleryCategory(input, userId) {
  const slug = await uniqueCategorySlug(slugifyName(input.slug || input.name));
  const payload = {
    slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    sort_order: Number(input.sort_order || 0),
    is_active: input.is_active ?? true,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('gallery_categories')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGalleryCategory(id, input) {
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    sort_order: Number(input.sort_order || 0),
    is_active: input.is_active,
  };

  const { data, error } = await supabase
    .from('gallery_categories')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGalleryCategory(id) {
  const { error } = await supabase
    .from('gallery_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function uploadGalleryImage(file, { folder = 'gallery' } = {}) {
  if (!file) throw new Error('Please choose an image file.');

  const path = `${folder}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path, fileId: null, width: null, height: null };
}

function safeFileName(name) {
  return String(name || `upload-${Date.now()}`)
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || `upload-${Date.now()}`;
}

export async function createGalleryImage(input, userId) {
  const payload = {
    category_id: input.category_id || null,
    title: input.title.trim(),
    description: input.description?.trim() || null,
    image_url: input.image_url,
    image_path: input.image_path || null,
    imagekit_file_id: input.imagekit_file_id || null,
    width: input.width || null,
    height: input.height || null,
    sort_order: Number(input.sort_order || 0),
    is_active: input.is_active ?? true,
    created_by: userId,
  };

  const { data, error } = await supabase
    .from('gallery_images')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGalleryImage(id, input) {
  const payload = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    category_id: input.category_id || null,
    sort_order: Number(input.sort_order || 0),
    is_active: input.is_active,
  };

  if (input.image_url !== undefined) payload.image_url = input.image_url;
  if (input.image_path !== undefined) payload.image_path = input.image_path;
  if (input.imagekit_file_id !== undefined) payload.imagekit_file_id = input.imagekit_file_id;
  if (input.width !== undefined) payload.width = input.width;
  if (input.height !== undefined) payload.height = input.height;

  const { data, error } = await supabase
    .from('gallery_images')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGalleryImage(id) {
  const { error } = await supabase
    .from('gallery_images')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

async function uniqueCategorySlug(baseSlug) {
  const { data, error } = await supabase
    .from('gallery_categories')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);

  if (error) throw error;

  const existing = new Set((data || []).map((row) => row.slug));
  if (!existing.has(baseSlug)) return baseSlug;

  let counter = 2;
  while (existing.has(`${baseSlug}-${counter}`)) counter += 1;
  return `${baseSlug}-${counter}`;
}
