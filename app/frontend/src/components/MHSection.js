// src/components/MHSection.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SubNavigationBar from './SubNavigationBar';
import MHBasicInterface from './MHBasicInterface';
import MHTreatmentPlan from './MHTreatmentPlan';
import MHCaseNotes from './MHCaseNotes';
import MHAssessment from './MHAssessment';

const MHSection = () => {
  const subNavItems = [
    { label: 'Basic', route: '/' },
    { label: 'Treatment Plan', route: '/treatment-plan' },
    { label: 'Case Notes', route: '/case-notes' },
    { label: 'Assessment', route: '/assessment' }
  ];

  return (
    <div data-aoi="MH Section Container">
      <SubNavigationBar
        items={subNavItems}
        baseRoute="/CaseMH"
        data-aoi="MH SubNavigationBar"
      />
      <div data-aoi="MH Section Content">
        <Routes>
          <Route path="/" element={<MHBasicInterface />} />
          <Route path="/treatment-plan" element={<MHTreatmentPlan />} />
          <Route path="/case-notes" element={<MHCaseNotes />} />
          <Route path="/assessment" element={<MHAssessment />} />
          <Route path="*" element={<Navigate to="/CaseMH" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default MHSection;
