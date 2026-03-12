import React from 'react';
import DesktopLayout from './DesktopLayout';
import GeneralFeedbackBubble from '../chat/GeneralFeedbackBubble';

const MobileContainer = ({ children }) => {
    const path = window.location.pathname;
    const isLandingPage = path === '/' || path.startsWith('/products') || path.startsWith('/campaigns');
    const isSpecialPage = path.startsWith('/chat') || path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/profile');

    const shouldShow = isLandingPage && !isSpecialPage;

    return (
        <div className="w-full max-w-md bg-white min-h-screen relative shadow-lg mx-auto">
            {children}
            {shouldShow && <GeneralFeedbackBubble />}
        </div>
    );
};

const ResponsiveLayout = ({ isDesktop, children, hideFooter = false }) => {
    const path = window.location.pathname;
    const isLandingPage = path === '/' || path.startsWith('/products') || path.startsWith('/campaigns');
    const isSpecialPage = path.startsWith('/chat') || path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/profile');

    const shouldShow = isLandingPage && !isSpecialPage;

    if (isDesktop) {
        return (
            <DesktopLayout hideFooter={hideFooter}>
                {children}
                {shouldShow && <GeneralFeedbackBubble />}
            </DesktopLayout>
        );
    }
    return <MobileContainer>{children}</MobileContainer>;
};

export { ResponsiveLayout, MobileContainer };
