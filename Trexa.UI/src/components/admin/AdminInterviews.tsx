import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { UserCheck, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AdminPagination, getPaginationRange } from './AdminPagination';

interface Interview {
  id: string;
  studentId: string;
  designationId: string;
  interviewerId: string | null;
  scheduledDate: string;
  status: string;
  skill?: string;
  level?: string;
  interviewLevel?: string;
  notes?: string;
  zoomJoinUrl?: string;
  zoomMeetingId?: string;
  preferredCompany?: string;
  interviewerFee?: number | null;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  techStacks?: string[];
  linkedInProfile?: string;
  company?: string;
  defaultInterviewerFee?: number;
}

interface Designation {
  id: string;
  name: string;
}

interface Availability {
  id: string;
  interviewerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface TimeSlot {
  date: Date;
  time: string;
  formattedDateTime: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const INTERVIEWS_PAGE_SIZE = 10;

export function AdminInterviews() {
  const { accessToken } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [assignmentFee, setAssignmentFee] = useState('');
  const [interviewerAvailability, setInterviewerAvailability] = useState<Availability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [rescheduleInterview, setRescheduleInterview] = useState<Interview | null>(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduling, setRescheduling] = useState(false);
  const [updatingInterviewId, setUpdatingInterviewId] = useState<string | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [assignedPage, setAssignedPage] = useState(1);
  const [pendingSearch, setPendingSearch] = useState('');
  const [assignedSearch, setAssignedSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [accessToken]);

  useEffect(() => {
    setPendingPage(1);
  }, [pendingSearch]);

  useEffect(() => {
    setAssignedPage(1);
  }, [assignedSearch]);

  // Fetch availability when interviewer is selected
  useEffect(() => {
    if (selectedInterviewer) {
      fetchInterviewerAvailability(selectedInterviewer);
    } else {
      setInterviewerAvailability([]);
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setAvailableTimeSlots([]);
      setAssignmentFee('');
    }
  }, [selectedInterviewer]);

  useEffect(() => {
    if (!selectedInterviewer) return;

    if (selectedInterview?.interviewerId === selectedInterviewer && selectedInterview.interviewerFee != null) {
      setAssignmentFee(String(selectedInterview.interviewerFee));
      return;
    }

    const interviewer = users.find(u => u.id === selectedInterviewer);
    setAssignmentFee(String(interviewer?.defaultInterviewerFee || 0));
  }, [selectedInterviewer, selectedInterview, users]);

  // Generate time slots when date is selected
  useEffect(() => {
    if (selectedDate && interviewerAvailability.length > 0) {
      generateTimeSlots();
    } else {
      setAvailableTimeSlots([]);
      setSelectedTimeSlot('');
    }
  }, [selectedDate, interviewerAvailability]);

  const fetchData = async () => {
    try {
      const [interviewsRes, usersRes, designationsRes] = await Promise.all([
        fetch(`/interviews`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/admin/users`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
        fetch(`/designations`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }),
      ]);

      const interviewsData = await interviewsRes.json();
      const usersData = await usersRes.json();
      const designationsData = await designationsRes.json();

      setInterviews(interviewsData.interviews || []);
      setUsers(usersData.users || []);
      setDesignations(designationsData.designations || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchInterviewerAvailability = async (interviewerId: string) => {
    setLoadingAvailability(true);
    try {
      const response = await fetch(
        `/availability/${interviewerId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setInterviewerAvailability(data.availability || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast.error('Failed to load interviewer availability');
    } finally {
      setLoadingAvailability(false);
    }
  };

  const generateTimeSlots = () => {
    if (!selectedDate) return;

    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = interviewerAvailability.filter(
      (avail) => avail.dayOfWeek === dayOfWeek
    );

    if (dayAvailability.length === 0) {
      setAvailableTimeSlots([]);
      toast.info('No availability set for this day');
      return;
    }

    const slots: TimeSlot[] = [];

    dayAvailability.forEach((avail) => {
      const [startHour, startMinute] = avail.startTime.split(':').map(Number);
      const [endHour, endMinute] = avail.endTime.split(':').map(Number);

      // Generate 1-hour slots
      for (let hour = startHour; hour < endHour; hour++) {
        const time = `${String(hour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
        const dateTime = new Date(selectedDate);
        dateTime.setHours(hour, startMinute, 0, 0);

        slots.push({
          date: dateTime,
          time: time,
          formattedDateTime: dateTime.toISOString(),
        });
      }
    });

    setAvailableTimeSlots(slots);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Unknown';
  };

  const getDesignationName = (designationId: string) => {
    const designation = designations.find(d => d.id === designationId);
    return designation?.name || 'Unknown';
  };

  const interviewers = users.filter(u => u.role === 'interviewer');

  // Filter interviewers by matching tech stack
  const getMatchingInterviewers = () => {
    if (!selectedInterview?.skill) {
      return interviewers;
    }

    let filteredInterviewers = interviewers;

    // Filter by preferred company first if specified
    if (selectedInterview.preferredCompany) {
      const companyMatches = interviewers.filter((interviewer) => {
        return interviewer.company && 
          interviewer.company.toLowerCase().includes(selectedInterview.preferredCompany!.toLowerCase());
      });
      
      if (companyMatches.length > 0) {
        filteredInterviewers = companyMatches;
      }
    }

    // Then filter by matching skills
    const matchingInterviewers = filteredInterviewers.filter((interviewer) => {
      if (!interviewer.techStacks || interviewer.techStacks.length === 0) {
        return false;
      }
      return interviewer.techStacks.some(
        (tech) => tech.toLowerCase() === selectedInterview.skill?.toLowerCase()
      );
    });

    // If no exact matches, show all interviewers (from company filter or all)
    return matchingInterviewers.length > 0 ? matchingInterviewers : filteredInterviewers;
  };

  const handleAssignInterviewer = async () => {
    if (!selectedInterview || !selectedInterviewer) {
      toast.error('Please select an interviewer');
      return;
    }

    if (!selectedTimeSlot) {
      toast.error('Please select a date and time slot');
      return;
    }

    setAssigning(true);

    try {
      const response = await fetch(
        `/admin/interviews/${selectedInterview.id}/assign`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ 
            interviewerId: selectedInterviewer,
            scheduledDate: selectedTimeSlot,
            interviewerFee: Number(assignmentFee) || 0,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign interviewer');
      }

      toast.success('Interviewer assigned and interview scheduled successfully!');
      setSelectedInterview(null);
      setSelectedInterviewer('');
      setSelectedDate(undefined);
      setSelectedTimeSlot('');
      setAssignmentFee('');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning interviewer:', error);
      toast.error(error.message || 'Failed to assign interviewer');
    } finally {
      setAssigning(false);
    }
  };

  const formatDateTimeForInput = (value: string) => {
    if (!value || value === 'pending') {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const tzOffsetMs = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
  };

  const openRescheduleDialog = (interview: Interview) => {
    setRescheduleInterview(interview);
    setRescheduleDateTime(formatDateTimeForInput(interview.scheduledDate));
    setRescheduleReason('');
  };

  const handleRescheduleInterview = async () => {
    if (!rescheduleInterview || !rescheduleDateTime) {
      toast.error('Please select a new date and time');
      return;
    }

    setRescheduling(true);

    try {
      const response = await fetch(`/admin/interviews/${rescheduleInterview.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scheduledDate: new Date(rescheduleDateTime).toISOString(),
          reason: rescheduleReason.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule interview');
      }

      toast.success('Interview rescheduled successfully');
      setRescheduleInterview(null);
      setRescheduleDateTime('');
      setRescheduleReason('');
      fetchData();
    } catch (error: any) {
      console.error('Error rescheduling interview:', error);
      toast.error(error.message || 'Failed to reschedule interview');
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelInterview = async (interview: Interview) => {
    const confirmed = window.confirm(`Cancel interview for ${getUserName(interview.studentId)}?`);
    if (!confirmed) {
      return;
    }

    setUpdatingInterviewId(interview.id);
    try {
      const response = await fetch(`/admin/interviews/${interview.id}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel interview');
      }

      toast.success('Interview cancelled successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error cancelling interview:', error);
      toast.error(error.message || 'Failed to cancel interview');
    } finally {
      setUpdatingInterviewId(null);
    }
  };

  // Filter pending requests
  const pendingInterviews = interviews.filter(
    (interview) => interview.scheduledDate === 'pending' || (!interview.interviewerId && interview.status === 'scheduled')
  );

  const assignedInterviews = interviews.filter(
    (interview) => interview.scheduledDate !== 'pending' && interview.interviewerId
  );
  const matchesInterviewSearch = (interview: Interview, search: string) => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return true;

    return [
      getUserName(interview.studentId),
      interview.interviewerId ? getUserName(interview.interviewerId) : '',
      getDesignationName(interview.designationId),
      interview.skill,
      interview.interviewLevel,
      interview.notes,
      interview.status,
      interview.scheduledDate,
      interview.interviewerFee,
    ]
      .filter(value => value !== null && value !== undefined)
      .some(value => String(value).toLowerCase().includes(normalized));
  };
  const filteredPendingInterviews = pendingInterviews.filter(interview => matchesInterviewSearch(interview, pendingSearch));
  const filteredAssignedInterviews = assignedInterviews.filter(interview => matchesInterviewSearch(interview, assignedSearch));
  const pendingRange = getPaginationRange(pendingPage, filteredPendingInterviews.length, INTERVIEWS_PAGE_SIZE);
  const assignedRange = getPaginationRange(assignedPage, filteredAssignedInterviews.length, INTERVIEWS_PAGE_SIZE);
  const paginatedPendingInterviews = filteredPendingInterviews.slice(
    (pendingRange.currentPage - 1) * INTERVIEWS_PAGE_SIZE,
    pendingRange.currentPage * INTERVIEWS_PAGE_SIZE
  );
  const paginatedAssignedInterviews = filteredAssignedInterviews.slice(
    (assignedRange.currentPage - 1) * INTERVIEWS_PAGE_SIZE,
    assignedRange.currentPage * INTERVIEWS_PAGE_SIZE
  );

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
        <h2 className="text-2xl mb-2">Interview Management</h2>
        <p className="text-gray-600">Manage and assign interviews to interviewers</p>
      </div>

      {/* Pending Interview Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Interview Requests</CardTitle>
          <CardDescription>Requests waiting for interviewer assignment: {pendingInterviews.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingInterviews.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No pending interview requests</p>
          ) : (
            <>
            <Input
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="Search pending interviews by student, designation, skill, or notes"
              className="mb-4 max-w-md"
            />
            {filteredPendingInterviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No pending interviews match your search</p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPendingInterviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell>{getUserName(interview.studentId)}</TableCell>
                    <TableCell>{getDesignationName(interview.designationId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{interview.skill || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{interview.interviewLevel || 'N/A'}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{interview.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setSelectedInterviewer(interview.interviewerId ?? '');
                            setSelectedDate(undefined);
                            setSelectedTimeSlot('');
                            setAssignmentFee(String(interview.interviewerFee ?? users.find(u => u.id === interview.interviewerId)?.defaultInterviewerFee ?? 0));
                          }}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Assign
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelInterview(interview)}
                          disabled={updatingInterviewId === interview.id}
                        >
                          {updatingInterviewId === interview.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            </>
          )}
          <AdminPagination
            page={pendingPage}
            pageSize={INTERVIEWS_PAGE_SIZE}
            totalItems={filteredPendingInterviews.length}
            onPageChange={setPendingPage}
          />
        </CardContent>
      </Card>

      {/* Assigned Interviews */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Interviews</CardTitle>
          <CardDescription>Interviews with assigned interviewers: {assignedInterviews.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedInterviews.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No assigned interviews</p>
          ) : (
            <>
            <Input
              value={assignedSearch}
              onChange={(e) => setAssignedSearch(e.target.value)}
              placeholder="Search assigned interviews by student, interviewer, status, fee, or date"
              className="mb-4 max-w-md"
            />
            {filteredAssignedInterviews.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No assigned interviews match your search</p>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Interviewer</TableHead>
                  <TableHead>Scheduled Date</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssignedInterviews.map((interview) => (
                  <TableRow key={interview.id}>
                    <TableCell>{getUserName(interview.studentId)}</TableCell>
                    <TableCell>{getDesignationName(interview.designationId)}</TableCell>
                    <TableCell>
                      {interview.interviewerId ? getUserName(interview.interviewerId) : (
                        <span className="text-gray-400 italic">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {interview.scheduledDate !== 'pending' 
                        ? new Date(interview.scheduledDate).toLocaleString()
                        : 'Pending'
                      }
                    </TableCell>
                    <TableCell>₹{Number(interview.interviewerFee || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={interview.status === 'completed' ? 'default' : 'secondary'}>
                        {interview.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setSelectedInterviewer(interview.interviewerId ?? '');
                            setSelectedDate(undefined);
                            setSelectedTimeSlot('');
                            setAssignmentFee(String(interview.interviewerFee ?? users.find(u => u.id === interview.interviewerId)?.defaultInterviewerFee ?? 0));
                          }}
                          disabled={interview.status === 'completed' || interview.status === 'cancelled'}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Reassign
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openRescheduleDialog(interview)}
                          disabled={interview.status === 'completed' || interview.status === 'cancelled'}
                        >
                          Reschedule
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleCancelInterview(interview)}
                          disabled={interview.status === 'completed' || interview.status === 'cancelled' || updatingInterviewId === interview.id}
                        >
                          {updatingInterviewId === interview.id ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            </>
          )}
          <AdminPagination
            page={assignedPage}
            pageSize={INTERVIEWS_PAGE_SIZE}
            totalItems={filteredAssignedInterviews.length}
            onPageChange={setAssignedPage}
          />
        </CardContent>
      </Card>

      {/* Assign Interviewer Dialog */}
      <Dialog open={!!selectedInterview} onOpenChange={(open) => {
        if (!open) {
          setSelectedInterview(null);
          setSelectedInterviewer('');
          setSelectedDate(undefined);
          setSelectedTimeSlot('');
          setAssignmentFee('');
        }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Interviewer & Schedule Interview</DialogTitle>
            <DialogDescription>
              Select an interviewer and choose a date/time based on their availability
            </DialogDescription>
          </DialogHeader>
          
          {selectedInterview && (
            <div className="space-y-6">
              {/* Interview Details */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h3 className="font-medium">Interview Request Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Student:</span>{' '}
                    <span className="font-medium">{getUserName(selectedInterview.studentId)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Designation:</span>{' '}
                    <span className="font-medium">{getDesignationName(selectedInterview.designationId)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Skill:</span>{' '}
                    <Badge variant="outline">{selectedInterview.skill || 'N/A'}</Badge>
                  </div>
                  <div>
                    <span className="text-gray-600">Level:</span>{' '}
                    <span className="font-medium">{selectedInterview.interviewLevel || 'N/A'}</span>
                  </div>
                  {selectedInterview.preferredCompany && (
                    <div>
                      <span className="text-gray-600">Preferred Company:</span>{' '}
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedInterview.preferredCompany}
                      </Badge>
                    </div>
                  )}
                </div>
                {selectedInterview.notes && (
                  <div className="pt-2 border-t">
                    <span className="text-gray-600 text-sm">Notes:</span>
                    <p className="text-sm mt-1">{selectedInterview.notes}</p>
                  </div>
                )}
              </div>

              {/* Interviewer Selection */}
              <div>
                <Label>Select Interviewer *</Label>
                <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an interviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {getMatchingInterviewers().map(interviewer => {
                      const hasMatchingSkill = interviewer.techStacks?.some(
                        tech => tech.toLowerCase() === selectedInterview.skill?.toLowerCase()
                      );
                      const hasMatchingCompany = selectedInterview.preferredCompany && 
                        interviewer.company?.toLowerCase().includes(selectedInterview.preferredCompany.toLowerCase());
                      
                      return (
                        <SelectItem key={interviewer.id} value={interviewer.id}>
                          <div className="flex items-center gap-2">
                            <span>{interviewer.name}</span>
                            {interviewer.company && (
                              <span className="text-xs text-gray-500">({interviewer.company})</span>
                            )}
                            {hasMatchingSkill && (
                              <Badge variant="default" className="text-xs">Matching Skill</Badge>
                            )}
                            {hasMatchingCompany && (
                              <Badge variant="secondary" className="text-xs bg-blue-500 text-white">Matching Company</Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedInterviewer && (
                  <p className="text-sm text-gray-600 mt-1">
                    Tech Stacks: {users.find(u => u.id === selectedInterviewer)?.techStacks?.join(', ') || 'Not specified'}
                  </p>
                )}
              </div>

              {selectedInterviewer && (
                <div>
                  <Label htmlFor="assignmentFee">Interview Fee *</Label>
                  <Input
                    id="assignmentFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={assignmentFee}
                    onChange={(e) => setAssignmentFee(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Defaults from the selected interviewer's fee and can be changed for this interview.
                  </p>
                </div>
              )}

              {/* Date and Time Selection */}
              {selectedInterviewer && (
                <>
                  {loadingAvailability ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                    </div>
                  ) : interviewerAvailability.length === 0 ? (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-sm text-yellow-800">
                        This interviewer hasn't set their availability yet. Please ask them to set it first.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          Select Date *
                        </Label>
                        <div className="mt-2 border rounded-lg p-4">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => {
                              const dayOfWeek = date.getDay();
                              const hasAvailability = interviewerAvailability.some(
                                avail => avail.dayOfWeek === dayOfWeek
                              );
                              return !hasAvailability || date < new Date(new Date().setHours(0, 0, 0, 0));
                            }}
                            className="rounded-md"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Available days: {Array.from(new Set(interviewerAvailability.map(a => DAYS_OF_WEEK[a.dayOfWeek]))).join(', ')}
                        </p>
                      </div>

                      {selectedDate && (
                        <div>
                          <Label className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Select Time Slot *
                          </Label>
                          {availableTimeSlots.length === 0 ? (
                            <p className="text-sm text-gray-500 mt-2">No available time slots for this date</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              {availableTimeSlots.map((slot, idx) => (
                                <Button
                                  key={idx}
                                  type="button"
                                  variant={selectedTimeSlot === slot.formattedDateTime ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setSelectedTimeSlot(slot.formattedDateTime)}
                                >
                                  {slot.time}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={handleAssignInterviewer} 
                  disabled={!selectedInterviewer || !selectedTimeSlot || assigning}
                >
                  {assigning ? 'Assigning...' : 'Assign Interviewer & Schedule'}
                </Button>
                <Button variant="outline" onClick={() => {
                  setSelectedInterview(null);
                  setSelectedInterviewer('');
                  setSelectedDate(undefined);
                  setSelectedTimeSlot('');
                  setAssignmentFee('');
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rescheduleInterview} onOpenChange={(open) => {
        if (!open) {
          setRescheduleInterview(null);
          setRescheduleDateTime('');
          setRescheduleReason('');
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Reschedule Interview</DialogTitle>
            <DialogDescription>Set a new interview date/time and optional reason.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rescheduleDateTime">New Date & Time *</Label>
              <Input
                id="rescheduleDateTime"
                type="datetime-local"
                value={rescheduleDateTime}
                min={formatDateTimeForInput(new Date().toISOString())}
                onChange={(e) => setRescheduleDateTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rescheduleReason">Reason (Optional)</Label>
              <Textarea
                id="rescheduleReason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Reason for reschedule"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleRescheduleInterview} disabled={!rescheduleDateTime || rescheduling}>
                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleInterview(null);
                  setRescheduleDateTime('');
                  setRescheduleReason('');
                }}
                disabled={rescheduling}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
