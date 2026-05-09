import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { apiBaseUrl } from "../../config/api";
import { Briefcase } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AdminPagination, getPaginationRange } from './AdminPagination';

interface Designation {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

const DESIGNATIONS_PAGE_SIZE = 10;

export function AdminDesignations() {
  const { accessToken } = useAuth();
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [designationsPage, setDesignationsPage] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const designationsRange = getPaginationRange(designationsPage, designations.length, DESIGNATIONS_PAGE_SIZE);
  const paginatedDesignations = designations.slice(
    (designationsRange.currentPage - 1) * DESIGNATIONS_PAGE_SIZE,
    designationsRange.currentPage * DESIGNATIONS_PAGE_SIZE
  );

  useEffect(() => {
    fetchDesignations();
  }, [accessToken]);

  const fetchDesignations = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = await fetch(
        `/admin/designations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create designation');
      }

      toast.success('Designation created successfully!');
      setDialogOpen(false);
      setFormData({ name: '', description: '' });
      fetchDesignations();
    } catch (error: any) {
      console.error('Error creating designation:', error);
      toast.error(error.message || 'Failed to create designation');
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl mb-2">Designation Management</h2>
          <p className="text-gray-600">Manage interview designations and roles</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Briefcase className="h-4 w-4 mr-2" />
              Create Designation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Designation</DialogTitle>
              <DialogDescription>
                Add a new role/designation for mock interviews
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDesignation} className="space-y-4">
              <div>
                <Label htmlFor="name">Designation Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Senior React Developer"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role and technologies..."
                  rows={4}
                />
              </div>
              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Designation'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Designations</CardTitle>
          <CardDescription>Total designations: {designations.length}</CardDescription>
        </CardHeader>
        <CardContent>
          {designations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No designations found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDesignations.map((designation) => (
                  <TableRow key={designation.id}>
                    <TableCell>{designation.name}</TableCell>
                    <TableCell>{designation.description || '-'}</TableCell>
                    <TableCell>{new Date(designation.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <AdminPagination
            page={designationsPage}
            pageSize={DESIGNATIONS_PAGE_SIZE}
            totalItems={designations.length}
            onPageChange={setDesignationsPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
