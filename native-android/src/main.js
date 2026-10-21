import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const NATIVE_VERSION = '1.1-DIAG-PUSH';

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

const diag = {
  versao: NATIVE_VERSION,
  plataforma:
    Capacitor.isNativePlatform()
      ? Capacitor.getPlatform()
      : 'web',
  permissao: 'verificando',
  iframe: 'aguardando',
  firebaseRegistro: tokenNativo ? 'TOKEN LOCAL EXISTE' : 'aguardando',
  tokenSufixo: tokenNativo ? tokenNativo.slice(-12) : '',
  envioPwa: 'aguardando',
  pwaRecebeu: 'aguardando',
  pingPwa: 'aguardando',
  ponteAppsScript: 'desconhecida',
  backend: 'aguardando',
  ultimoErro: '',
  atualizadoEm: new Date().toLocaleString('pt-BR')
};

function salvarDiag() {
  diag.atualizadoEm =
    new Date().toLocaleString('pt-BR');

  try {
    localStorage.setItem(
      'idealNativeDiag',
      JSON.stringify(diag)
    );
  } catch (_) {}

  renderDiag();
}

function setDiag(campo, valor) {
  diag[campo] = valor;
  salvarDiag();
}

function criarDiagUI() {
  const botao =
    document.createElement('button');

  botao.id = 'idealNativeDiagBtn';
  botao.type = 'button';
  botao.textContent = '🧪 Android';

  botao.style.cssText =
    'position:fixed;right:12px;top:12px;z-index:2147483647;' +
    'border:0;border-radius:999px;padding:9px 12px;' +
    'background:#202124;color:#fff;font:800 12px Arial;' +
    'box-shadow:0 6px 20px rgba(0,0,0,.28)';

  const painel =
    document.createElement('pre');

  painel.id = 'idealNativeDiagPanel';

  painel.style.cssText =
    'display:none;position:fixed;left:12px;right:12px;top:58px;' +
    'z-index:2147483647;max-height:62vh;overflow:auto;' +
    'margin:0;padding:14px;border-radius:14px;background:#111;' +
    'color:#f5f5f5;font:12px/1.5 Consolas,monospace;' +
    'white-space:pre-wrap;word-break:break-word;' +
    'box-shadow:0 12px 36px rgba(0,0,0,.4)';

  botao.addEventListener('click', () => {
    painel.style.display =
      painel.style.display === 'block'
        ? 'none'
        : 'block';

    renderDiag();
  });

  document.body.appendChild(botao);
  document.body.appendChild(painel);

  renderDiag();
}

function renderDiag() {
  const painel =
    document.getElementById(
      'idealNativeDiagPanel'
    );

  if (!painel) return;

  painel.textContent = [
    'IDEAL OFERTAS — ANDROID NATIVO',
    'Versão: ' + diag.versao,
    'Atualizado: ' + diag.atualizadoEm,
    '',
    'Plataforma Capacitor: ' + diag.plataforma,
    'Permissão Push: ' + diag.permissao,
    'Iframe IDEAL: ' + diag.iframe,
    'Firebase registro: ' + diag.firebaseRegistro,
    'Token sufixo: ' + (diag.tokenSufixo || '—'),
    'Envio APK → PWA: ' + diag.envioPwa,
    'PWA recebeu token: ' + diag.pwaRecebeu,
    'Ping APK ↔ PWA: ' + diag.pingPwa,
    'Ponte Apps Script: ' + diag.ponteAppsScript,
    'Backend/planilha: ' + diag.backend,
    '',
    'Último erro: ' + (diag.ultimoErro || 'nenhum')
  ].join('\n');
}

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

function pingPwa() {
  if (!frame || !frame.contentWindow) {
    return;
  }

  try {
    frame.contentWindow.postMessage(
      {
        type: 'IDEAL_NATIVE_DIAG_PING',
        version: NATIVE_VERSION
      },
      APP_ORIGIN
    );
  } catch (err) {
    setDiag(
      'ultimoErro',
      'Ping PWA: ' +
      String(err?.message || err)
    );
  }
}

function enviarTokenParaPwa() {
  if (!tokenNativo) {
    setDiag(
      'envioPwa',
      'SEM TOKEN FCM'
    );
    return false;
  }

  if (
    !frame ||
    !frame.contentWindow
  ) {
    setDiag(
      'envioPwa',
      'IFRAME NÃO PRONTO'
    );
    return false;
  }

  try {
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

    setDiag(
      'envioPwa',
      'ENVIADO ' +
      new Date().toLocaleTimeString('pt-BR')
    );

    return true;
  } catch (err) {
    setDiag(
      'envioPwa',
      'ERRO'
    );

    setDiag(
      'ultimoErro',
      'Envio PWA: ' +
      String(err?.message || err)
    );

    return false;
  }
}

frame.addEventListener(
  'load',
  () => {
    setDiag(
      'iframe',
      'CARREGADO ' +
      new Date().toLocaleTimeString('pt-BR')
    );

    [300, 1000, 2500, 5000].forEach(t => {
      window.setTimeout(
        pingPwa,
        t
      );
    });

    [500, 1500, 3500, 7000].forEach(t => {
      window.setTimeout(
        enviarTokenParaPwa,
        t
      );
    });
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
      'IDEAL_NATIVE_DIAG_PONG'
    ) {
      setDiag(
        'pingPwa',
        'OK'
      );

      setDiag(
        'ponteAppsScript',
        msg.pontePronta
          ? 'PRONTA'
          : 'AINDA NÃO PRONTA'
      );

      return;
    }

    if (
      msg.type ===
      'IDEAL_NATIVE_TOKEN_RECEBIDO'
    ) {
      setDiag(
        'pwaRecebeu',
        'SIM · ...' +
        String(
          msg.tokenSuffix || ''
        )
      );

      return;
    }

    if (
      msg.type ===
      'IDEAL_NATIVE_PUSH_BACKEND_OK'
    ) {
      setDiag(
        'backend',
        'CONFIRMADO'
      );

      setDiag(
        'ponteAppsScript',
        'PRONTA'
      );

      mostrarStatus(
        '✅ Push nativo conectado ao IDEAL.',
        'ok'
      );

      return;
    }

    if (
      msg.type ===
      'IDEAL_NATIVE_PUSH_BACKEND_ERRO'
    ) {
      setDiag(
        'backend',
        'ERRO'
      );

      setDiag(
        'ultimoErro',
        String(
          msg.erro ||
          'Backend não confirmou o token.'
        )
      );
    }
  }
);

async function prepararPushNativo() {
  criarDiagUI();

  if (
    !Capacitor.isNativePlatform() ||
    Capacitor.getPlatform() !== 'android'
  ) {
    setDiag(
      'ultimoErro',
      'Aplicativo não detectado como Android nativo.'
    );

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
        setDiag(
          'firebaseRegistro',
          'TOKEN VAZIO'
        );

        setDiag(
          'ultimoErro',
          'Firebase retornou token vazio.'
        );

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

      setDiag(
        'firebaseRegistro',
        'OK'
      );

      setDiag(
        'tokenSufixo',
        tokenNativo.slice(-12)
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

      setDiag(
        'firebaseRegistro',
        'ERRO'
      );

      setDiag(
        'ultimoErro',
        'Registro FCM: ' +
        String(
          err?.error ||
          err?.message ||
          JSON.stringify(err)
        )
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

  setDiag(
    'permissao',
    String(permissao.receive || '')
  );

  if (permissao.receive === 'prompt') {
    permissao =
      await PushNotifications.requestPermissions();

    setDiag(
      'permissao',
      String(permissao.receive || '')
    );
  }

  if (permissao.receive !== 'granted') {
    setDiag(
      'ultimoErro',
      'Permissão Push: ' +
      String(permissao.receive || '')
    );

    mostrarStatus(
      'Permita as notificações do IDEAL no Android.',
      'erro'
    );

    return;
  }

  setDiag(
    'firebaseRegistro',
    tokenNativo
      ? 'SOLICITANDO NOVO REGISTRO · token local existe'
      : 'SOLICITANDO REGISTRO'
  );

  await PushNotifications.register();
}

prepararPushNativo()
  .catch(err => {
    console.error(
      '[IDEAL Android] Falha ao iniciar Push:',
      err
    );

    setDiag(
      'ultimoErro',
      'Inicialização: ' +
      String(err?.message || err)
    );

    mostrarStatus(
      'Não foi possível iniciar o Push Android.',
      'erro'
    );
  });
