"use client";

import { useState, useEffect } from 'react';

interface LoadingScreenProps {
  status: string;
  progress: number;
}

export default function LoadingScreen({ status, progress }: LoadingScreenProps) {
  const [dots, setDots] = useState('');
  
  // Animate the dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-900 z-50">
      <div className="w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-white">
            Loading Classes
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            {status}{dots}
          </p>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-6 overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <p>This may take a moment for the first load.</p>
          <p>Data will be cached for faster access next time.</p>
        </div>
      </div>
    </div>
  );
}