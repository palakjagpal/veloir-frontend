import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/**
 * Admin-only replacements for window.alert / window.confirm and for the
 * global react-hot-toast toaster. Everything here is rendered inside the admin
 * shell (.adm-root) so the admin panel has no dependency on user-facing UI.
 */
const AdminUIContext = createContext(null);

const TOAST_MS = 4500;
let toastCounter = 0;

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function AdminUIProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const resolverRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  const closeDialog = useCallback((result) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    if (resolve) resolve(result);
    const previous = lastFocusedRef.current;
    if (previous && typeof previous.focus === "function") previous.focus();
  }, []);

  /** Promise-based confirm: `if (!(await confirm({...}))) return;` */
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      // A second request while one is open cancels the first.
      if (resolverRef.current) resolverRef.current(false);
      lastFocusedRef.current = document.activeElement;
      resolverRef.current = resolve;
      setDialog({
        title: options.title || "Please confirm",
        message: options.message || "",
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        tone: options.tone || "default", // "default" | "danger"
      });
    });
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (type, message, title) => {
      const id = ++toastCounter;
      setToasts((current) => [...current.slice(-3), { id, type, message, title }]);
      window.setTimeout(() => dismissToast(id), TOAST_MS);
      return id;
    },
    [dismissToast]
  );

  const toast = useMemo(
    () => ({
      success: (message, title) => notify("success", message, title),
      error: (message, title) => notify("error", message, title),
      info: (message, title) => notify("info", message, title),
    }),
    [notify]
  );

  // Dialog keyboard handling, focus and scroll lock.
  useEffect(() => {
    if (!dialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [dialog, closeDialog]);

  // Resolve a pending confirm as "cancelled" if the provider unmounts.
  useEffect(
    () => () => {
      if (resolverRef.current) resolverRef.current(false);
    },
    []
  );

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <AdminUIContext.Provider value={value}>
      {children}

      <div className="adm-toast-region" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => {
          const Icon = TOAST_ICONS[item.type] || Info;
          return (
            <div key={item.id} className={`adm-toast adm-toast-${item.type}`} role={item.type === "error" ? "alert" : "status"}>
              <Icon size={19} className="adm-toast-icon" />
              <div className="adm-toast-body">
                {item.title ? <strong>{item.title}</strong> : null}
                <span>{item.message}</span>
              </div>
              <button type="button" className="adm-toast-close" aria-label="Dismiss notification" onClick={() => dismissToast(item.id)}>
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>

      {dialog ? (
        <div className="adm-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(false); }}>
          <div className="adm-modal" role="alertdialog" aria-modal="true" aria-labelledby="adm-modal-title" aria-describedby="adm-modal-message">
            <div className={`adm-modal-icon ${dialog.tone === "danger" ? "is-danger" : ""}`}>
              {dialog.tone === "danger" ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
            </div>
            <h2 id="adm-modal-title" className="adm-modal-title">{dialog.title}</h2>
            <p id="adm-modal-message" className="adm-modal-message">{dialog.message}</p>
            <div className="adm-modal-actions">
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => closeDialog(false)}>
                {dialog.cancelLabel}
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                className={`adm-btn ${dialog.tone === "danger" ? "adm-btn-danger" : "adm-btn-primary"}`}
                onClick={() => closeDialog(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminUIContext.Provider>
  );
}

export function useAdminUI() {
  const context = useContext(AdminUIContext);
  if (!context) {
    throw new Error("useAdminUI must be used inside the admin layout.");
  }
  return context;
}
