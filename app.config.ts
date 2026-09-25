import type { ConfigContext, ExpoConfig } from 'expo/config';

const VERSION = '1.0.0';
/** Monotonic build number, set by fastlane/CI (LUEUR_BUILD_NUMBER). */
const BUILD_NUMBER = Number(process.env.LUEUR_BUILD_NUMBER ?? 1);

const INK = '#1C1A1F';
const PAPER = '#EFE8DC';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Lueur',
  slug: 'lueur',
  platforms: ['ios', 'android'],
  version: VERSION,
  orientation: 'portrait',
  scheme: 'lueur',
  userInterfaceStyle: 'automatic',
  backgroundColor: INK,
  icon: './assets/brand/generated/icon-ios.png',
  ios: {
    bundleIdentifier: 'app.lueur',
    buildNumber: String(BUILD_NUMBER),
    supportsTablet: false,
    icon: {
      light: './assets/brand/generated/icon-ios.png',
      dark: './assets/brand/generated/icon-ios-dark.png',
      tinted: './assets/brand/generated/icon-ios-tinted.png',
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      CFBundleAllowMixedLocalizations: true,
      CFBundleDevelopmentRegion: 'fr',
      CFBundleLocalizations: ['fr', 'en'],
    },
    // Local-only app: declares required-reason APIs used by React Native and Expo,
    // no tracking, no collected data (docs/STORE.md).
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['C617.1', '0A2A.1', '3B52.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
          NSPrivacyAccessedAPITypeReasons: ['35F9.1'],
        },
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
          NSPrivacyAccessedAPITypeReasons: ['E174.1', '85F4.1'],
        },
      ],
    },
  },
  android: {
    package: 'app.lueur',
    versionCode: BUILD_NUMBER,
    adaptiveIcon: {
      foregroundImage: './assets/brand/generated/android-foreground.png',
      backgroundImage: './assets/brand/generated/android-background.png',
      monochromeImage: './assets/brand/generated/android-monochrome.png',
      backgroundColor: INK,
    },
    predictiveBackGestureEnabled: true,
    // Nothing here needs these; some libraries declare them by default.
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.WRITE_SETTINGS',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.RECORD_AUDIO',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'com.google.android.c2dm.permission.RECEIVE',
      'com.google.android.gms.permission.AD_ID',
    ],
  },
  locales: {
    fr: './assets/locales/fr.json',
    en: './assets/locales/en.json',
  },
  plugins: [
    // Registered first so its mod runs last (after expo-notifications).
    './plugins/with-ios-local-notifications-only',
    'expo-router',
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/YoungSerif-Regular.ttf',
          './assets/fonts/YsabeauOffice-Regular.ttf',
          './assets/fonts/YsabeauOffice-Italic.ttf',
          './assets/fonts/YsabeauOffice-Medium.ttf',
          './assets/fonts/YsabeauOffice-SemiBold.ttf',
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: PAPER,
        image: './assets/brand/generated/splash-light.png',
        imageWidth: 140,
        dark: { backgroundColor: INK, image: './assets/brand/generated/splash-dark.png' },
      },
    ],
    [
      'expo-notifications',
      { icon: './assets/brand/generated/notification-icon.png', color: '#B37656' },
    ],
    'expo-sqlite',
    ['expo-localization', { supportedLocales: { ios: ['fr', 'en'], android: ['fr', 'en'] } }],
    'expo-sharing',
    [
      'expo-build-properties',
      {
        android: { enableMinifyInReleaseBuilds: true, enableShrinkResourcesInReleaseBuilds: true },
      },
    ],
    './plugins/with-android-release',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    demo: process.env.EXPO_PUBLIC_DEMO === '1',
  },
});
