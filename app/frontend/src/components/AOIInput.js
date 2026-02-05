// src/components/AOIInput.js
import React from 'react';
import useAOILogging from '../useAOILogging';

function AOIInput({ label, id, type = "text", placeholder, ...rest }) {
  const logEvent = useAOILogging(label || id);

  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      <input 
        type={type} 
        id={id} 
        name={id}
        placeholder={placeholder}
        onFocus={(e) => 
          logEvent("field_focus", { 
            field: label,
            fieldId: id,
            coordinates: { x: e.clientX, y: e.clientY }
          })
        }
        onChange={(e) =>
          logEvent("field_change", { 
            field: label,
            fieldId: id,
            newValue: e.target.value 
          })
        }
        {...rest}
      />
    </div>
  );
}

export default AOIInput;
