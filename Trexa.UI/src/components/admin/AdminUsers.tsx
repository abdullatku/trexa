import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { UserPlus, X, Plus, Code, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  techStacks?: string[];
  linkedInProfile?: string;
  company?: string;
}

const AVAILABLE_TECH_STACKS = [
  'React', 'Angular', 'Vue.js', 'Node.js', 'Python', 'Java',
  'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'PHP', 'Ruby',
  'Swift', 'Kotlin', 'Rust', 'Scala', 'System Design', 'Data Structures',
  'Algorithms', 'Database Design', 'DevOps', 'Cloud Architecture',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'MongoDB', 'PostgreSQL',
];

export function AdminUsers() {
  const { accessToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'student',
    linkedInProfile: '',
    bio: '',
    techStacks: [] as string[],
    company: '',
  });
  const [newTech, setNewTech] = useState('');

  const isAdminRole = formData.role === 'admin';

  useEffect(() => {
    if (accessToken) {
      fetchUsers();
    }
  }, [accessToken]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `/admin/users`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const copyGeneratedPassword = async () => {
    if (!generatedPassword) return;

    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast.success('Generated password copied to clipboard');
    } catch (error) {
      console.error('Failed to copy password:', error);
      toast.error('Unable to copy password. Please copy it manually.');
    }
  };

  const handleAddTech = (tech: string) => {
    if (!formData.techStacks.includes(tech)) {
      setFormData({ ...formData, techStacks: [...formData.techStacks, tech] });
    }
    setNewTech('');
  };

  const handleRemoveTech = (tech: string) => {
    setFormData({ ...formData, techStacks: formData.techStacks.filter(t => t !== tech) });
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !accessToken) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/admin/users/${userToDelete.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      toast.success('User deleted successfully');
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const handleRoleChange = (value: string) => {
    if (value === 'admin') {
      setFormData(prev => ({
        ...prev,
        role: value,
        linkedInProfile: '',
        bio: '',
        techStacks: [],
      }));
      setNewTech('');
      return;
    }

    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const payload: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        company: formData.company,
      };

      if (!isAdminRole) {
        payload.linkedInProfile = formData.linkedInProfile;
        payload.bio = formData.bio;
        payload.techStacks = formData.techStacks;
      }

      const response = await fetch(
        `/admin/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      setGeneratedPassword(data.generatedPassword || null);
      toast.success('User created successfully!');
      setDialogOpen(false);
      setFormData({
        email: '',
        name: '',
        role: 'student',
        linkedInProfile: '',
        bio: '',
        techStacks: [],
        company: '',
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
    } finally {
      setCreating(false);
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
      {generatedPassword && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base">Generated Password</CardTitle>
            <CardDescription>
              Share this temporary password securely with the new user.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="flex-1 font-mono text-sm p-3 bg-white border rounded break-all">{generatedPassword}</div>
              <Button type="button" variant="outline" onClick={copyGeneratedPassword}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl mb-2">User Management</h2>
          <p className="text-gray-600">Manage students, interviewers, and admins</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                System will generate a strong password automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="interviewer">Interviewer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!isAdminRole && (
                <>
                  <div>
                    <Label htmlFor="linkedInProfile">LinkedIn Profile</Label>
                    <Input
                      id="linkedInProfile"
                      value={formData.linkedInProfile}
                      onChange={(e) => setFormData({ ...formData, linkedInProfile: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="techStacks">Tech Stacks (for Interviewers)</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.techStacks.map((tech) => (
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
                        {AVAILABLE_TECH_STACKS.filter(t => !formData.techStacks.includes(t)).map((tech) => (
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
                </>
              )}

              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Total users: {users.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No users found</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="flex gap-2 justify-end">
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
