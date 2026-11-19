/**
 * App.tsx
 * Route map of the whole product. Two areas share one data store:
 *   /          customer web app (ClientLayout)
 *   /admin/*   independent admin panel (AdminLayout, requires staff login)
 * Admin sections are also protected per-permission inside AdminLayout.
 */
import { Navigate, Route, Routes } from 'react-router-dom'
import ClientLayout from './components/ClientLayout'
import AdminLayout from './components/AdminLayout'
import Home from './pages/client/Home'
import Login from './pages/client/Login'
import Spaces from './pages/client/Spaces'
import SpaceDetail from './pages/client/SpaceDetail'
import Checkout from './pages/client/Checkout'
import MyBookings from './pages/client/MyBookings'
import BookingDetail from './pages/client/BookingDetail'
import Plans from './pages/client/Plans'
import DayPassPage from './pages/client/DayPassPage'
import Profile from './pages/client/Profile'
import Community from './pages/client/Community'
import PublicProfile from './pages/client/PublicProfile'
import Rewards from './pages/client/Rewards'
import Dashboard from './pages/admin/Dashboard'
import CalendarPage from './pages/admin/CalendarPage'
import SpacesAdmin from './pages/admin/SpacesAdmin'
import UsersAdmin from './pages/admin/UsersAdmin'
import Finance from './pages/admin/Finance'
import Reports from './pages/admin/Reports'
import PlansAdmin from './pages/admin/PlansAdmin'
import AccessAdmin from './pages/admin/AccessAdmin'
import Moderation from './pages/admin/Moderation'
import SettingsPage from './pages/admin/SettingsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<ClientLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="spaces" element={<Spaces />} />
        <Route path="spaces/:id" element={<SpaceDetail />} />
        <Route path="checkout/:id" element={<Checkout />} />
        <Route path="bookings" element={<MyBookings />} />
        <Route path="bookings/:id" element={<BookingDetail />} />
        <Route path="plans" element={<Plans />} />
        <Route path="daypass" element={<DayPassPage />} />
        <Route path="profile" element={<Profile />} />
        <Route path="community" element={<Community />} />
        <Route path="u/:id" element={<PublicProfile />} />
        <Route path="rewards" element={<Rewards />} />
      </Route>
      <Route path="admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="spaces" element={<SpacesAdmin />} />
        <Route path="users" element={<UsersAdmin />} />
        <Route path="finance" element={<Finance />} />
        <Route path="reports" element={<Reports />} />
        <Route path="plans" element={<PlansAdmin />} />
        <Route path="access" element={<AccessAdmin />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
