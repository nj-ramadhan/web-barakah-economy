import React from 'react';
import DesktopHeader from './DesktopHeader';
import DesktopFooter from './DesktopFooter';

const DesktopLayout = ({ children }) => {
    return (
        <div className="w-full min-h-screen bg-gray-50 flex flex-col font-sans">
            <DesktopHeader />
            <main className="flex-1 pt-20">
                {children}
            </main>
            <DesktopFooter />
        </div>
    );
};

export default DesktopLayout;
