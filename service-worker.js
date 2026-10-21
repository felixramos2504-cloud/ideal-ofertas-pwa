/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 12 · FASE 16.3 — NOTIFICATION + DATA
   FIREBASE MESSAGING + PWA — FID
   ========================================================= */

const CACHE_NAME = 'ideal-ofertas-pwa-shell-v12-fase16-3-notification';

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
  event.waitUntil((async () => {
    let bruto = null;
    let resumo = 'evento push sem payload';

    try{
      if(event.data){
        try{
          bruto = event.data.json();
        }catch(_){
          resumo = event.data.text();
        }

        if(bruto){
          resumo = bruto;
        }else if(
          typeof resumo === 'string' &&
          resumo.length > 2500
        ){
          resumo = resumo.slice(0, 2500) + '...';
        }
      }
    }catch(err){
      resumo = 'erro ao ler payload: ' + String(err);
    }

    await logDiag(
      'PUSH_RAW_RECEBIDO',
      resumo
    );

    /*
     * FASE 16.1 — EXIBIÇÃO DIRETA PELO EVENTO PUSH
     *
     * O Push FID pode chegar ao Service Worker sem passar pelo
     * onBackgroundMessage. Portanto a decisão de exibir a
     * notificação é feita aqui, no evento nativo "push".
     */
    if(!bruto){
      try{
        if(event.data){
          bruto = JSON.parse(event.data.text());
        }
      }catch(_){}
    }

    const notification =
      (bruto && bruto.notification) || {};

    const data =
      (bruto && bruto.data) || {};

    /*
     * FASE 16.3
     * Se o servidor enviou o payload oficial "notification",
     * deixamos o Firebase Messaging/Chrome exibir a notificação
     * automaticamente em segundo plano. Não chamamos showNotification()
     * aqui para evitar duplicidade.
     */
    if(
      notification &&
      (
        notification.title ||
        notification.body
      )
    ){
      await logDiag(
        'PUSH_NOTIFICATION_AUTOMATICA_FCM',
        {
          title: notification.title || data.title || '',
          body: notification.body || data.body || ''
        }
      );

      return;
    }

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

    const tag =
      notification.tag ||
      data.tag ||
      (
        bruto && bruto.fcmMessageId
          ? 'ideal-' + bruto.fcmMessageId
          : 'ideal-ofertas'
      );

    const url =
      (
        bruto &&
        bruto.fcmOptions &&
        bruto.fcmOptions.link
      ) ||
      data.url ||
      './';

    let clientes = [];

    try{
      clientes =
        await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });
    }catch(_){}

    /*
     * FASE 16.2
     * Em Android/PWA, visibilityState pode continuar como "visible"
     * mesmo depois de o usuário sair para a tela inicial. Por isso,
     * usamos WindowClient.focused para decidir se o app está realmente
     * em primeiro plano.
     */
    const appEmFoco =
      clientes.some(
        client =>
          client &&
          client.focused === true
      );

    if(appEmFoco){
      await logDiag(
        'PUSH_APP_EM_FOCO',
        {
          title: title,
          body: body
        }
      );

      return;
    }

    try{
      await self.registration.showNotification(
        title,
        {
          body: body,
          icon: icon,
          badge:
            data.badge ||
            './icon-192.png',
          tag: tag,
          renotify: true,
          requireInteraction: false,
          data: {
            url: url
          }
        }
      );

      await logDiag(
        'SHOW_NOTIFICATION_OK',
        {
          origem: 'PUSH_RAW_DIRETO',
          title: title,
          body: body
        }
      );
    }catch(err){
      await logDiag(
        'SHOW_NOTIFICATION_ERRO',
        {
          origem: 'PUSH_RAW_DIRETO',
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
    '[IDEAL Push 12.16.1] Mensagem Firebase em segundo plano:',
    payload
  );

  /*
   * FASE 16.1
   * O evento nativo "push" é o responsável exclusivo por
   * showNotification(), evitando duplicidade.
   */
  return logDiag(
    'FCM_BACKGROUND_RECEBIDO',
    resumo
  );
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
