// Central API configuration
// In development: proxied via Vite → http://localhost:5000
// In production: same origin (backend serves frontend)
const API_BASE = import.meta.env.VITE_API_URL || '';

export default API_BASE;
