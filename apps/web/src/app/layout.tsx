import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Manrope, Syne } from 'next/font/google';
import { directionForLocale, isLocale } from '@unison/shared';
import { I18nProvider } from '@/components/i18n-provider';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const syne = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UNISON — Work in concert',
  description: 'Multi-tenant work management for teams that move together.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('unison_locale')?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : 'en';
  const dir = directionForLocale(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${manrope.variable} ${syne.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
