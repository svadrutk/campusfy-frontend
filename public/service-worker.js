const CACHE_NAME = 'campusfy-cache-v1';
const API_CACHE_NAME = 'campusfy-api-cache-v1';

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/search',
        '/classes',
        '/class',
        '/offline.html',
        '/manifest.json',
        '/icons/icon-192x192.png',
        '/icons/icon-512x512.png'
      ]);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Sync event - handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'class-data-sync') {
    event.waitUntil(syncClassData());
  }
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    if (data.type === 'class-update') {
      event.waitUntil(
        self.registration.showNotification('Course Update', {
          body: `New updates available for ${data.department} courses`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data: {
            url: '/search'
          }
        })
      );
    }
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
});

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  // Handle API requests
  if (event.request.url.includes('/api/classes')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    })
  );
});

// Helper function to handle API requests
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // If we have a cached response and it's not expired, return it
  if (cachedResponse) {
    const cachedData = await cachedResponse.json();
    const cacheTime = new Date(cachedData.cached_at).getTime();
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (now - cacheTime < maxAge) {
      return new Response(JSON.stringify(cachedData.data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // If no cache or expired, fetch from network
  try {
    const response = await fetch(request);
    const data = await response.json();

    // Cache the response with timestamp
    const cacheData = {
      data,
      cached_at: new Date().toISOString()
    };

    cache.put(request, new Response(JSON.stringify(cacheData), {
      headers: { 'Content-Type': 'application/json' }
    }));

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // If network fails and we have a cached response, return it
    if (cachedResponse) {
      const cachedData = await cachedResponse.json();
      return new Response(JSON.stringify(cachedData.data), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    throw error;
  }
}

// Helper function to sync class data
async function syncClassData() {
  try {
    const db = await openIndexedDB();
    const lastUpdated = await getLastUpdatedTimestamp(db);
    
    const response = await fetch(`/api/classes/updates?since=${lastUpdated || ''}`);
    if (!response.ok) throw new Error('Failed to fetch updates');
    
    const data = await response.json();
    if (data.classes && data.classes.length > 0) {
      await storeUpdates(db, data.classes);
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper function to open IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('campusfy-cache', 3);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Helper function to get last updated timestamp
async function getLastUpdatedTimestamp(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('meta', 'readonly');
    const store = transaction.objectStore('meta');
    const request = store.get('lastUpdated');
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value || null);
  });
}

// Helper function to store updates
async function storeUpdates(db, classes) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['classes', 'meta'], 'readwrite');
    const classStore = transaction.objectStore('classes');
    const metaStore = transaction.objectStore('meta');
    
    // Store updated classes
    classes.forEach(classData => {
      classStore.put({
        ...classData,
        last_updated: new Date().toISOString()
      });
    });
    
    // Update meta information
    metaStore.put({
      key: 'lastUpdated',
      value: new Date().toISOString(),
      totalClasses: classes.length
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
} 