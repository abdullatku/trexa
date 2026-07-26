import { PaymentHistory } from '../shared/PaymentHistory';
import { InterviewerFeeHistory } from '../shared/InterviewerFeeHistory';

export function AdminPayments() {
  return (
    <div className="space-y-10">
      <PaymentHistory
        title="Plan Payments"
        description="Candidate payment records across plans"
        showCustomer
      />
      <InterviewerFeeHistory
        title="Interviewer Payments"
        description="Interview fee obligations for assigned interviewers"
        showInterviewer
        canRelease
      />
    </div>
  );
}
