/* =========================================================
   IDEAL SUPERMERCADOS — MASTER 9.7.2
   FIREBASE CLOUD MESSAGING — SERVICE WORKER
   ========================================================= */

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
 * Para mensagens "data-only" enviadas futuramente pelo nosso backend,
 * este bloco cria a notificação.
 *
 * Mensagens que já chegam com payload "notification" são exibidas pelo
 * próprio FCM, evitando notificação duplicada.
 */
messaging.onBackgroundMessage((payload) => {
  console.log(
    '[IDEAL Push] Mensagem em segundo plano:',
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
        './index.html'
    }
  };

  return self.registration.showNotification(
    title,
    options
  );
});

/*
 * Ao tocar em uma notificação criada pelo nosso service worker,
 * abre ou traz o PWA para frente.
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destino =
    (event.notification &&
     event.notification.data &&
     event.notification.data.url)
      ? event.notification.data.url
      : './index.html';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((lista) => {
      for(const client of lista){
        if('focus' in client){
          client.navigate(destino);
          return client.focus();
        }
      }

      if(clients.openWindow){
        return clients.openWindow(destino);
      }
    })
  );
});
