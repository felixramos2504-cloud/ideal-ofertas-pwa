/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 9.7.2.9
   FIREBASE MESSAGING + PWA — FID
   ========================================================= */

const CACHE_NAME = 'ideal-ofertas-pwa-shell-v7-fid';

const STATIC_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

/*
 * O clique é registrado ANTES do Firebase, conforme orientação
 * da documentação do FCM para comportamento personalizado.
 */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const destino =
    event.notification &&
    event.notification.data &&
    event.notification.data.url
      ? event.notification.data.url
      : './';

  event.waitUntil(
    self.clients.matchAll({
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

      if(self.clients.openWindow){
        return self.clients.openWindow(destino);
      }
    })
  );
});

/* Firebase Messaging compat no Service Worker. */
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
 * Toda mensagem recebida em segundo plano passa por aqui.
 * O handler cria a notificação do sistema explicitamente.
 */
messaging.onBackgroundMessage(payload => {
  console.log(
    '[IDEAL Push] Mensagem recebida em segundo plano:',
    payload
  );

  const notification =
    (payload && payload.notification) || {};

  const data =
    (payload && payload.data) || {};

  const fcmOptions =
    (payload && payload.fcmOptions) || {};

  const title =
    notification.title ||
    data.title ||
    'IDEAL Supermercados';

  const options = {
    body:
      notification.body ||
      data.body ||
      'Você recebeu uma nova atualização.',
    icon:
      notification.icon ||
      data.icon ||
      './icon-192.png',
    badge: './icon-192.png',
    tag:
      data.tag ||
      'ideal-ofertas',
    renotify: true,
    data: {
      url:
        fcmOptions.link ||
        data.url ||
        './'
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});

/* =========================
   PWA
   ========================= */

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
        keys.map(key =>
          key === CACHE_NAME
            ? Promise.resolve()
            : caches.delete(key)
        )
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  if(req.method !== 'GET'){
    return;
  }

  const url = new URL(req.url);

  if(
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleusercontent.com')
  ){
    return;
  }

  if(url.origin !== self.location.origin){
    return;
  }

  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();

        caches.open(CACHE_NAME)
          .then(cache => cache.put(req, clone));

        return res;
      })
      .catch(() => caches.match(req))
  );
});
