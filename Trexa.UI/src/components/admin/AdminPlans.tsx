import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { apiBaseUrl } from "../../config/api";
import { CreditCard, Plus, Trash2, Building2, CheckCircle2, Pencil } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { AdminPagination, getPaginationRange } from './AdminPagination';

interface Plan {
  id: string;
  name: string;
  price: number;
  interviews: number;
  features: string[];
  duration: string;
  isDefault?: boolean;
  companyLevels?: string[];
  paymentType?: 'subscription' | 'one_time';
  createdAt: string;
}

interface CompanyLevel {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

const PLANS_PAGE_SIZE = 6;

export function AdminPlans() {
  const { accessToken } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [companyLevelsList, setCompanyLevelsList] = useState<CompanyLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [companyLevelDialogOpen, setCompanyLevelDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    interviews: '',
    duration: 'monthly',
    paymentType: 'subscription' as 'subscription' | 'one_time',
    isDefault: false,
  });
  const [features, setFeatures] = useState<string[]>(['']);
  const [selectedCompanyLevels, setSelectedCompanyLevels] = useState<string[]>([]);
  const [newCompanyLevel, setNewCompanyLevel] = useState({
    name: '',
    description: '',
  });
  const [creatingCompanyLevel, setCreatingCompanyLevel] = useState(false);
  const [editingCompanyLevel, setEditingCompanyLevel] = useState<CompanyLevel | null>(null);
  const [updatingCompanyLevel, setUpdatingCompanyLevel] = useState(false);
  const [deletingCompanyLevel, setDeletingCompanyLevel] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<string | null>(null);
  const [editFeatures, setEditFeatures] = useState<string[]>(['']);
  const [editSelectedCompanyLevels, setEditSelectedCompanyLevels] = useState<string[]>([]);
  const [plansPage, setPlansPage] = useState(1);
  const plansRange = getPaginationRange(plansPage, plans.length, PLANS_PAGE_SIZE);
  const paginatedPlans = plans.slice(
    (plansRange.currentPage - 1) * PLANS_PAGE_SIZE,
    plansRange.currentPage * PLANS_PAGE_SIZE
  );

  useEffect(() => {
    if (accessToken) {
      fetchPlans();
      fetchCompanyLevels();
    }
  }, [accessToken]);

  const fetchPlans = async () => {
    try {
      const response = await fetch(
        `/plans`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyLevels = async () => {
    try {
      const response = await fetch(
        `/admin/company-levels`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      const data = await response.json();
      setCompanyLevelsList(data.companyLevels || []);
    } catch (error) {
      console.error('Error fetching company levels:', error);
    }
  };

  const handleAddFeature = () => {
    setFeatures([...features, '']);
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleUpdateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const handleAddEditFeature = () => {
    setEditFeatures([...editFeatures, '']);
  };

  const handleRemoveEditFeature = (index: number) => {
    setEditFeatures(editFeatures.filter((_, i) => i !== index));
  };

  const handleUpdateEditFeature = (index: number, value: string) => {
    const newFeatures = [...editFeatures];
    newFeatures[index] = value;
    setEditFeatures(newFeatures);
  };

  const toggleCompanyLevel = (levelId: string) => {
    setSelectedCompanyLevels(prev =>
      prev.includes(levelId)
        ? prev.filter(id => id !== levelId)
        : [...prev, levelId]
    );
  };

  const toggleEditCompanyLevel = (levelId: string) => {
    setEditSelectedCompanyLevels(prev =>
      prev.includes(levelId)
        ? prev.filter(id => id !== levelId)
        : [...prev, levelId]
    );
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    const validFeatures = features.filter(f => f.trim() !== '');

    setCreating(true);

    try {
      const response = await fetch(
        `/admin/plans`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: formData.name,
            price: parseFloat(formData.price),
            interviews: parseInt(formData.interviews),
            duration: formData.duration,
            features: validFeatures,
            isDefault: formData.isDefault,
            companyLevels: selectedCompanyLevels,
            paymentType: formData.paymentType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create plan');
      }

      toast.success('Plan created successfully!');
      setDialogOpen(false);
      setFormData({ name: '', price: '', interviews: '', duration: 'monthly', isDefault: false });
      setFeatures(['']);
      setSelectedCompanyLevels([]);
      fetchPlans();
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast.error(error.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateCompanyLevel = async (e: React.FormEvent) => {
    e.preventDefault();

    setCreatingCompanyLevel(true);

    try {
      const response = await fetch(
        `/admin/company-levels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: newCompanyLevel.name,
            description: newCompanyLevel.description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create company level');
      }

      toast.success('Company level created successfully!');
      setCompanyLevelDialogOpen(false);
      setNewCompanyLevel({ name: '', description: '' });
      fetchCompanyLevels();
    } catch (error: any) {
      console.error('Error creating company level:', error);
      toast.error(error.message || 'Failed to create company level');
    } finally {
      setCreatingCompanyLevel(false);
    }
  };

  const handleUpdateCompanyLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompanyLevel) return;

    setUpdatingCompanyLevel(true);

    try {
      const response = await fetch(
        `/admin/company-levels/${editingCompanyLevel.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: editingCompanyLevel.name,
            description: editingCompanyLevel.description,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update company level');
      }

      toast.success('Company level updated successfully!');
      setEditingCompanyLevel(null);
      fetchCompanyLevels();
    } catch (error: any) {
      console.error('Error updating company level:', error);
      toast.error(error.message || 'Failed to update company level');
    } finally {
      setUpdatingCompanyLevel(false);
    }
  };

  const handleDeleteCompanyLevel = async (levelId: string) => {
    if (!confirm('Are you sure you want to delete this company level? This may affect existing plans.')) {
      return;
    }

    setDeletingCompanyLevel(levelId);

    try {
      const response = await fetch(
        `/admin/company-levels/${levelId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete company level');
      }

      toast.success('Company level deleted successfully!');
      fetchCompanyLevels();
      fetchPlans(); // Refresh plans to update their displayed company levels
    } catch (error: any) {
      console.error('Error deleting company level:', error);
      toast.error(error.message || 'Failed to delete company level');
    } finally {
      setDeletingCompanyLevel(null);
    }
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setEditPlanDialogOpen(true);
    setEditFeatures(plan.features);
    setEditSelectedCompanyLevels(plan.companyLevels || []);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setUpdatingPlan(true);

    try {
      const response = await fetch(
        `/admin/plans/${editingPlan.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: editingPlan.name,
            price: editingPlan.price,
            interviews: editingPlan.interviews,
            duration: editingPlan.duration,
            features: editFeatures,
            isDefault: editingPlan.isDefault,
            companyLevels: editSelectedCompanyLevels,
            paymentType: editingPlan.paymentType,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update plan');
      }

      toast.success('Plan updated successfully!');
      setEditingPlan(null);
      fetchPlans();
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast.error(error.message || 'Failed to update plan');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    const planToDelete = plans.find(p => p.id === planId);
    
    let confirmMessage = 'Are you sure you want to delete this plan?';
    if (planToDelete?.isDefault) {
      confirmMessage = 'This is the default plan. If deleted, another plan will automatically be set as default. Continue?';
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingPlan(planId);

    try {
      const response = await fetch(
        `/admin/plans/${planId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete plan');
      }

      if (planToDelete?.isDefault) {
        toast.success('Plan deleted and another plan was set as default');
      } else {
        toast.success('Plan deleted successfully!');
      }
      fetchPlans();
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error(error.message || 'Failed to delete plan');
    } finally {
      setDeletingPlan(null);
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
    <div className="admin-plans-page space-y-6">
      <div className="admin-plans-header flex justify-between items-center gap-4">
        <div className="admin-plans-heading min-w-0">
          <h2 className="text-2xl mb-2">Plan Management</h2>
          <p className="text-gray-600">Create and manage subscription plans and company levels</p>
        </div>
        <div className="admin-plans-actions flex gap-2">
          <Dialog open={companyLevelDialogOpen} onOpenChange={setCompanyLevelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="admin-plans-action">
                <Building2 className="h-4 w-4 mr-2" />
                Manage Company Levels
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Company Levels</DialogTitle>
                <DialogDescription>
                  Create and manage company levels that can be associated with plans
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateCompanyLevel} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium">Create New Company Level</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyLevelName">Name *</Label>
                    <Input
                      id="companyLevelName"
                      value={newCompanyLevel.name}
                      onChange={(e) => setNewCompanyLevel({ ...newCompanyLevel, name: e.target.value })}
                      placeholder="e.g., Startup"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="companyLevelDescription">Description *</Label>
                    <Input
                      id="companyLevelDescription"
                      value={newCompanyLevel.description}
                      onChange={(e) => setNewCompanyLevel({ ...newCompanyLevel, description: e.target.value })}
                      placeholder="e.g., 1-50 employees"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={creatingCompanyLevel} size="sm">
                  {creatingCompanyLevel ? 'Creating...' : 'Create Company Level'}
                </Button>
              </form>

              <Separator className="my-4" />

              <div className="space-y-3">
                <h3 className="font-medium">Existing Company Levels</h3>
                {companyLevelsList.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center">No company levels created yet</p>
                ) : (
                  <div className="grid gap-3">
                    {companyLevelsList.map((level) => (
                      editingCompanyLevel?.id === level.id ? (
                        <Card key={level.id} className="border-indigo-500">
                          <CardContent className="p-4">
                            <form onSubmit={handleUpdateCompanyLevel} className="space-y-3">
                              <div>
                                <Label htmlFor={`edit-name-${level.id}`}>Name *</Label>
                                <Input
                                  id={`edit-name-${level.id}`}
                                  value={editingCompanyLevel.name}
                                  onChange={(e) => setEditingCompanyLevel({ ...editingCompanyLevel, name: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor={`edit-desc-${level.id}`}>Description *</Label>
                                <Input
                                  id={`edit-desc-${level.id}`}
                                  value={editingCompanyLevel.description}
                                  onChange={(e) => setEditingCompanyLevel({ ...editingCompanyLevel, description: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingCompanyLevel(null)}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={updatingCompanyLevel}>
                                  {updatingCompanyLevel ? 'Saving...' : 'Save'}
                                </Button>
                              </div>
                            </form>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card key={level.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{level.name}</h4>
                                <p className="text-sm text-gray-600">{level.description}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  Created {new Date(level.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingCompanyLevel(level)}
                                  disabled={deletingCompanyLevel === level.id}
                                >
                                  <Pencil className="h-4 w-4 text-indigo-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteCompanyLevel(level.id)}
                                  disabled={deletingCompanyLevel === level.id}
                                >
                                  {deletingCompanyLevel === level.id ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-red-600" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="admin-plans-action">
                <CreditCard className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Plan</DialogTitle>
                <DialogDescription>
                  Add a new subscription plan for students
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreatePlan} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">1</div>
                    <h3 className="font-medium">Basic Information</h3>
                  </div>
                  
                  <div>
                    <Label htmlFor="planName">Plan Name *</Label>
                    <Input
                      id="planName"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Professional Plan"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Price (₹) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="29.99"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter 0 for a free plan</p>
                    </div>

                    <div>
                      <Label htmlFor="interviews">Interviews *</Label>
                      <Input
                        id="interviews"
                        type="number"
                        value={formData.interviews}
                        onChange={(e) => setFormData({ ...formData, interviews: e.target.value })}
                        placeholder="5"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="paymentType">Payment Type *</Label>
                      <Select
                        value={formData.paymentType}
                        onValueChange={(value: 'subscription' | 'one_time') => setFormData({ ...formData, paymentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="one_time">One-Time Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.paymentType === 'subscription' && (
                    <div>
                      <Label htmlFor="duration">Subscription Duration *</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData({ ...formData, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {formData.paymentType === 'one_time' && (
                    <div>
                      <Label htmlFor="validity">Validity Period *</Label>
                      <Select
                        value={formData.duration}
                        onValueChange={(value) => setFormData({ ...formData, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 month">1 Month</SelectItem>
                          <SelectItem value="3 months">3 Months</SelectItem>
                          <SelectItem value="6 months">6 Months</SelectItem>
                          <SelectItem value="1 year">1 Year</SelectItem>
                          <SelectItem value="lifetime">Lifetime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Features */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">2</div>
                      <h3 className="font-medium">Features</h3>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddFeature}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Feature
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {features.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => handleUpdateFeature(index, e.target.value)}
                          placeholder="e.g., Detailed feedback report"
                        />
                        {features.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveFeature(index)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Company Levels */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">3</div>
                    <h3 className="font-medium">Supported Company Levels</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {companyLevelsList.length === 0 ? (
                      <p className="text-sm text-gray-500 col-span-2">No company levels available. Create one first.</p>
                    ) : (
                      companyLevelsList.map((level) => (
                        <div
                          key={level.id}
                          className={`p-3 border rounded-lg transition-all ${
                            selectedCompanyLevels.includes(level.id)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={`level-${level.id}`}
                              checked={selectedCompanyLevels.includes(level.id)}
                              onCheckedChange={() => toggleCompanyLevel(level.id)}
                            />
                            <label htmlFor={`level-${level.id}`} className="flex-1 cursor-pointer">
                              <p className="font-medium text-sm">{level.name}</p>
                              <p className="text-xs text-gray-600">{level.description}</p>
                            </label>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">4</div>
                    <h3 className="font-medium">Settings</h3>
                  </div>

                  <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Checkbox
                      id="isDefault"
                      checked={formData.isDefault}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked as boolean })}
                    />
                    <div className="flex-1">
                      <Label htmlFor="isDefault" className="cursor-pointer">
                        Set as Default Plan
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        New students will be automatically assigned this plan
                      </p>
                    </div>
                    {formData.isDefault && <CheckCircle2 className="h-5 w-5 text-yellow-600" />}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Plan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editPlanDialogOpen} onOpenChange={setEditPlanDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Plan</DialogTitle>
                <DialogDescription>
                  Update an existing subscription plan for students
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleUpdatePlan} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">1</div>
                    <h3 className="font-medium">Basic Information</h3>
                  </div>
                  
                  <div>
                    <Label htmlFor="planName">Plan Name *</Label>
                    <Input
                      id="planName"
                      value={editingPlan?.name || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan!, name: e.target.value })}
                      placeholder="e.g., Professional Plan"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="price">Price (₹) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingPlan?.price || ''}
                        onChange={(e) => setEditingPlan({ ...editingPlan!, price: parseFloat(e.target.value) })}
                        placeholder="29.99"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter 0 for a free plan</p>
                    </div>

                    <div>
                      <Label htmlFor="interviews">Interviews *</Label>
                      <Input
                        id="interviews"
                        type="number"
                        value={editingPlan?.interviews || ''}
                        onChange={(e) => setEditingPlan({ ...editingPlan!, interviews: parseInt(e.target.value) })}
                        placeholder="5"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="paymentType">Payment Type *</Label>
                      <Select
                        value={editingPlan?.paymentType || 'subscription'}
                        onValueChange={(value: 'subscription' | 'one_time') => setEditingPlan({ ...editingPlan!, paymentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="one_time">One-Time Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {editingPlan?.paymentType === 'subscription' && (
                    <div>
                      <Label htmlFor="duration">Subscription Duration *</Label>
                      <Select
                        value={editingPlan?.duration || 'monthly'}
                        onValueChange={(value) => setEditingPlan({ ...editingPlan!, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editingPlan?.paymentType === 'one_time' && (
                    <div>
                      <Label htmlFor="validity">Validity Period *</Label>
                      <Select
                        value={editingPlan?.duration || '1 month'}
                        onValueChange={(value) => setEditingPlan({ ...editingPlan!, duration: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 month">1 Month</SelectItem>
                          <SelectItem value="3 months">3 Months</SelectItem>
                          <SelectItem value="6 months">6 Months</SelectItem>
                          <SelectItem value="1 year">1 Year</SelectItem>
                          <SelectItem value="lifetime">Lifetime</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Features */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">2</div>
                      <h3 className="font-medium">Features</h3>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddEditFeature}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Feature
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {editFeatures.map((feature, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={feature}
                          onChange={(e) => handleUpdateEditFeature(index, e.target.value)}
                          placeholder="e.g., Detailed feedback report"
                        />
                        {editFeatures.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveEditFeature(index)}
                          >
                            <Trash2 className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Company Levels */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">3</div>
                    <h3 className="font-medium">Supported Company Levels</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {companyLevelsList.length === 0 ? (
                      <p className="text-sm text-gray-500 col-span-2">No company levels available. Create one first.</p>
                    ) : (
                      companyLevelsList.map((level) => (
                        <div
                          key={level.id}
                          className={`p-3 border rounded-lg transition-all ${
                            editSelectedCompanyLevels.includes(level.id)
                              ? 'border-indigo-500 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={`level-${level.id}`}
                              checked={editSelectedCompanyLevels.includes(level.id)}
                              onCheckedChange={() => toggleEditCompanyLevel(level.id)}
                            />
                            <label htmlFor={`level-${level.id}`} className="flex-1 cursor-pointer">
                              <p className="font-medium text-sm">{level.name}</p>
                              <p className="text-xs text-gray-600">{level.description}</p>
                            </label>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Settings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">4</div>
                    <h3 className="font-medium">Settings</h3>
                  </div>

                  <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <Checkbox
                      id="isDefault"
                      checked={editingPlan?.isDefault || false}
                      onCheckedChange={(checked) => setEditingPlan({ ...editingPlan!, isDefault: checked as boolean })}
                    />
                    <div className="flex-1">
                      <Label htmlFor="isDefault" className="cursor-pointer">
                        Set as Default Plan
                      </Label>
                      <p className="text-xs text-gray-600 mt-1">
                        New students will be automatically assigned this plan
                      </p>
                    </div>
                    {editingPlan?.isDefault && <CheckCircle2 className="h-5 w-5 text-yellow-600" />}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditPlanDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatingPlan}>
                    {updatingPlan ? 'Updating...' : 'Update Plan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No plans created yet. Click "Create Plan" to add your first plan.
          </CardContent>
        </Card>
      ) : (
        <div className="admin-plans-grid grid md:grid-cols-3 gap-6 items-start">
          {paginatedPlans.map((plan) => (
            <Card key={plan.id} className={`admin-plan-card min-h-[450px] flex flex-col ${plan.isDefault ? 'border-indigo-500 border-2' : ''}`}>
              <CardHeader className="admin-plan-card-header">
                <div className="admin-plan-card-title-row flex justify-between items-start mb-2 gap-3">
                  <div className="flex-1">
                    <CardTitle className="admin-plan-title flex items-center gap-2">
                      {plan.name}
                      {plan.isDefault && (
                        <Badge variant="default" className="bg-indigo-600">
                          Default
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="admin-plan-duration">{plan.duration}</Badge>
                </div>
                <CardDescription className="admin-plan-price flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="admin-plan-price-value text-3xl text-green-600">Free</span>
                  ) : (
                    <>
                      <span className="admin-plan-price-value text-3xl">₹{plan.price}</span>
                      <span className="text-gray-600">/{plan.duration}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="admin-plan-card-content flex-1 flex flex-col">
                <div className="space-y-3 flex-1">
                  <div className="admin-plan-interviews flex items-center gap-2 text-sm font-medium text-indigo-600">
                    <CreditCard className="h-4 w-4" />
                    {plan.interviews} mock interviews
                  </div>
                  
                  {plan.features && plan.features.length > 0 && (
                    <div className="space-y-1">
                      {plan.features.map((feature, index) => (
                        <p key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-500 mt-1">•</span>
                          <span>{feature}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  {plan.companyLevels && plan.companyLevels.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-2">Supported Company Levels:</p>
                      <div className="flex flex-wrap gap-1">
                        {plan.companyLevels.map((levelId, index) => {
                          const level = companyLevelsList.find(l => l.id === levelId);
                          return level ? (
                            <Badge key={index} variant="outline" className="text-xs">
                              {level.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="admin-plan-created mt-4 pt-4 border-t text-xs text-gray-500">
                  Created {new Date(plan.createdAt).toLocaleDateString()}
                </div>
                <div className="admin-plan-card-actions flex gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleEditPlan(plan)}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => handleDeletePlan(plan.id)}
                    disabled={deletingPlan === plan.id}
                    className="flex-1"
                  >
                    {deletingPlan === plan.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-600" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-600" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <AdminPagination
        page={plansPage}
        pageSize={PLANS_PAGE_SIZE}
        totalItems={plans.length}
        onPageChange={setPlansPage}
      />
    </div>
  );
}
