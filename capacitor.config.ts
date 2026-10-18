import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meman.moveman',
  appName: 'MEMAN 이사견적',
  webDir: 'public',
  server: {
    url: 'https://move-man.onrender.com',
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: false,
    webContentsDebuggingEnabled: true
  }
};

export default config;
