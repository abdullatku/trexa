import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { apiBaseUrl } from "../../config/api";
import { toast } from 'sonner@2.0.3';
import { User, Mail, Briefcase, Linkedin, Code, Save, X, Plus } from 'lucide-react';

const AVAILABLE_TECH_STACKS = [
  'React', 'Angular', 'Vue.js', 'Node.js', 'Python', 'Java',
  'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'PHP', 'Ruby',
  'Swift', 'Kotlin', 'Rust', 'Scala', 'System Design', 'Data Structures',
  'Algorithms', 'Database Design', 'DevOps', 'Cloud Architecture',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
  'Redis', 'GraphQL', 'REST API', 'Microservices', 'Machine Learning',
];

export function ProfilePage() {
  const { user, accessToken, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [linkedInProfile, setLinkedInProfile] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [techStacks, setTechStacks] = useState<string[]>([]);
  const [newTech, setNewTech] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setLinkedInProfile((user as any).linkedInProfile || '');
      setBio((user as any).bio || '');
      setPhone((user as any).phone || '');
      setTechStacks((user as any).techStacks || []);
    }
  }, [user]);

  const handleAddTech = (tech: string) => {
    if (!techStacks.includes(tech)) {
      setTechStacks([...techStacks, tech]);
    }
    setNewTech('');
  };

  const handleRemoveTech = (tech: string) => {
    setTechStacks(techStacks.filter(t => t !== tech));
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch(
        `/auth/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name,
            linkedInProfile,
            bio,
            phone,
            techStacks,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      setEditing(false);
      await refreshProfile();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    if (user) {
      setName(user.name || '');
      setLinkedInProfile((user as any).linkedInProfile || '');
      setBio((user as any).bio || '');
      setPhone((user as any).phone || '');
      setTechStacks((user as any).techStacks || []);
    }
    setEditing(false);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information and preferences</p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your basic profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-indigo-100 flex items-center justify-center">
              <User className="h-10 w-10 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <Badge variant="outline" className="mt-1">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Full Name</Label>
            <div className="mt-1">
              {editing ? (
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                />
              ) : (
                <div className="flex items-center gap-2 p-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{user.name || 'Not set'}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="flex items-center gap-2 p-2 mt-1">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">{user.email}</span>
              <Badge variant="secondary" className="text-xs">Verified</Badge>
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="mt-1">
              {editing ? (
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  type="tel"
                />
              ) : (
                <div className="p-2">
                  <span className="text-gray-600">{phone || 'Not set'}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <div className="mt-1">
              {editing ? (
                <Input
                  id="linkedin"
                  value={linkedInProfile}
                  onChange={(e) => setLinkedInProfile(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              ) : linkedInProfile ? (
                <div className="flex items-center gap-2 p-2">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  <a
                    href={linkedInProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {linkedInProfile}
                  </a>
                </div>
              ) : (
                <div className="p-2">
                  <span className="text-gray-400">Not set</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <div className="mt-1">
              {editing ? (
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself, your experience, and your goals..."
                  rows={4}
                />
              ) : (
                <div className="p-2">
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {bio || 'No bio added yet'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {user.role === 'interviewer' && (
            <div>
              <Label>Technology Stacks</Label>
              <div className="mt-2">
                {editing ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {techStacks.map((tech) => (
                        <Badge key={tech} variant="secondary" className="flex items-center gap-1">
                          <Code className="h-3 w-3" />
                          {tech}
                          <button
                            type="button"
                            onClick={() => handleRemoveTech(tech)}
                            className="ml-1 hover:text-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={newTech}
                        onChange={(e) => setNewTech(e.target.value)}
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      >
                        <option value="">Select technology to add...</option>
                        {AVAILABLE_TECH_STACKS.filter(t => !techStacks.includes(t)).map((tech) => (
                          <option key={tech} value={tech}>{tech}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => newTech && handleAddTech(newTech)}
                        disabled={!newTech}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {techStacks.length > 0 ? (
                      techStacks.map((tech) => (
                        <Badge key={tech} variant="secondary">
                          <Code className="h-3 w-3 mr-1" />
                          {tech}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-400">No technologies added yet</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {editing && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Account Type</p>
              <p className="mt-1">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="mt-1">
                {new Date((user as any).createdAt || Date.now()).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
