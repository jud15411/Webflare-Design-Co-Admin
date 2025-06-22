const fs = require('fs-extra');
const { execSync } = require('child_process');
const path = require('path');

// Clean dist directory
fs.emptyDirSync('dist');

// Copy files
const filesToCopy = [
  'index.html',
  'login.html',
  'admin-logo.png',
  'favicon.ico',
  'robots.txt',
  '.htaccess'
];

const dirsToCopy = [
  'css',
  'js',
  'images'
];

// Copy individual files
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('dist', file));
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.copySync(dir, path.join('dist', dir));
  }
});

// Minify HTML (requires html-minifier)
try {
  execSync('npx html-minifier --input-dir . --output-dir dist --file-ext html --collapse-whitespace --remove-comments --minify-css true --minify-js true');
  console.log('HTML minification complete');
} catch (error) {
  console.warn('HTML minification skipped - html-minifier not found');
}

// Generate service worker
const swContent = `
const CACHE_NAME = 'webflare-admin-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/admin-logo.png',
  '/css/styles.css',
  '/js/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
`;

fs.writeFileSync(path.join('dist', 'sw.js'), swContent);

console.log('Production build complete!');
