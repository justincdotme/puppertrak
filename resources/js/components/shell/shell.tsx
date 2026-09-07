import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomTabs } from '@/components/shell/bottom-tabs'
import { SideNav } from '@/components/shell/side-nav'
import { DogsListPage } from '@/pages/dogs-list'
import { DogPage } from '@/pages/dog'
import { DogFormPage } from '@/pages/dog-form'
import { DogHistoryPage } from '@/pages/dog-history'
import { HistoryPage } from '@/pages/history'
import { PantryPage } from '@/pages/pantry'

/**
 * One responsive shell: side nav from md up, bottom tabs below it. Screens
 * are fluid, with no fixed pixel column anywhere.
 */
export function Shell() {
  return (
    <div className="flex min-h-dvh bg-background">
      <SideNav />
      <main className="flex min-w-0 flex-1 flex-col pb-24 md:pb-0">
        <Routes>
          <Route path="/" element={<DogsListPage />} />
          <Route path="/dogs/new" element={<DogFormPage />} />
          <Route path="/dogs/:slug" element={<DogPage />} />
          <Route path="/dogs/:slug/edit" element={<DogFormPage />} />
          <Route path="/dogs/:slug/history" element={<DogHistoryPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomTabs />
    </div>
  )
}
