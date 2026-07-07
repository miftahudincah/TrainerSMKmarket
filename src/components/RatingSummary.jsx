// components/RatingSummary.jsx
import React from 'react';
import { ProgressBar } from 'react-bootstrap';
import { Star } from 'lucide-react';

const RatingSummary = ({ comments }) => {
  if (!comments || comments.length === 0) {
    return (
      <div className="text-center py-3">
        <div style={{ fontSize: '48px' }}>⭐</div>
        <h5 className="text-light">Belum ada rating</h5>
        <p className="text-muted">Jadilah yang pertama memberi rating</p>
      </div>
    );
  }

  const total = comments.length;
  const avgRating = comments.reduce((sum, c) => sum + c.rating, 0) / total;
  
  // Hitung distribusi rating
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  comments.forEach(c => {
    if (c.rating >= 1 && c.rating <= 5) {
      distribution[c.rating]++;
    }
  });

  // Hitung persentase untuk setiap rating
  const getPercentage = (count) => {
    return total > 0 ? (count / total) * 100 : 0;
  };

  // Tampilkan bintang berdasarkan rata-rata
  const renderAverageStars = () => {
    const fullStars = Math.floor(avgRating);
    const hasHalfStar = avgRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    const stars = [];
    
    // Bintang penuh
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} size={24} fill="#ff9100" color="#ff9100" />
      );
    }
    
    // Setengah bintang
    if (hasHalfStar) {
      stars.push(
        <div key="half" style={{ position: 'relative', display: 'inline-block' }}>
          <Star size={24} color="#ff9100" />
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '50%', 
            overflow: 'hidden' 
          }}>
            <Star size={24} fill="#ff9100" color="#ff9100" />
          </div>
        </div>
      );
    }
    
    // Bintang kosong
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} size={24} color="#6c757d" />
      );
    }
    
    return stars;
  };

  return (
    <div className="rating-summary">
      <div className="text-center mb-4">
        <div style={{ fontSize: '48px' }}>⭐</div>
        <h2 className="text-light">{avgRating.toFixed(1)}</h2>
        <div className="d-flex justify-content-center gap-1">
          {renderAverageStars()}
        </div>
        <p className="text-muted">
          {total} rating • {comments.filter(c => c.comment && c.comment.trim().length > 0).length} ulasan
        </p>
      </div>

      <div>
        {[5, 4, 3, 2, 1].map(ratingValue => {
          const count = distribution[ratingValue] || 0;
          const percentage = getPercentage(count);
          const label = ratingValue === 5 ? '5 ★' : 
                        ratingValue === 4 ? '4 ★' : 
                        ratingValue === 3 ? '3 ★' : 
                        ratingValue === 2 ? '2 ★' : '1 ★';
          
          return (
            <div key={ratingValue} className="d-flex align-items-center gap-2 mb-1">
              <span className="text-muted small" style={{ minWidth: '35px' }}>{label}</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <ProgressBar 
                  now={percentage} 
                  variant="warning" 
                  style={{ 
                    height: '8px', 
                    backgroundColor: '#2a3444',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <span className="text-muted small" style={{ minWidth: '35px', textAlign: 'right' }}>
                {count}
              </span>
              <span className="text-muted small" style={{ minWidth: '40px', textAlign: 'right' }}>
                {percentage.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RatingSummary;