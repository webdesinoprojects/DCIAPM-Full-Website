import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from '../components/SEO';
import { listGalleryCategories, listGalleryImages } from '../lib/gallery';

const Gallery = () => {
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGallery = useCallback(async () => {
    const [cats, imgs] = await Promise.all([
      listGalleryCategories(),
      listGalleryImages(),
    ]);
    setCategories(cats);
    setImages(imgs);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadGallery().catch((loadError) => {
      setError(loadError.message || 'Unable to load gallery.');
      setLoading(false);
    });
  }, [loadGallery]);

  const categoryTabs = useMemo(
    () => ['All', ...categories.map((category) => category.name)],
    [categories],
  );

  const filteredImages = useMemo(() => {
    if (selectedCategory === 'All') return images;
    return images.filter((image) => image.category?.name === selectedCategory);
  }, [images, selectedCategory]);

  const isLightboxOpen = lightboxIndex >= 0;

  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);
  const goPrev = useCallback(
    () => setLightboxIndex((prev) => (prev <= 0 ? filteredImages.length - 1 : prev - 1)),
    [filteredImages.length],
  );
  const goNext = useCallback(
    () => setLightboxIndex((prev) => (prev >= filteredImages.length - 1 ? 0 : prev + 1)),
    [filteredImages.length],
  );

  useEffect(() => {
    if (!isLightboxOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') goPrev();
      if (event.key === 'ArrowRight') goNext();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLightboxOpen, closeLightbox, goPrev, goNext]);

  return (
    <motion.main
      className="container mx-auto px-4 lg:px-6 py-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <SEO
        title="Gallery"
        description="Browse categorized photo albums and preview images in a lightbox."
        keywords="IAPM gallery, pathology photo albums, event gallery, DC-IAPM images"
      />

      <section className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl font-bold text-primary dark:text-white">Image Gallery</h1>
        <p className="mt-3 text-base md:text-lg text-text-muted-light dark:text-text-muted-dark max-w-3xl">
          Explore categorized albums from our chapter activities, office bearers and resources. Click any image for a lightbox preview.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-primary dark:text-white mb-4">Categorized Albums</h2>
        <div className="flex flex-wrap gap-3">
          {categoryTabs.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setLightboxIndex(-1);
                }}
                className={`px-4 py-2 rounded-full border transition-colors ${
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-background-dark text-primary dark:text-white border-border-light dark:border-border-dark hover:border-gold-DEFAULT'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </section>

      {loading && (
        <div className="rounded-xl border border-border-light p-10 text-center text-text-muted-light">
          Loading gallery...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-5 font-semibold text-red-700">{error}</div>
      )}

      {!loading && !error && (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredImages.map((image, index) => (
              <motion.button
                key={image.id}
                type="button"
                whileHover={{ y: -4 }}
                className="text-left rounded-xl overflow-hidden bg-white dark:bg-background-dark border border-border-light dark:border-border-dark shadow-sm"
                onClick={() => setLightboxIndex(index)}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={image.image_url} alt={image.title} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-primary dark:text-white truncate">{image.title}</p>
                  <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                    {image.category?.name || 'Uncategorised'}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>

          {filteredImages.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-border-light dark:border-border-dark p-10 text-center">
              <p className="text-text-muted-light dark:text-text-muted-dark">No images available in this category yet.</p>
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {isLightboxOpen && filteredImages[lightboxIndex] && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/90 p-4 md:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white"
              onClick={closeLightbox}
              aria-label="Close preview"
            >
              <span className="material-symbols-outlined text-4xl">close</span>
            </button>

            <button
              type="button"
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white"
              onClick={goPrev}
              aria-label="Previous image"
            >
              <span className="material-symbols-outlined text-4xl">chevron_left</span>
            </button>

            <button
              type="button"
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white"
              onClick={goNext}
              aria-label="Next image"
            >
              <span className="material-symbols-outlined text-4xl">chevron_right</span>
            </button>

            <div className="h-full flex flex-col items-center justify-center gap-4">
              <img
                src={filteredImages[lightboxIndex].image_url}
                alt={filteredImages[lightboxIndex].title}
                className="max-h-[75vh] max-w-[95vw] object-contain rounded-lg"
              />
              <div className="text-center text-white">
                <p className="font-semibold">{filteredImages[lightboxIndex].title}</p>
                <p className="text-sm text-gray-300">{filteredImages[lightboxIndex].category?.name || 'Uncategorised'}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
};

export default Gallery;
