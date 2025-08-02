'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { shouldRefreshCache, getOrLoadClassData, hasCachedData } from '@/utils/cacheUtils';
import { schoolThemes } from '@/config/themeConfigs';

/**
 * Type declarations for service worker synchronization
 * Extends the global ServiceWorkerRegistration interface to include sync functionality
 */
declare global {
  interface ServiceWorkerRegistration {
    sync: {
      register(tag: string): Promise<void>;
    };
  }
}

/**
 * Global state to track if cache has been checked in current session
 * Prevents redundant cache checks within the same browser session
 */
let hasCheckedCacheThisSession = false;

/**
 * Array of paths where cache loading should be enabled
 * These routes require course data and benefit from caching
 */
export const CACHE_ENABLED_PATHS = ['/search', '/classes', '/class', '/advisor'];

/**
 * Loading overlay component for cache initialization/updates
 * 
 * Displays a progress indicator when course data is being loaded or refreshed.
 * Automatically checks if cache needs updating when visiting supported paths.
 * Provides visual feedback on loading progress and error states.
 * 
 * @returns React component that renders a loading overlay or null if not needed
 */
export default function CacheLoadingOverlay() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Loading courses...');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isRefreshingCache, setIsRefreshingCache] = useState(false);
  const [_retryCount, setRetryCount] = useState(0);
  const pathname = usePathname();
  
  // Get theme colors
  const theme = schoolThemes.wisco;

  /**
   * Determines if the current path requires cache loading
   * Checks if the current pathname matches any of the enabled paths
   * 
   * @returns Boolean indicating if cache should be loaded for current path
   */
  const shouldLoadCacheForPath = useCallback(() => {
    if (!pathname) return false;
    return CACHE_ENABLED_PATHS.some(path => pathname === path);
  }, [pathname]);

  /**
   * Checks if cache needs refreshing and loads/updates if necessary
   * Shows progress indicators during the process
   * Sets error state if the cache loading fails
   */
  const checkAndLoadCache = useCallback(async () => {
    if (hasCheckedCacheThisSession || !shouldLoadCacheForPath()) return;
    
    try {
      hasCheckedCacheThisSession = true;
      
      // Fast check to see if we have cached data
      const hasCached = await hasCachedData();
      
      if (hasCached) {
        // Only check for refresh if we have cached data
        const needsRefresh = await shouldRefreshCache();
        
        if (needsRefresh) {
          // Only show the overlay if we actually need to refresh
          setLoading(true);
          setIsRefreshingCache(true);
          setError(null);
          setRetryCount(0);
          
          setStatus('Updating course data...');
          setProgress(0.1);
          
          await getOrLoadClassData((newStatus: string, progressValue: number) => {
            setStatus(newStatus);
            setProgress(progressValue);
          });
          
          setProgress(1.0);
          setStatus('Ready!');
          
          // Keep the overlay visible briefly to show completion
          setTimeout(() => {
            setLoading(false);
            setIsRefreshingCache(false);
          }, 500);
        } else {
          // Cache is fresh, no need to show loading state
          return;
        }
      } else {
        // No cache exists, need to load from scratch
        setLoading(true);
        setIsRefreshingCache(true);
        setError(null);
        setRetryCount(0);
        
        setStatus('Loading course data...');
        setProgress(0.1);
        
        await getOrLoadClassData((newStatus: string, progressValue: number) => {
          setStatus(newStatus);
          setProgress(progressValue);
        });
        
        setProgress(1.0);
        setStatus('Ready!');
        
        // Keep the overlay visible briefly to show completion
        setTimeout(() => {
          setLoading(false);
          setIsRefreshingCache(false);
        }, 500);
      }
    } catch (error) {
      console.error('Error loading cache:', error);
      setError('Failed to load course data. Please try again.');
      setIsRefreshingCache(true);
    }
  }, [shouldLoadCacheForPath]);

  /**
   * Effect to initialize component and check cache on mount/pathname change
   * Sets the mounted state and triggers cache check
   */
  useEffect(() => {
    setMounted(true);
    checkAndLoadCache();
  }, [mounted, pathname, checkAndLoadCache]);

  // Only show overlay when actually loading new data
  if (!mounted || !loading || !isRefreshingCache) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-6">
          Loading Course Data
        </h1>
        
        <div className="relative w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full transition-all duration-300 ease-out"
            style={{ 
              width: `${Math.max(2, progress * 100)}%`,
              backgroundColor: theme.primary
            }}
          />
        </div>
        
        <div className="mt-4">
          <p className="text-sm font-medium text-center text-gray-900 dark:text-white">
            {status}
          </p>
          
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
            Please wait while we prepare your course data.
          </p>
        </div>

        {error && (
          <div className="text-center mt-4">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                checkAndLoadCache();
              }}
              style={{ backgroundColor: theme.primary }}
              className="text-white text-sm py-1.5 px-3 rounded-lg transition-colors hover:opacity-90"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 