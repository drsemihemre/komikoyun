import type { Metadata, Viewport } from 'next'
import { Fredoka } from 'next/font/google'
import './globals.css'

const fredoka = Fredoka({
  variable: '--font-fredoka',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Komik Oyun',
  description: 'Eğlenceli ragdoll fizik macerası — binalardan atla, iksir iç, arenada komik yaratıklarla dövüş.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#87ceeb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="tr" className={`${fredoka.variable} h-full antialiased`}>
      <body className="m-0 h-full overflow-hidden bg-sky-200 font-sans">
        {children}
      </body>
    </html>
  )
}
