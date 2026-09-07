import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DonorPage from './pages/DonorPage.jsx'
import InstitutionPage from './pages/InstitutionPage.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/donor" element={<DonorPage />} />
        <Route path="/institution" element={<InstitutionPage />} />
      </Route>
    </Routes>
  )
}
