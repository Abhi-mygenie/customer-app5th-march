/**
 * Custom Hook: useRestaurantId
 * Extracts restaurant ID from URL (path, query, or subdomain)
 * For subdomain mode, resolves to numeric ID via restaurant-info API
 *
 * Supports:
 * - /478 (path parameter)
 * - /?id=478 (query parameter)
 * - hyatt.mygenie.online (subdomain → resolves to numeric ID)
 */

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getRestaurantDetails } from '../api/services/restaurantService';

// Module-level cache: subdomain string → numeric restaurant ID
// Persists across component re-mounts and navigations
const subdomainIdCache = {};

/**
 * Get subdomain from current hostname
 * @returns {string|null} - Full subdomain hostname or null
 */
export const getSubdomain = () => {
  const hostname = window.location.hostname;

  // Development - localhost
  if (hostname === 'localhost' || hostname.startsWith('127.0.0.1')) {
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }
    return null;
  }

  // Production - Extract subdomain from mygenie.online
  const parts = hostname.split('.');

  // Just mygenie.online (2 parts) → no subdomain
  if (parts.length === 2) {
    return null;
  }

  // hyatt.mygenie.online (3 parts)
  if (parts.length === 3) {
    const subdomain = parts[0];

    // Exclude system subdomains
    const systemSubdomains = ['www', 'admin', 'api', 'cdn', 'app'];
    if (systemSubdomains.includes(subdomain)) {
      return null;
    }

    // If hostname ends with .mygenie.online, return full hostname
    if (hostname.endsWith('.mygenie.online')) {
      return hostname; // "hyatt.mygenie.online"
    }

    return subdomain;
  }

  return null;
};

/**
 * Get restaurant identifier (ID or subdomain → resolved to numeric ID)
 * Priority: Path > Query > Resolved subdomain ID > Raw subdomain > Env > Default
 */
export const useRestaurantId = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();

  // 1. Try path parameter first (e.g., /478)
  const pathRestaurantId = params.restaurantId || params.id;

  // 2. Try query parameter (e.g., ?id=478)
  const queryRestaurantId = searchParams.get('id') || searchParams.get('restaurantId');

  // 3. Try subdomain (e.g., hyatt.mygenie.online)
  const subdomain = getSubdomain();

  const needsResolution = !pathRestaurantId && !queryRestaurantId && !!subdomain;

  // Initialize from cache for instant hit on subsequent navigations
  const [resolvedId, setResolvedId] = useState(
    needsResolution ? subdomainIdCache[subdomain] || null : null
  );

  // Resolve subdomain → numeric ID via API (one-time per subdomain)
  useEffect(() => {
    if (!needsResolution) return;

    // Already cached
    if (subdomainIdCache[subdomain]) {
      setResolvedId(subdomainIdCache[subdomain]);
      return;
    }

    getRestaurantDetails(subdomain)
      .then(data => {
        if (data?.id) {
          const numericId = String(data.id);
          subdomainIdCache[subdomain] = numericId;
          setResolvedId(numericId);
        }
      })
      .catch(() => {
        // Resolution failed — subdomain string will be used as fallback
      });
  }, [subdomain, needsResolution]);

  // 4. Fallback chain
  const envRestaurantId = process.env.REACT_APP_RESTAURANT_ID;
  const defaultRestaurantId = "478"; // 18march - hardcoded for preview

  // Priority: path > query > resolved numeric ID > (null while resolving) > env > default
  const restaurantId =
    pathRestaurantId ||
    queryRestaurantId ||
    resolvedId ||
    (needsResolution ? null : (subdomain || envRestaurantId || defaultRestaurantId));

  const isSubdomainMode = needsResolution;

  return {
    restaurantId,
    isSubdomainMode,
    subdomain,
  };
};

export default useRestaurantId;
