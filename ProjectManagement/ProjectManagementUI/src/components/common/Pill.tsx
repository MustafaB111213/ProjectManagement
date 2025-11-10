import React from 'react';

interface PillProps {
    text: string;
    colorClasses: string; // Örn: "bg-green-100 text-green-800"
}

const Pill: React.FC<PillProps> = ({ text, colorClasses }) => {
    return (
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
            {text}
        </span>
    );
};

export default Pill;