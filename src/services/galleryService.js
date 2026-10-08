import { api } from "../lib/api";

// Get all gallery images for a bike
export const getBikeGallery = (bikeId) =>
  api(`/api/bikes/${bikeId}/gallery`);

// Add images to gallery
export const addGalleryImages = (bikeId, images) =>
  api(`/api/bikes/${bikeId}/gallery`, {
    method: "POST",
    body: JSON.stringify({
      images,
    }),
  });

// Set a gallery image as featured
export const setFeaturedImage = (
  bikeId,
  imageIndex
) =>
  api(`/api/bikes/${bikeId}/gallery/featured`, {
    method: "PUT",
    body: JSON.stringify({
      imageIndex,
    }),
  });

// Delete one image
export const deleteGalleryImage = (
  bikeId,
  imageIndex
) =>
  api(
    `/api/bikes/${bikeId}/gallery/${imageIndex}`,
    {
      method: "DELETE",
    }
  );

// Reorder gallery images
export const reorderGalleryImages = (
  bikeId,
  imageOrder
) =>
  api(`/api/bikes/${bikeId}/gallery/reorder`, {
    method: "PUT",
    body: JSON.stringify({
      imageOrder,
    }),
  });

// Clear entire gallery
export const clearGallery = (bikeId) =>
  api(`/api/bikes/${bikeId}/gallery`, {
    method: "DELETE",
  });