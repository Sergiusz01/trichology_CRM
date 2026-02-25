/**
 * Builds a secure image URL path (without token in query string).
 * 
 * NOTE: This function now returns ONLY the path, NOT the full URL with token.
 * The SecureImage component handles authentication via Authorization header.
 * This function is kept for backward compatibility but should be used sparingly.
 * Prefer using the SecureImage component or fetching via `api.get()` with responseType: 'blob'.
 */
export const buildSecureImageUrl = (filenameOrPath?: string | null): string => {
    if (!filenameOrPath) return '';
    // Extract just the filename in case older DB records still hold the full path or URL
    const cleanName = filenameOrPath.split(/[/\\]/).pop();
    if (!cleanName) return '';

    const API_URL = import.meta.env.VITE_API_URL || '';
    // Prevent double slashes when joining the base URL
    const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return `${base}/api/uploads/secure/${cleanName}`;
};
