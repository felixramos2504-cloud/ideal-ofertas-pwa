/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 9.7.2.8
   PUSH NATIVO + PWA
   =========================================================

   Esta versão não depende do Firebase Messaging SDK dentro
   do Service Worker. O token FCM continua sendo criado pelo
   Firebase no index.html, mas a entrega em segundo plano é
   tratada diretamente pelo evento nativo "push".
   ========================================================= */

const CACHE_NAME = 'ideal-ofertas-pwa-shell-v6-push-nativo';

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
   INSTALAÇÃO / ATIVAÇÃO
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

/* =========================
   PUSH NATIVO
   ========================= */

self.addEventListener('push', event => {
  if(!event.data){
    return;
  }

  event.waitUntil(
    (async () => {
      let payload = {};

      try{
        payload = event.data.json() || {};
      }catch(err){
        console.error(
          '[IDEAL Push] Não foi possível ler o payload JSON:',
          err
        );

        try{
          payload = {
            notification: {
              title: 'IDEAL Supermercados',
              body: event.data.text()
            }
          };
        }catch(_){
          payload = {};
        }
      }

      console.log(
        '[IDEAL Push] Evento PUSH recebido:',
        payload
      );

      /*
       * Se houver uma janela visível do PWA, encaminha a mensagem
       * para o index.html mostrar o aviso dentro do aplicativo.
       */
      const lista =
        await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true
        });

      const visiveis =
        lista.filter(client =>
          client.visibilityState === 'visible'
        );

      if(visiveis.length){
        visiveis.forEach(client => {
          client.postMessage({
            type: 'IDEAL_PUSH',
            payload
          });
        });

        return;
      }

      /*
       * Sem janela visível: mostra a notificação do sistema.
       */
      const notification =
        payload.notification || {};

      const data =
        payload.data || {};

      const fcmOptions =
        payload.fcmOptions ||
        payload.fcm_options ||
        {};

      const title =
        notification.title ||
        data.title ||
        'IDEAL Supermercados';

      const body =
        notification.body ||
        data.body ||
        'Você recebeu uma nova atualização.';

      const url =
        fcmOptions.link ||
        notification.click_action ||
        data.url ||
        './';

      const options = {
        body,
        icon:
          notification.icon ||
          data.icon ||
          './icon-192.png',
        badge: './icon-192.png',
        tag:
          data.tag ||
          'ideal-ofertas',
        renotify: true,
        data: { url }
      };

      await self.registration.showNotification(
        title,
        options
      );
    })()
  );
});

/* =========================
   CLIQUE NA NOTIFICAÇÃO
   ========================= */

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

/* =========================
   CACHE / REDE
   ========================= */

self.addEventListener('fetch', event => {
  const req = event.request;

  if(req.method !== 'GET'){
    return;
  }

  const url = new URL(req.url);

  /*
   * Não interfere no Google Apps Script carregado no iframe.
   */
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
