/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 12 · FASE 16.8 — RECUPERAÇÃO DA 16.5 FUNCIONAL
   FIREBASE MESSAGING + PWA — FID
   ========================================================= */

const CACHE_NAME = 'ideal-ofertas-pwa-shell-v12-fase16-8-recuperacao-165';

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

/* =========================================================
   FASE 16.5 — PUSH AUTÔNOMO DO IDEAL
   O Service Worker exibe a notificação diretamente e não usa
   a heurística de visibilidade do Firebase Messaging.
   ========================================================= */

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    let bruto = '';

    try{
      if(event.data){
        try{
          payload = event.data.json() || {};
        }catch(_){
          bruto = event.data.text() || '';
          try{
            payload = JSON.parse(bruto);
          }catch(__){
            payload = {};
          }
        }
      }
    }catch(err){
      await logDiag(
        'PUSH_PARSE_ERRO',
        { mensagem: String(err && (err.message || err)) }
      );
    }

    await logDiag(
      'PUSH_RAW_RECEBIDO',
      payload && Object.keys(payload).length
        ? payload
        : (bruto || 'evento push sem payload')
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

    const body =
      notification.body ||
      data.body ||
      'Você recebeu uma nova atualização.';

    const icon =
      notification.icon ||
      data.icon ||
      './icon-192.png';

    const badge =
      notification.badge ||
      data.badge ||
      './icon-192.png';

    const tag =
      notification.tag ||
      data.tag ||
      (
        payload && payload.fcmMessageId
          ? 'ideal-' + payload.fcmMessageId
          : 'ideal-ofertas'
      );

    const url =
      (
        fcmOptions &&
        fcmOptions.link
      ) ||
      data.url ||
      './';

    try{
      await self.registration.showNotification(
        title,
        {
          body: body,
          icon: icon,
          badge: badge,
          tag: tag,
          renotify: true,
          requireInteraction: false,
          data: { url: url }
        }
      );

      await logDiag(
        'SHOW_NOTIFICATION_OK',
        {
          origem: 'IDEAL_SW_AUTONOMO_16_5',
          title: title,
          body: body
        }
      );
    }catch(err){
      await logDiag(
        'SHOW_NOTIFICATION_ERRO',
        {
          origem: 'IDEAL_SW_AUTONOMO_16_5',
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
  })());
});

/* MASTER 12 · ETAPA 15.4 — teste local do canal de notificações. */
self.addEventListener('message', event => {
  const d = event && event.data ? event.data : {};
  if(d.type !== 'IDEAL_TEST_NOTIFICATION') return;

  event.waitUntil(
    self.registration.showNotification(
      d.title || 'Teste local IDEAL',
      {
        body: d.body || 'Canal de notificações funcionando.',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'ideal-teste-local',
        data: { url: d.url || './' }
      }
    )
  );
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
