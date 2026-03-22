import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home';
import About from './pages/About';
import Pricing from './pages/Pricing';
import Login from './pages/Login';
import { AuthProvider } from './contexts/AuthContext';
import Signup from './pages/Signup';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CursorGlow from './components/CursorGlow';
import PageTransition from './components/PageTransition';
import PageLoader from './components/PageLoader';
import NotFound from './pages/NotFound';

function App() {
  const location = useLocation();

  return (
    <AuthProvider>
      <div className="relative min-h-screen bg-bg selection:bg-accent/30 selection:text-white">
        {/* Initial Loading Overlay */}
        <PageLoader />

        <CursorGlow />
        <Navbar />
        
        <main className="min-h-screen pt-[72px]">
           <PageTransition>
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
           </PageTransition>
        </main>

        <Footer />
      </div>
    </AuthProvider>
  );
}

export default App;
