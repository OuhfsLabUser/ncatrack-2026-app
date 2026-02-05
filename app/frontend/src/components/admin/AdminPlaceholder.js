import React from 'react';
import { Box, Typography, Paper, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AdminPlaceholder = ({ title }) => {
  const navigate = useNavigate();
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" paragraph>
          This is a placeholder for the {title} section. This functionality will be implemented in future updates.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate('/admin')}
        >
          Back to Admin Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default AdminPlaceholder;