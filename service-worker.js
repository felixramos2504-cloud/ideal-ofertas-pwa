/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 9.7.2.4
   PWA + FIREBASE CLOUD MESSAGING NO MESMO SERVICE WORKER
   ========================================================= */

/*
 * IMPORTANTE:
 * O manipulador de clique é registrado antes das bibliotecas do Firebase,
 * conforme orientação do Firebase para comportamento personalizado.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const destino =
    (event.notification &&
     event.notification.data &&
     event.notification.data.url)
      ? event.notification.data.url
      : './';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(lista => {
      for(const client of lista){
        if('focus' in client){
          if('navigate' in client){
            client.navigate(destino);
          }
          return client.focus();
        }
      }

      if(clients.openWindow){
        return clients.openWindow(destino);
      }
    })
  );
});

importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js'
);

importScripts(
  'https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js'
);

firebase.initializeApp({
  apiKey: "AIzaSyCxNq9yO7JhXn9PHqgAMdls5Cb89yq2tv0",
  authDomain: "ideal-ofertas.firebaseapp.com",
  projectId: "ideal-ofertas",
  storageBucket: "ideal-ofertas.firebasestorage.app",
  messagingSenderId: "554998916130",
  appId: "1:554998916130:web:ce65e917617d036f89167b"
});

const messaging = firebase.messaging();

/*
 * Mensagens do tipo "notification" enviadas pelo Firebase Console
 * são exibidas automaticamente pelo SDK quando o PWA está em segundo plano.
 *
 * Para futuras mensagens "data-only" enviadas pelo nosso Apps Script,
 * este bloco cria a notificação manualmente.
 */
messaging.onBackgroundMessage(payload => {
  console.log(
    '[IDEAL Push] Mensagem recebida em segundo plano:',
    payload
  );

  if(payload && payload.notification){
    return;
  }

  const data = (payload && payload.data) || {};

  const title =
    data.title ||
    'IDEAL Supermercados';

  const options = {
    body:
      data.body ||
      'Você recebeu uma nova atualização.',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag:
      data.tag ||
      'ideal-ofertas',
    data: {
      url:
        data.url ||
        './'
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});

const CACHE_NAME = 'ideal-ofertas-pwa-shell-v4-push-unificado';

const STATIC_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(key => key === CACHE_NAME ? Promise.resolve() : caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Não interfere no Google Apps Script carregado no iframe.
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com')
  ) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
