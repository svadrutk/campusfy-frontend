'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { shouldRefreshCache, getOrLoadClassData, hasCachedData } from '@/utils/cacheUtils';
import { schoolThemes } from '@/config/themeConfigs';
import BackgroundRefreshBanner from './BackgroundRefreshBanner';

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
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [_retryCount, setRetryCount] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  // Enhanced UI state for preventing "boredom"
  const lastProgressRef = useRef(0);
  
  // Background refresh banner state
  const [showBackgroundBanner, setShowBackgroundBanner] = useState(false);
  const [backgroundProgress, setBackgroundProgress] = useState(0);
  const [backgroundStatus, setBackgroundStatus] = useState('');
  const [backgroundError, setBackgroundError] = useState<string | null>(null);
  const [backgroundIsIndeterminate, setBackgroundIsIndeterminate] = useState(false);
  
  const pathname = usePathname();
  
  // Get theme colors
  const theme = schoolThemes.wisco;

  /**
   * Enhances progress updates with visual effects
   */
  const handleProgressUpdate = useCallback((newStatus: string, progressValue: number, isIndeterminateMode?: boolean) => {
    setStatus(newStatus);
    setProgress(progressValue);
    setIsIndeterminate(isIndeterminateMode || false);
    
    // Track progress for potential future use
    lastProgressRef.current = progressValue;
  }, []);

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
   * Uses the new background mode for non-blocking refresh when cache exists
   * Shows blocking overlay only for cold starts (no cache)
   */
  const checkAndLoadCache = useCallback(async () => {
    if (hasCheckedCacheThisSession || !shouldLoadCacheForPath()) return;
    
    try {
      hasCheckedCacheThisSession = true;
      
      // Create abort controller for this operation
      const controller = new AbortController();
      setAbortController(controller);
      
      // Fast check to see if we have cached data
      const hasCached = await hasCachedData();
      
      if (hasCached) {
        // Cache exists - use background mode for non-blocking refresh
        const needsRefresh = await shouldRefreshCache();
        
        if (needsRefresh) {
          console.log('Cache exists but needs refresh - using background mode');
          
          // Show background banner instead of blocking overlay
          setShowBackgroundBanner(true);
          setBackgroundProgress(0.1);
          setBackgroundStatus('Checking for updates...');
          setBackgroundError(null);
          
          // Use background mode - this returns cached data immediately
          // and starts refresh in background
          await getOrLoadClassData((newStatus: string, progressValue: number, isIndeterminateMode?: boolean) => {
            if (!controller.signal.aborted) {
              setBackgroundStatus(newStatus);
              setBackgroundProgress(progressValue);
              setBackgroundIsIndeterminate(isIndeterminateMode || false);
            }
          }, controller.signal, true); // backgroundMode = true
          
          if (!controller.signal.aborted) {
            setBackgroundProgress(1.0);
            setBackgroundStatus('Cache updated!');
          }
        } else {
          // Cache is fresh, no need to show any loading state
          console.log('Cache is fresh, no refresh needed');
          return;
        }
      } else {
        // No cache exists - use blocking overlay for cold start
        console.log('No cache exists - using blocking mode');
        setLoading(true);
        setIsRefreshingCache(true);
        setError(null);
        setRetryCount(0);
        
        setStatus('Loading course data...');
        setProgress(0.1);
        
        // Use normal blocking mode (backgroundMode = false/undefined) with enhanced progress handler
        await getOrLoadClassData((newStatus: string, progressValue: number, isIndeterminateMode?: boolean) => {
          if (!controller.signal.aborted) {
            handleProgressUpdate(newStatus, progressValue, isIndeterminateMode);
          }
        }, controller.signal);
        
        if (!controller.signal.aborted) {
          setProgress(1.0);
          setStatus('Ready!');
          
          // Keep the overlay visible briefly to show completion
          setTimeout(() => {
            setLoading(false);
            setIsRefreshingCache(false);
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error loading cache:', error);
      
      // Determine if this was a background operation or blocking operation
      const hasCached = await hasCachedData();
      if (hasCached) {
        // Background refresh failed
        setBackgroundError('Failed to update course data. You can continue using cached data.');
      } else {
        // Blocking load failed
        setError('Failed to load course data. Please try again.');
        setIsRefreshingCache(true);
      }
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



  /**
   * Cleanup effect to abort operations when component unmounts
   */
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Background banner handlers
  const handleBackgroundBannerDismiss = useCallback(() => {
    setShowBackgroundBanner(false);
  }, []);

  const handleBackgroundRetry = useCallback(() => {
    setBackgroundError(null);
    setBackgroundProgress(0);
    setBackgroundStatus('Retrying...');
    checkAndLoadCache();
  }, [checkAndLoadCache]);

  if (!mounted) return null;

  return (
    <>
      {/* Background refresh banner - non-blocking */}
      <BackgroundRefreshBanner
        isVisible={showBackgroundBanner}
        progress={backgroundProgress}
        status={backgroundStatus}
        error={backgroundError}
        isIndeterminate={backgroundIsIndeterminate}
        onDismiss={handleBackgroundBannerDismiss}
        onRetry={handleBackgroundRetry}
      />

      {/* Blocking overlay - only for cold starts (no cache) */}
      {loading && isRefreshingCache && (
        <div className="fixed inset-0 bg-gradient-to-br from-black/20 to-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8">
            {/* Header with clean typography */}
            <div className="text-center mb-8">
              <h1 className="text-xl font-bold text-center bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent">
                Loading Course Data
              </h1>
            </div>
            
            <div className="relative w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
              {isIndeterminate ? (
                // Enhanced indeterminate animation with stripes
                <div className="absolute inset-0">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      background: `linear-gradient(45deg, 
                        ${theme.primary}40 25%, 
                        transparent 25%, 
                        transparent 50%, 
                        ${theme.primary}40 50%, 
                        ${theme.primary}40 75%, 
                        transparent 75%
                      )`,
                      backgroundSize: '20px 20px',
                      animation: 'indeterminate-stripes 1s linear infinite'
                    }}
                  />
                  <div 
                    className="absolute inset-0 h-full rounded-full"
                    style={{ 
                      background: `linear-gradient(90deg, 
                        transparent 0%, 
                        ${theme.primary}80 50%, 
                        transparent 100%
                      )`,
                      animation: 'shimmer 2s ease-in-out infinite'
                    }}
                  />
                </div>
              ) : (
                // Enhanced determinate progress with shimmer and smoother easing
                <div className="absolute inset-0">
                  {/* Background gradient */}
                  <div 
                    className="absolute left-0 top-0 h-full transition-all duration-300 ease-out rounded-full"
                    style={{ 
                      width: `${Math.max(2, progress * 100)}%`,
                      background: `linear-gradient(135deg, 
                        ${theme.primary} 0%, 
                        ${theme.primary}dd 30%, 
                        ${theme.primary} 70%, 
                        ${theme.primary}dd 100%
                      )`,
                      boxShadow: `0 0 8px ${theme.primary}30`
                    }}
                  />
                  {/* Shimmer overlay */}
                  <div 
                    className="absolute left-0 top-0 h-full transition-all duration-300 ease-out rounded-full"
                    style={{ 
                      width: `${Math.max(2, progress * 100)}%`,
                      background: `linear-gradient(90deg, 
                        transparent 0%, 
                        rgba(255,255,255,0.2) 50%, 
                        transparent 100%
                      )`,
                      animation: 'shimmer 3s ease-in-out infinite'
                    }}
                  />
                </div>
              )}
            </div>
            
            <div className="mt-8">
              {/* Enhanced status message with better typography */}
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600 ">
                  {status}
                </p>
              </div>
            </div>

            {error && (
              <div className="text-center mt-6 p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 backdrop-blur-sm">
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">{error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    checkAndLoadCache();
                  }}
                  style={{ 
                    background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primary}90 100%)`,
                    boxShadow: `0 4px 12px ${theme.primary}30`
                  }}
                  className="text-white text-sm font-medium py-2.5 px-6 rounded-full transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 