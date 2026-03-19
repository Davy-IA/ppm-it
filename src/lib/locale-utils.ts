import { Locale } from './i18n';

// Map app locale to BCP 47 language tag for Intl APIs
export const LOCALE_TO_BCP47: Record<Locale, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  pt: 'pt-BR',
  zh: 'zh-CN',
};

export function formatMonth(dateStr: string, locale: Locale, options: Intl.DateTimeFormatOptions = { month: 'short' }): string {
  return new Date(dateStr + '-01').toLocaleDateString(LOCALE_TO_BCP47[locale], options);
}

export function formatDate(dateStr: string, locale: Locale, options?: Intl.DateTimeFormatOptions): string {
  const opts = options ?? { day: '2-digit', month: 'short', year: '2-digit' };
  return new Date(dateStr).toLocaleDateString(LOCALE_TO_BCP47[locale], opts);
}

export function formatDateTime(dateStr: string, locale: Locale): string {
  return new Date(dateStr).toLocaleDateString(LOCALE_TO_BCP47[locale], {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
