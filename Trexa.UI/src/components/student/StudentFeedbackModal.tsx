import { useState } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Star } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { apiBaseUrl } from "../../config/api";

interface StudentFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interviewId: string;
  interviewerName: string;
  accessToken: string;
  onSuccess: () => void;
}

export function StudentFeedbackModal({
  open,
  onOpenChange,
  interviewId,
  interviewerName,
  accessToken,
  onSuccess,
}: StudentFeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState('');
  const [communication, setCommunication] = useState('');
  const [professionalism, setProfessionalism] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    if (!comments.trim()) {
      toast.error('Please provide some comments');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/interviews/${interviewId}/student-feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            rating,
            comments,
            communication,
            professionalism,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      toast.success('Thank you for your feedback!');
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setRating(0);
      setComments('');
      setCommunication('');
      setProfessionalism('');
    } catch (error: any) {
      console.error('Submit feedback error:', error);
      toast.error(error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rate Your Interview Experience</DialogTitle>
          <DialogDescription>
            Share your feedback about the interview with {interviewerName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Overall Rating */}
          <div className="space-y-2">
            <Label>Overall Rating *</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600 self-center">
                  {rating} out of 5 stars
                </span>
              )}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">Overall Comments *</Label>
            <Textarea
              id="comments"
              placeholder="Share your overall experience with the interview..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Communication */}
          <div className="space-y-2">
            <Label htmlFor="communication">Communication Skills</Label>
            <Textarea
              id="communication"
              placeholder="How was the interviewer's communication? Were questions clear?"
              value={communication}
              onChange={(e) => setCommunication(e.target.value)}
              rows={3}
            />
          </div>

          {/* Professionalism */}
          <div className="space-y-2">
            <Label htmlFor="professionalism">Professionalism</Label>
            <Textarea
              id="professionalism"
              placeholder="Was the interviewer professional and respectful?"
              value={professionalism}
              onChange={(e) => setProfessionalism(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
