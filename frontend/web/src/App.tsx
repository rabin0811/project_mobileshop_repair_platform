import { Route, Routes, useNavigate } from 'react-router-dom';
import { Button, Container, EmptyState } from '@mobileshop/ui';
import { SearchX } from 'lucide-react';
import Layout from './components/Layout';
import HomePage from './features/home/HomePage';
import ServicesPage from './features/services/ServicesPage';
import ServiceDetailPage from './features/services/ServiceDetailPage';
import BookingPage from './features/booking/BookingPage';
import TrackPage from './features/track/TrackPage';
import BranchesPage from './features/branches/BranchesPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:slug" element={<ServiceDetailPage />} />
        <Route path="book" element={<BookingPage />} />
        <Route path="track" element={<TrackPage />} />
        <Route path="track/:ref" element={<TrackPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <Container className="py-24">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={<Button onClick={() => navigate('/')}>Back to home</Button>}
      />
    </Container>
  );
}
