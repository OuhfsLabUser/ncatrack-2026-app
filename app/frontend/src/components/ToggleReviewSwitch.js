import React from 'react';
import './ToggleReviewSwitch.css';

/**
 * ToggleReviewSwitch Component
 * A custom toggle switch with YES/NO states and a sliding indicator
 * 
 * @param {boolean} value - Current state (true = YES, false = NO)
 * @param {function} onChange - Callback function when toggle is clicked
 * @param {string} label - Label text to display next to the toggle
 * @param {string} name - Name attribute for form handling
 */
const ToggleReviewSwitch = ({ value = false, onChange, label = "Ready for MDT Review", name = "" }) => {
  const handleClick = () => {
    if (onChange) {
      onChange(!value);
    }
  };

  return (
    <div className="toggle-review-container" data-aoi={`Toggle Review ${name || label}`}>
      <div 
        className={`toggle-review-switch ${value ? 'toggle-review-yes' : 'toggle-review-no'}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        data-aoi={`Toggle Review Switch ${name || label}`}
      >
        <div className="toggle-review-slider" />
        <div className="toggle-review-text">
          {value ? 'YES' : 'NO'}
        </div>
      </div>
      {label && (
        <span className="toggle-review-label" data-aoi={`Toggle Review Label ${name || label}`}>
          {label}
        </span>
      )}
    </div>
  );
};

export default ToggleReviewSwitch;

