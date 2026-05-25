import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noteflow.app',
  appName: 'Note Flow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
