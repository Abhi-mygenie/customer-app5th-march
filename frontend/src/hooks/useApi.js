/**
 * Custom Hook: useApi
 * Generic hook for making API calls with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../api/utils/errorHandler';

/**
 * Custom hook for API calls
 * @param {Function} apiFunction - The API function to call
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {Object} options - Additional options
 * @returns {Object} { data, loading, error, refetch }
 */
export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const {
    immediate = true, // Call API immediately
    onSuccess = null, // Callback on success
    onError = null, // Callback on error
  } = options;

  const fetchData = useCallback(async () => {
    if (!apiFunction) return;

    setLoading(true);
    setError(null);
    setErrorMessage(null);

    try {
      const response = await apiFunction();
      setData(response);
      
      if (onSuccess) {
        onSuccess(response);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(err);
      setErrorMessage(message);
      
      if (onError) {
        onError(err, message);
      }
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
    // Dependencies are intentionally spread here to allow dynamic dependency arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate, fetchData].concat(dependencies));

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    errorMessage,
    refetch,
  };
};

export default useApi;
