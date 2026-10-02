import { STATUS_LABELS } from "../../lib/inquiryUtils";
import "../../deals.css";

export default function InquiryStatusBadge({ status }) {
  return (
    <span className={`dl-badge ${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
