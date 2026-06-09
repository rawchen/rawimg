import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { HomePage } from '@/pages/HomePage';
import { GalleryDetailPage } from '@/pages/GalleryDetailPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { GalleriesPage } from '@/pages/admin/GalleriesPage';
import { GalleryFormPage } from '@/pages/admin/GalleryFormPage';
import { GalleryEditPage } from '@/pages/admin/GalleryEditPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { CommentsPage } from '@/pages/admin/CommentsPage';
import { ConfigPage } from '@/pages/admin/ConfigPage';
import { LogsPage } from '@/pages/admin/LogsPage';
import { UserActionsPage } from '@/pages/admin/UserActionsPage';
import { OrdersPage } from '@/pages/admin/OrdersPage';
import { CardKeysPage } from '@/pages/admin/CardKeysPage';
import { VipPackagesPage } from '@/pages/admin/VipPackagesPage';
import { RechargePage } from '@/pages/RechargePage';
import { FeedbackPage } from '@/pages/admin/FeedbackPage';
import { EditorLayout } from '@/components/editor/EditorLayout';

function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  const isEditorPage = location.pathname.startsWith('/editor');

  return (
    <div className={`flex flex-col bg-gray-50 ${isEditorPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      {!isEditorPage && <Header />}
      <main className={isEditorPage ? 'flex-1 overflow-hidden' : 'flex-1 pt-16'}>
        <Routes>
            {/* Frontend Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/id/:id" element={<GalleryDetailPage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/recharge" element={<RechargePage />} />
            <Route path="/like" element={<HomePage />} />
            <Route path="/hot" element={<HomePage />} />
            <Route path="/down" element={<HomePage />} />

            {/* Editor Route */}
            <Route path="/editor" element={<ProtectedRoute><EditorLayout /></ProtectedRoute>} />
            <Route path="/editor/:id" element={<ProtectedRoute><EditorLayout /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><DashboardPage /></ProtectedRoute>} />
            <Route path="/admin/galleries" element={<ProtectedRoute requireAdmin><GalleriesPage /></ProtectedRoute>} />
            <Route path="/admin/galleries/new" element={<ProtectedRoute requireAdmin><GalleryFormPage /></ProtectedRoute>} />
            <Route path="/admin/galleries/:id/edit" element={<ProtectedRoute requireAdmin><GalleryEditPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute requireAdmin><UsersPage /></ProtectedRoute>} />
            <Route path="/admin/comments" element={<ProtectedRoute requireAdmin><CommentsPage /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><OrdersPage /></ProtectedRoute>} />
            <Route path="/admin/card-keys" element={<ProtectedRoute requireAdmin><CardKeysPage /></ProtectedRoute>} />
            <Route path="/admin/vip-packages" element={<ProtectedRoute requireAdmin><VipPackagesPage /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute requireAdmin><LogsPage /></ProtectedRoute>} />
            <Route path="/admin/user-actions" element={<ProtectedRoute requireAdmin><UserActionsPage /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute requireAdmin><FeedbackPage /></ProtectedRoute>} />
            <Route path="/admin/config" element={<ProtectedRoute requireAdmin><ConfigPage /></ProtectedRoute>} />

          {/* 404 - Catch all unmatched routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminPage && !isEditorPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
