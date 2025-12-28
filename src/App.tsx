import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import MarketsPage from './pages/MarketsPage'
import MarketPage from './pages/MarketPage'
import LeaderboardPage from './pages/LeaderboardPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/market/:id" element={<MarketPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
