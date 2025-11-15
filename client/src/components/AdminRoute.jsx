import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.isAdmin) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <h1>403 - Access Denied</h1>
        <p>You don't have admin privileges.</p>
        <a href="/" style={{ color: 'var(--accent)' }}>Go back to auction</a>
      </div>
    );
  }

  return children;
}

export default AdminRoute;
