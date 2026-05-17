// frontend/src/components/ui/Card.jsx
import React from 'react';
import './Card.css';

const Card = ({ children, className = '', style = {}, hoverable = true }) => {
    return (
        <div
            className={`ui-card ${hoverable ? 'ui-card-hoverable' : ''} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
};

export default Card;