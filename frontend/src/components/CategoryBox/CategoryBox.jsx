import React from 'react';
import './CategoryBox.css';

const CategoryBox = ({ section, isSelected, onClick }) => {
  const handleImageError = (e) => {
    e.target.style.display = 'none';
    if (e.target.nextElementSibling) {
      e.target.nextElementSibling.style.display = 'block';
    }
  };

  return (
    <div className="category-item">
      <div
        role="button"
        tabIndex={0}
        className={`category-box ${isSelected ? 'selected' : ''}`}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      >
        {section.sectionImage ? (
          <img
            src={section.sectionImage}
            alt={section.sectionName}
            onError={handleImageError}
          />
        ) : 
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{ display: section.image ? 'none' : 'block' }}
        >
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
        }
      </div>
      <span className="category-name">{section.sectionName}</span>
    </div>
  );
};

export default CategoryBox;
