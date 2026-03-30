import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Montserrat } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-serif",
})

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: 'Nitia Estudio - Gestion',
  description: 'Sistema de gestion para Nitia Estudio de Arquitectura e Interiorismo',
  icons: {
    icon: '/images/nitia-logo.png',
    apple: '/images/nitia-logo.png',
    shortcut: '/images/nitia-logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#5F5A46',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${cormorant.variable} ${montserrat.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
