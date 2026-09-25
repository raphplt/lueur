process.env.TZ = 'Europe/Paris';

/* global jest */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', languageTag: 'fr-FR' }],
  getCalendars: () => [{ timeZone: 'Europe/Paris', uses24hourClock: true, firstWeekday: 2 }],
}));

jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
