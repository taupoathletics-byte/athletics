import { Routes, Route } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Registration from '@/pages/Registration'
import ClubNights from '@/pages/ClubNights'
import Events from '@/pages/Events'
import Team from '@/pages/Team'
import ClubRecords from '@/pages/ClubRecords'
import Calendar from '@/pages/Calendar'
import Faqs from '@/pages/Faqs'
import Volunteer from '@/pages/Volunteer'
import Brand from '@/pages/Brand'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="registration" element={<Registration />} />
        <Route path="club-nights" element={<ClubNights />} />
        <Route path="events" element={<Events />} />
        <Route path="team" element={<Team />} />
        <Route path="club-records" element={<ClubRecords />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="volunteer" element={<Volunteer />} />
        <Route path="brand" element={<Brand />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
