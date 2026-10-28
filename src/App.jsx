import { Navigate, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DonorPage from './pages/DonorPage.jsx'
import InstitutionPage from './pages/InstitutionPage.jsx'
import MyPage from './pages/MyPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/donor" element={<DonorPage />} />
        <Route path="/institution" element={<InstitutionPage />} />
        <Route path="/mypage" element={<MyPage />} />
        {/* 예전 주소로 들어와도 마이페이지로 */}
        <Route path="/profile" element={<Navigate to="/mypage" replace />} />
      </Route>
    </Routes>
  )
}
