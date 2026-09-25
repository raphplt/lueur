process.env.TZ = 'Europe/Paris';

/* global jest */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fr', languageTag: 'fr-FR' }],
  getCalendars: () => [{ timeZone: 'Europe/Paris', uses24hourClock: true, firstWeekday: 2 }],
}));
