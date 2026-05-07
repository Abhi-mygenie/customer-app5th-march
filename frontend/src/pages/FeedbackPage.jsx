import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoArrowBack, IoStarOutline, IoStar } from 'react-icons/io5';
import { useRestaurantId } from '../utils/useRestaurantId';
import { useRestaurantConfig } from '../context/RestaurantConfigContext';
import toast from 'react-hot-toast';
import './FeedbackPage.css';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FeedbackPage = () => {
  const navigate = useNavigate();
  const { restaurantId } = useRestaurantId();
  const config = useRestaurantConfig();
  const [form, setForm] = useState({ name: '', email: '', rating: 0, message: '' });
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (restaurantId) config.fetchConfig(restaurantId);
  }, [restaurantId]);

  const introText = config.feedbackIntroText || "We value your opinion! Share your dining experience with us.";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.rating || !form.message) {
      toast.error('Please fill in name, rating, and message');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/config/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, restaurant_id: restaurantId }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      toast.success('Thank you for your feedback!');
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-page" data-testid="feedback-page">
      <div className="feedback-header">
        <button className="feedback-back-btn" onClick={() => navigate(-1)} data-testid="feedback-back-btn">
          <IoArrowBack />
        </button>
        <h1 className="feedback-title">Feedback</h1>
        <div className="feedback-header-spacer" />
      </div>

      <div className="feedback-content">
        {submitted ? (
          <div className="feedback-success" data-testid="feedback-success">
            <div className="feedback-success-icon">&#10003;</div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted. We appreciate you taking the time to help us improve.</p>
            <button className="feedback-btn" onClick={() => navigate(-1)} data-testid="feedback-back-after-submit">
              Back to Menu
            </button>
          </div>
        ) : (
          <>
            <p className="feedback-intro">{introText}</p>

            <form onSubmit={handleSubmit} className="feedback-form" data-testid="feedback-form">
              <div className="feedback-field">
                <label className="feedback-label">Your Name *</label>
                <input
                  type="text"
                  className="feedback-input"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  data-testid="feedback-name"
                />
              </div>

              <div className="feedback-field">
                <label className="feedback-label">Email (optional)</label>
                <input
                  type="email"
                  className="feedback-input"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  data-testid="feedback-email"
                />
              </div>

              <div className="feedback-field">
                <label className="feedback-label">Rating *</label>
                <div className="feedback-stars" data-testid="feedback-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`feedback-star ${star <= (hoveredStar || form.rating) ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      onClick={() => setForm(p => ({ ...p, rating: star }))}
                      data-testid={`feedback-star-${star}`}
                    >
                      {star <= (hoveredStar || form.rating) ? <IoStar /> : <IoStarOutline />}
                    </button>
                  ))}
                  {form.rating > 0 && <span className="feedback-rating-text">{form.rating}/5</span>}
                </div>
              </div>

              <div className="feedback-field">
                <label className="feedback-label">Your Message *</label>
                <textarea
                  className="feedback-textarea"
                  placeholder="Tell us about your experience..."
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                  data-testid="feedback-message"
                />
              </div>

              <button type="submit" className="feedback-btn" disabled={submitting} data-testid="feedback-submit-btn">
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default FeedbackPage;
