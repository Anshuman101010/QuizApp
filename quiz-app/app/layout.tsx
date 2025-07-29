import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import { PageTransition } from '@/components/ui/page-transition'

export const metadata: Metadata = {
  title: 'quiz app',
  description: 'Created by Angshuman, Rayyan, Anshuman',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body style={{ position: 'relative', minHeight: '100vh', background: '#fff' }}>
        <header style={{
          position: 'relative',
          zIndex: 10,
          width: '100%',
          padding: '0.5rem 0',
          background: '#fff',
          boxShadow: '0 2px 16px 0 rgba(0,0,0,0.06)',
          borderBottom: '2px solid #e6c200', // gold
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/college_logo.png"
              alt="NMIMS Logo"
              style={{ height: 56, width: 'auto', marginLeft: 24, marginRight: 16, objectFit: 'contain', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            />
          </Link>
        </header>
        <PageTransition>
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </PageTransition>
      </body>
    </html>
  )
}
