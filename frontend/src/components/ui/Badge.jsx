// frontend/src/components/ui/Badge.jsx
import React from 'react';
import './Badge.css';

const Badge = ({ children, variant = 'default', className = '' }) => {
    return (
        <span className={`ui-badge ui-badge-${variant} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;