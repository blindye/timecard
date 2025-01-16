import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getCurrentShift } from '../../utils/shiftCalculator';

function Timer() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [earlyMinutes, setEarlyMinutes] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualMinutes, setManualMinutes] = useState('');
  const [userTeam, setUserTeam] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [timeEntryId, setTimeEntryId] = useState(null);
  const [hasStartedWork, setHasStartedWork] = useState(false);
  const { currentUser } = useAuth();

  const fetchUserTeam = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserTeam(userData.team);
        // Set current shift based on user's team
        const shift = getCurrentShift(userData.team);
        setCurrentShift(shift);
      }
    } catch (error) {
      console.error('Error fetching user team:', error);
    }
  }, [currentUser.uid]);

  const checkExistingEntry = useCallback(async () => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', currentUser.uid),
      where('date', '>=', today)
    );

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        const existingData = existingDoc.data();
        
        // Check if we're past reset time
        if (currentShift) {
          const [hours, minutes] = currentShift.startTime.split(':').map(Number);
          const resetTime = new Date(now);
          resetTime.setHours(hours + 2, minutes, 0, 0);
          
          if (now >= resetTime) {
            // Past reset time, clear early minutes
            setEarlyMinutes(0);
            setManualMinutes('0');
          } else {
            // Before reset time, show existing minutes
            setEarlyMinutes(existingData.earlyMinutes || 0);
            setManualMinutes((existingData.earlyMinutes || 0).toString());
          }
        }
        
        setTimeEntryId(existingDoc.id);
        setHasStartedWork(true);
      }
    } catch (error) {
      console.error('Error checking existing entries:', error);
    }
  }, [currentUser.uid, currentShift]);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUserTeam();
    checkExistingEntry();
  }, [fetchUserTeam, checkExistingEntry]);

  const calculateEarlyMinutes = (startTime, shiftStartTime) => {
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    
    // Create new date objects and set only hours and minutes
    const shiftStart = new Date(startTime);
    shiftStart.setHours(hours, minutes, 0, 0);
    
    const startTimeRounded = new Date(startTime);
    startTimeRounded.setSeconds(0, 0);
    
    // Get reset time (2 hours after shift start)
    const resetTime = new Date(shiftStart);
    resetTime.setHours(hours + 2, minutes, 0, 0);
    
    // If current time is past reset time, return 0
    if (startTimeRounded >= resetTime) {
      return 0;
    }
    
    return Math.floor((shiftStart - startTimeRounded) / (1000 * 60));
  };

  const handleStart = async () => {
    const now = new Date();
    const shiftStartTime = currentShift?.startTime;
    
    // Check for existing entry today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, 'timeEntries'),
      where('userId', '==', currentUser.uid),
      where('date', '>=', today)
    );

    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        // Entry exists for today - show warning dialog
        const existingDoc = querySnapshot.docs[0];
        setTimeEntryId(existingDoc.id);
        const existingData = existingDoc.data();
        setEarlyMinutes(existingData.earlyMinutes || 0);
        setManualMinutes((existingData.earlyMinutes || 0).toString());
        setHasStartedWork(true);
        setDialogOpen(true);
        return;
      }

      // No existing entry, create new one silently
      if (shiftStartTime) {
        const minutes = calculateEarlyMinutes(now, shiftStartTime);
        if (minutes > 0) {
          // Create entry first
          const hours = Math.floor(minutes / 60 * 10) / 10;
          const docRef = await addDoc(collection(db, 'timeEntries'), {
            userId: currentUser.uid,
            date: new Date(),
            startTime: new Date(),
            earlyMinutes: minutes,
            earlyHours: hours,
            team: userTeam,
            shift: currentShift.name
          });
          
          // Then update all states
          setTimeEntryId(docRef.id);
          setEarlyMinutes(minutes);
          setManualMinutes(minutes.toString());
          setHasStartedWork(true);
        }
      }
    } catch (error) {
      console.error('Error checking existing entries:', error);
    }
  };

  const handleEditMinutes = () => {
    setManualMinutes(earlyMinutes.toString());
    setDialogOpen(true);
  };

  const handleSaveTime = async () => {
    const minutes = parseInt(manualMinutes);
    const hours = Math.floor(minutes / 60 * 10) / 10;
    
    try {
      if (timeEntryId) {
        // Update existing entry
        await updateDoc(doc(db, 'timeEntries', timeEntryId), {
          earlyMinutes: minutes,
          earlyHours: hours
        });
        // Update local state after successful save
        setEarlyMinutes(minutes);
      } else {
        // Create new entry
        const docRef = await addDoc(collection(db, 'timeEntries'), {
          userId: currentUser.uid,
          date: new Date(),
          startTime: new Date(),
          earlyMinutes: minutes,
          earlyHours: hours,
          team: userTeam,
          shift: currentShift.name
        });
        setTimeEntryId(docRef.id);
        setEarlyMinutes(minutes);
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving time entry:', error);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false 
    });
  };

  return (
    <Box sx={{ textAlign: 'center', mt: 4 }}>
      {userTeam && currentShift && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            Team {userTeam} - {currentShift.name} Shift
          </Typography>
          <Typography variant="body1">
            Shift starts at {currentShift.startTime}
          </Typography>
          {hasStartedWork && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1">
                Early minutes: {earlyMinutes}
              </Typography>
              <IconButton onClick={handleEditMinutes} size="small" sx={{ ml: 1 }}>
                <EditIcon />
              </IconButton>
            </Box>
          )}
        </Paper>
      )}
      
      <Typography variant="h3">
        {formatTime(currentTime)}
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleStart}
        >
          Start Work
        </Button>
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          Warning: Work Already Started
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            You have already started work today. Do you want to adjust your early minutes?
          </Typography>
          <TextField
            label="Adjust Minutes"
            type="number"
            value={manualMinutes}
            onChange={(e) => setManualMinutes(e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTime} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Timer; 