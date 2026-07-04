import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RequestInterview } from './RequestInterview';
import { StudentFeedbackModal } from './StudentFeedbackModal';
import { apiBaseUrl } from "../../config/api";
import { Calendar, Clock, FileText, Video, RefreshCw, AlertCircle, User, CreditCard, MessageSquare, XCircle, RotateCcw, Building2, Mail, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

interface Interview {
  id: string;
  studentId: string;
  designationId: string;
  interviewerId: string | null;
  scheduledDate: string;
  status: string;
  notes: string;
  feedback: any;
  studentFeedback?: any;
  createdAt: string;
  timezone?: string;
  meetingJoinUrl?: string;
  videoMeetingId?: string;
  meetingPassword?: string;
  zoomJoinUrl?: string;
  zoomMeetingId?: string;
  zoomPassword?: string;
  meetingStartedAt?: string | null;
  skill?: string;
  level?: string;
  interviewLevel?: string;
  cvUrl?: string;
  recordingUrl?: string;
  recordingStatus?: string;
  recordingSyncedAt?: string | null;
  acceptedByInterviewer?: boolean;
  rescheduleCount?: number;
  rescheduleReason?: string;
  companyLevel?: string;
  preferredCompany?: string;
}

interface Designation {
  id: string;
  name: string;
  description: string;
}

interface Interviewer {
  id: string;
  email: string;
  name: string;
  role: string;
  linkedInProfile?: string;
  bio?: string;
  company?: string;
}

export function StudentInterviewsList() {
  const { accessToken } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [joiningInterviewId, setJoiningInterviewId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (accessToken) {
      console.log('StudentInterviewsList: Access token available, fetching data...');
      fetchData();
    } else {
      console.log('StudentInterviewsList: No access token available');
      setLoading(false);
    }
  }, [accessToken]);

  const fetchData = async () => {
    if (!accessToken) {
      console.error('No access token available for fetching data');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching interviews with token:', accessToken.substring(0, 20) + '...');
      const [interviewsRes, designationsRes, interviewersRes] = await Promise.all([
        fetch(`/interviews`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/designations`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/interviewers`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      if (!interviewsRes.ok) {
        const errorText = await interviewsRes.text();
        console.error('Failed to fetch interviews:', errorText);
        
        // If unauthorized, the token might be expired
        if (interviewsRes.status === 401) {
          toast.error('Session expired. Please sign in again.');
        }
        throw new Error('Failed to fetch interviews');
      }

      if (!designationsRes.ok) {
        const errorText = await designationsRes.text();
        console.error('Failed to fetch designations:', errorText);
        throw new Error('Failed to fetch designations');
      }

      const interviewsData = await interviewsRes.json();
      const designationsData = await designationsRes.json();

      setInterviews(interviewsData.interviews || []);
      setDesignations(designationsData.designations || []);

      // Fetch interviewers separately with error handling
      if (interviewersRes.ok) {
        const interviewersData = await interviewersRes.json();
        setInterviewers(interviewersData.interviewers || []);
      } else {
        console.log('Interviewers endpoint not available, continuing without interviewer names');
        setInterviewers([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast.success('Interviews refreshed');
  };

  const getTimeUntilInterview = (scheduledDate: string) => {
    const now = new Date();
    const interviewDate = new Date(scheduledDate);
    const diffMs = interviewDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 0) return 'Past';
    if (diffMins < 60) return `in ${diffMins} min`;
    if (diffHours < 24) return `in ${diffHours}h ${diffMins % 60}min`;
    return `in ${diffDays} days`;
  };

  const isInterviewSoon = (scheduledDate: string) => {
    const now = new Date();
    const interviewDate = new Date(scheduledDate);
    const diffMs = interviewDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins > 0 && diffMins <= 30; // Within 30 minutes
  };

  const getDesignationName = (designationId: string) => {
    const designation = designations.find(d => d.id === designationId);
    return designation?.name || 'Unknown';
  };

  const getInterviewerName = (interviewerId: string | null) => {
    const interviewer = interviewers.find(i => i.id === interviewerId);
    return interviewer?.name || 'Unknown';
  };

  const getInterviewer = (interviewerId: string | null) => {
    return interviewers.find(i => i.id === interviewerId) || null;
  };

  const handleCancelInterview = async (interviewId: string) => {
    if (!accessToken) return;

    const confirmed = window.confirm('Are you sure you want to cancel this interview request?');
    if (!confirmed) return;

    try {
      const response = await fetch(
        `/interviews/${interviewId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel interview');
      }

      toast.success('Interview cancelled successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error cancelling interview:', error);
      toast.error(error.message || 'Failed to cancel interview');
    }
  };

  const handleJoinMeeting = async (interview: Interview) => {
    if (!accessToken) return;

    setJoiningInterviewId(interview.id);
    try {
      const response = await fetch(`/interviews/${interview.id}/meeting/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join meeting');
      }

      const meetingUrl = data.meetingJoinUrl || interview.meetingJoinUrl || interview.zoomJoinUrl;
      if (meetingUrl) {
        window.open(meetingUrl, '_blank');
      }

      fetchData();
    } catch (error: any) {
      console.error('Error joining meeting:', error);
      toast.error(error.message || 'Failed to join meeting');
    } finally {
      setJoiningInterviewId(null);
    }
  };

  const handleRequestReschedule = async (interviewId: string, rescheduleCount: number) => {
    if (!accessToken) return;

    const remainingReschedules = 2 - (rescheduleCount || 0);
    if (remainingReschedules <= 0) {
      toast.error('Maximum reschedule limit reached for this interview');
      return;
    }

    const reason = window.prompt(`Request reschedule? (${remainingReschedules} remaining)\n\nPlease provide a reason:`);
    if (!reason) return;

    try {
      const response = await fetch(
        `/interviews/${interviewId}/reschedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request reschedule');
      }

      toast.success(`Reschedule request submitted! ${data.remainingReschedules} reschedules remaining.`);
      fetchData();
    } catch (error: any) {
      console.error('Error requesting reschedule:', error);
      toast.error(error.message || 'Failed to request reschedule');
    }
  };

  const pendingInterviews = interviews.filter(i => i.status === 'pending');

  const upcomingInterviews = interviews.filter(
    i => i.status === 'in_progress' ||
         ((i.status === 'scheduled' || i.status === 'accepted' || i.status === 'reschedule_requested') &&
          new Date(i.scheduledDate) > new Date() &&
          i.scheduledDate !== 'pending')
  );

  const pastInterviews = interviews.filter(
    i => i.status === 'completed' ||
         i.status === 'declined' ||
         i.status === 'cancelled' ||
         (i.status !== 'in_progress' && new Date(i.scheduledDate) <= new Date())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="student-interviews-page space-y-6">
      <div className="student-interviews-header flex justify-between items-start gap-4">
        <div className="student-interviews-heading min-w-0">
          <h2 className="text-2xl mb-2">My Interviews</h2>
          <p className="text-gray-600">View and manage your scheduled and past interviews</p>
        </div>
        <div className="student-interviews-actions flex gap-2">
          <RequestInterview onSuccess={fetchData} triggerClassName="student-primary-action" />
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            className="student-refresh-action"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="pending" className="student-interviews-tabs-root">
        <TabsList className="student-interviews-tabs">
          <TabsTrigger value="pending" className="student-interviews-tab">
            Pending ({pendingInterviews.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="student-interviews-tab">
            Upcoming ({upcomingInterviews.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="student-interviews-tab">
            Past ({pastInterviews.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingInterviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No pending interview requests
              </CardContent>
            </Card>
          ) : (
            pendingInterviews.map(interview => (
              <Card key={interview.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{getDesignationName(interview.designationId)}</CardTitle>
                      <CardDescription>Interview ID: {interview.id.split(':')[1]}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      Pending Assignment
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Awaiting Admin:</strong> Your interview request is pending. An admin will assign an interviewer and schedule the date soon.
                    </p>
                  </div>

                  {interview.skill && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Briefcase className="h-4 w-4" />
                      <span>Skill: {interview.skill} ({interview.level || 'N/A'})</span>
                    </div>
                  )}

                  {interview.interviewLevel && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>Level: {interview.interviewLevel}</span>
                    </div>
                  )}

                  {interview.preferredCompany && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="h-4 w-4" />
                      <span>Preferred Company: {interview.preferredCompany}</span>
                    </div>
                  )}

                  {interview.notes && (
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600"><strong>Notes:</strong></p>
                      <p className="text-sm">{interview.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t">
                    <Button
                      onClick={() => handleCancelInterview(interview.id)}
                      variant="destructive"
                      size="sm"
                      className="w-full"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Interview Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcomingInterviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No upcoming interviews scheduled
              </CardContent>
            </Card>
          ) : (
            upcomingInterviews.map(interview => (
              <Card key={interview.id} className={isInterviewSoon(interview.scheduledDate) ? 'border-blue-500 border-2' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{getDesignationName(interview.designationId)}</CardTitle>
                      <CardDescription>Interview ID: {interview.id.split(':')[1]}</CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge>{interview.status}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {getTimeUntilInterview(interview.scheduledDate)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {isInterviewSoon(interview.scheduledDate) && (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded mb-3">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-sm text-blue-800">
                        <strong>Starting soon!</strong> Your interview begins {getTimeUntilInterview(interview.scheduledDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(interview.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(interview.scheduledDate).toLocaleTimeString()}</span>
                  </div>
                  {interview.interviewerId && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4" />
                      <span>Interviewer: {getInterviewerName(interview.interviewerId)}</span>
                    </div>
                  )}
                  {interview.timezone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Timezone: {interview.timezone}</span>
                    </div>
                  )}
                  {interview.notes && (
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <p className="text-sm">{interview.notes}</p>
                    </div>
                  )}
                  {(interview.meetingJoinUrl || interview.zoomJoinUrl) ? (
                    <div className="mt-4 space-y-2">
                      <Button
                        onClick={() => handleJoinMeeting(interview)}
                        disabled={joiningInterviewId === interview.id}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        <Video className="h-5 w-5 mr-2" />
                        {joiningInterviewId === interview.id ? 'Joining...' : 'Join Interview Now'}
                      </Button>
                      {(interview.videoMeetingId || interview.zoomMeetingId) && (
                        <p className="text-sm text-gray-600 text-center">
                          Meeting ID: <strong>{interview.videoMeetingId || interview.zoomMeetingId}</strong>
                        </p>
                      )}
                      {(interview.meetingPassword || interview.zoomPassword) && (
                        <p className="text-sm text-gray-600 text-center">
                          Password: <strong>{interview.meetingPassword || interview.zoomPassword}</strong>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <strong>Note:</strong> The meeting link will be available once the interviewer creates it.
                        </p>
                      </div>
                      <Button 
                        onClick={handleRefresh} 
                        disabled={refreshing}
                        variant="outline"
                        className="w-full"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Check for Meeting Link
                      </Button>
                    </div>
                  )}

                  {/* Interviewer Details */}
                  {interview.interviewerId && (() => {
                    const interviewer = getInterviewer(interview.interviewerId);
                    return interviewer ? (
                      <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                        <h4 className="font-semibold text-sm mb-3 text-indigo-900">👤 Your Interviewer</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4 text-indigo-600" />
                            <span className="font-medium">{interviewer.name}</span>
                          </div>
                          {interviewer.email && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-4 w-4" />
                              <span>{interviewer.email}</span>
                            </div>
                          )}
                          {interviewer.company && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Building2 className="h-4 w-4" />
                              <span className="font-medium text-indigo-700">{interviewer.company}</span>
                            </div>
                          )}
                          {interviewer.bio && (
                            <p className="text-xs text-gray-600 mt-2 italic">{interviewer.bio}</p>
                          )}
                          {interviewer.linkedInProfile && (
                            <a 
                              href={interviewer.linkedInProfile} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                            >
                              View LinkedIn Profile →
                            </a>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Reschedule Notice/Button */}
                  {interview.status === 'reschedule_requested' ? (
                    <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-sm text-orange-800">
                        <strong>Reschedule Requested:</strong> Your reschedule request is pending. Admin will update the schedule soon.
                      </p>
                      {interview.rescheduleReason && (
                        <p className="text-xs text-orange-700 mt-1">Reason: {interview.rescheduleReason}</p>
                      )}
                      <p className="text-xs text-orange-600 mt-2">
                        Remaining reschedules: {2 - (interview.rescheduleCount || 0)}
                      </p>
                    </div>
                  ) : (
                    (interview.rescheduleCount || 0) < 2 && (
                      <div className="mt-3">
                        <Button
                          onClick={() => handleRequestReschedule(interview.id, interview.rescheduleCount || 0)}
                          variant="outline"
                          size="sm"
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Request Reschedule ({2 - (interview.rescheduleCount || 0)} remaining)
                        </Button>
                      </div>
                    )
                  )}

                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-4">
          {pastInterviews.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No past interviews
              </CardContent>
            </Card>
          ) : (
            pastInterviews.map(interview => (
              <Card key={interview.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{getDesignationName(interview.designationId)}</CardTitle>
                      <CardDescription>Interview ID: {interview.id.split(':')[1]}</CardDescription>
                    </div>
                    <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                      {interview.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(interview.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  {interview.feedback && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <span>Feedback</span>
                      </div>
                      <div className="p-3 bg-blue-50 rounded">
                        {Object.entries(interview.feedback).map(([key, value]) => {
                          if (key === 'submittedBy' || key === 'submittedAt') return null;
                          return (
                            <div key={key} className="mb-2">
                              <span className="text-sm block">{key}: </span>
                              <span className="text-sm">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {interview.recordingUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(interview.recordingUrl, '_blank')}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      View Recording
                    </Button>
                  )}
                  {interview.studentFeedback && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4" />
                        <span>Your Feedback</span>
                      </div>
                      <div className="p-3 bg-blue-50 rounded">
                        {Object.entries(interview.studentFeedback).map(([key, value]) => {
                          if (key === 'submittedBy' || key === 'submittedAt') return null;
                          return (
                            <div key={key} className="mb-2">
                              <span className="text-sm block">{key}: </span>
                              <span className="text-sm">{String(value)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {interview.status === 'completed' && !interview.studentFeedback && interview.interviewerId && (
                    <div className="mt-4">
                      <Button
                        onClick={() => {
                          setSelectedInterview(interview);
                          setFeedbackModalOpen(true);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Provide Feedback
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <StudentFeedbackModal
        open={feedbackModalOpen}
        onOpenChange={setFeedbackModalOpen}
        interviewId={selectedInterview?.id || ''}
        interviewerName={selectedInterview?.interviewerId ? getInterviewerName(selectedInterview.interviewerId) : 'Unknown'}
        accessToken={accessToken || ''}
        onSuccess={fetchData}
      />
    </div>
  );
}
