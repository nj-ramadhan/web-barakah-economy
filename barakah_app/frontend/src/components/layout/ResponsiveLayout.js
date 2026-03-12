import React from 'react';
import DesktopLayout from './DesktopLayout';
import GeneralFeedbackBubble from '../chat/GeneralFeedbackBubble';

const MobileContainer = ({ children }) => {
    const isChatPage = window.location.pathname.startsWith('/chat');
    return (
        <div className="w-full max-w-md bg-white min-h-screen relative shadow-lg mx-auto">
            {children}
            {!isChatPage && <GeneralFeedbackBubble />}
        </div>
    );
};

const ResponsiveLayout = ({ isDesktop, children, hideFooter = false }) => {
    const isChatPage = window.location.pathname.startsWith('/chat');
    if (isDesktop) {
        return (
            <DesktopLayout hideFooter={hideFooter}>
                {children}
                {!isChatPage && <GeneralFeedbackBubble />}
            </DesktopLayout>
        );
    }
    return <MobileContainer>{children}</MobileContainer>;
};

export { ResponsiveLayout, MobileContainer };
