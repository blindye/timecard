import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem 
} from '@mui/material';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const [team, setTeam] = useState('');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchUserSettings = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setTeam(userDoc.data().team || '');
          setTimezone(userDoc.data().timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user settings:', error);
        setLoading(false);
      }
    };

    fetchUserSettings();
  }, [currentUser]);

  const handleTeamChange = async (event) => {
    const newTeam = event.target.value;
    setTeam(newTeam);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { team: newTeam });
    } catch (error) {
      console.error('Error updating team:', error);
    }
  };

  const handleTimezoneChange = async (event) => {
    const newTimezone = event.target.value;
    setTimezone(newTimezone);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { timezone: newTimezone });
    } catch (error) {
      console.error('Error updating timezone:', error);
    }
  };

  if (loading) {
    return <Typography>Loading settings...</Typography>;
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Settings</Typography>
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Team</InputLabel>
          <Select value={team} label="Team" onChange={handleTeamChange}>
            <MenuItem value=""><em>None</em></MenuItem>
            <MenuItem value="A">Team A</MenuItem>
            <MenuItem value="B">Team B</MenuItem>
            <MenuItem value="C">Team C</MenuItem>
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Timezone</InputLabel>
          <Select value={timezone} label="Timezone" onChange={handleTimezoneChange}>
            {Intl.supportedValuesOf('timeZone').map((tz) => (
              <MenuItem key={tz} value={tz}>{tz}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>
    </Box>
  );
};

export default Settings; 