'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { schoolThemes } from '@/config/themeConfigs';

interface BackgroundRefreshBannerProps {
  isVisible: boolean;
  progress: number;
  status: string;
  error?: string | null;
  isIndeterminate?: boolean;
  onDismiss: () => void;
  onRetry?: () => void;
}

/**
 * Non-blocking banner for background cache refresh operations
 * 
 * Displays a subtle banner at the top of the page when cache is being
 * refreshed in the background. Shows progress, status, and allows dismissal.
 * 
 * @param isVisible - Whether the banner should be shown
 * @param progress - Progress value between 0 and 1
 * @param status - Current status message
 * @param error - Error message if refresh failed
 * @param onDismiss - Callback when user dismisses the banner
 * @param onRetry - Callback when user wants to retry failed refresh
 */
export default function BackgroundRefreshBanner({
  isVisible,
  progress,
  status,
  error,
  isIndeterminate = false,
  onDismiss,
  onRetry
}: BackgroundRefreshBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const theme = schoolThemes.wisco;

  // Auto-hide banner when refresh completes successfully
  useEffect(() => {
    if (progress >= 1.0 && !error && isVisible) {
      setIsCompleted(true);
      const timer = setTimeout(() => {
        setIsDismissed(true);
        onDismiss();
      }, 2000); // Show completion state for 2 seconds

      return () => clearTimeout(timer);
    }
  }, [progress, error, isVisible, onDismiss]);

  // Reset dismissed state when banner becomes visible again
  useEffect(() => {
    if (isVisible) {
      setIsDismissed(false);
      setIsCompleted(false);
    }
  }, [isVisible]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  const handleRetry = () => {
    if (onRetry) {
      setIsDismissed(false);
      onRetry();
    }
  };

  // Don't render if not visible or dismissed
  if (!isVisible || isDismissed) return null;

  const showError = !!error;
  const showSuccess = isCompleted && !error;
  const showProgress = !showError && !showSuccess;

  return (
    <div 
      className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{ top: '64px' }} // Position below header
    >
      <div className="mx-4 mt-2">
        <div className={`rounded-lg shadow-md border transition-all duration-300 ${
          showError 
            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
            : showSuccess
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        }`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {/* Icon */}
                <div className="flex-shrink-0">
                  {showError ? (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : showSuccess ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        showError 
                          ? 'text-red-800 dark:text-red-200'
                          : showSuccess
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {showError ? error : status}
                      </p>
                      
                      {showProgress && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Updating course data...</span>
                            {!isIndeterminate && <span>{Math.round(progress * 100)}%</span>}
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            {isIndeterminate ? (
                              <div className="relative h-full">
                                <div 
                                  className="h-full rounded-full animate-pulse"
                                  style={{ backgroundColor: theme.primary, opacity: 0.4 }}
                                />
                                <div 
                                  className="absolute inset-y-0 left-0 w-1/3 h-full rounded-full"
                                  style={{ 
                                    backgroundColor: theme.primary,
                                    animation: 'indeterminate-slide 2s infinite ease-in-out'
                                  }}
                                />
                              </div>
                            ) : (
                              <div 
                                className="h-1.5 rounded-full transition-all duration-300 ease-out"
                                style={{ 
                                  width: `${Math.max(2, progress * 100)}%`,
                                  backgroundColor: theme.primary
                                }}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      {showError && onRetry && (
                        <button
                          onClick={handleRetry}
                          className="text-xs px-2 py-1 rounded text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      
                      <button
                        onClick={handleDismiss}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
