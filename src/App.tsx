import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ShiftProvider } from '@/contexts/ShiftContext';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Planner } from '@/pages/Planner';
import { History } from '@/pages/History';

const App = () => (
  <ShiftProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="planner" element={<Planner />} />
          <Route path="history" element={<History />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </ShiftProvider>
);

export default App;
