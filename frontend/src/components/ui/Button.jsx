// frontend/src/components/ui/Button.jsx
import React from 'react';
import './Button.css';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    disabled = false,
    onClick,
    type = 'button',
    className = '',
    ...props
}) => {
    const sizeClass = {
        sm: 'ui-button-sm',
        md: 'ui-button-md',
        lg: 'ui-button-lg',
    }[size] || 'ui-button-md';

    return (
        <button
            type={type}
            className={`ui-button ui-button-${variant} ${sizeClass} ${fullWidth ? 'ui-button-full' : ''} ${className}`}
            disabled={disabled}
            onClick={onClick}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;