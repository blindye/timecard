import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Container } from '@mui/material';
import UserList from './UserList';
import AddUserForm from './AddUserForm';

const AdminPanel = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Panel
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <AddUserForm />
        </Paper>

        <Paper sx={{ p: 3 }}>
          <UserList />
        </Paper>
      </Box>
    </Container>
  );
};

export default AdminPanel; 