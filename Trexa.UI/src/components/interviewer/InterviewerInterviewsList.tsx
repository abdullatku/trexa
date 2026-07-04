import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Calendar, Clock, FileText, Video, CheckCircle, XCircle, ChevronLeft, ChevronRight, IndianRupee } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Interview {
  id: string;
  studentId: string;
  designationId: string;
  interviewerId: string | null;
  scheduledDate: string;
  status: string;
  notes: string;
  feedback: any;
  timezone?: string;
  meetingJoinUrl?: string;
  meetingStartUrl?: string;
  videoMeetingId?: string;
  meetingPassword?: string;
  zoomJoinUrl?: string;
  zoomStartUrl?: string;
  zoomMeetingId?: string;
  zoomPassword?: string;
  meetingStartedAt?: string | null;
  acceptedByInterviewer?: boolean;
  skill?: string;
  level?: string;
  interviewLevel?: string;
  cvUrl?: string;
  recordingUrl?: string;
  recordingStatus?: string;
  recordingSyncedAt?: string | null;
  interviewerFee?: number | null;
  interviewerPaymentReleased?: boolean;
  interviewerPaymentReleasedAt?: string | null;
}

interface Designation {
  id: string;
  name: string;
  description: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface FeedbackForm {
  id: string;
  name: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

export function InterviewerInterviewsList() {
  const { accessToken } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [feedbackForms, setFeedbackForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [feedbackData, setFeedbackData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [cancelRequestInterview, setCancelRequestInterview] = useState<Interview | null>(null);
  const [rescheduleRequestInterview, setRescheduleRequestInterview] = useState<Interview | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Increased from 6 to 12

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  const parseJsonSafe = async (response: Response) => {
    const text = await response.text();
    if (!text) {
      return { _rawText: '' } as Record<string, any>;
    }

    try {
      const parsed = JSON.parse(text) as Record<string, any>;
      return { ...parsed, _rawText: text };
    } catch {
      return { _rawText: text } as Record<string, any>;
    }
  };

  const getApiErrorMessage = (response: Response, data: Record<string, any>, fallback: string) => {
    return (
      data?.error ||
      data?.message ||
      (typeof data?._rawText === 'string' && data._rawText.trim() ? data._rawText.trim() : null) ||
      fallback + ' (HTTP ' + response.status + ')'
    );
  };

  const fetchData = async () => {
    try {
      const [interviewsRes, designationsRes, feedbackFormsRes, studentsRes] = await Promise.all([
        fetch(`/interviews`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/designations`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/feedback-forms`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/interview-students`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const interviewsData = await parseJsonSafe(interviewsRes);
      const designationsData = await parseJsonSafe(designationsRes);
      const feedbackFormsData = await parseJsonSafe(feedbackFormsRes);
      const studentsData = await parseJsonSafe(studentsRes);

      setInterviews(interviewsData.interviews || []);
      setDesignations(designationsData.designations || []);
      setFeedbackForms(feedbackFormsData.forms || []);
      setStudents(studentsData.students || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const getDesignationName = (designationId: string) => {
    const designation = designations.find(d => d.id === designationId);
    return designation?.name || 'Unknown';
  };

  const getStudentName = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    return student?.name || 'Unknown Student';
  };

  const formatInterviewFee = (amount?: number | null) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatScheduledDate = (value: string) => {
    if (!value || value === 'pending') return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Pending' : date.toLocaleDateString();
  };

  const formatScheduledTime = (value: string) => {
    if (!value || value === 'pending') return 'Pending';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Pending' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate pagination
  const totalPages = Math.ceil(interviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentInterviews = interviews.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProvideFeedback = (interview: Interview) => {
    setSelectedInterview(interview);
    
    // Initialize feedback data with empty values based on the first available form
    if (feedbackForms.length > 0) {
      const initialData: Record<string, any> = {};
      feedbackForms[0].fields.forEach(field => {
        initialData[field.name] = '';
      });
      setFeedbackData(initialData);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedInterview) return;

    setSubmitting(true);

    try {
      const response = await fetch(
        `/interviews/${selectedInterview.id}/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(feedbackData),
        }
      );

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to submit feedback'));
      }

      toast.success('Feedback submitted successfully!');
      setSelectedInterview(null);
      setFeedbackData({});
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptInterview = async (interviewId: string) => {
    setActionLoading(interviewId);
    try {
      const response = await fetch(
        `/interviews/${interviewId}/accept`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to accept interview'));
      }

      toast.success('Interview accepted successfully!');
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error('Error accepting interview:', error);
      toast.error(error.message || 'Failed to accept interview');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInterview = async (interviewId: string) => {
    setActionLoading(interviewId);
    try {
      const response = await fetch(
        `/interviews/${interviewId}/decline`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to decline interview'));
      }

      toast.success('Interview declined');
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error('Error declining interview:', error);
      toast.error(error.message || 'Failed to decline interview');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateMeeting = async (interviewId: string) => {
    setActionLoading(interviewId);
    try {
      const response = await fetch(
        `/interviews/${interviewId}/meeting`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to create meeting'));
      }

      toast.success('Meeting created successfully!');
      fetchData(); // Refresh the list
    } catch (error: any) {
      console.error('Error creating meeting:', error);
      toast.error(error.message || 'Failed to create meeting');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartMeeting = async (interviewId: string) => {
    setActionLoading(interviewId);
    try {
      const response = await fetch(
        `/interviews/${interviewId}/meeting/start`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await parseJsonSafe(response);

      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to start interview'));
      }

      const meetingUrl = data?.meetingStartUrl || data?.meetingJoinUrl;
      if (meetingUrl) {
        window.open(meetingUrl, '_blank');
      }

      toast.success('Interview started');
      fetchData();
    } catch (error: any) {
      console.error('Error starting interview:', error);
      toast.error(error.message || 'Failed to start interview');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncRecording = async (interview: Interview) => {
    setActionLoading(interview.id);
    try {
      const response = await fetch(`/interviews/${interview.id}/recording/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to sync recording'));
      }

      if (data?.recording?.url) {
        toast.success('Recording saved');
        window.open(data.recording.url, '_blank');
      } else {
        toast.info(`Recording ${data?.recording?.status || 'is not available yet'}`);
      }

      fetchData();
    } catch (error: any) {
      console.error('Error syncing recording:', error);
      toast.error(error.message || 'Failed to sync recording');
    } finally {
      setActionLoading(null);
    }
  };


  const handleRequestCancel = (interview: Interview) => {
    setCancelRequestInterview(interview);
  };

  const confirmCancelRequest = async () => {
    if (!cancelRequestInterview) {
      return;
    }

    setActionLoading(cancelRequestInterview.id);
    try {
      const response = await fetch(`/interviews/${cancelRequestInterview.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to request cancel'));
      }

      toast.success(data.message || 'Cancel request submitted successfully');
      setCancelRequestInterview(null);
      fetchData();
    } catch (error: any) {
      console.error('Error requesting cancel:', error);
      toast.error(error.message || 'Failed to request cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestReschedule = (interview: Interview) => {
    setRescheduleRequestInterview(interview);
    setRescheduleReason('');
  };

  const submitRescheduleRequest = async () => {
    if (!rescheduleRequestInterview) {
      return;
    }

    const reason = rescheduleReason.trim();
    if (!reason) {
      toast.error('Reason is required');
      return;
    }

    setActionLoading(rescheduleRequestInterview.id);
    try {
      const response = await fetch(`/interviews/${rescheduleRequestInterview.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await parseJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, data, 'Failed to request reschedule'));
      }

      toast.success(data.message || 'Reschedule request submitted');
      setRescheduleRequestInterview(null);
      setRescheduleReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error requesting reschedule:', error);
      toast.error(error.message || 'Failed to request reschedule');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Assigned Interviews</h2>
        <p className="text-gray-600">View and provide feedback for your assigned interviews</p>
      </div>

      {interviews.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No interviews assigned yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Grid layout - 2 cards per row with compact design */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {currentInterviews.map(interview => (
              <Card key={interview.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{getDesignationName(interview.designationId)}</CardTitle>
                      <CardDescription className="text-xs truncate">Interview ID: {interview.id || 'N/A'}</CardDescription>
                    </div>
                    <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'} className="text-xs shrink-0">
                      {interview.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0 flex-1 flex flex-col">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border bg-gray-50 px-2 py-1.5 min-w-0">
                      <div className="text-gray-500">Student</div>
                      <div className="font-medium truncate">{getStudentName(interview.studentId)}</div>
                    </div>
                    <div className="rounded border bg-gray-50 px-2 py-1.5 min-w-0">
                      <div className="text-gray-500">Fee</div>
                      <div className="font-medium flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        {formatInterviewFee(interview.interviewerFee).replace(/^₹/, '')}
                      </div>
                    </div>
                    <div className="rounded border bg-gray-50 px-2 py-1.5 min-w-0">
                      <div className="text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date
                      </div>
                      <div className="font-medium truncate">{formatScheduledDate(interview.scheduledDate)}</div>
                    </div>
                    <div className="rounded border bg-gray-50 px-2 py-1.5 min-w-0">
                      <div className="text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Time
                      </div>
                      <div className="font-medium truncate">{formatScheduledTime(interview.scheduledDate)}</div>
                    </div>
                  </div>

                  {/* Skills - Inline badges */}
                  <div className="flex flex-wrap gap-1 min-h-6">
                    {interview.skill ? (
                      <Badge variant="outline" className="text-xs max-w-full truncate">{interview.skill}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-gray-500">No skill</Badge>
                    )}
                      {interview.interviewLevel && (
                        <Badge variant="outline" className="text-xs bg-blue-50">{interview.interviewLevel}</Badge>
                      )}
                    {interview.interviewerPaymentReleased && (
                      <Badge className="text-xs bg-green-100 text-green-800">Payment Released</Badge>
                    )}
                  </div>

                  {/* Action Required - New Assignment */}
                  {!interview.acceptedByInterviewer && interview.status !== 'completed' && interview.status !== 'declined' && (
                    <div className="flex gap-1.5">
                      <Button
                        onClick={() => handleAcceptInterview(interview.id)}
                        disabled={actionLoading === interview.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-6 text-xs px-3"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        onClick={() => handleDeclineInterview(interview.id)}
                        disabled={actionLoading === interview.id}
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-600 hover:bg-red-50 h-6 text-xs px-3"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {/* All Action Buttons in One Row */}
                  <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t">
                    {/* Create Meeting Button */}
                    {interview.acceptedByInterviewer && !(interview.meetingJoinUrl || interview.zoomJoinUrl) && interview.status !== 'completed' && (
                      <Button
                        onClick={() => handleCreateMeeting(interview.id)}
                        disabled={actionLoading === interview.id}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 h-6 text-xs px-3"
                      >
                        <Video className="h-3 w-3 mr-1" />
                        {actionLoading === interview.id ? 'Creating...' : 'Create Meeting'}
                      </Button>
                    )}

                    {/* Start Interview Button */}
                    {(interview.meetingJoinUrl || interview.zoomJoinUrl) && interview.status !== 'completed' && (
                      <Button
                        onClick={() => handleStartMeeting(interview.id)}
                        disabled={actionLoading === interview.id}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-6 text-xs px-3"
                      >
                        <Video className="h-3 w-3 mr-1" />
                        {actionLoading === interview.id ? 'Starting...' : interview.meetingStartedAt ? 'Join Interview' : 'Start Interview'}
                      </Button>
                    )}

                    {/* CV Button */}
                    {interview.cvUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(interview.cvUrl, '_blank')}
                        className="h-6 text-xs px-3"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        CV
                      </Button>
                    )}

                    {/* Feedback Button */}
                    {interview.acceptedByInterviewer && interview.status !== 'completed' && (
                      <Button 
                        onClick={() => handleProvideFeedback(interview)} 
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-3"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Feedback
                      </Button>
                    )}

                    {interview.status === 'completed' && (
                      <Button
                        onClick={() => interview.recordingUrl ? window.open(interview.recordingUrl, '_blank') : handleSyncRecording(interview)}
                        disabled={actionLoading === interview.id}
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-3"
                      >
                        <Video className="h-3 w-3 mr-1" />
                        {interview.recordingUrl ? 'View Recording' : actionLoading === interview.id ? 'Syncing...' : 'Sync Recording'}
                      </Button>
                    )}

                    {/* Interviewer Request Actions */}
                    {interview.status !== 'completed' && interview.status !== 'declined' && interview.status !== 'cancelled' && (
                      <>
                        <Button
                          onClick={() => handleRequestReschedule(interview)}
                          disabled={actionLoading === interview.id || interview.status === 'reschedule_requested'}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-3"
                        >
                          {actionLoading === interview.id ? 'Submitting...' : 'Request Reschedule'}
                        </Button>
                        <Button
                          onClick={() => handleRequestCancel(interview)}
                          disabled={actionLoading === interview.id || interview.status === 'cancel_requested'}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-3 border-red-300 text-red-600 hover:bg-red-50"
                        >
                          {actionLoading === interview.id ? 'Submitting...' : 'Request Cancel'}
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Completed Status */}
                  {interview.feedback && (
                    <div className="p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs text-green-800">
                        <strong>✓ Completed</strong> - Feedback submitted
                      </p>
                    </div>
                  )}

                  {interview.status === 'reschedule_requested' && (
                    <div className="p-2 bg-orange-50 rounded border border-orange-200">
                      <p className="text-xs text-orange-800">
                        <strong>Reschedule Requested</strong> - Waiting for admin approval
                      </p>
                    </div>
                  )}

                  {interview.status === 'cancel_requested' && (
                    <div className="p-2 bg-red-50 rounded border border-red-200">
                      <p className="text-xs text-red-800">
                        <strong>Cancel Requested</strong> - Waiting for admin approval
                      </p>
                    </div>
                  )}

                  {/* Notes - Collapsible/Truncated */}
                  {interview.notes && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                        View student notes
                      </summary>
                      <p className="mt-1 p-2 bg-gray-50 rounded text-gray-700">{interview.notes}</p>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}</div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    className="min-w-[36px] h-8"
                  >
                    {page}
                  </Button>
                ))}
              </div>

              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Page info */}
          <div className="text-center text-xs text-gray-500">
            Showing {startIndex + 1}-{Math.min(endIndex, interviews.length)} of {interviews.length} interviews
          </div>
        </div>
      )}

      <Dialog
        open={!!cancelRequestInterview}
        onOpenChange={(open) => !open && setCancelRequestInterview(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Interview Cancel</DialogTitle>
            <DialogDescription>
              This will send a cancel request to admin for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={confirmCancelRequest}
              disabled={!cancelRequestInterview || actionLoading === cancelRequestInterview?.id}
            >
              {actionLoading === cancelRequestInterview?.id ? 'Submitting...' : 'Submit Request'}
            </Button>
            <Button variant="outline" onClick={() => setCancelRequestInterview(null)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rescheduleRequestInterview}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleRequestInterview(null);
            setRescheduleReason('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Interview Reschedule</DialogTitle>
            <DialogDescription>
              Provide a reason for the reschedule request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="rescheduleReason">Reason *</Label>
              <Textarea
                id="rescheduleReason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={submitRescheduleRequest}
                disabled={!rescheduleReason.trim() || !rescheduleRequestInterview || actionLoading === rescheduleRequestInterview?.id}
              >
                {actionLoading === rescheduleRequestInterview?.id ? 'Submitting...' : 'Submit Request'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleRequestInterview(null);
                  setRescheduleReason('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedInterview} onOpenChange={(open) => !open && setSelectedInterview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Provide Interview Feedback</DialogTitle>
            <DialogDescription>
              Submit detailed feedback for this interview
            </DialogDescription>
          </DialogHeader>

          {selectedInterview && (
            <div className="space-y-4">
              {feedbackForms.length > 0 ? (
                <form className="space-y-4">
                  {feedbackForms[0].fields.map((field) => (
                    <div key={field.name}>
                      <Label htmlFor={field.name}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.name}
                          value={feedbackData[field.name] || ''}
                          onChange={(e) => setFeedbackData({ ...feedbackData, [field.name]: e.target.value })}
                          required={field.required}
                          rows={4}
                        />
                      ) : (
                        <Input
                          id={field.name}
                          type={field.type}
                          value={feedbackData[field.name] || ''}
                          onChange={(e) => setFeedbackData({ ...feedbackData, [field.name]: e.target.value })}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rating">Overall Rating (1-10)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="10"
                      value={feedbackData.rating || ''}
                      onChange={(e) => setFeedbackData({ ...feedbackData, rating: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="comments">Comments</Label>
                    <Textarea
                      id="comments"
                      value={feedbackData.comments || ''}
                      onChange={(e) => setFeedbackData({ ...feedbackData, comments: e.target.value })}
                      rows={6}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="strengths">Strengths</Label>
                    <Textarea
                      id="strengths"
                      value={feedbackData.strengths || ''}
                      onChange={(e) => setFeedbackData({ ...feedbackData, strengths: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="improvements">Areas for Improvement</Label>
                    <Textarea
                      id="improvements"
                      value={feedbackData.improvements || ''}
                      onChange={(e) => setFeedbackData({ ...feedbackData, improvements: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleSubmitFeedback} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedInterview(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
