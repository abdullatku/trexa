import { useSearchParams } from 'react-router-dom';
import { SelectPlan } from '../student/SelectPlan';
import { TrexaLogo } from '../ui/logo';

export function SelectPlanPage() {
  const [searchParams] = useSearchParams();
  const isAfterSignup = searchParams.get('signup') === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {isAfterSignup && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <TrexaLogo className="h-10 text-indigo-600" />
            </div>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <SelectPlan afterSignup={isAfterSignup} />
        </div>
      </div>
    </div>
  );
}
