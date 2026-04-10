/**
 * Axios Configuration
 * Centralized axios instance with interceptors
 */

import axios from 'axios';
import { requestInterceptor, requestErrorInterceptor } from '../interceptors/request';
import { responseInterceptor, responseErrorInterceptor } from '../interceptors/response';

// DFA-001 fix: No fallback — fail visibly if env var missing
if (!process.env.REACT_APP_API_BASE_URL) {
  console.error('[axios] CRITICAL: REACT_APP_API_BASE_URL is not set in .env. API calls will fail.');
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json; charset=UTF-8',
    'Accept': 'application/json',
  },
});

// Add request interceptor
apiClient.interceptors.request.use(requestInterceptor, requestErrorInterceptor);

// Add response interceptor
apiClient.interceptors.response.use(responseInterceptor, responseErrorInterceptor);

export default apiClient;
