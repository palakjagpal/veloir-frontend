import { FiCheckCircle, FiShield } from "react-icons/fi";

/**
 * Format the existing plain-text rental terms into readable entries.
 * The saved value stays plain text; no schema or API changes are required.
 */
export function formatRentalTerms(terms) {
  const raw = String(terms ?? "").trim();
  if (!raw) return [];

  let lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Older listings may contain several terms in a single line.
  if (lines.length === 1) {
    const line = lines[0];

    if (/[;•|]/.test(line)) {
      lines = line.split(/\s*(?:;|•|\|)\s*/).filter(Boolean);
    } else if (line.includes(",")) {
      const parts = line
        .split(/,\s*/)
        .map((part) => part.trim())
        .filter(Boolean);

      // Do not split long prose into awkward fragments.
      if (
        parts.length >= 2 &&
        parts.length <= 8 &&
        parts.every((part) => part.length <= 140)
      ) {
        lines = parts;
      }
    }
  }

  return lines
    .map((line, index) => {
      const clean = line.replace(/^(?:[-*•]\s+|\d+[.)]\s+)/, "").trim();
      if (!clean) return null;

      // A standalone heading such as "Payment:" starts a new section.
      if (/^[^:]{2,60}:$/.test(clean) && !clean.includes("://")) {
        return {
          id: `${index}-${clean}`,
          kind: "heading",
          text: clean.slice(0, -1).trim(),
        };
      }

      // Label-value lines like "Fuel: Not included" get typographic hierarchy.
      const labelled = clean.match(/^([^:]{2,45}):\s*(.+)$/);
      if (labelled && !clean.includes("://")) {
        return {
          id: `${index}-${clean}`,
          kind: "labelled",
          label: labelled[1].trim(),
          text: labelled[2].trim(),
        };
      }

      return {
        id: `${index}-${clean}`,
        kind: "item",
        text: clean,
      };
    })
    .filter(Boolean);
}

export default function RentalTerms({ terms }) {
  const entries = formatRentalTerms(terms);
  if (!entries.length) return null;

  return (
    <section
      className="mt-5 rounded-2xl border border-[#dce8df] bg-[#f7faf6] p-4 text-[#254a47] sm:p-5"
      aria-labelledby="rental-terms-title"
    >
      <div className="flex items-start gap-3 border-b border-[#e1eae2] pb-4">

        <div className="min-w-0 flex-1">
          <h3
            id="rental-terms-title"
            className="m-0 text-base font-extrabold leading-snug text-[#092532]"
          >
            Rental Terms &amp; Conditions
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#667b76]">
            Please review these conditions before requesting a rental.
          </p>
        </div>
      </div>

      <div className="grid gap-3 pt-4">
        {entries.map((entry) => {
          if (entry.kind === "heading") {
            return (
              <h4
                key={entry.id}
                className="mb-0 mt-1 text-sm font-extrabold tracking-wide text-[#092532]"
              >
                {entry.text}
              </h4>
            );
          }

          return (
            <div key={entry.id} className="flex min-w-0 items-start gap-2.5">
              <span
                className="mt-0.5 inline-flex shrink-0 text-base text-[#398575]"
                aria-hidden="true"
              >
                <FiCheckCircle />
              </span>

              <p className="m-0 min-w-0 whitespace-pre-wrap break-words text-[13px] leading-7 text-[#365a54]">
                {entry.kind === "labelled" && (
                  <strong className="font-extrabold text-[#092532]">
                    {entry.label}: {" "}
                  </strong>
                )}
                {entry.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
