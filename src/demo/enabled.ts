import Constants from 'expo-constants';

/** Demo tools exist only in development and in demo builds (EXPO_PUBLIC_DEMO=1). */
export const DEMO_ENABLED = __DEV__ || Constants.expoConfig?.extra?.demo === true;
