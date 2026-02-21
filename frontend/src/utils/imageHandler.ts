export const buildSecureImageUrl = (filenameOrPath?: string | null): string => {
    if (!filenameOrPath) return '';
    // Extract just the filename in case older DB records still hold the full path or URL
    const cleanName = filenameOrPath.split(/[/\\]/).pop();
    if (!cleanName) return '';

    const API_URL = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('accessToken') || '';

    // Prevent double slashes when joining the base URL
    const base = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return `${base}/api/uploads/secure/${cleanName}?token=${token}`;
};
