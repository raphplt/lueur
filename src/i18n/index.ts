import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import type { AppLocale } from '@/domain/format';
import type { LanguagePreference } from '@/domain/settings';

import en from './en';
import fr from './fr';

export const resources = { fr: { translation: fr }, en: { translation: en } } as const;

export function systemLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode;
  return code === 'fr' ? 'fr' : 'en';
}

export function resolveLocale(pref: LanguagePreference): AppLocale {
  return pref === 'system' ? systemLocale() : pref;
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: systemLocale(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function setLocale(locale: AppLocale): void {
  if (i18n.language !== locale) void i18n.changeLanguage(locale);
}

/** Current app locale, as used by formatting helpers. */
export function useLocale(): AppLocale {
  const { i18n: inst } = useTranslation();
  return inst.language === 'en' ? 'en' : 'fr';
}

export { useTranslation };
export default i18n;
