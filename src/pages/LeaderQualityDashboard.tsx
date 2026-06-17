import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { LeaderQualityBoard } from '@/components/charts/LeaderQualityBoard';
import { QualityTrendChart } from '@/components/charts/QualityTrendChart';
import { useAuth } from '@/contexts/AuthContext';

const today = format(new Date(), 'yyyy-MM-dd');

export function LeaderQualityDashboard() {
  const { user } = useAuth();
  return (
    <>
      <Header title="Leader Quality Board" subtitle="Dedicated quality scorecard view" />
      <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
        <div className="card p-3">
          <LeaderQualityBoard startDate={today} endDate={today} excludeLeader={user?.name} />
        </div>
        <div className="card p-3">
          <QualityTrendChart days={30} excludeLeader={user?.name} />
        </div>
      </div>
    </>
  );
}
