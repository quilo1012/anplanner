import { Factory } from 'lucide-react';

export function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4">
      <div className="flex items-center gap-3 mb-2">
        <Factory size={28} className="text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          WELCOME TO APPLIED NUTRITION
        </h1>
      </div>
      <h2 className="text-lg sm:text-xl font-semibold text-primary">
        SHIFT REPORT
      </h2>
    </div>
  );
}
