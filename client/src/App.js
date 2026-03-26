import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import HomeownerDashboard from './pages/homeowner/Dashboard';
import HomeownerJobs from './pages/homeowner/Jobs';
import HomeownerJobDetail from './pages/homeowner/JobDetail';
import SubmitJob from './pages/homeowner/SubmitJob';
import CompanyDashboard from './pages/company/Dashboard';
import BrowseJobs from './pages/company/BrowseJobs';
import CompanyJobDetail from './pages/company/JobDetail';
import MyBids from './pages/company/MyBids';
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminJobs from './pages/admin/Jobs';
import AdminCompanies from './pages/admin/Companies';

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner"></div><p style={{color:'var(--gray)',fontSize:'0.88rem'}}>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function RoleRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'homeowner') return <Navigate to="/homeowner" replace />;
  if (user.role === 'company')   return <Navigate to="/company"   replace />;
  if (user.role === 'admin')     return <Navigate to="/admin"     replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/"         element={<RoleRedirect />} />
        <Route path="/homeowner" element={<PrivateRoute roles={['homeowner']}><Layout /></PrivateRoute>}>
          <Route index           element={<HomeownerDashboard />} />
          <Route path="jobs"     element={<HomeownerJobs />} />
          <Route path="jobs/:id" element={<HomeownerJobDetail />} />
          <Route path="submit"   element={<SubmitJob />} />
        </Route>
        <Route path="/company" element={<PrivateRoute roles={['company']}><Layout /></PrivateRoute>}>
          <Route index           element={<CompanyDashboard />} />
          <Route path="browse"   element={<BrowseJobs />} />
          <Route path="jobs/:id" element={<CompanyJobDetail />} />
          <Route path="bids"     element={<MyBids />} />
        </Route>
        <Route path="/admin" element={<PrivateRoute roles={['admin']}><Layout /></PrivateRoute>}>
          <Route index            element={<AdminDashboard />} />
          <Route path="users"     element={<AdminUsers />} />
          <Route path="jobs"      element={<AdminJobs />} />
          <Route path="companies" element={<AdminCompanies />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
