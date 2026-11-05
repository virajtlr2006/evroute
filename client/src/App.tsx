import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import ChargersPage from '@/pages/ChargersPage';
import ChargerDetailPage from '@/pages/ChargerDetailPage';
import TripPage from '@/pages/TripPage';
import CostPage from '@/pages/CostPage';
import AddChargerPage from '@/pages/AddChargerPage';
import ServicesPage from '@/pages/ServicesPage';
import BatteryPage from '@/pages/BatteryPage';
import BookingsPage from '@/pages/BookingsPage';
import LearnPage from '@/pages/LearnPage';
import AuthPage from '@/pages/AuthPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ChargersPage />} />
        <Route path="chargers/:id" element={<ChargerDetailPage />} />
        <Route path="trip" element={<TripPage />} />
        <Route path="cost" element={<CostPage />} />
        <Route path="add" element={<AddChargerPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="battery" element={<BatteryPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="login" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
