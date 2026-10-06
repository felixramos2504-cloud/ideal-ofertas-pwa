/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 9.7.6.1 — CORREÇÃO NOTIFICAÇÃO DUPLICADA
   FIREBASE MESSAGING + PWA — FID
   ========================================================= */

const CACHE_NAME = 'ideal-ofertas-pwa-shell-v9-push-unico';

const STATIC_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

/* =========================
   DIAGNÓSTICO PERSISTENTE 9.7.2.10
   ========================= */

const IDEAL_DIAG_DB = 'idealPushDiagnostico';
const IDEAL_DIAG_STORE = 'eventos';

function abrirDiagDB(){
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDEAL_DIAG_DB, 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(IDEAL_DIAG_STORE)){
        db.createObjectStore(
          IDEAL_DIAG_STORE,
          { keyPath: 'id', autoIncrement: true }
        );
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function logDiag(tipo, detalhe){
  try{
    const db = await abrirDiagDB();

    await new Promise((resolve, reject) => {
      const tx = db.transaction(
        IDEAL_DIAG_STORE,
        'readwrite'
      );

      tx.objectStore(IDEAL_DIAG_STORE).add({
        data: new Date().toISOString(),
        tipo: String(tipo || ''),
        detalhe:
          typeof detalhe === 'string'
            ? detalhe
            : JSON.stringify(detalhe || {})
      });

      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });

    db.close();
  }catch(err){
    console.error(
      '[IDEAL Push][DIAG] Falha ao gravar log:',
      err
    );
  }
}

self.addEventListener('push', event => {
  let resumo = 'evento push sem payload';

  try{
    if(event.data){
      resumo = event.data.text();
      if(resumo.length > 2500){
        resumo = resumo.slice(0, 2500) + '...';
      }
    }
  }catch(err){
    resumo = 'erro ao ler payload: ' + String(err);
  }

  event.waitUntil(
    logDiag('PUSH_RAW_RECEBIDO', resumo)
  );
});

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    logDiag(
      'PUSH_SUBSCRIPTION_CHANGE',
      {
        antiga: !!event.oldSubscription,
        nova: !!event.newSubscription
      }
    )
  );
});

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
  const resumo = {
    notification:
      payload && payload.notification
        ? payload.notification
        : null,
    data:
      payload && payload.data
        ? payload.data
        : null,
    fcmOptions:
      payload && payload.fcmOptions
        ? payload.fcmOptions
        : null
  };

  console.log(
    '[IDEAL Push] Mensagem recebida em segundo plano:',
    payload
  );

  return (async () => {
    await logDiag(
      'FCM_BACKGROUND_RECEBIDO',
      resumo
    );

    /*
     * MASTER 9.7.6.1 — CORREÇÃO DE DUPLICIDADE
     *
     * Quando a mensagem possui "notification", o próprio Firebase
     * Messaging exibe a notificação do sistema automaticamente.
     *
     * A versão anterior chamava showNotification() novamente,
     * causando duas notificações iguais.
     */
    if(
      payload &&
      payload.notification
    ){
      await logDiag(
        'FCM_AUTO_NOTIFICATION',
        {
          title:
            payload.notification.title || '',
          body:
            payload.notification.body || ''
        }
      );

      return;
    }

    /*
     * Mensagens DATA-ONLY não são exibidas automaticamente.
     * Para elas mantemos showNotification() manual.
     */
    const data =
      (payload && payload.data) || {};

    const fcmOptions =
      (payload && payload.fcmOptions) || {};

    const title =
      data.title ||
      'IDEAL Supermercados';

    const options = {
      body:
        data.body ||
        'Você recebeu uma nova atualização.',
      icon:
        data.icon ||
        './icon-192.png',
      badge:
        './icon-192.png',
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

    try{
      await self.registration.showNotification(
        title,
        options
      );

      await logDiag(
        'SHOW_NOTIFICATION_OK',
        {
          title,
          body: options.body
        }
      );
    }catch(err){
      await logDiag(
        'SHOW_NOTIFICATION_ERRO',
        {
          mensagem:
            String(
              err &&
              (err.stack || err.message) ||
              err
            )
        }
      );

      throw err;
    }
  })();
});

/* =========================
   PWA
   ========================= */

self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      logDiag(
        'SW_INSTALL',
        { cache: CACHE_NAME }
      ),
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(STATIC_FILES))
        .then(() => self.skipWaiting())
    ])
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      await logDiag(
        'SW_ACTIVATE',
        {
          cache: CACHE_NAME,
          scriptURL: self.location.href
        }
      );

      const keys = await caches.keys();

      await Promise.all(
        keys.map(key =>
          key === CACHE_NAME
            ? Promise.resolve()
            : caches.delete(key)
        )
      );

      await self.clients.claim();
    })()
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
