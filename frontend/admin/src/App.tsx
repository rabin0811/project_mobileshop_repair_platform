import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './lib/auth';
import { AdminShell } from './layout/AdminShell';
import { LoginPage } from './features/login/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { BookingsPage } from './features/bookings/BookingsPage';
import { BookingDetailPage } from './features/bookings/BookingDetailPage';
import { PlaceholderPage } from './features/placeholders/PlaceholderPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AdminShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="customers" element={<PlaceholderPage title="Customers" />} />
          <Route path="technicians" element={<PlaceholderPage title="Technicians" />} />
          <Route path="invoices" element={<PlaceholderPage title="Invoices" />} />
          <Route path="reviews" element={<PlaceholderPage title="Reviews" />} />
          <Route path="catalog" element={<PlaceholderPage title="Catalog" />} />
          <Route path="branches" element={<PlaceholderPage title="Branches" />} />
          <Route path="coupons" element={<PlaceholderPage title="Coupons" />} />
          <Route path="cms" element={<PlaceholderPage title="CMS" />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="audit" element={<PlaceholderPage title="Audit log" />} />
          <Route path="*" element={<PlaceholderPage title="Page not found" />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
