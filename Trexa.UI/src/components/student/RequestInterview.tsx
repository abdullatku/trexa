import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { apiBaseUrl } from "../../config/api";
import { toast } from 'sonner@2.0.3';
import { Upload, FileText, X, Calendar, Building2, Pencil } from 'lucide-react';

interface Designation {
  id: string;
  name: string;
  description: string;
}

const SKILLS = [
  'React', 'Angular', 'Vue.js', 'Node.js', 'Python', 'Java',
  'JavaScript', 'TypeScript', 'C++', 'Go', 'PHP', 'Ruby',
  'Swift', 'Kotlin', 'System Design', 'Data Structures',
  'Algorithms', 'Database Design', 'DevOps', 'Cloud Architecture',
];

const LEVELS = [
  'Beginner', 'Intermediate', 'Advanced', 'Expert',
];

const INTERVIEW_LEVELS = [
  'Entry Level / Fresher',
  'Junior (0-2 years)',
  'Mid-Level (2-5 years)',
  'Senior (5-8 years)',
  'Lead / Principal (8+ years)',
  'Architect / Staff Engineer',
];

const COMPANY_LEVELS = [
  { value: 'startup', label: 'Startup (1-50 employees)' },
  { value: 'midsize', label: 'Midsize (50-500 employees)' },
  { value: 'enterprise', label: 'Enterprise (500+ employees)' },
];

interface RequestInterviewProps {
  onSuccess?: () => void;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
  editInterview?: {
    id: string;
    designationId: string;
    notes?: string;
    skill?: string;
    level?: string;
    interviewLevel?: string;
    cvUrl?: string;
    companyLevel?: string;
    preferredCompany?: string;
    timezone?: string;
  };
}

export function RequestInterview({ onSuccess, triggerClassName, triggerLabel = 'Request Interview', triggerVariant = 'default', triggerSize = 'default', editInterview }: RequestInterviewProps) {
  const { accessToken } = useAuth();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [level, setLevel] = useState('');
  const [interviewLevel, setInterviewLevel] = useState('');
  const [companyLevel, setCompanyLevel] = useState('');
  const [preferredCompany, setPreferredCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [newDesignationName, setNewDesignationName] = useState('');
  const [newDesignationDesc, setNewDesignationDesc] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [userPlan, setUserPlan] = useState<any>(null);
  
  // CV upload states
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState('');
  const [uploadingCv, setUploadingCv] = useState(false);

  useEffect(() => {
    if (accessToken) {
      fetchDesignations();
      fetchSubscription();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!dialogOpen || !editInterview) return;

    setSelectedDesignation(editInterview.designationId || '');
    setNotes(editInterview.notes || '');
    setSelectedSkills((editInterview.skill || '').split(',').map((skill) => skill.trim()).filter(Boolean));
    setCustomSkill('');
    setLevel(editInterview.level || '');
    setInterviewLevel(editInterview.interviewLevel || '');
    setCompanyLevel(editInterview.companyLevel || '');
    setPreferredCompany(editInterview.preferredCompany || '');
    setCvUrl(editInterview.cvUrl || '');
    setCvFile(null);
  }, [dialogOpen, editInterview]);

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

  const handleCvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document');
        return;
      }

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

      toast.success('CV uploaded successfully');
      return data.cvUrl;
    } catch (error: any) {
      console.error('Error uploading CV:', error);
      toast.error(error.message || 'Failed to upload CV');
      return '';
    } finally {
      setUploadingCv(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDesignation) {
      toast.error('Please select a designation');
      return;
    }

    if (selectedSkills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    if (!interviewLevel) {
      toast.error('Please select an interview level');
      return;
    }

    setLoading(true);

    try {
      // Upload CV first if selected
      let uploadedCvUrl = cvUrl;
      if (cvFile && !cvUrl) {
        uploadedCvUrl = await uploadCv();
        if (!uploadedCvUrl) {
          setLoading(false);
          return;
        }
        setCvUrl(uploadedCvUrl);
      }

      const response = await fetch(
        editInterview ? `/interviews/${editInterview.id}` : `/interviews`,
        {
          method: editInterview ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            designationId: selectedDesignation,
            ...(editInterview ? {} : { scheduledDate: 'pending' }),
            notes,
            skill: selectedSkills.join(', '),
            level,
            interviewLevel,
            cvUrl: uploadedCvUrl,
            companyLevel,
            preferredCompany,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request interview');
      }

      toast.success(editInterview ? 'Interview request updated successfully' : 'Interview request submitted successfully! Admin will assign an interviewer and schedule it.');
      
      // Reset form
      setSelectedDesignation('');
      setNotes('');
      setSelectedSkills([]);
      setCustomSkill('');
      setLevel('');
      setInterviewLevel('');
      setCompanyLevel('');
      setPreferredCompany('');
      setCvFile(null);
      setCvUrl('');
      setDialogOpen(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error(error.message || 'Failed to request interview');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDesignationName) {
      toast.error('Please enter a designation name');
      return;
    }

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

      toast.success('Designation request submitted successfully! Admin will review it.');
      setNewDesignationName('');
      setNewDesignationDesc('');
      setRequestDialogOpen(false);
    } catch (error: any) {
      console.error('Error requesting designation:', error);
      toast.error(error.message || 'Failed to request designation');
    } finally {
      setRequesting(false);
    }
  };

  const fetchSubscription = async () => {
    if (!accessToken) return;
    
    try {
      const response = await fetch(
        `/subscription`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setSubscription(data.subscription || null);
      setUserPlan(data.plan || null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant} className={`${triggerVariant === 'default' ? 'bg-indigo-600 hover:bg-indigo-700' : ''} ${triggerClassName || ''}`}>
          {editInterview ? <Pencil className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editInterview ? 'Edit Interview Request' : 'Request Mock Interview'}</DialogTitle>
          <DialogDescription>
            {editInterview ? 'Update the request details before an admin assigns and schedules it.' : 'Submit your interview request. Admin will assign an interviewer and schedule it based on availability.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="designation">Designation / Role *</Label>
            <div className="flex gap-2">
              <Select value={selectedDesignation} onValueChange={setSelectedDesignation}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select designation" />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">Request New</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request New Designation</DialogTitle>
                    <DialogDescription>
                      If your desired designation is not listed, request it here.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRequestDesignation} className="space-y-4">
                    <div>
                      <Label htmlFor="newName">Designation Name *</Label>
                      <Input
                        id="newName"
                        value={newDesignationName}
                        onChange={(e) => setNewDesignationName(e.target.value)}
                        placeholder="e.g., Senior Backend Engineer"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newDesc">Description (optional)</Label>
                      <Textarea
                        id="newDesc"
                        value={newDesignationDesc}
                        onChange={(e) => setNewDesignationDesc(e.target.value)}
                        placeholder="Brief description of the role"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRequestDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={requesting}>
                        {requesting ? 'Submitting...' : 'Submit Request'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div>
            <Label htmlFor="skill">Primary Skills *</Label>
            <Select value="" onValueChange={(value) => {
              if (!selectedSkills.includes(value)) {
                setSelectedSkills([...selectedSkills, value]);
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select skills to focus on" />
              </SelectTrigger>
              <SelectContent>
                {SKILLS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
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
            <Label htmlFor="level">Skill Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select your level in this skill" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="interviewLevel">Interview Level *</Label>
            <Select value={interviewLevel} onValueChange={setInterviewLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select interview difficulty" />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_LEVELS.map((il) => (
                  <SelectItem key={il} value={il}>{il}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="companyLevel">
              <Building2 className="h-4 w-4 inline mr-1" />
              Company Tier (optional)
            </Label>
            <Select value={companyLevel} onValueChange={setCompanyLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_LEVELS.map((cl) => (
                  <SelectItem key={cl.value} value={cl.value}>{cl.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">Choose the type of company you're preparing for</p>
          </div>

          <div>
            <Label htmlFor="preferredCompany">
              <Building2 className="h-4 w-4 inline mr-1" />
              Preferred Company (optional)
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
            <Label htmlFor="cv">Upload CV (optional)</Label>
            <div className="mt-2">
              {!cvFile && !cvUrl ? (
                <div className="flex items-center gap-2">
                  <Input
                    id="cv"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleCvFileChange}
                    className="flex-1"
                  />
                  <Upload className="h-5 w-5 text-gray-400" />
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="flex-1 text-sm text-green-800">
                    {cvFile?.name || 'CV uploaded'}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleRemoveCv}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                PDF or Word document, max 5MB
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific areas you want to focus on or questions you have..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingCv}>
              {loading ? 'Submitting...' : uploadingCv ? 'Uploading CV...' : editInterview ? 'Save Changes' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
