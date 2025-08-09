import { ClassData } from '@/types/classes/classTypes';
import { SearchParams } from '@/types/search';
import { applyFilters } from './search/searchFilters';
import { convertToApiQuery } from './helpers/formatters';
import { schoolConfigs, getSchoolFromHostname } from '@/config/themes';


// Get the current school code for school-specific caching
const getCurrentSchoolCode = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const school = getSchoolFromHostname(hostname);
    return school.shortName || 'wisco'; // Default to wisco if no shortName
  }
  return 'wisco'; // Default for SSR
};

// Database configuration
const getDbName = (): string => {
  const schoolCode = getCurrentSchoolCode().toLowerCase();
  return `campusfy-cache-${schoolCode}`;
};

const DB_VERSION = 4; // Increment version for new schema
const CLASS_STORE = 'classes';
const META_STORE = 'meta';

// Initialize the database with school-specific name
export const initDatabase = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const DB_NAME = getDbName();
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject('Failed to open database');
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create classes store with improved indices
      if (!db.objectStoreNames.contains(CLASS_STORE)) {
        const classStore = db.createObjectStore(CLASS_STORE, { keyPath: 'class_code' });
        // Add indices for frequently accessed fields
        classStore.createIndex('course_name', 'course_name', { unique: false });
        classStore.createIndex('last_updated', 'last_updated', { unique: false });
        classStore.createIndex('grade_count', 'grade_count', { unique: false });
        classStore.createIndex('department', 'department', { unique: false });
        // Add new indices for better performance
        classStore.createIndex('combined_search', ['department', 'course_name'], { unique: false });
        classStore.createIndex('popularity', ['grade_count', 'last_updated'], { unique: false });
      }
      
      // Create meta store for cache information
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' });
      }
    };
  });
};

// Store class data in IndexedDB with chunked storage and enhanced progress tracking
export const storeClassData = async (
  classes: ClassData[], 
  progressManager?: EnhancedProgressManager
): Promise<void> => {
  const startTime = performance.now();
  try {
    if (classes.length === 0) {
      console.log('No classes to store, skipping IndexedDB operation');
      return;
    }
    
    const db = await initDatabase();
    // Adjust chunk size based on data size - smaller chunks for larger datasets
    const CHUNK_SIZE = classes.length > 10000 ? 2000 : 
                      classes.length > 5000 ? 3000 : 5000;
    
    // Add last_updated timestamp to each class
    const timestamp = new Date().toISOString();
    const classesWithTimestamp = classes.map(classData => ({
      ...classData,
      last_updated: timestamp
    }));

    const totalChunks = Math.ceil(classesWithTimestamp.length / CHUNK_SIZE);
    console.log(`Storing ${classes.length} classes in ${totalChunks} chunks of ${CHUNK_SIZE}`);

    // Transition to WRITE_CHUNKS phase if progress manager is available
    if (progressManager) {
      if (progressManager.getCurrentPhase() !== 'WRITE_CHUNKS') {
        // Complete current phase and start WRITE_CHUNKS
        progressManager.completePhase('WRITE_CHUNKS', totalChunks);
      }
    }

    // Process classes in chunks with detailed progress tracking
    for (let i = 0; i < classesWithTimestamp.length; i += CHUNK_SIZE) {
      const chunkStart = performance.now();
      const chunk = classesWithTimestamp.slice(i, i + CHUNK_SIZE);
      const chunkNumber = Math.floor(i / CHUNK_SIZE) + 1;
      
      // Update progress for this chunk
      if (progressManager) {
        const chunkProgress = (chunkNumber - 1) / totalChunks;
        progressManager.updatePhaseProgress(
          chunkProgress, 
          undefined, // Use rotating message
          chunkNumber - 1 // completed chunks
        );
      }
      
      const transaction = db.transaction([CLASS_STORE, META_STORE], 'readwrite');
      const store = transaction.objectStore(CLASS_STORE);
      const metaStore = transaction.objectStore(META_STORE);
      
      // Create all the put operations
      const putOperations = chunk.map(classData => store.put(classData));
      
      // Add the metadata update operation for the last chunk
      if (i + CHUNK_SIZE >= classesWithTimestamp.length) {
        putOperations.push(
          metaStore.put({ 
            key: 'lastUpdated', 
            value: timestamp,
            totalClasses: classes.length
          })
        );
      }
      
      // Execute all operations in parallel
      await Promise.all(putOperations);
      
      // Wait for the transaction to complete
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject('Failed to store class data chunk');
      });
      
      const chunkDuration = Math.round(performance.now() - chunkStart);
      console.log(`Stored chunk ${chunkNumber}/${totalChunks} in ${chunkDuration}ms`);
      
      // Update progress after chunk completion
      if (progressManager) {
        const completedProgress = chunkNumber / totalChunks;
        progressManager.updatePhaseProgress(
          completedProgress,
          undefined, // Use rotating message
          chunkNumber // completed chunks
        );
      }
    }
    
    // Complete the WRITE_CHUNKS phase and start FINALIZE
    if (progressManager) {
      progressManager.completePhase('FINALIZE');
      progressManager.updatePhaseProgress(0.5, 'Finalizing storage...');
      // Complete the final phase
      progressManager.updatePhaseProgress(1.0, 'Storage complete!');
    }
    
    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`Total storage time: ${totalDuration}ms for ${classes.length} classes`);
  } catch (error) {
    console.error('Failed to store class data:', error);
    throw error;
  }
};

// Get class data from IndexedDB with improved performance
export const getClassData = async (): Promise<ClassData[] | null> => {
  const startTime = performance.now();
  try {
    const db = await initDatabase();
    
    // First check meta store for total count
    const metaTransaction = db.transaction(META_STORE, 'readonly');
    const metaStore = metaTransaction.objectStore(META_STORE);
    const metaRequest = metaStore.get('lastUpdated');
    
    const metaData = await new Promise<{ value: string; totalClasses: number } | null>((resolve, reject) => {
      metaRequest.onsuccess = () => resolve(metaRequest.result);
      metaRequest.onerror = () => reject('Failed to get meta data');
    });
    
    if (!metaData) {
      console.log('getClassData: No metadata found, returning null');
      return null;
    }
    
    const expectedCount = metaData.totalClasses || 0;
    console.log(`getClassData: Expected to retrieve ${expectedCount} classes`);
    
    // Then get the actual data
    const transaction = db.transaction(CLASS_STORE, 'readonly');
    const store = transaction.objectStore(CLASS_STORE);
    const request = store.getAll();
    
    const getDataStart = performance.now();
    const classes = await new Promise<ClassData[] | null>((resolve, reject) => {
      request.onsuccess = () => {
        const classes = request.result;
        if (classes && classes.length > 0) {
          resolve(classes);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (event) => {
        console.error('Request error:', event);
        reject('Failed to get class data');
      };
    });
    
    const getDataTime = Math.round(performance.now() - getDataStart);
    const totalTime = Math.round(performance.now() - startTime);
    
    if (classes) {
      console.log(`getClassData: Retrieved ${classes.length} classes in ${getDataTime}ms (total: ${totalTime}ms)`);
      if (expectedCount > 0 && classes.length < expectedCount * 0.9) {
        console.warn(`getClassData: Retrieved fewer classes than expected (${classes.length} vs ${expectedCount})`);
      }
      return classes;
    } else {
      console.log(`getClassData: No classes found in ${totalTime}ms`);
      return null;
    }
  } catch (error) {
    console.error('Failed to get class data:', error);
    return null;
  }
};

// Get last updated timestamp from cache
const _getLastUpdatedTimestamp = async (): Promise<string | null> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(META_STORE, 'readonly');
    const store = transaction.objectStore(META_STORE);
    const request = store.get('lastUpdated');
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };
      request.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error('Failed to get last updated timestamp:', error);
    return null;
  }
};

// Refresh class data with differential updates
export const refreshClassData = async (
  lastUpdatedTimestamp: string | null,
  progressCallback?: (status: string, progress: number) => void
): Promise<ClassData[]> => {
  // Create enhanced progress manager
  const enhancedProgressManager = new EnhancedProgressManager((status, progress, _isIndeterminate) => {
    if (progressCallback) {
      progressCallback(status, progress);
    }
  });

  const startTime = performance.now();
  try {
    // Start initial check phase
    enhancedProgressManager.startPhase('INITIAL_CHECK');
    
    // If we have a timestamp and it's less than 24 hours old, skip the update
    if (lastUpdatedTimestamp) {
      const lastUpdateDate = new Date(lastUpdatedTimestamp);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        // Cache is fresh, no need to make any API calls
        enhancedProgressManager.updatePhaseProgress(1.0, 'Up to date!');
        console.log(`refreshClassData: Cache is fresh (${hoursSinceUpdate.toFixed(1)} hours old), skipping refresh`);
        return [];
      }
    }

    // Start read metadata phase
    enhancedProgressManager.completePhase('READ_METADATA');

    const schoolCode = getCurrentSchoolCode();
    console.log(`refreshClassData: Fetching updates for school ${schoolCode}`);
    
    // Start fetch phase
    enhancedProgressManager.startPhase('FETCH_BATCHES', 1); // Single batch for refresh
    
    const fetchStart = performance.now();
    const response = await fetch(`/api/classes/cache?limit=1000&school=${schoolCode}`, {
      referrerPolicy: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    if (!response.ok) throw new Error('Failed to fetch updates');
    
    const responseData = await response.json();
    const classes = responseData.classes || [];
    
    console.log(`refreshClassData: Fetched ${classes.length} classes in ${Math.round(performance.now() - fetchStart)}ms for school ${schoolCode}`);
    enhancedProgressManager.completePhase('MERGE_DATA');
    
    if (classes.length > 0) {
      enhancedProgressManager.updatePhaseProgress(0.5, 'Processing updates...');
      
      const storeStart = performance.now();
      enhancedProgressManager.completePhase(); // Complete merge, start write
      await storeClassData(classes, enhancedProgressManager);
      console.log(`refreshClassData: Stored ${classes.length} classes in ${Math.round(performance.now() - storeStart)}ms for school ${schoolCode}`);
      
      enhancedProgressManager.updatePhaseProgress(1.0, 'Cache updated');
    } else {
      console.log(`refreshClassData: No updates available from server for school ${schoolCode}`);
      enhancedProgressManager.updatePhaseProgress(1.0, 'Up to date!');
    }
    
    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`refreshClassData completed in ${totalDuration}ms, found ${classes.length} updates for school ${schoolCode}`);
    return classes;
  } catch (error) {
    console.error('Failed to refresh class data:', error);
    throw error;
  } finally {
    // Clean up progress manager
    enhancedProgressManager.destroy();
  }
};

/**
 * SHARED REFRESH PIPELINE - CONCURRENT LOAD DEDUPLICATION SYSTEM
 * 
 * This implements the first TODO task: "Coalesce concurrent loads (dedupe overlapping refreshes)"
 * 
 * Key features implemented:
 * 1. Single in-flight refresh pipeline - no parallel Supabase/IDB work
 * 2. Shared Promise system - subsequent calls attach to existing operation
 * 3. Progress subscriber list - multiple listeners get real-time updates
 * 4. Immediate attachment - no more "Waiting for previous operation" polling
 * 5. AbortSignal support - callers can stop listening without canceling shared refresh
 * 6. Per-batch network timeouts - maintained for reliability
 * 
 * Benefits:
 * - Eliminates duplicate network requests and database operations
 * - Provides instant progress feedback to all concurrent requesters
 * - Reduces server load and improves performance
 * - Better user experience with immediate progress instead of waiting messages
 */

// Shared refresh pipeline - single in-flight operation system
interface ProgressSubscriber {
  id: string;
  callback: (status: string, progress: number) => void;
  abortController: AbortController;
}

// Generate unique subscriber IDs
let subscriberIdCounter = 0;
const generateSubscriberId = (): string => `subscriber_${++subscriberIdCounter}_${Date.now()}`;

// Shared cache refresh manager - handles concurrent requests for cache operations
class SharedCacheRefreshManager {
  private activeOperation: Promise<ClassData[]> | null = null;
  private subscribers: Map<string, ProgressSubscriber> = new Map();
  private lastProgress: { status: string; progress: number } = { status: '', progress: 0 };
  
  // Subscribe to ongoing operation or start new one
  async getOrLoadData(
    progressCallback?: (status: string, progress: number) => void,
    abortSignal?: AbortSignal,
    backgroundMode?: boolean
  ): Promise<ClassData[]> {
    const subscriberId = generateSubscriberId();
    
    // Create abort controller for this subscriber
    const subscriberAbortController = new AbortController();
    
    // Forward external abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        subscriberAbortController.abort();
      });
    }
    
    // Add subscriber
    if (progressCallback) {
      this.subscribers.set(subscriberId, {
        id: subscriberId,
        callback: progressCallback,
        abortController: subscriberAbortController
      });
      
      // Immediately provide last known progress to new subscriber
      if (this.lastProgress.status) {
        try {
          progressCallback(this.lastProgress.status, this.lastProgress.progress);
        } catch (error) {
          console.warn('Progress callback error:', error);
        }
      }
    }
    
    try {
      // Background mode: return cached data immediately and refresh in background
      if (backgroundMode) {
        const cachedData = await getClassData();
        if (cachedData && cachedData.length > 0) {
          console.log('Background mode: returning cached data immediately');
          
          // Start background refresh if needed and not already in progress
          if (!this.activeOperation) {
            const needsRefresh = await shouldRefreshCache();
            if (needsRefresh) {
              console.log('Starting background refresh operation');
              this.activeOperation = this.executeRefresh();
              // Don't await - let it run in background
              this.activeOperation.catch(error => {
                console.error('Background refresh failed:', error);
              });
            }
          }
          
          return cachedData;
        }
        // If no cached data, fall through to normal blocking behavior
        console.log('Background mode: no cached data found, falling back to blocking mode');
      }
      
      // If operation already in progress, attach to it
      if (this.activeOperation) {
        console.log('Attaching to existing cache refresh operation');
        return await this.activeOperation;
      }
      
      // Start new operation
      console.log('Starting new shared cache refresh operation');
      this.activeOperation = this.executeRefresh();
      
      const result = await this.activeOperation;
      return result;
    } finally {
      // Remove subscriber
      this.subscribers.delete(subscriberId);
    }
  }
  
  // Execute the actual refresh operation
  private async executeRefresh(): Promise<ClassData[]> {
    const sharedProgressCallback = (status: string, progress: number) => {
      this.lastProgress = { status, progress };
      
      // Notify all active subscribers
      this.subscribers.forEach((subscriber) => {
        if (!subscriber.abortController.signal.aborted) {
          try {
            subscriber.callback(status, progress);
          } catch (error) {
            console.warn('Progress callback error:', error);
          }
        }
      });
      
      // Clean up aborted subscribers
      for (const [id, subscriber] of this.subscribers) {
        if (subscriber.abortController.signal.aborted) {
          this.subscribers.delete(id);
        }
      }
    };
    
    try {
      // Use the existing getOrLoadClassData logic but with shared progress
      const result = await this.performActualRefresh(sharedProgressCallback);
      return result;
    } finally {
      // Clean up operation state
      this.activeOperation = null;
      this.subscribers.clear();
      this.lastProgress = { status: '', progress: 0 };
    }
  }
  
  // The actual refresh logic (directly use the enhanced progress system)
  private async performActualRefresh(progressCallback: (status: string, progress: number) => void): Promise<ClassData[]> {
    return loadAllClassData(progressCallback);
  }
}

// Global shared cache manager instance
const sharedCacheManager = new SharedCacheRefreshManager();

// Export for testing purposes
export const testSharedRefresh = async (): Promise<void> => {
  console.log('Testing shared refresh system...');
  
  // Simulate multiple concurrent requests
  const promises = [];
  
  for (let i = 0; i < 3; i++) {
    const promise = getOrLoadClassData((status, progress) => {
      console.log(`Request ${i + 1}: ${status} (${Math.round(progress * 100)}%)`);
    });
    promises.push(promise);
  }
  
  const results = await Promise.all(promises);
  console.log('All requests completed, results length:', results.map(r => r.length));
  
  // Verify all results are the same (shared)
  const firstResult = results[0];
  const allSame = results.every(result => result === firstResult);
  console.log('All results are shared (same reference):', allSame);
};

// Legacy loading variables (kept for compatibility with original implementation)
let lastLoadTime = 0;
const LOAD_COOLDOWN = 2000; // 2 seconds cooldown

// Shared loadAllClassData manager
class SharedLoadAllDataManager {
  private activeOperation: Promise<ClassData[]> | null = null;
  private subscribers: Map<string, ProgressSubscriber> = new Map();
  private lastProgress: { status: string; progress: number } = { status: '', progress: 0 };
  
  async loadData(
    progressCallback?: (status: string, progress: number) => void,
    abortSignal?: AbortSignal
  ): Promise<ClassData[]> {
    const subscriberId = generateSubscriberId();
    
    // Create abort controller for this subscriber
    const subscriberAbortController = new AbortController();
    
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        subscriberAbortController.abort();
      });
    }
    
    // Add subscriber
    if (progressCallback) {
      this.subscribers.set(subscriberId, {
        id: subscriberId,
        callback: progressCallback,
        abortController: subscriberAbortController
      });
      
      // Provide immediate progress update
      if (this.lastProgress.status) {
        try {
          progressCallback(this.lastProgress.status, this.lastProgress.progress);
        } catch (error) {
          console.warn('Progress callback error:', error);
        }
      }
    }
    
    try {
      // If operation in progress, attach to it
      if (this.activeOperation) {
        console.log('Attaching to existing loadAllClassData operation');
        return await this.activeOperation;
      }
      
      // Start new operation
      console.log('Starting new shared loadAllClassData operation');
      this.activeOperation = this.executeLoad();
      
      const result = await this.activeOperation;
      return result;
    } finally {
      this.subscribers.delete(subscriberId);
    }
  }
  
  private async executeLoad(): Promise<ClassData[]> {
    const sharedProgressCallback = (status: string, progress: number) => {
      this.lastProgress = { status, progress };
      
      this.subscribers.forEach((subscriber) => {
        if (!subscriber.abortController.signal.aborted) {
          try {
            subscriber.callback(status, progress);
          } catch (error) {
            console.warn('Progress callback error:', error);
          }
        }
      });
      
      // Clean up aborted subscribers
      for (const [id, subscriber] of this.subscribers) {
        if (subscriber.abortController.signal.aborted) {
          this.subscribers.delete(id);
        }
      }
    };
    
    try {
      return await this.performActualLoad(sharedProgressCallback);
    } finally {
      this.activeOperation = null;
      this.subscribers.clear();
      this.lastProgress = { status: '', progress: 0 };
    }
  }
  
  private async performActualLoad(progressCallback: (status: string, progress: number) => void): Promise<ClassData[]> {
    return loadAllClassDataOriginal(progressCallback);
  }
}

const sharedLoadManager = new SharedLoadAllDataManager();

// Original loadAllClassData implementation (renamed for internal use)
const loadAllClassDataOriginal = async (
  progressCallback?: (status: string, progress: number) => void
): Promise<ClassData[]> => {
  // Create enhanced progress manager
  const enhancedProgressManager = new EnhancedProgressManager((status, progress, _isIndeterminate) => {
    if (progressCallback) {
      progressCallback(status, progress);
    }
  });

  try {
    // Start initial check phase
    enhancedProgressManager.startPhase('INITIAL_CHECK');
    
    // Check cooldown period (keeping this for network safety)
    const now = Date.now();
    if (now - lastLoadTime < LOAD_COOLDOWN) {
      console.log(`Load request enforcing cooldown (${now - lastLoadTime}ms since last load)`);
      await new Promise(resolve => setTimeout(resolve, LOAD_COOLDOWN));
    }
    
    lastLoadTime = Date.now();
    enhancedProgressManager.completePhase('READ_METADATA');

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;
    const schoolCode = getCurrentSchoolCode();

    interface ApiResponse {
      total: number;
      classes: ClassData[];
    }

    const fetchWithRetry = async (url: string, retryCount = 0): Promise<ApiResponse> => {
      const fetchStartTime = performance.now();
      try {
        // Ensure school code is included in the URL
        const urlWithSchool = url.includes('?') 
          ? `${url}&school=${schoolCode}`
          : `${url}?school=${schoolCode}`;

        const response = await fetch(urlWithSchool, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate, br', // Enable compression
            'Cache-Control': 'no-cache',
            'X-Requested-With': 'XMLHttpRequest'
          },
          referrerPolicy: 'same-origin',
          // Add a reasonable timeout
          signal: AbortSignal.timeout(60000) // 60 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }
        
        const data = await response.json();
        const fetchDuration = Math.round(performance.now() - fetchStartTime);
        const responseSize = data.classes?.length || 0;
        console.log(`Fetch completed in ${fetchDuration}ms, retrieved ${responseSize} classes for school ${schoolCode}`);
        
        return data;
      } catch (error: unknown) {
        if (retryCount < MAX_RETRIES && (
          error instanceof Error && (error.message.includes('timeout') || error.message.includes('network'))
        )) {
          console.log(`Retrying request (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchWithRetry(url, retryCount + 1);
        }
        throw error;
      }
    };

    // First, get the total count - optimize to avoid this if we know a fixed total
    console.log(`Fetching class count for school ${schoolCode}...`);
    enhancedProgressManager.updatePhaseProgress(0.5, 'Counting available courses...');
    
    const countResponse = await fetchWithRetry(`/api/classes/count`);
    const total = countResponse.total;
    
    if (!total) {
      throw new Error('No total count available');
    }
    
    console.log(`Found ${total} total classes for school ${schoolCode}`);
    
    // Determine optimal batch strategy based on total classes
    // For smaller datasets, use fewer batches to reduce overhead
    let batchCount = 1;
    
    if (total <= 2000) {
      batchCount = 2;
    } else if (total <= 5000) {
      batchCount = 3;
    } else if (total <= 10000) {
      batchCount = 4; 
    } else {
      batchCount = 4;
    }
    
    const chunkSize = Math.ceil(total / batchCount);
    console.log(`Loading ${total} classes in ${batchCount} sequential batches of ~${chunkSize} each for school ${schoolCode}`);

    // Now start the FETCH_BATCHES phase with the correct estimated total (number of batches)
    enhancedProgressManager.completePhase('FETCH_BATCHES', batchCount);

    let allClasses: ClassData[] = [];
    
    // Fetch data in sequential batches - more reliable than parallel fetching
    for (let i = 0; i < batchCount; i++) {
      const page = i + 1;
      const batchProgress = i / batchCount;
      
      enhancedProgressManager.updatePhaseProgress(
        batchProgress,
        undefined, // Use rotating message
        i // completed batches
      );

      // Fetch chunk using the cache endpoint
      console.log(`Fetching batch ${page}/${batchCount} for school ${schoolCode}...`);
      const fetchStart = performance.now();
      
      const response = await fetchWithRetry(`/api/classes/cache?page=${page}&limit=${chunkSize}`);
      
      if (!response.classes) {
        throw new Error(`No classes returned from API for chunk ${page}`);
      }

      const fetchDuration = Math.round(performance.now() - fetchStart);
      console.log(`Batch ${page}/${batchCount} fetched ${response.classes.length} classes in ${fetchDuration}ms for school ${schoolCode}`);
      
      allClasses = [...allClasses, ...response.classes];

      // Update progress after batch completion
      const completedBatchProgress = (i + 1) / batchCount;
      enhancedProgressManager.updatePhaseProgress(
        completedBatchProgress,
        undefined, // Use rotating message
        i + 1 // completed batches
      );

      // Add a small delay between batches to prevent overloading the server
      // But only if we're not on the last batch
      if (i < batchCount - 1) {
        const delayTime = 500; // Increased to 500ms delay between batches
        await new Promise(resolve => setTimeout(resolve, delayTime));
        console.log(`Waited ${delayTime}ms before next batch`);
      }
    }

    // Complete fetch phase and start merge phase
    enhancedProgressManager.completePhase('MERGE_DATA');
    enhancedProgressManager.updatePhaseProgress(0.5, 'Processing course data...');

    console.log(`Successfully fetched ${allClasses.length} classes from API for school ${schoolCode}. Storing in cache...`);
    
    // Complete merge phase properly
    enhancedProgressManager.updatePhaseProgress(1.0, 'Preparing to store data...');
    
    // Store in IndexedDB after all data is loaded (this will handle WRITE_CHUNKS and FINALIZE phases)
    await storeClassData(allClasses, enhancedProgressManager);

    // Final completion handled by storeClassData

    return allClasses;
    } catch (error) {
      console.error('Failed to load class data:', error);
      throw error;
    } finally {
      // Clean up progress manager
      enhancedProgressManager.destroy();
    }
};

// New shared loadAllClassData - uses shared refresh pipeline to dedupe concurrent loads  
export const loadAllClassData = async (
  progressCallback?: (status: string, progress: number) => void,
  abortSignal?: AbortSignal
): Promise<ClassData[]> => {
  return sharedLoadManager.loadData(progressCallback, abortSignal);
};

// Fast check to see if we have any cached data without loading everything
export const hasCachedData = async (): Promise<boolean> => {
  const startTime = performance.now();
  try {
    const db = await initDatabase();
    const transaction = db.transaction(CLASS_STORE, 'readonly');
    const store = transaction.objectStore(CLASS_STORE);
    
    // Use count() which is much faster than getAll()
    const request = store.count();
    
    const result = await new Promise<boolean>((resolve) => {
      request.onsuccess = () => {
        resolve(request.result > 0);
      };
      request.onerror = () => resolve(false);
    });
    
    const duration = Math.round(performance.now() - startTime);
    console.log(`Cache check completed in ${duration}ms, has data: ${result}`);
    return result;
  } catch (error) {
    console.error('Failed to check if cache has data:', error);
    return false;
  }
};

// Legacy cache checking variables (kept for compatibility with original implementation)
const _isCheckingCache = false;
const _lastCacheCheck = 0;
const _CACHE_CHECK_COOLDOWN = 1000; // 1 second cooldown

// Progress manager to handle consistent progress updates
/**
 * Enhanced progress manager with granular phase-based tracking
 * Implements the determinate progress indicator requirements from TODO.md
 */
class EnhancedProgressManager {
  private currentProgress: number = 0;
  private currentStatus: string = '';
  private currentPhase: string = '';
  private lastUpdateTime: number = 0;
  private progressUpdateInterval?: NodeJS.Timeout;
  private isIndeterminate: boolean = false;
  private phaseStartTime: number = 0;
  private estimatedTotal: number = 0;
  private readonly progressCallback?: (status: string, progress: number, isIndeterminate?: boolean) => void;
  
  // Phase-based progress with exact weights from TODO.md
  private readonly progressPhases: { [key: string]: { weight: number; cumulative: number } } = {
    INITIAL_CHECK: { weight: 0.05, cumulative: 0.05 },      // Initial check (5%)
    READ_METADATA: { weight: 0.05, cumulative: 0.10 },     // Read metadata/count (10% total)
    FETCH_BATCHES: { weight: 0.40, cumulative: 0.50 },     // Fetch updates in batches (40%)
    MERGE_DATA: { weight: 0.10, cumulative: 0.60 },        // Merge (10%)
    WRITE_CHUNKS: { weight: 0.30, cumulative: 0.90 },      // Write to IndexedDB in chunks (30%)
    FINALIZE: { weight: 0.10, cumulative: 1.00 }           // Finalize/meta write (10%, includes 5% buffer)
  };

  // Rotating micro-messages tied to phases
  private readonly phaseMessages: { [key: string]: string[] } = {
    INITIAL_CHECK: [
      'Initializing course system...',
      'Preparing data pipeline...',
      'Setting up environment...'
    ],
    READ_METADATA: [
      'Reading course metadata...',
      'Counting available courses...',
      'Analyzing data structure...',
      'Checking cache validity...'
    ],
    FETCH_BATCHES: [
      'Fetching course updates...',
      'Downloading course data...',
      'Retrieving latest information...',
      'Loading course details...',
      'Synchronizing with server...'
    ],
    MERGE_DATA: [
      'Merging course updates...',
      'Consolidating data...',
      'Processing changes...',
      'Integrating new courses...'
    ],
    WRITE_CHUNKS: [
      'Indexing courses...',
      'Storing course data...',
      'Writing to local database...',
      'Optimizing storage...',
      'Building search indexes...'
    ],
    FINALIZE: [
      'Optimizing filters...',
      'Finalizing updates...',
      'Completing setup...',
      'Preparing interface...'
    ]
  };

  constructor(progressCallback?: (status: string, progress: number, isIndeterminate?: boolean) => void) {
    this.progressCallback = progressCallback;
    this.lastUpdateTime = Date.now();
  }

  /**
   * Start a new phase with optional estimated total for granular tracking
   */
  startPhase(phase: keyof typeof this.progressPhases, estimatedTotal?: number) {
    this.currentPhase = phase as string;
    this.phaseStartTime = Date.now();
    this.estimatedTotal = estimatedTotal || 0;
    this.isIndeterminate = !estimatedTotal;
    
    // Clear any existing interval
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
    }
    
    // Start steady progress updates every 250ms
    this.progressUpdateInterval = setInterval(() => {
      this.sendProgressUpdate();
    }, 250);
    
    // Send immediate update
    this.updatePhaseProgress(0);
  }

  /**
   * Update progress within the current phase
   */
  updatePhaseProgress(subProgress: number, customStatus?: string, completed?: number) {
    if (!this.currentPhase || !(this.currentPhase in this.progressPhases)) {
      console.warn('No active phase for progress update');
      return;
    }

    const phase = this.progressPhases[this.currentPhase];
    const prevPhase = this.getPreviousPhase();
    const baseProgress = prevPhase ? this.progressPhases[prevPhase].cumulative : 0;
    
    // Calculate progress within this phase
    const phaseProgress = Math.min(1, Math.max(0, subProgress));
    const newProgress = baseProgress + (phase.weight * phaseProgress);
    
    // Update progress only if it's advancing
    if (newProgress > this.currentProgress) {
      this.currentProgress = newProgress;
    }
    
    // Update status with custom message or rotating phase message
    if (customStatus) {
      this.currentStatus = customStatus;
    } else {
      this.currentStatus = this.getRotatingMessage();
      
      // Add specific details when we have completion info
      if (completed !== undefined && this.estimatedTotal > 0) {
        this.currentStatus += ` (${completed}/${this.estimatedTotal})`;
      }
    }
    
    this.lastUpdateTime = Date.now();
  }

  /**
   * Complete the current phase and optionally start the next one
   */
  completePhase(nextPhase?: keyof typeof this.progressPhases, estimatedTotal?: number) {
    if (this.currentPhase && this.currentPhase in this.progressPhases) {
      const phase = this.progressPhases[this.currentPhase];
      this.currentProgress = phase.cumulative;
    }
    
    // Clear progress interval
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = undefined;
    }
    
    // Send final update for this phase
    this.sendProgressUpdate();
    
    // Start next phase if specified
    if (nextPhase) {
      this.startPhase(nextPhase, estimatedTotal);
    }
  }

  /**
   * Handle stalls - switch to indeterminate mode if no progress for 3-5 seconds
   */
  private checkForStalls() {
    const timeSinceUpdate = Date.now() - this.lastUpdateTime;
    if (timeSinceUpdate > 4000 && !this.isIndeterminate) { // 4 seconds
      this.isIndeterminate = true;
      this.currentStatus = 'Continuing in background...';
      this.sendProgressUpdate();
    }
  }

  /**
   * Send progress update with stall checking
   */
  private sendProgressUpdate() {
    this.checkForStalls();
    
    if (this.progressCallback) {
      this.progressCallback(this.currentStatus, this.currentProgress, this.isIndeterminate);
    }
  }

  /**
   * Get rotating message for current phase
   */
  private getRotatingMessage(): string {
    if (!this.currentPhase || !(this.currentPhase in this.phaseMessages)) {
      return 'Processing...';
    }
    
    const messages = this.phaseMessages[this.currentPhase];
    const elapsed = Date.now() - this.phaseStartTime;
    const messageIndex = Math.floor(elapsed / 2000) % messages.length; // Rotate every 2 seconds
    return messages[messageIndex];
  }

  /**
   * Get the previous phase key
   */
  private getPreviousPhase(): string | null {
    const phases = Object.keys(this.progressPhases);
    const currentIndex = phases.indexOf(this.currentPhase);
    return currentIndex > 0 ? phases[currentIndex - 1] : null;
  }

  /**
   * Force indeterminate mode
   */
  setIndeterminate(message?: string) {
    this.isIndeterminate = true;
    if (message) {
      this.currentStatus = message;
    }
    this.sendProgressUpdate();
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
      this.progressUpdateInterval = undefined;
    }
  }

  getCurrentProgress() {
    return this.currentProgress;
  }

  getCurrentStatus() {
    return this.currentStatus;
  }

  getCurrentPhase() {
    return this.currentPhase;
  }

  getIsIndeterminate() {
    return this.isIndeterminate;
  }
}

// New shared getOrLoadClassData - uses shared refresh pipeline to dedupe concurrent loads
export const getOrLoadClassData = async (
  progressCallback?: (status: string, progress: number) => void,
  abortSignal?: AbortSignal,
  backgroundMode?: boolean
): Promise<ClassData[]> => {
  return sharedCacheManager.getOrLoadData(progressCallback, abortSignal, backgroundMode);
};

// Get a specific class by code
export const getClassByCode = async (classCode: string): Promise<ClassData | null> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(CLASS_STORE, 'readonly');
    const store = transaction.objectStore(CLASS_STORE);
    const request = store.get(classCode);
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const classData = request.result;
        resolve(classData || null);
      };
      
      request.onerror = (event) => {
        console.error('Request error:', event);
        reject('Failed to get class data');
      };
    });
  } catch (error) {
    console.error(`Failed to get class ${classCode}:`, error);
    return null;
  }
};

// Cache for shouldRefreshCache results to avoid repeated calculations
let shouldRefreshCache_cache: { result: boolean; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Check if the cache needs to be refreshed (older than 24 hours or empty)
export const shouldRefreshCache = async (): Promise<boolean> => {
  try {
    // Check if we have a cached result that's still valid
    const now = Date.now();
    if (shouldRefreshCache_cache && now - shouldRefreshCache_cache.timestamp < CACHE_TTL) {
      return shouldRefreshCache_cache.result;
    }

    // Get the last updated timestamp first - this is faster than checking class count
    const db = await initDatabase();
    const metaTx = db.transaction(META_STORE, 'readonly');
    const metaStore = metaTx.objectStore(META_STORE);
    const metaRequest = metaStore.get('lastUpdated');
    
    const metaData = await new Promise<{ value: string } | null>((resolve) => {
      metaRequest.onsuccess = () => resolve(metaRequest.result);
      metaRequest.onerror = () => resolve(null);
    });
    
    if (!metaData || !metaData.value) {
      // Cache result for future calls
      shouldRefreshCache_cache = { result: true, timestamp: now };
      return true; // No timestamp means cache is empty
    }
    
    // Check if cache is older than 24 hours
    const lastUpdateDate = new Date(metaData.value);
    const hoursSinceUpdate = (now - lastUpdateDate.getTime()) / (1000 * 60 * 60);
    const needsRefresh = hoursSinceUpdate >= 24;
    
    // Cache result for future calls
    shouldRefreshCache_cache = { result: needsRefresh, timestamp: now };
    return needsRefresh;
  } catch (error) {
    console.error('Failed to check if cache needs refresh:', error);
    return true; // Default to refresh on error
  }
};

// Get cache expiration time in days
export const getCacheExpirationDays = async (): Promise<number> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction(META_STORE, 'readonly');
    const store = transaction.objectStore(META_STORE);
    const request = store.get('lastUpdated');
    
    return new Promise((resolve) => {
      request.onsuccess = () => {
        const lastUpdated = request.result?.value;
        
        if (!lastUpdated) {
          resolve(0);
          return;
        }
        
        const lastUpdateDate = new Date(lastUpdated);
        const now = new Date();
        const hoursSinceUpdate = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
        const daysRemaining = Math.max(0, Math.ceil((24 - hoursSinceUpdate) / 24));
        
        resolve(daysRemaining);
      };
      
      request.onerror = () => {
        resolve(0);
      };
    });
  } catch (error) {
    console.error('Failed to get cache expiration:', error);
    return 0;
  }
};

// Clear the cache
export const clearCache = async (): Promise<void> => {
  try {
    const db = await initDatabase();
    const transaction = db.transaction([CLASS_STORE, META_STORE], 'readwrite');
    
    transaction.objectStore(CLASS_STORE).clear();
    transaction.objectStore(META_STORE).clear();
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.onerror = (event) => {
        console.error('Transaction error:', event);
        reject('Failed to clear cache');
      };
    });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    throw error;
  }
};

// Cache for all classes (maintained for compatibility)
let allClassesCache: ClassData[] | null = null;
let lastCacheUpdate: number = 0;
const CACHE_DURATION = 1440 * 60 * 1000; // 1 day in milliseconds

/**
 * Get all classes from cache or load them if not available
 * Now uses the shared loading system
 */
export const getAllClasses = async (): Promise<ClassData[] | null> => {
  // Check if cache is valid
  if (allClassesCache && Date.now() - lastCacheUpdate < CACHE_DURATION) {
    return allClassesCache;
  }

  try {
    // Use shared loading system
    const classes = await loadAllClassData();
    if (classes.length > 0) {
      allClassesCache = classes;
      lastCacheUpdate = Date.now();
      return classes;
    }
    return null;
  } catch (error) {
    console.error('Failed to get all classes:', error);
    return null;
  }
};

/**
 * Search classes using cached data
 */
export const searchClasses = async (
  classes: ClassData[],
  params: SearchParams
): Promise<ClassData[]> => {
  // Get the current school configuration based on hostname
  let schoolConfig = schoolConfigs.wisco; // Default fallback
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    schoolConfig = getSchoolFromHostname(hostname);
  }

  // Convert SearchParams to ClassSearchQuery using the correct school config
  const query = convertToApiQuery(params, schoolConfig);
  
  // Apply filters using the existing searchFilters utility with the correct school config
  return applyFilters(classes, query, schoolConfig);
};