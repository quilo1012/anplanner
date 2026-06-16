import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { LeaderQualityBoard } from '@/components/charts/LeaderQualityBoard';

const today = format(new Date(), 'yyyy-MM-dd');

export function LeaderQualityDashboard() {
  return (
    <>
      <Header title="Leader Quality Board" subtitle="Dedicated quality scorecard view" />
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="card p-3">
          <LeaderQualityBoard startDate={today} endDate={today} />
        </div>
      </div>
    </>
  );
}
