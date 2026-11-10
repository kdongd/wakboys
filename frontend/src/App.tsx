import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import KakaoCallback from './pages/KakaoCallback'
import Invite from './pages/Invite'
import Home from './pages/Home'
import Trips from './pages/Trips'
import TripDetail from './pages/trip/TripDetail'
import Dues from './pages/Dues'
import Feed from './pages/Feed'
import Collection from './pages/Collection'
import MemberDetail from './pages/MemberDetail'
import Me from './pages/Me'
import Admin from './pages/Admin'
import { Spinner } from './components/ui'

export default function App() {
  const { me, ready } = useAuth()
  const loc = useLocation()

  if (!ready) return <Spinner full />

  if (!me) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />
        <Route path="/invite" element={<Invite />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/trips" element={<Trips />} />
        <Route path="/dues" element={<Dues />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/members" element={<Collection />} />
      </Route>
      <Route path="/trips/:id" element={<TripDetail />} />
      <Route path="/members/:slug" element={<MemberDetail />} />
      <Route path="/me" element={<Me />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/auth/kakao/callback" element={<Navigate to="/" replace />} />
      <Route path="/invite" element={<Navigate to="/" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
