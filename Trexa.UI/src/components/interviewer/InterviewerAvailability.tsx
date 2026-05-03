import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { apiBaseUrl } from "../../config/api";
import { toast } from 'sonner@2.0.3';
import { Clock, Trash2, Plus } from 'lucide-react';

interface Availability {
  id: string;
  interviewerId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  createdAt: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

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

export function InterviewerAvailability() {
  const { accessToken, user } = useAuth();
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  useEffect(() => {
    if (user) {
      fetchAvailability();
    }
  }, [user, accessToken]);

  const fetchAvailability = async () => {
    if (!user) return;

    try {
      const response = await fetch(
        `/availability/${user.id}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }

      const data = await response.json();
      setAvailabilities(data.availability || []);
    } catch (error: any) {
      console.error('Error fetching availability:', error);
      toast.error(error.message || 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `/availability`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            dayOfWeek,
            startTime,
            endTime,
            timezone,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add availability');
      }

      toast.success('Availability added successfully');
      fetchAvailability();
      
      // Reset form
      setDayOfWeek(1);
      setStartTime('09:00');
      setEndTime('17:00');
    } catch (error: any) {
      console.error('Error adding availability:', error);
      toast.error(error.message || 'Failed to add availability');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const response = await fetch(
        `/availability/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete availability');
      }

      toast.success('Availability deleted successfully');
      fetchAvailability();
    } catch (error: any) {
      console.error('Error deleting availability:', error);
      toast.error(error.message || 'Failed to delete availability');
    }
  };

  const groupByDay = () => {
    const grouped: Record<number, Availability[]> = {};
    availabilities.forEach(avail => {
      if (!grouped[avail.dayOfWeek]) {
        grouped[avail.dayOfWeek] = [];
      }
      grouped[avail.dayOfWeek].push(avail);
    });
    return grouped;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const groupedAvailability = groupByDay();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-2">Manage Availability</h2>
        <p className="text-gray-600">Set your weekly availability for conducting interviews</p>
      </div>

      {/* Add Availability Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Availability Slot
          </CardTitle>
          <CardDescription>Define when you&apos;re available to conduct interviews</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddAvailability} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dayOfWeek">Day of Week</Label>
                <Select 
                  value={dayOfWeek.toString()} 
                  onValueChange={(value) => setDayOfWeek(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map(day => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="timezone">Time Zone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
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

              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              {saving ? 'Adding...' : 'Add Availability'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Current Availability */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Availability
          </CardTitle>
          <CardDescription>Your weekly schedule for conducting interviews</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedAvailability).length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No availability set. Add your first time slot above.
            </p>
          ) : (
            <div className="space-y-4">
              {DAYS_OF_WEEK.map(day => {
                const slots = groupedAvailability[day.value];
                if (!slots || slots.length === 0) return null;

                return (
                  <div key={day.value} className="border rounded-lg p-4">
                    <h3 className="mb-3">{day.label}</h3>
                    <div className="space-y-2">
                      {slots.map(slot => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded"
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span>
                              {slot.startTime} - {slot.endTime}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({TIMEZONES.find(tz => tz.value === slot.timezone)?.label || slot.timezone})
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAvailability(slot.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
