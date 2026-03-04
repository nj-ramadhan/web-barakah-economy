import React from 'react';
import DesktopLayout from './DesktopLayout';

const MobileContainer = ({ children }) => (
    <div className="w-full max-w-md bg-white min-h-screen relative shadow-lg mx-auto">
        {children}
    </div>
);

const ResponsiveLayout = ({ isDesktop, children }) => {
    if (isDesktop) {
        return <DesktopLayout>{children}</DesktopLayout>;
    }
    return <MobileContainer>{children}</MobileContainer>;
};

export { ResponsiveLayout, MobileContainer };
