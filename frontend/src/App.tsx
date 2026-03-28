import PresentationMock from './pages/Presentation';
import './index.css';
import Index from './pages/Index';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index/>} />
        <Route path="/record" element={<PresentationMock/>} />
      </Routes>
    </Router>

  )
}

export default App
