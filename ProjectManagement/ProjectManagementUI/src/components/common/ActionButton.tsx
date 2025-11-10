import React from 'react';

// Bu component, bir ikon ve bir metin alarak standart bir eylem butonu oluşturur.
interface ActionButtonProps {
    icon: React.ReactNode; // İkonu bir JSX elementi olarak alıyoruz (örn: <FiFilter />)
    text: string;
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, text }) => {
    return (
        <button className="flex items-center gap-x-2 px-3 py-1.5 text-sm font-medium text-text-secondary bg-card-bg border border-border-color rounded-md hover:bg-gray-50 transition-colors">
            {icon}
            <span>{text}</span>
        </button>
    );
};

export default ActionButton;