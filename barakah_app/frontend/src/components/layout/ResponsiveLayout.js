import React from 'react';
import DesktopLayout from './DesktopLayout';
import Footer from './Footer';
import GeneralFeedbackBubble from '../chat/GeneralFeedbackBubble';

const MobileContainer = ({ children, hideFooter = false }) => {
    const path = window.location.pathname;
    const isLandingPage = path === '/' || path.startsWith('/products') || path.startsWith('/campaigns');
    const isSpecialPage = path.startsWith('/chat') || path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/profile');

    const shouldShow = isLandingPage && !isSpecialPage;

    return (
        <div className="w-full max-w-md bg-white dark:bg-gray-950 min-h-screen relative shadow-lg mx-auto transition-colors duration-300 flex flex-col">
            <div className="flex-1">
                {children}
            </div>
            {shouldShow && <GeneralFeedbackBubble />}
            {!hideFooter && <Footer />}
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
    return <MobileContainer hideFooter={hideFooter}>{children}</MobileContainer>;
};

export { ResponsiveLayout, MobileContainer };
