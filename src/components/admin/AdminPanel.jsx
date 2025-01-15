import React from 'react';
import { Box, Typography } from '@mui/material';
import UserList from './UserList';

function AdminPanel() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Admin Panel
      </Typography>
      <UserList />
    </Box>
  );
}

export default AdminPanel; 