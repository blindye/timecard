import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from 'config/firebase';

const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (currentUser) {
      // Check if user is admin
      const userDoc = doc(db, 'users', currentUser.uid);
      getDoc(userDoc).then((doc) => {
        if (doc.exists()) {
          setIsAdmin(doc.data().role === 'admin');
        }
      });
    } else {
      setIsAdmin(false);
    }
  }, [currentUser]);

  const value = {
    currentUser,
    isAdmin,
    login,
    signup,
    logout,
    resetPassword,
    updateEmail,
    updatePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider; 