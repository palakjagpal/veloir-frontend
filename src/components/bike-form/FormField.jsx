export function Field({ label, error, required, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error.message}</span>}
    </label>
  );
}

const baseInputClasses =
  "w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition-colors focus:ring-2 focus:ring-emerald-500/40 disabled:bg-gray-100 disabled:text-gray-400";

export function inputClasses(hasError) {
  return `${baseInputClasses} ${hasError ? "border-red-400 focus:border-red-500" : "border-gray-300 focus:border-emerald-500"}`;
}
