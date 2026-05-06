import React, { useState, useEffect } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import WarningModal from '../components/popup/WarningModal';

const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [showWarning, setShowWarning] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => setShowWarning(true), 100); // Show modal after 100ms
            return () => clearTimeout(timer); // Cleanup timer
        }
    }, [user]);

    if (user) {
        // If profile is incomplete, and we are not already on profile/edit, redirect
        if (user.is_profile_complete === false && location.pathname !== '/profile/edit') {
            return <Navigate to="/profile/edit" replace state={{ from: location }} />;
        }
        return children; // Allow access if the user is logged in
    }

    return showWarning ? <WarningModal redirectPath={location.pathname} /> : null; // Show modal or nothing
};

export default PrivateRoute;

