import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { apiBaseUrl } from "../../config/api";
import { toast } from 'sonner@2.0.3';
import { Calendar, Clock, Globe, Upload, FileText, X, Building2 } from 'lucide-react';

interface Designation {
  id: string;
  name: string;
  description: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AvailableSlot {
  time: string;
  available: boolean;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

const SKILLS = [
  'React',
  'Angular',
  'Vue.js',
  'Node.js',
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'C++',
  'Go',
  'PHP',
  'Ruby',
  'Swift',
  'Kotlin',
  'System Design',
  'Data Structures',
  'Algorithms',
  'Database Design',
  'DevOps',
  'Cloud Architecture',
];

const LEVELS = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

const INTERVIEW_LEVELS = [
  'Entry Level / Fresher',
  'Junior (0-2 years)',
  'Mid-Level (2-5 years)',
  'Senior (5-8 years)',
  'Lead / Principal (8+ years)',
  'Architect / Staff Engineer',
];

interface ScheduleInterviewProps {
  onClose?: () => void;
}

export function ScheduleInterview({ onClose }: ScheduleInterviewProps) {
  const { accessToken } = useAuth();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [interviewers, setInterviewers] = useState<User[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedInterviewer, setSelectedInterviewer] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [notes, setNotes] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [level, setLevel] = useState('');
  const [interviewLevel, setInterviewLevel] = useState('');
  const [preferredCompany, setPreferredCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [newDesignationName, setNewDesignationName] = useState('');
  const [newDesignationDesc, setNewDesignationDesc] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  // CV upload states
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState('');
  const [uploadingCv, setUploadingCv] = useState(false);

  useEffect(() => {
    fetchDesignations();
    fetchInterviewers();
  }, [accessToken]);

  useEffect(() => {
    if (selectedInterviewer && scheduledDate) {
      fetchAvailableSlots();
    }
  }, [selectedInterviewer, scheduledDate]);

  const fetchDesignations = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(
        `/designations`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setDesignations(data.designations || []);
    } catch (error) {
      console.error('Error fetching designations:', error);
      toast.error('Failed to load designations');
    }
  };

  const fetchInterviewers = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(
        `/admin/users`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const interviewerUsers = data.users?.filter((u: User) => u.role === 'interviewer') || [];
        setInterviewers(interviewerUsers);
      }
    } catch (error) {
      console.error('Error fetching interviewers:', error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!accessToken) return;
    
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `/available-slots?interviewerId=${selectedInterviewer}&date=${scheduledDate}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Generate time slots from 9 AM to 6 PM
        const slots: AvailableSlot[] = [];
        for (let hour = 9; hour < 18; hour++) {
          const time = `${String(hour).padStart(2, '0')}:00`;
          const dateTimeStr = `${scheduledDate}T${time}`;
          const isBooked = data.bookedSlots?.some((slot: string) => slot.startsWith(dateTimeStr));
          
          slots.push({
            time,
            available: !isBooked && !isPastTimeSlot(scheduledDate, time),
          });
        }
        
        setAvailableSlots(slots);
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setCvFile(file);
    }
  };

  const handleRemoveCv = () => {
    setCvFile(null);
    setCvUrl('');
  };

  const uploadCv = async (): Promise<string> => {
    if (!cvFile) return '';

    setUploadingCv(true);
    try {
      const formData = new FormData();
      formData.append('cv', cvFile);

      const response = await fetch(
        `/upload-cv`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CV');
      }

      return data.cvUrl;
    } catch (error: any) {
      console.error('Error uploading CV:', error);
      toast.error(error.message || 'Failed to upload CV');
      return '';
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSkills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    setLoading(true);

    try {
      // Upload CV if provided
      let uploadedCvUrl = cvUrl;
      if (cvFile && !cvUrl) {
        uploadedCvUrl = await uploadCv();
        if (!uploadedCvUrl) {
          throw new Error('Failed to upload CV');
        }
      }

      const dateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (dateTime <= new Date()) {
        throw new Error('Please select a future time slot');
      }

      const response = await fetch(
        `/interviews`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            designationId: selectedDesignation,
            scheduledDate: dateTime.toISOString(),
            timezone,
            notes,
            skill: selectedSkills.join(', '),
            level,
            interviewLevel,
            cvUrl: uploadedCvUrl,
            preferredInterviewerId: selectedInterviewer || null,
            preferredCompany,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to schedule interview');
      }

      toast.success('Interview scheduled successfully!');
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const isPastTimeSlot = (date: string, time: string) => {
    if (!date || !time) return false;
    const today = new Date().toISOString().split('T')[0];
    if (date !== today) return false;
    return new Date(`${date}T${time}`) <= new Date();
  };

  const handleRequestDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequesting(true);

    try {
      const response = await fetch(
        `/designations/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: newDesignationName,
            description: newDesignationDesc,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request designation');
      }

      toast.success('Designation request submitted successfully!');
      setDialogOpen(false);
      setNewDesignationName('');
      setNewDesignationDesc('');
    } catch (error: any) {
      console.error('Error requesting designation:', error);
      toast.error(error.message || 'Failed to request designation');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Schedule New Interview</CardTitle>
        <CardDescription>Fill in the details to schedule your mock interview</CardDescription>
      </CardHeader>

      <form onSubmit={handleSchedule} className="space-y-4">
        <div>
          <Label htmlFor="designation">Designation *</Label>
          <div className="flex gap-2">
            <Select value={selectedDesignation} onValueChange={setSelectedDesignation} required>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a designation" />
              </SelectTrigger>
              <SelectContent>
                {designations.map(designation => (
                  <SelectItem key={designation.id} value={designation.id}>
                    {designation.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline">Request New</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request New Designation</DialogTitle>
                  <DialogDescription>
                    Can&apos;t find the designation you&apos;re looking for? Request a new one.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleRequestDesignation} className="space-y-4">
                  <div>
                    <Label htmlFor="newDesignationName">Designation Name</Label>
                    <Input
                      id="newDesignationName"
                      value={newDesignationName}
                      onChange={(e) => setNewDesignationName(e.target.value)}
                      placeholder="e.g., Senior React Developer"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="newDesignationDesc">Description (Optional)</Label>
                    <Textarea
                      id="newDesignationDesc"
                      value={newDesignationDesc}
                      onChange={(e) => setNewDesignationDesc(e.target.value)}
                      placeholder="Additional details about this role..."
                    />
                  </div>
                  <Button type="submit" disabled={requesting} className="w-full">
                    {requesting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="skill">Skills *</Label>
            <Select value="" onValueChange={(value) => {
              if (!selectedSkills.includes(value)) {
                setSelectedSkills([...selectedSkills, value]);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select skills" />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map(skillOption => (
                  <SelectItem key={skillOption} value={skillOption}>
                    {skillOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedSkills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedSkills.map((selectedSkill) => (
                  <Button
                    key={selectedSkill}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSkills(selectedSkills.filter((item) => item !== selectedSkill))}
                  >
                    {selectedSkill}
                    <X className="ml-2 h-3 w-3" />
                  </Button>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <Input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                placeholder="Add secondary skill"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const normalized = customSkill.trim();
                  if (normalized && !selectedSkills.includes(normalized)) {
                    setSelectedSkills([...selectedSkills, normalized]);
                    setCustomSkill('');
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="level">Skill Level *</Label>
            <Select value={level} onValueChange={setLevel} required>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map(levelOption => (
                  <SelectItem key={levelOption} value={levelOption}>
                    {levelOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="interviewLevel">Interview Level *</Label>
          <Select value={interviewLevel} onValueChange={setInterviewLevel} required>
            <SelectTrigger>
              <SelectValue placeholder="Select interview level" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_LEVELS.map(levelOption => (
                <SelectItem key={levelOption} value={levelOption}>
                  {levelOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {interviewers.length > 0 && (
          <div>
            <Label htmlFor="interviewer">Preferred Interviewer (Optional)</Label>
            <Select value={selectedInterviewer} onValueChange={setSelectedInterviewer}>
              <SelectTrigger>
                <SelectValue placeholder="Select an interviewer or leave blank for auto-assignment" />
              </SelectTrigger>
              <SelectContent>
                {interviewers.map(interviewer => (
                  <SelectItem key={interviewer.id} value={interviewer.id}>
                    {interviewer.name} ({interviewer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label htmlFor="preferredCompany">
            <Building2 className="h-4 w-4 inline mr-1" />
            Preferred Company (Optional)
          </Label>
          <Input
            id="preferredCompany"
            value={preferredCompany}
            onChange={(e) => setPreferredCompany(e.target.value)}
            placeholder="e.g., Google, Microsoft, Amazon, Apple, Meta"
          />
          <p className="text-xs text-gray-500 mt-1">💼 Request an interviewer from a specific company</p>
        </div>

        <div>
          <Label htmlFor="timezone">
            <Globe className="h-4 w-4 inline mr-1" />
            Time Zone *
          </Label>
          <Select value={timezone} onValueChange={setTimezone} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">
              <Calendar className="h-4 w-4 inline mr-1" />
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div>
            <Label htmlFor="time">
              <Clock className="h-4 w-4 inline mr-1" />
              Time *
            </Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={scheduledDate === new Date().toISOString().split('T')[0] ? new Date().toTimeString().slice(0, 5) : undefined}
              required
            />
          </div>
        </div>

        {selectedInterviewer && scheduledDate && availableSlots.length > 0 && (
          <div>
            <Label>Available Time Slots</Label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {availableSlots.map(slot => (
                <Button
                  key={slot.time}
                  type="button"
                  variant={scheduledTime === slot.time ? 'default' : 'outline'}
                  size="sm"
                  disabled={!slot.available}
                  onClick={() => setScheduledTime(slot.time)}
                  className="text-sm"
                >
                  {slot.time}
                  {!slot.available && ' ✗'}
                </Button>
              ))}
            </div>
            {loadingSlots && <p className="text-sm text-gray-500 mt-2">Loading available slots...</p>}
          </div>
        )}

        <div>
          <Label htmlFor="cv">
            <FileText className="h-4 w-4 inline mr-1" />
            Upload CV (Optional)
          </Label>
          <div className="mt-2">
            {!cvFile ? (
              <div className="flex items-center gap-2">
                <Input
                  id="cv"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleCvFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('cv')?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose CV File (PDF or Word)
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                <FileText className="h-5 w-5 text-blue-600" />
                <span className="flex-1 text-sm truncate">{cvFile.name}</span>
                <span className="text-xs text-gray-500">
                  {(cvFile.size / 1024).toFixed(1)} KB
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveCv}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Formats: PDF, DOC, DOCX</p>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific topics or areas you'd like to focus on..."
            rows={4}
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading || uploadingCv} className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            {loading || uploadingCv ? 'Scheduling...' : 'Schedule Interview'}
          </Button>
          {onClose && (
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
