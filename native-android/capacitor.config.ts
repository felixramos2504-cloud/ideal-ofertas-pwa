/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.idealsupermercados.ofertas',
  appName: 'Ideal Ofertas',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['sound', 'alert', 'banner', 'list']
    }
  }
};

export default config;
