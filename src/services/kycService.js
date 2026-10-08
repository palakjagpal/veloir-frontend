import { api } from "../lib/api";

/**
 * Get the current user's KYC capability summary.
 * Uses the existing Veloir api() helper, so the existing JWT handling stays unchanged.
 */
export const getKycStatus = () => api("/api/kyc/status");

/** Get the documents currently stored for the signed-in user. */
export const getKycDocuments = () => api("/api/kyc/documents");

/**
 * Start the DigiLocker flow.
 * In backend mock mode the returned authorizationUrl points to the backend mock callback.
 */
export const startDigiLockerVerification = ({
  flow = "buyer_transaction",
  vehicleRegistrationNumber = "",
} = {}) =>
  api("/api/kyc/digilocker/start", {
    method: "POST",
    body: JSON.stringify({
      flow,
      ...(vehicleRegistrationNumber
        ? { vehicleRegistrationNumber: vehicleRegistrationNumber.trim() }
        : {}),
    }),
  });

/**
 * Development/demo-only shortcut.
 * Backend must have DIGILOCKER_MODE=mock.
 */
export const verifyMockKyc = ({
  flow = "buyer_transaction",
  vehicleRegistrationNumber = "",
} = {}) =>
  api("/api/kyc/mock/verify", {
    method: "POST",
    body: JSON.stringify({
      flow,
      ...(vehicleRegistrationNumber
        ? { vehicleRegistrationNumber: vehicleRegistrationNumber.trim() }
        : {}),
    }),
  });

export const getKycSession = (sessionId) =>
  api(`/api/kyc/sessions/${sessionId}`);
