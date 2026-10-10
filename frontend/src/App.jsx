import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import OAuthCallback from './pages/OAuthCallback/OAuthCallback';
import Dashboard from './pages/Dashboard/Dashboard';
import WorkflowBuilder from './pages/WorkflowBuilder/WorkflowBuilder';
import Credentials from './pages/Credentials/Credentials';
import ExecutionsList from './pages/Executions/ExecutionsList';
import ExecutionDetail from './pages/Executions/ExecutionDetail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/workflows/new" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
          <Route path="/workflows/:id" element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
          <Route path="/executions" element={<ProtectedRoute><ExecutionsList /></ProtectedRoute>} />
          <Route path="/executions/:id" element={<ProtectedRoute><ExecutionDetail /></ProtectedRoute>} />
          <Route path="/credentials" element={<ProtectedRoute><Credentials /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}