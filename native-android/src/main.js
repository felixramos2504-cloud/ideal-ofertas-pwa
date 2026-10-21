import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const APP_ORIGIN =
  'https://felixramos2504-cloud.github.io';

const APP_URL =
  APP_ORIGIN + '/ideal-ofertas-pwa/?native=android';

const frame =
  document.getElementById('idealFrame');

const statusEl =
  document.getElementById('nativeStatus');

let tokenNativo =
  localStorage.getItem('idealNativeFcmToken') || '';

function mostrarStatus(texto, tipo = '') {
  if (!statusEl) return;

  statusEl.textContent = texto;
  statusEl.className =
    'status' + (tipo ? ' ' + tipo : '');

  window.clearTimeout(
    window.__idealNativeStatusTimer
  );

  window.__idealNativeStatusTimer =
    window.setTimeout(() => {
      statusEl.classList.add('oculto');
    }, tipo === 'erro' ? 9000 : 4500);
}

function obterIdNativo() {
  let id =
    localStorage.getItem(
      'idealNativeDeviceId'
    ) || '';

  if (id) {
    return id;
  }

  try {
    id = crypto.randomUUID();
  } catch (_) {
    id =
      'android-' +
      Date.now() +
      '-' +
      Math.random()
        .toString(16)
        .slice(2);
  }

  localStorage.setItem(
    'idealNativeDeviceId',
    id
  );

  return id;
}

function enviarTokenParaPwa() {
  if (
    !tokenNativo ||
    !frame ||
    !frame.contentWindow
  ) {
    return;
  }

  frame.contentWindow.postMessage(
    {
      type: 'IDEAL_NATIVE_PUSH_TOKEN',
      payload: {
        idDispositivo:
          'native-' + obterIdNativo(),
        tokenFcm:
          tokenNativo,
        plataforma:
          'ANDROID_NATIVE',
        origem:
          'IDEAL_OFERTAS_ANDROID_NATIVE',
        userAgent:
          navigator.userAgent || ''
      }
    },
    APP_ORIGIN
  );
}

frame.addEventListener(
  'load',
  () => {
    window.setTimeout(
      enviarTokenParaPwa,
      500
    );
  }
);

window.addEventListener(
  'message',
  event => {
    if (event.origin !== APP_ORIGIN) {
      return;
    }

    const msg =
      event.data || {};

    if (
      msg.type ===
      'IDEAL_NATIVE_PUSH_BACKEND_OK'
    ) {
      mostrarStatus(
        '✅ Push nativo conectado ao IDEAL.',
        'ok'
      );
    }
  }
);

async function prepararPushNativo() {
  if (
    !Capacitor.isNativePlatform() ||
    Capacitor.getPlatform() !== 'android'
  ) {
    mostrarStatus(
      'Abra pelo aplicativo Android.',
      'erro'
    );
    return;
  }

  await PushNotifications.addListener(
    'registration',
    token => {
      tokenNativo =
        String(token?.value || '').trim();

      if (!tokenNativo) {
        mostrarStatus(
          'Firebase não retornou o token nativo.',
          'erro'
        );
        return;
      }

      localStorage.setItem(
        'idealNativeFcmToken',
        tokenNativo
      );

      mostrarStatus(
        '✅ Firebase Android registrado.',
        'ok'
      );

      enviarTokenParaPwa();

      window.setTimeout(
        enviarTokenParaPwa,
        1500
      );

      window.setTimeout(
        enviarTokenParaPwa,
        4000
      );
    }
  );

  await PushNotifications.addListener(
    'registrationError',
    err => {
      console.error(
        '[IDEAL Android] Erro no registro FCM:',
        err
      );

      mostrarStatus(
        'Erro ao registrar notificações Android.',
        'erro'
      );
    }
  );

  await PushNotifications.addListener(
    'pushNotificationReceived',
    notification => {
      console.log(
        '[IDEAL Android] Push recebido:',
        notification
      );
    }
  );

  await PushNotifications.addListener(
    'pushNotificationActionPerformed',
    action => {
      const data =
        action?.notification?.data || {};

      const destino =
        String(
          data.url ||
          APP_URL
        );

      if (
        frame &&
        destino.startsWith(APP_ORIGIN)
      ) {
        const separador =
          destino.includes('?')
            ? '&'
            : '?';

        frame.src =
          destino +
          separador +
          'native=android';
      }
    }
  );

  try {
    await PushNotifications.createChannel({
      id: 'ideal_pedidos',
      name: 'IDEAL Ofertas e Pedidos',
      description:
        'Atualizações de pedidos e avisos do IDEAL Supermercados',
      importance: 5,
      vibration: true,
      lights: true,
      lightColor: '#D71920'
    });
  } catch (err) {
    console.warn(
      '[IDEAL Android] Canal padrão:',
      err
    );
  }

  let permissao =
    await PushNotifications.checkPermissions();

  if (permissao.receive === 'prompt') {
    permissao =
      await PushNotifications.requestPermissions();
  }

  if (permissao.receive !== 'granted') {
    mostrarStatus(
      'Permita as notificações do IDEAL no Android.',
      'erro'
    );
    return;
  }

  await PushNotifications.register();
}

prepararPushNativo()
  .catch(err => {
    console.error(
      '[IDEAL Android] Falha ao iniciar Push:',
      err
    );

    mostrarStatus(
      'Não foi possível iniciar o Push Android.',
      'erro'
    );
  });
