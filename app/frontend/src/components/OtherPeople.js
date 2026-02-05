// src/components/OtherPeople.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { peopleApi, casesApi } from '../services/api';
import { useCase } from '../context/CaseContext';

const OtherPeople = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentCase } = useCase();

  const returnTo = location.state?.returnTo || '/CasePersonList';
  const caseData = location.state?.caseData || null;
  const selectedCacId = location.state?.selectedCacId || null;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    role: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required.');
      return;
    }

    if (!selectedCacId) {
      setError('CAC ID is required. Please go back and select a CAC.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create person data
      const personData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        middle_name: formData.middleName || null,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        cac_id: parseInt(selectedCacId, 10)
      };

      // Create the person
      const createdPerson = await peopleApi.createPerson(personData);

      setSuccess('Person created successfully!');

      // Get current lists from location state to preserve them
      const currentVictims = location.state?.victims || [];
      const currentOtherPeople = location.state?.otherPeople || [];

      // Navigate back to CasePersonList with the new person
      setTimeout(() => {
        navigate(returnTo, {
          state: {
            newPerson: {
              person_id: createdPerson.person_id,
              first_name: createdPerson.first_name,
              last_name: createdPerson.last_name,
              middle_name: createdPerson.middle_name,
              date_of_birth: createdPerson.date_of_birth,
              ssn: createdPerson.ssn || null,
              role: formData.role || 'Other',
              personType: 'other'
            },
            caseData: caseData,
            selectedCacId: selectedCacId,
            victims: currentVictims,
            otherPeople: currentOtherPeople
          }
        });
      }, 1000);
    } catch (err) {
      console.error('Error creating person:', err);
      setError(`Failed to create person: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Get current lists from location state to preserve them
    const currentVictims = location.state?.victims || [];
    const currentOtherPeople = location.state?.otherPeople || [];

    navigate(returnTo, {
      state: {
        caseData: caseData,
        selectedCacId: selectedCacId,
        victims: currentVictims,
        otherPeople: currentOtherPeople
      }
    });
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: '20px' }}>
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <Typography variant="h4" gutterBottom align="center">
          Add Other Person
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name *"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name *"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Middle Name"
              name="middleName"
              value={formData.middleName}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date of Birth"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Gender</InputLabel>
              <Select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                label="Gender"
              >
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                name="role"
                value={formData.role}
                onChange={handleChange}
                label="Role"
              >
                <MenuItem value="Alleged Offender">Alleged Offender</MenuItem>
                <MenuItem value="Caregiver">Caregiver</MenuItem>
                <MenuItem value="Witness">Witness</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
          <Button variant="outlined" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default OtherPeople;

