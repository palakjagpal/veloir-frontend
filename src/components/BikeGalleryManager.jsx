import {
  useEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  FiCamera,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
  FiTrash2,
  FiX,
} from "react-icons/fi";

import toast from "react-hot-toast";

import { getImageUrl } from "../lib/api";

import {
  getBikeGallery,
  addGalleryImages,
  setFeaturedImage,
  deleteGalleryImage,
  reorderGalleryImages,
  clearGallery,
} from "../services/galleryService";


function ModalPortal({ children }) {
  if (
    typeof document === "undefined"
  ) {
    return null;
  }

  return createPortal(
    children,
    document.body
  );
}

/*
Constants
*/

const MAX_FILE_SIZE =
  2 * 1024 * 1024; // 2MB

const MAX_ADD_IMAGES = 5;


const fileToDataUrl = (
  file
) =>
  new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader();

      reader.onload = () =>
        resolve(reader.result);

      reader.onerror = () =>
        reject(
          new Error(
            "Failed to read image."
          )
        );

      reader.readAsDataURL(file);
    }
  );

/*
 Main Component
*/

export default function BikeGalleryManager({
  bikeId,
  onChanged,
}) {
  const fileInputRef =
    useRef(null);

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [actionBusy, setActionBusy] =
    useState(false);

  const [images, setImages] =
    useState([]);

  const [
    featuredImage,
    setFeaturedImageUrl,
  ] = useState(null);

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState(null);

  const [
    confirmClear,
    setConfirmClear,
  ] = useState(false);

  /*
Prevent body scrolling while modal is open
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, [open]);

  /*
  |--------------------------------------------------------------------------
  | Load Gallery
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    loadGallery();
  }, [open, bikeId]);

  const loadGallery =
    async () => {
      setLoading(true);

      try {
        const response =
          await getBikeGallery(
            bikeId
          );

        const data =
          response.data || {};

        setImages(
          data.images || []
        );

        setFeaturedImageUrl(
          data.featuredImage || null
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to load bike gallery."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Synchronize Gallery State
  |--------------------------------------------------------------------------
  */

  const syncGallery = (
    data = {}
  ) => {
    const nextImages =
      data.images ||
      data.remainingImages ||
      [];

    const nextFeatured =
      data.featuredImage ??
      null;

    setImages(nextImages);

    setFeaturedImageUrl(
      nextFeatured
    );

    onChanged?.({
      images: nextImages,
      featuredImage:
        nextFeatured,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Open / Close
  |--------------------------------------------------------------------------
  */

  const openGallery = (
    event
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setOpen(true);
  };

  const closeGallery = () => {
    if (actionBusy) {
      return;
    }

    setOpen(false);

    setConfirmDelete(
      null
    );

    setConfirmClear(false);
  };

  /*
  |--------------------------------------------------------------------------
  | Add Images
  |--------------------------------------------------------------------------
  */

  const handleSelectFiles =
    async (event) => {
      const files = Array.from(
        event.target.files || []
      );

      // Reset input so same file can be selected again
      event.target.value = "";

      if (!files.length) {
        return;
      }

      if (
        files.length >
        MAX_ADD_IMAGES
      ) {
        toast.error(
          `You can add up to ${MAX_ADD_IMAGES} images at once.`
        );

        return;
      }

      const validFiles = [];

      for (const file of files) {
        if (
          !file.type.startsWith(
            "image/"
          )
        ) {
          toast.error(
            `${file.name} is not a valid image.`
          );

          continue;
        }

        if (
          file.size >
          MAX_FILE_SIZE
        ) {
          toast.error(
            `${file.name} is larger than 2MB.`
          );

          continue;
        }

        validFiles.push(file);
      }

      if (!validFiles.length) {
        return;
      }

      setActionBusy(true);

      try {
        const dataUrls =
          await Promise.all(
            validFiles.map(
              fileToDataUrl
            )
          );

        const response =
          await addGalleryImages(
            bikeId,
            dataUrls
          );

        syncGallery(
          response.data
        );

        toast.success(
          response.message ||
            "Images added successfully."
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to add images."
        );
      } finally {
        setActionBusy(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Set Featured Image
  |--------------------------------------------------------------------------
  */

  const handleSetFeatured =
    async (index) => {
      if (actionBusy) {
        return;
      }

      setActionBusy(true);

      try {
        const response =
          await setFeaturedImage(
            bikeId,
            index
          );

        syncGallery({
          images,
          ...response.data,
        });

        toast.success(
          response.message ||
            "Featured image updated."
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to update featured image."
        );
      } finally {
        setActionBusy(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete One Image
  |--------------------------------------------------------------------------
  */

  const handleDeleteImage =
    async () => {
      if (
        actionBusy ||
        confirmDelete === null
      ) {
        return;
      }

      setActionBusy(true);

      try {
        const response =
          await deleteGalleryImage(
            bikeId,
            confirmDelete
          );

        syncGallery(
          response.data
        );

        toast.success(
          response.message ||
            "Image deleted successfully."
        );

        setConfirmDelete(
          null
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to delete image."
        );
      } finally {
        setActionBusy(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Move Image
  |--------------------------------------------------------------------------
  */

  const moveImage =
    async (
      currentIndex,
      direction
    ) => {
      if (actionBusy) {
        return;
      }

      const newIndex =
        currentIndex +
        direction;

      if (
        newIndex < 0 ||
        newIndex >= images.length
      ) {
        return;
      }

      const order =
        images.map(
          (_, index) =>
            index
        );

      [
        order[currentIndex],
        order[newIndex],
      ] = [
        order[newIndex],
        order[currentIndex],
      ];

      setActionBusy(true);

      try {
        const response =
          await reorderGalleryImages(
            bikeId,
            order
          );

        syncGallery(
          response.data
        );

        toast.success(
          response.message ||
            "Gallery reordered."
        );
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to reorder gallery."
        );
      } finally {
        setActionBusy(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Clear Gallery
  |--------------------------------------------------------------------------
  */

  const handleClearGallery =
    async () => {
      if (
        !confirmClear ||
        actionBusy
      ) {
        return;
      }

      setActionBusy(true);

      try {
        const response =
          await clearGallery(
            bikeId
          );

        syncGallery(
          response.data
        );

        toast.success(
          response.message ||
            "All gallery images deleted."
        );

        setConfirmClear(false);
      } catch (error) {
        toast.error(
          error.message ||
            "Unable to clear gallery."
        );
      } finally {
        setActionBusy(false);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <>
      {/* ================================================================
          Manage Gallery Button
          ================================================================ */}

      <button
        type="button"
        onClick={openGallery}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700"
      >
        <FiCamera />

        Manage Photos
      </button>

      {/* ================================================================
          Gallery Modal
          ================================================================ */}

      <ModalPortal>
        {open && (
          <div
            className="fixed inset-0 z-[200000] overflow-y-auto overscroll-contain bg-black/60 p-3 sm:p-6"
            onClick={
              closeGallery
            }
          >
            <div
              className="relative mx-auto my-3 max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-4 shadow-2xl sm:my-6 sm:max-h-[calc(100dvh-3rem)] sm:p-7"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                    Listing gallery
                  </p>
                  <br></br>

                  <h2 className="mt-1 text-2xl font-bold text-[#092532]">
                    Manage Photos
                  </h2>
                  <br></br>

                  <p className="mt-1 text-sm leading-6 text-gray-900">
                    Add, reorder, feature,
                    or remove your bike
                    images.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeGallery
                  }
                  disabled={
                    actionBusy
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                  aria-label="Close gallery"
                >
                  <FiX size={20} />
                </button>
              </div>

              {/* Actions */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={
                    actionBusy
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#092532] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FiCamera />

                  {actionBusy
                    ? "Working..."
                    : "Add Images"}
                </button>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={
                    handleSelectFiles
                  }
                  className="hidden"
                />

                {images.length >
                  0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmClear(
                        true
                      )
                    }
                    disabled={
                      actionBusy
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <FiTrash2 />

                    Clear Gallery
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs leading-5 text-gray-800">
                Maximum 2MB per image.
                You can add up to{" "}
                {MAX_ADD_IMAGES} images
                at a time.
              </p>

              {/* ==========================================================
                  Loading
                  ========================================================== */}

              {loading ? (
                <div className="mt-8 rounded-2xl bg-gray-50 p-10 text-center text-sm text-gray-500">
                  Loading gallery...
                </div>
              ) : images.length ? (
                /* ========================================================
                   Gallery Grid
                   ======================================================== */

                <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {images.map(
                    (
                      image,
                      index
                    ) => {
                      const isFeatured =
                        image ===
                        featuredImage;

                      return (
                        <div
                          key={`${image}-${index}`}
                          className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50"
                        >
                          {/* Image */}
                          <div className="relative aspect-[4/3] bg-gray-100">
                            <img
                              src={getImageUrl(
                                image
                              )}
                              alt={`Bike photo ${
                                index + 1
                              }`}
                              className="h-full w-full object-cover"
                            />

                            {/* Featured Badge */}
                            {isFeatured && (
                              <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#092532] px-3 py-1.5 text-xs font-semibold text-white shadow">
                                <FiStar />

                                Featured
                              </span>
                            )}

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete(
                                  index
                                )
                              }
                              disabled={
                                actionBusy
                              }
                              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow transition hover:bg-red-50 disabled:opacity-50"
                              title="Delete image"
                              aria-label="Delete image"
                            >
                              <FiTrash2 />
                            </button>
                          </div>

                          {/* Controls */}
                          <div className="p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-gray-500">
                                Image{" "}
                                {index +
                                  1}
                              </span>

                              {isFeatured ? (
                                <span className="text-xs font-semibold text-emerald-600">
                                  Featured
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  #
                                  {index +
                                    1}
                                </span>
                              )}
                            </div>

                            {/* Move buttons */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  moveImage(
                                    index,
                                    -1
                                  )
                                }
                                disabled={
                                  actionBusy ||
                                  index ===
                                    0
                                }
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <FiChevronLeft />

                                Left
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveImage(
                                    index,
                                    1
                                  )
                                }
                                disabled={
                                  actionBusy ||
                                  index ===
                                    images.length -
                                      1
                                }
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-semibold text-gray-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Right

                                <FiChevronRight />
                              </button>
                            </div>

                            {/* Featured */}
                            {!isFeatured && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetFeatured(
                                    index
                                  )
                                }
                                disabled={
                                  actionBusy
                                }
                                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <FiStar />

                                Set as Featured
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              ) : (
                /* ========================================================
                   Empty State
                   ======================================================== */

                <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center sm:p-12">
                  <FiCamera
                    className="mx-auto text-gray-400"
                    size={32}
                  />

                  <h3 className="mt-3 text-lg font-semibold text-[#092532]">
                    No gallery images
                  </h3>

                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-gray-500">
                    Add some photos to
                    make this listing
                    more attractive.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalPortal>

      {/* ================================================================
          Delete One Image Confirmation
          ================================================================ */}

      <ModalPortal>
        {confirmDelete !==
          null && (
          <div
            className="fixed inset-0 z-[500000] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6"
            onClick={() => {
              if (
                !actionBusy
              ) {
                setConfirmDelete(
                  null
                );
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <FiTrash2
                  size={22}
                />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#092532]">
                Delete this image?
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                This photo will
                be permanently
                removed from
                the gallery.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmDelete(
                      null
                    )
                  }
                  disabled={
                    actionBusy
                  }
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleDeleteImage
                  }
                  disabled={
                    actionBusy
                  }
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {actionBusy
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* ================================================================
          Clear Gallery Confirmation
          ================================================================ */}

      <ModalPortal>
        {confirmClear && (
          <div
            className="fixed inset-0 z-[500000] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6"
            onClick={() => {
              if (
                !actionBusy
              ) {
                setConfirmClear(
                  false
                );
              }
            }}
          >
            <div
              className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"
              onClick={(
                event
              ) =>
                event.stopPropagation()
              }
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <FiTrash2
                  size={22}
                />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#092532]">
                Clear entire gallery?
              </h3>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                All photos will be
                permanently removed
                from this bike
                listing.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    setConfirmClear(
                      false
                    )
                  }
                  disabled={
                    actionBusy
                  }
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleClearGallery
                  }
                  disabled={
                    actionBusy
                  }
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {actionBusy
                    ? "Clearing..."
                    : "Clear All"}
                </button>
              </div>
            </div>
          </div>
        )}
      </ModalPortal>
    </>
  );
}