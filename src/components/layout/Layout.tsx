import { Outlet } from 'react-router-dom'
import { AnnouncementBar } from '@/components/AnnouncementBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { ScrollToTop } from './ScrollToTop'

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <AnnouncementBar />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
