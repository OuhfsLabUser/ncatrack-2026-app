import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Paper, Tabs, Tab, Box } from '@mui/material';

const SubNavigationBar = ({ items, baseRoute }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Extract the current subroute (everything after the baseRoute)
  const currentSubRoute = currentPath.replace(baseRoute, '') || '/';
  
  // Find the index of the current tab
  const currentTabIndex = items.findIndex(item => item.route === currentSubRoute);
  
  return (
    <Box sx={{ width: '100%', mb: 3 }} data-aoi="SubNavigationBar Container">
      <Paper elevation={2} data-aoi="SubNavigationBar Paper">
        <Tabs
          value={currentTabIndex !== -1 ? currentTabIndex : 0}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          data-aoi="SubNavigationBar Tabs"
        >
          {items.map((item, index) => (
            <Tab
              key={index}
              label={item.label}
              component={Link}
              to={`${baseRoute}${item.route}`}
              data-aoi={`SubNavigationBar Tab ${item.label}`}
            />
          ))}
        </Tabs>
      </Paper>
    </Box>
  );
};

export default SubNavigationBar;
