// src/components/AOIBox.js
import React from 'react';
import useAOILogging from '../useAOILogging';

function AOIBox({ aoiId, style, children }) {
  // Use the custom hook with the AOI id as the context.
  const logEvent = useAOILogging(aoiId);

  const handleMouseOver = (e) => {
    logEvent("mouseover", {
      aoi: aoiId,
      coordinates: { x: e.clientX, y: e.clientY },
      mouse_click: false,
      text_input: false,
      text_activity: ""
    });
  };

  return (
    <div
      className="aoi-box"
      data-aoi={aoiId}
      style={style}
      onMouseOver={handleMouseOver}
    >
      {children}
    </div>
  );
}

export default AOIBox;
