import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meman.moveman',
  appName: 'MEMAN 이사견적',
  webDir: 'public',
  server: {
    // Render 배포 주소나 내부망 개발 서버 URL을 설정할 수 있습니다.
    // url: 'https://meman.onrender.com', // 실제 배포 주소로 변경하여 즉시 웹앱과 동기화 가능
    cleartext: true,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
