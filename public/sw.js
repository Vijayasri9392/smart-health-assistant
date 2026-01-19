const CACHE_NAME = 'health-assistant-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/login.html',
    '/signup.html',
    '/profile.html',
    '/history.html',
    '/js/app.js'
];

// TEMPORARILY DISABLED - Fix API blocking
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    self.clients.claim();
});

// NO CACHING - Pass all requests
self.addEventListener('fetch', event => {
    event.respondWith(fetch(event.request));
});


