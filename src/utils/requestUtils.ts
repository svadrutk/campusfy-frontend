/**
 * Creates an abort controller and returns both the controller and a cleanup function
 * that should be called when the component unmounts or when the request should be cancelled
 */
export function createRequestController() {
  const controller = new AbortController();
  
  return {
    cleanup: () => controller.abort(),
    signal: controller.signal
  };
}

/**
 * Wraps a fetch request with abort controller functionality
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns A promise that will be aborted if the cleanup function is called
 */
export function fetchWithAbort(url: string, options: RequestInit = {}) {
  const { cleanup, signal } = createRequestController();
  
  const fetchPromise = fetch(url, {
    ...options,
    signal
  });
  
  return {
    promise: fetchPromise,
    cleanup
  };
} 