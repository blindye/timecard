import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getShiftRotation } from '../../utils/shiftCalculator';

function Calendar() {
  const [userTeam, setUserTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const fetchUserTeam = useCallback(async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserTeam(userDoc.data().team);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user team:', error);
      setLoading(false);
    }
  }, [currentUser.uid]);

  useEffect(() => {
    fetchUserTeam();
  }, [currentUser, fetchUserTeam]);

  const generateYearlySchedule = () => {
    const year = new Date().getFullYear();
    const months = [];
    
    for (let month = 0; month < 12; month++) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthData = [];
      
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const rotation = getShiftRotation(date);
        const shift = rotation ? rotation[userTeam]?.name : 'N/A';
        const startTime = rotation ? rotation[userTeam]?.startTime : 'N/A';
        
        monthData.push({
          date,
          shift,
          startTime
        });
      }
      
      months.push({
        name: new Date(year, month).toLocaleString('default', { month: 'long' }),
        days: monthData
      });
    }
    
    return months;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  const yearlySchedule = generateYearlySchedule();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Yearly Schedule - Team {userTeam}
      </Typography>

      {yearlySchedule.map((month) => (
        <Paper sx={{ mb: 3, p: 2 }} key={month.name}>
          <Typography variant="h6" gutterBottom>
            {month.name}
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Day</TableCell>
                  <TableCell>Shift</TableCell>
                  <TableCell>Start Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {month.days.map((day) => (
                  <TableRow 
                    key={day.date.toISOString()}
                    sx={{
                      backgroundColor: 
                        day.date.getDay() === 0 || day.date.getDay() === 6 
                          ? '#e8f5e9'  // Light green for weekends
                          : 'inherit',
                      color: 
                        day.date.getDay() === 0 || day.date.getDay() === 6 
                          ? '#2e7d32'  // Darker green text for weekends
                          : 'inherit'
                    }}
                  >
                    <TableCell>{day.date.getDate()}</TableCell>
                    <TableCell>
                      {day.date.toLocaleDateString('default', { weekday: 'short' })}
                    </TableCell>
                    <TableCell>{day.shift}</TableCell>
                    <TableCell>{day.startTime}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}

export default Calendar; 