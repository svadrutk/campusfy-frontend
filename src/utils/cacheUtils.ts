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

// Store class data in IndexedDB with chunked storage
export const storeClassData = async (classes: ClassData[]): Promise<void> => {
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

    console.log(`Storing ${classes.length} classes in chunks of ${CHUNK_SIZE}`);

    // Process classes in chunks
    for (let i = 0; i < classesWithTimestamp.length; i += CHUNK_SIZE) {
      const chunkStart = performance.now();
      const chunk = classesWithTimestamp.slice(i, i + CHUNK_SIZE);
      const transaction = db.transaction([CLASS_STORE, META_STORE], 'readwrite');
      const store = transaction.objectStore(CLASS_STORE);
      const metaStore = transaction.objectStore(META_STORE);
      
      // Create all the put operations
      const putOperations = chunk.map(classData => store.put(classData));
      
      // Add the metadata update operation
      putOperations.push(
        metaStore.put({ 
          key: 'lastUpdated', 
          value: timestamp,
          totalClasses: classes.length
        })
      );
      
      // Execute all operations in parallel
      await Promise.all(putOperations);
      
      // Wait for the transaction to complete
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject('Failed to store class data chunk');
      });
      
      const chunkDuration = Math.round(performance.now() - chunkStart);
      console.log(`Stored chunk ${Math.floor(i/CHUNK_SIZE) + 1}/${Math.ceil(classesWithTimestamp.length/CHUNK_SIZE)} in ${chunkDuration}ms`);
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
const getLastUpdatedTimestamp = async (): Promise<string | null> => {
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
  const startTime = performance.now();
  try {
    // If we have a timestamp and it's less than 24 hours old, skip the update
    if (lastUpdatedTimestamp) {
      const lastUpdateDate = new Date(lastUpdatedTimestamp);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceUpdate < 24) {
        // Cache is fresh, no need to make any API calls
        if (progressCallback) {
          progressCallback('Up to date!', 1.0);
        }
        console.log(`refreshClassData: Cache is fresh (${hoursSinceUpdate.toFixed(1)} hours old), skipping refresh`);
        return [];
      }
    }

    // Use the cache endpoint with a limit to get recent updates
    if (progressCallback) {
      progressCallback('Checking for updates...', 0.3);
    }

    const schoolCode = getCurrentSchoolCode();
    console.log(`refreshClassData: Fetching updates for school ${schoolCode}`);
    
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
    
    if (classes.length > 0) {
      if (progressCallback) {
        progressCallback('Updating cache...', 0.5);
      }
      
      const storeStart = performance.now();
      await storeClassData(classes);
      console.log(`refreshClassData: Stored ${classes.length} classes in ${Math.round(performance.now() - storeStart)}ms for school ${schoolCode}`);
      
      if (progressCallback) {
        progressCallback('Cache updated', 1.0);
      }
    } else {
      console.log(`refreshClassData: No updates available from server for school ${schoolCode}`);
      if (progressCallback) {
        progressCallback('Up to date!', 1.0);
      }
    }
    
    const totalDuration = Math.round(performance.now() - startTime);
    console.log(`refreshClassData completed in ${totalDuration}ms, found ${classes.length} updates for school ${schoolCode}`);
    return classes;
  } catch (error) {
    console.error('Failed to refresh class data:', error);
    throw error;
  }
};

// Global request lock to prevent multiple parallel loading processes
let isLoadingData = false;
let lastLoadTime = 0;
const LOAD_COOLDOWN = 2000; // 2 seconds cooldown

// Load all class data from API with optimized batch loading
export const loadAllClassData = async (
  progressCallback?: (status: string, progress: number) => void
): Promise<ClassData[]> => {
  try {
    // Check if we're already loading data
    const now = Date.now();
    if (isLoadingData) {
      console.log("Another load process is already running, waiting...");
      
      // Wait for the other process to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isLoadingData) {
            clearInterval(checkInterval);
            console.log("Previous load process completed, continuing");
            
            // Get the cached data instead of starting a new load
            getClassData().then(cachedData => {
              if (cachedData && cachedData.length > 0) {
                resolve(cachedData);
              } else {
                // This shouldn't normally happen, but handle it just in case
                setTimeout(() => loadAllClassData(progressCallback).then(resolve), LOAD_COOLDOWN);
              }
            });
          }
        }, 200);
      });
    }
    
    // Check cooldown period
    if (now - lastLoadTime < LOAD_COOLDOWN) {
      console.log(`Load request too soon (${now - lastLoadTime}ms since last load), enforcing cooldown`);
      await new Promise(resolve => setTimeout(resolve, LOAD_COOLDOWN));
    }
    
    // Set the loading lock
    isLoadingData = true;
    lastLoadTime = Date.now();
    
    try {
      if (progressCallback) {
        progressCallback('Loading courses...', 0.1);
      }

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

      let allClasses: ClassData[] = [];
      
      // Fetch data in sequential batches - more reliable than parallel fetching
      for (let i = 0; i < batchCount; i++) {
        const page = i + 1;
        
        if (progressCallback) {
          // Adjust progress calculation based on batch count
          const progressIncrement = 0.8 / batchCount;
          progressCallback(`Fetching courses (part ${page}/${batchCount})...`, 0.1 + (i * progressIncrement));
        }

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

        // Add a small delay between batches to prevent overloading the server
        // But only if we're not on the last batch
        if (i < batchCount - 1) {
          const delayTime = 500; // Increased to 500ms delay between batches
          await new Promise(resolve => setTimeout(resolve, delayTime));
          console.log(`Waited ${delayTime}ms before next batch`);
        }
      }

      if (progressCallback) {
        progressCallback('Saving to cache...', 0.9);
      }

      console.log(`Successfully fetched ${allClasses.length} classes from API for school ${schoolCode}. Storing in cache...`);
      
      // Store in IndexedDB after all data is loaded
      await storeClassData(allClasses);

      if (progressCallback) {
        progressCallback('Ready!', 1.0);
      }

      return allClasses;
    } finally {
      // Always release the lock, even if there was an error
      isLoadingData = false;
    }
  } catch (error) {
    console.error('Failed to load class data:', error);
    throw error;
  }
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

// Global request lock for getOrLoadClassData
let isCheckingCache = false;
let lastCacheCheck = 0;
const CACHE_CHECK_COOLDOWN = 1000; // 1 second cooldown

// Progress manager to handle consistent progress updates
class ProgressManager {
  private currentProgress: number = 0;
  private currentStatus: string = '';
  private readonly progressCallback?: (status: string, progress: number) => void;
  private readonly progressSegments: { [key: string]: number } = {
    INITIAL_CHECK: 0.1,
    CACHE_CHECK: 0.2,
    API_CHECK: 0.3,
    REFRESH_CHECK: 0.4,
    DATA_LOAD: 0.7,
    CACHE_UPDATE: 0.9,
    COMPLETE: 1.0
  };

  private readonly statusMessages: { [key: string]: string[] } = {
    INITIAL_CHECK: [
      'Preparing to load courses...',
      'Initializing...',
      'Setting up...'
    ],
    CACHE_CHECK: [
      'Checking your saved courses...',
      'Looking for cached data...',
      'Verifying local data...'
    ],
    API_CHECK: [
      'Connecting to course database...',
      'Checking available courses...',
      'Fetching course information...'
    ],
    REFRESH_CHECK: [
      'Checking for updates...',
      'Looking for new courses...',
      'Verifying course data...'
    ],
    DATA_LOAD: [
      'Loading course information...',
      'Retrieving course details...',
      'Gathering course data...'
    ],
    CACHE_UPDATE: [
      'Updating your course data...',
      'Saving course information...',
      'Storing course details...'
    ],
    COMPLETE: [
      'Ready!',
      'All set!',
      'Done!'
    ]
  };

  constructor(progressCallback?: (status: string, progress: number) => void) {
    this.progressCallback = progressCallback;
  }

  private getRandomStatus(segment: keyof typeof this.progressSegments): string {
    const messages = this.statusMessages[segment];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  updateProgress(segment: keyof typeof this.progressSegments, customStatus?: string, subProgress: number = 0) {
    const baseProgress = this.progressSegments[segment];
    const prevSegment = Object.entries(this.progressSegments)
      .find(([_key, value]) => value < baseProgress && value > this.currentProgress)?.[0];
    
    const prevProgress = prevSegment ? this.progressSegments[prevSegment as keyof typeof this.progressSegments] : this.currentProgress;
    const progressRange = baseProgress - prevProgress;
    
    const newProgress = Math.max(
      this.currentProgress,
      prevProgress + (progressRange * subProgress)
    );
    
    this.currentProgress = newProgress;
    this.currentStatus = customStatus || this.getRandomStatus(segment);
    
    if (this.progressCallback) {
      this.progressCallback(this.currentStatus, newProgress);
    }
  }

  getCurrentProgress() {
    return this.currentProgress;
  }

  getCurrentStatus() {
    return this.currentStatus;
  }
}

// Get or load class data with improved error handling and performance
export const getOrLoadClassData = async (
  progressCallback?: (status: string, progress: number) => void
): Promise<ClassData[]> => {
  const progressManager = new ProgressManager(progressCallback);
  
  // Check if we're already checking cache
  const now = Date.now();
  if (isCheckingCache) {
    progressManager.updateProgress('INITIAL_CHECK', 'Waiting for previous operation to complete...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Cache check timeout'));
      }, 30000);
      
      const checkInterval = setInterval(() => {
        if (!isCheckingCache) {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          setTimeout(() => getOrLoadClassData(progressCallback).then(resolve).catch(reject), 100);
        }
      }, 100);
    });
  }
  
  if (now - lastCacheCheck < CACHE_CHECK_COOLDOWN) {
    progressManager.updateProgress('INITIAL_CHECK', 'Preparing to check cache...');
    await new Promise(resolve => setTimeout(resolve, CACHE_CHECK_COOLDOWN));
  }
  
  isCheckingCache = true;
  lastCacheCheck = Date.now();
  
  try {
    progressManager.updateProgress('INITIAL_CHECK', 'Starting cache check...', 0.5);
    
    const [hasCached, apiClassCount] = await Promise.all([
      hasCachedData(),
      (async () => {
        try {
          const schoolCode = getCurrentSchoolCode();
          progressManager.updateProgress('API_CHECK', 'Checking available courses...', 0.3);
          
          const countResponse = await fetch(`/api/classes/count?school=${schoolCode}`, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-Requested-With': 'XMLHttpRequest'
            },
            signal: AbortSignal.timeout(5000)
          });
          
          progressManager.updateProgress('API_CHECK', 'Processing course information...', 0.7);
          
          if (countResponse.ok) {
            const countData = await countResponse.json();
            return countData.total || 0;
          }
          return 0;
        } catch (error) {
          console.warn('Failed to get API class count:', error);
          return 0;
        }
      })()
    ]);
    
    progressManager.updateProgress('CACHE_CHECK', 'Analyzing cached data...', 0.5);
    
    if (hasCached) {
      const [needsRefresh, cachedData] = await Promise.all([
        shouldRefreshCache(),
        getClassData().catch(err => {
          console.warn('Cache read error:', err);
          return null;
        })
      ]);
      
      if (!cachedData || cachedData.length === 0) {
        progressManager.updateProgress('DATA_LOAD', 'No cached data found, loading fresh data...', 0.1);
      } else {
        const cacheIsComplete = apiClassCount > 0 && cachedData.length >= apiClassCount * 0.95;
        
        if (cacheIsComplete && !needsRefresh) {
          progressManager.updateProgress('COMPLETE', 'Using cached data', 1.0);
          isCheckingCache = false;
          return cachedData;
        }
        
        if (needsRefresh) {
          try {
            progressManager.updateProgress('REFRESH_CHECK', 'Checking for updates...', 0.3);
            
            const lastUpdated = await getLastUpdatedTimestamp();
            const updatedClasses = await refreshClassData(lastUpdated, (status, progress) => {
              progressManager.updateProgress('CACHE_UPDATE', status, progress);
            });
            
            if (updatedClasses.length === 0) {
              progressManager.updateProgress('COMPLETE', 'Cache is up to date', 1.0);
              isCheckingCache = false;
              return cachedData;
            }
            
            progressManager.updateProgress('CACHE_UPDATE', 'Merging updates...', 0.5);
            
            const updatedMap = new Map(updatedClasses.map(c => [c.class_code, c]));
            const mergedData = new Array(cachedData.length + updatedClasses.length);
            let writeIndex = 0;
            
            for (const cls of cachedData) {
              mergedData[writeIndex++] = updatedMap.has(cls.class_code) 
                ? updatedMap.get(cls.class_code)! 
                : cls;
            }
            
            for (const cls of updatedClasses) {
              if (!cachedData.some(c => c.class_code === cls.class_code)) {
                mergedData[writeIndex++] = cls;
              }
            }
            
            mergedData.length = writeIndex;
            
            progressManager.updateProgress('CACHE_UPDATE', 'Saving updates...', 0.8);
            await storeClassData(mergedData);
            
            progressManager.updateProgress('COMPLETE', 'Ready!', 1.0);
            isCheckingCache = false;
            return mergedData;
          } catch (refreshError) {
            console.error('Cache refresh failed:', refreshError);
            progressManager.updateProgress('COMPLETE', 'Using existing data', 1.0);
            isCheckingCache = false;
            return cachedData;
          }
        }
      }
    }
    
    progressManager.updateProgress('DATA_LOAD', 'Loading all courses...', 0.1);
    const result = await loadAllClassData((status, progress) => {
      progressManager.updateProgress('DATA_LOAD', status, progress);
    });
    
    progressManager.updateProgress('COMPLETE', 'Ready!', 1.0);
    return result;
  } catch (error) {
    console.error('Failed to get or load class data:', error);
    throw error;
  } finally {
    isCheckingCache = false;
  }
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

// Cache for all classes
let allClassesCache: ClassData[] | null = null;
let lastCacheUpdate: number = 0;
const CACHE_DURATION = 1440 * 60 * 1000; // 1 day in milliseconds
let isLoadingClasses = false;

/**
 * Get all classes from cache or load them if not available
 */
export const getAllClasses = async (): Promise<ClassData[] | null> => {
  // Check if cache is valid
  if (allClassesCache && Date.now() - lastCacheUpdate < CACHE_DURATION) {
    return allClassesCache;
  }

  // If we're already loading classes, wait for that to complete
  if (isLoadingClasses) {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (allClassesCache) {
          clearInterval(checkInterval);
          resolve(allClassesCache);
        }
      }, 100);
    });
  }

  // Set loading flag
  isLoadingClasses = true;

  try {
    // Load all classes from API
    const classes = await loadAllClassData();
    if (classes.length > 0) {
      allClassesCache = classes;
      lastCacheUpdate = Date.now();
      return classes;
    }
  } finally {
    // Clear loading flag
    isLoadingClasses = false;
  }

  return null;
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