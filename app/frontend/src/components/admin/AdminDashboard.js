import React from 'react';
import { 
  Box, 
  Typography, 
  Grid,
  Card,
  CardContent,
  CardActionArea
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BusinessIcon from '@mui/icons-material/Business';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AnnouncementIcon from '@mui/icons-material/Announcement';
import HistoryIcon from '@mui/icons-material/History';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  const adminOptions = [
    { title: 'CAC/MDT Setup', icon: <SettingsIcon />, path: '/admin/cac-setup' },
    { title: 'Add Names', icon: <PeopleIcon />, path: '/admin/add-names' },
    { title: 'Data Entry Fields', icon: <TextFieldsIcon />, path: '/admin/data-fields' },
    { title: 'Pick Lists', icon: <ListAltIcon />, path: '/admin/pick-lists' },
    { title: 'Agencies', icon: <BusinessIcon />, path: '/admin/agencies' },
    { title: 'Personnel', icon: <PersonIcon />, path: '/admin/personnel' },
    { title: 'Roles', icon: <AssignmentIndIcon />, path: '/admin/roles' },
    { title: 'News', icon: <AnnouncementIcon />, path: '/admin/news' },
    { title: 'Logs', icon: <HistoryIcon />, path: '/admin/logs' }
  ];

  const handleOptionClick = (path) => {
    navigate(path);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Admin Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {adminOptions.map((option, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card 
              elevation={3} 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              <CardActionArea 
                onClick={() => handleOptionClick(option.path)}
                sx={{ height: '100%', p: 2 }}
              >
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ fontSize: 60, mb: 2, color: 'primary.main' }}>
                    {option.icon}
                  </Box>
                  <Typography variant="h6" component="div">
                    {option.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default AdminDashboard;