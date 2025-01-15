import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Grid
} from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const AddUserForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        'tempPassword123' // You should generate a random password and send it to user's email
      );

      // Add user to Firestore
      await addDoc(collection(db, 'users'), {
        uid: userCredential.user.uid,
        email: formData.email,
        name: formData.name,
        role: formData.role,
        createdAt: new Date(),
        lastActive: new Date()
      });

      // Reset form
      setFormData({
        email: '',
        name: '',
        role: 'user'
      });

      alert('User created successfully!');
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error creating user: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" gutterBottom>
        Add New User
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleChange}
              label="Role"
              required
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add User'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AddUserForm; 