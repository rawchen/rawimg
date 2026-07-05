import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { LandingPage } from '@/pages/LandingPage';
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
import { InspirationAdminPage } from '@/pages/admin/InspirationAdminPage';
import { ImageTasksPage } from '@/pages/admin/ImageTasksPage';
import { EditorLayout } from '@/components/editor/EditorLayout';
import { ImageEnhancePage } from '@/pages/ImageEnhancePage.tsx';
import { ImageCreatePage } from '@/pages/ImageCreatePage.tsx';
import { ImageRemovePage } from '@/pages/ImageRemovePage.tsx';
import { ImageExpandPage } from '@/pages/ImageExpandPage.tsx';
import { ImageMattingPage } from '@/pages/ImageMattingPage.tsx';

function AppContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');
  const isEditorPage = location.pathname.startsWith('/editor');
  const isCreatePage = location.pathname === '/create';
  const isEnhancePage = location.pathname === '/enhance';
  const isRemovePage = location.pathname === '/remove';
  const isExpandPage = location.pathname === '/expand';
  const isMattingPage = location.pathname === '/matting';

  const [isScrolled, setIsScrolled] = useState(false);
  const scrollElementRef = useRef<HTMLElement | null>(null);

  // 使用回调 ref，确保在元素挂载时立即绑定事件
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setIsScrolled(target.scrollTop > 50);
  }, []);

  const scrollContainerRef = useCallback((element: HTMLElement | null) => {
    if (scrollElementRef.current) {
      scrollElementRef.current.removeEventListener('scroll', handleScroll);
    }
    scrollElementRef.current = element;
    if (element) {
      element.addEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    return () => {
      if (scrollElementRef.current) {
        scrollElementRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  return (
    <div className={`flex flex-col h-screen overflow-hidden`}>
      {!isEditorPage && <Header scrolled={isScrolled} />}
      <main ref={scrollContainerRef} id="scroll-container" className={isEditorPage ? 'flex-1 overflow-hidden' : 'flex-1 overflow-y-auto mt-16'}>
        <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Gallery Routes */}
            <Route path="/galleries" element={<HomePage />} />
            <Route path="/galleries/latest" element={<HomePage />} />
            <Route path="/galleries/like" element={<HomePage />} />
            <Route path="/galleries/hot" element={<HomePage />} />
            <Route path="/galleries/down" element={<HomePage />} />

            {/* Legacy Routes - redirect to galleries */}
            <Route path="/like" element={<HomePage />} />
            <Route path="/hot" element={<HomePage />} />
            <Route path="/down" element={<HomePage />} />

            {/* Frontend Routes */}
            <Route path="/id/:id" element={<GalleryDetailPage />} />
            <Route path="/not-found" element={<NotFoundPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/recharge" element={<RechargePage />} />

            {/* Image Enhance Route */}
            <Route path="/enhance" element={<ImageEnhancePage />} />

            {/* Image Create Route */}
            <Route path="/create" element={<ImageCreatePage />} />

            {/* Image Remove Route */}
            <Route path="/remove" element={<ImageRemovePage />} />

            {/* Image Expand Route */}
            <Route path="/expand" element={<ImageExpandPage />} />

            {/* Image Matting Route */}
            <Route path="/matting" element={<ImageMattingPage />} />

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
            <Route path="/admin/inspiration" element={<ProtectedRoute requireAdmin><InspirationAdminPage /></ProtectedRoute>} />
            <Route path="/admin/image-tasks" element={<ProtectedRoute requireAdmin><ImageTasksPage /></ProtectedRoute>} />
            <Route path="/admin/config" element={<ProtectedRoute requireAdmin><ConfigPage /></ProtectedRoute>} />

          {/* 404 - Catch all unmatched routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      {!isAdminPage && !isEditorPage && !isLandingPage && !isCreatePage && !isEnhancePage && !isRemovePage && !isExpandPage && !isMattingPage && <Footer />}
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
