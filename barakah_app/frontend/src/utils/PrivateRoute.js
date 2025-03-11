// utils/PrivateRoute.js
import React, { useState, useEffect } from 'react';
import WarningModal from '../components/popup/WarningModal';

const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => setShowWarning(true), 100); // Show modal after 100ms
            return () => clearTimeout(timer); // Cleanup timer
        }
    }, [user]);

    if (user) {
        return children; // Allow access if the user is logged in
    }

    return showWarning ? <WarningModal /> : null; // Show modal or nothing
};

export default PrivateRoute;