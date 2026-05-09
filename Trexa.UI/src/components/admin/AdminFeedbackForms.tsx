import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { apiBaseUrl } from "../../config/api";
import { FileText, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Checkbox } from '../ui/checkbox';
import { AdminPagination, getPaginationRange } from './AdminPagination';

interface FeedbackForm {
  id: string;
  name: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  createdAt: string;
}

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

const FEEDBACK_FORMS_PAGE_SIZE = 6;

export function AdminFeedbackForms() {
  const { accessToken } = useAuth();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formsPage, setFormsPage] = useState(1);
  const [formName, setFormName] = useState('');
  const [fields, setFields] = useState<FormField[]>([
    { name: 'rating', label: 'Overall Rating (1-10)', type: 'number', required: true },
    { name: 'comments', label: 'Comments', type: 'textarea', required: true },
  ]);
  const formsRange = getPaginationRange(formsPage, forms.length, FEEDBACK_FORMS_PAGE_SIZE);
  const paginatedForms = forms.slice(
    (formsRange.currentPage - 1) * FEEDBACK_FORMS_PAGE_SIZE,
    formsRange.currentPage * FEEDBACK_FORMS_PAGE_SIZE
  );

  useEffect(() => {
    fetchForms();
  }, [accessToken]);

  const fetchForms = async () => {
    try {
      const response = await fetch(
        `/feedback-forms`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setForms(data.forms || []);
    } catch (error) {
      console.error('Error fetching feedback forms:', error);
      toast.error('Failed to load feedback forms');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setFields([...fields, { name: '', label: '', type: 'text', required: false }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleUpdateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate fields
    if (fields.some(f => !f.name || !f.label)) {
      toast.error('All fields must have a name and label');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(
        `/admin/feedback-forms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: formName,
            fields,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create feedback form');
      }

      toast.success('Feedback form created successfully!');
      setDialogOpen(false);
      setFormName('');
      setFields([
        { name: 'rating', label: 'Overall Rating (1-10)', type: 'number', required: true },
        { name: 'comments', label: 'Comments', type: 'textarea', required: true },
      ]);
      fetchForms();
    } catch (error: any) {
      console.error('Error creating feedback form:', error);
      toast.error(error.message || 'Failed to create feedback form');
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
          <h2 className="text-2xl mb-2">Feedback Form Management</h2>
          <p className="text-gray-600">Create and manage feedback forms for interviewers</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileText className="h-4 w-4 mr-2" />
              Create Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Feedback Form</DialogTitle>
              <DialogDescription>
                Design a custom feedback form for interviewers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div>
                <Label htmlFor="formName">Form Name</Label>
                <Input
                  id="formName"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Technical Interview Feedback"
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Form Fields</Label>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddField}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Field Name</Label>
                          <Input
                            value={field.name}
                            onChange={(e) => handleUpdateField(index, 'name', e.target.value)}
                            placeholder="e.g., technicalSkills"
                            required
                          />
                        </div>
                        <div>
                          <Label>Field Label</Label>
                          <Input
                            value={field.label}
                            onChange={(e) => handleUpdateField(index, 'label', e.target.value)}
                            placeholder="e.g., Technical Skills"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <Label>Field Type</Label>
                          <Select
                            value={field.type}
                            onValueChange={(value) => handleUpdateField(index, 'type', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="textarea">Textarea</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <Checkbox
                            id={`required-${index}`}
                            checked={field.required}
                            onCheckedChange={(checked) => handleUpdateField(index, 'required', checked)}
                          />
                          <Label htmlFor={`required-${index}`}>Required</Label>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveField(index)}
                          className="mt-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button type="submit" disabled={creating} className="w-full">
                {creating ? 'Creating...' : 'Create Form'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {forms.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="py-12 text-center text-gray-500">
              No feedback forms created yet
            </CardContent>
          </Card>
        ) : (
          paginatedForms.map((form) => (
            <Card key={form.id}>
              <CardHeader>
                <CardTitle>{form.name}</CardTitle>
                <CardDescription>
                  {form.fields.length} fields • Created {new Date(form.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {form.fields.map((field, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span>{field.label}</span>
                      <div className="flex gap-2">
                        <span className="text-gray-500">{field.type}</span>
                        {field.required && (
                          <span className="text-red-500">*</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <AdminPagination
        page={formsPage}
        pageSize={FEEDBACK_FORMS_PAGE_SIZE}
        totalItems={forms.length}
        onPageChange={setFormsPage}
      />
    </div>
  );
}
