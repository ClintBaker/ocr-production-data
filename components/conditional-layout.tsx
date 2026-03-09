'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './navbar'
import { Footer } from './footer'

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isRootPage = pathname === '/'

  return (
    <>
      {!isRootPage && <Navbar />}
      <main className="flex-1">{children}</main>
      {!isRootPage && <Footer />}
    </>
  )
}
