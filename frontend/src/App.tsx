import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';
import ScanResultPage from './pages/ScanResultPage';
import ProtectedRoute from './components/ProtectedRoute';
import { IDEMode } from './pages/IDEMode';
import IDEPage from './pages/IDEPage';

function App() {
  return (
    <div className="min-h-screen bg-background text-white font-sans">
      <Routes>
        {/* All routes require authentication */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan"
          element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan/:id"
          element={
            <ProtectedRoute>
              <ScanResultPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scan/:id/ide"
          element={
            <ProtectedRoute>
              <IDEMode />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ide/:sessionId"
          element={
            <ProtectedRoute>
              <IDEPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}


export default App;
