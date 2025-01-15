import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Reports() {
  const [currentWeekOvertime, setCurrentWeekOvertime] = useState(0);
  const [historicalData, setHistoricalData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [shiftStats, setShiftStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'weekly'
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchReportData();
  }, [currentUser, fetchReportData]);

  const fetchReportData = useCallback(async () => {
    try {
      const timeEntriesRef = collection(db, 'timeEntries');
      const q = query(timeEntriesRef, where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const entries = [];
      const weekMap = new Map();
      let weeklyOvertime = 0;
      const shiftOvertimeMap = { Morning: 0, Evening: 0, Night: 0 };

      // Get current week's Sunday
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Get end of week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const date = data.date.toDate();
        const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
        
        entries.push({
          ...data,
          docId: doc.id,
          startTime: data.startTime.toDate(),
          date: date
        });

        if (data.earlyHours) {
          // Weekly overtime calculation
          if (date >= startOfWeek && date <= endOfWeek) {
            weeklyOvertime += data.earlyHours;
          }

          // Aggregate overtime by shift
          if (data.shift) {
            shiftOvertimeMap[data.shift] = (shiftOvertimeMap[data.shift] || 0) + data.earlyHours;
          }

          // Process weekly aggregation
          if (!weekMap.has(weekKey)) {
            weekMap.set(weekKey, {
              weekKey,
              weekNumber: getWeekNumber(date),
              year: date.getFullYear(),
              totalHours: 0,
              entries: []
            });
          }
          const weekData = weekMap.get(weekKey);
          weekData.totalHours += data.earlyHours;
          weekData.entries.push(data);
        }
      });

      // Convert shiftOvertimeMap to array format for chart
      const shiftStatsArray = Object.entries(shiftOvertimeMap)
        .filter(([shift]) => shift !== 'Free') // Exclude 'Free' shift
        .map(([shift, hours]) => ({
          shift,
          hours: Number(hours.toFixed(1))
        }));

      setHistoricalData(entries);
      setWeeklyData(Array.from(weekMap.values()).sort((a, b) => 
        b.year - a.year || b.weekNumber - a.weekNumber
      ));
      setCurrentWeekOvertime(weeklyOvertime);
      setShiftStats(shiftStatsArray);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report data:', error);
      setLoading(false);
    }
  }, [currentUser.uid]);

  const getWeekNumber = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // Get first day of year
    const yearStart = new Date(d.getFullYear(), 0, 1);
    
    // Get first Sunday of year
    const firstSunday = new Date(yearStart);
    firstSunday.setDate(yearStart.getDate() + (7 - yearStart.getDay()) % 7);
    
    // If date is before first Sunday, it's week 1
    if (d < firstSunday) {
      return 1;
    }
    
    // Calculate week number based on first Sunday
    const daysSinceFirstSunday = Math.floor((d - firstSunday) / (24 * 60 * 60 * 1000));
    return Math.floor(daysSinceFirstSunday / 7) + 2; // Add 2 because week 1 is before first Sunday
  };

  const handleDeleteClick = (entry) => {
    setSelectedEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteDoc(doc(db, 'timeEntries', selectedEntry.docId));
      await fetchReportData(); // Refresh data
      setDeleteDialogOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Time Reports
      </Typography>

      <Grid container spacing={3}>
        {/* Current Week Overtime */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Week Overtime
            </Typography>
            <Typography variant="h3">
              {currentWeekOvertime} hours
            </Typography>
          </Paper>
        </Grid>

        {/* Shift Statistics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Overtime by Shift
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={shiftStats}>
                <XAxis dataKey="shift" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="overtimeHours" fill="#8884d8" name="Overtime Hours" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Historical Data</Typography>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>View Mode</InputLabel>
              <Select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                label="View Mode"
              >
                <MenuItem value="daily">Daily View</MenuItem>
                <MenuItem value="weekly">Weekly View</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {viewMode === 'daily' ? (
                      <>
                        <TableCell>Date</TableCell>
                        <TableCell>Time</TableCell>
                        <TableCell>Shift</TableCell>
                        <TableCell>Early Hours</TableCell>
                        <TableCell>Team</TableCell>
                        <TableCell>Actions</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>Week</TableCell>
                        <TableCell>Total Hours</TableCell>
                        <TableCell>Details</TableCell>
                      </>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {viewMode === 'daily' ? (
                    historicalData
                      .filter(entry => entry.earlyHours > 0)
                      .sort((a, b) => b.date - a.date)
                      .map((entry) => (
                        <TableRow key={entry.docId}>
                          <TableCell>{entry.date.toLocaleDateString()}</TableCell>
                          <TableCell>
                            {entry.startTime.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false
                            })}
                          </TableCell>
                          <TableCell>{entry.shift}</TableCell>
                          <TableCell>{entry.earlyHours}</TableCell>
                          <TableCell>{entry.team}</TableCell>
                          <TableCell>
                            <IconButton 
                              onClick={() => handleDeleteClick(entry)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  ) : (
                    weeklyData.map((week) => (
                      <TableRow key={week.weekKey}>
                        <TableCell>
                          Week {week.weekNumber}, {week.year}
                        </TableCell>
                        <TableCell>{week.totalHours.toFixed(1)}</TableCell>
                        <TableCell>
                          {week.entries.length} entries
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this overtime entry?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Reports; 