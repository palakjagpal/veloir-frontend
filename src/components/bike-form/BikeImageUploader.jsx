import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiUploadCloud, FiX, FiStar, FiImage } from "react-icons/fi";
import { MAX_IMAGES, MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from "../../lib/bikeFormConstants";

let idCounter = 0;
const nextId = () => `img-${Date.now()}-${idCounter++}`;

export default function BikeImageUploader({ images, onChange, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const validateAndAdd = useCallback(
    (fileList) => {
      const incoming = Array.from(fileList || []);
      if (incoming.length === 0) return;

      const accepted = [];
      const remainingSlots = MAX_IMAGES - images.length;

      for (const file of incoming) {
        if (accepted.length >= remainingSlots) {
          toast.error(`You can upload a maximum of ${MAX_IMAGES} images.`);
          break;
        }
        if (file.type !== "image/png") {
          toast.error(`"${file.name}" was skipped — only .png images are allowed.`);
          continue;
        }
        if (file.size > MAX_IMAGE_SIZE_BYTES) {
          toast.error(`"${file.name}" was skipped — must be under ${MAX_IMAGE_SIZE_MB}MB.`);
          continue;
        }
        accepted.push({
          id: nextId(),
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (accepted.length > 0) {
        onChange([...images, ...accepted]);
      }
    },
    [images, onChange]
  );

  const handleInputChange = (event) => {
    validateAndAdd(event.target.files);
    // reset so selecting the same file again re-triggers onChange
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    validateAndAdd(event.dataTransfer.files);
  };

  const handleRemove = (id) => {
    const target = images.find((img) => img.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(images.filter((img) => img.id !== id));
  };

  const canAddMore = images.length < MAX_IMAGES && !disabled;

  return (
    <div>
      {canAddMore && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-emerald-500 bg-emerald-50"
              : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50"
          }`}
        >
          <FiUploadCloud className="text-3xl text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Drag &amp; drop images here, or click to browse
          </p>
          <p className="text-xs text-gray-500">
            PNG only · up to {MAX_IMAGE_SIZE_MB}MB each · max {MAX_IMAGES} images
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png"
            multiple
            className="hidden"
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>
      )}

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100"
            >
              <img
                src={img.previewUrl}
                alt={`Bike preview ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                  <FiStar className="text-[10px]" /> Featured Image
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(img.id)}
                disabled={disabled}
                aria-label="Remove image"
                className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <FiX className="text-xs" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <FiImage /> At least one PNG image is required.
        </p>
      )}
    </div>
  );
}
