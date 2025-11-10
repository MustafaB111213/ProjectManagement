import React, { useState } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';

interface CollapsibleStepProps {
    title: string;
    children: React.ReactNode;
    isInitiallyOpen?: boolean;
}

const CollapsibleStep: React.FC<CollapsibleStepProps> = ({ 
    title, 
    children, 
    isInitiallyOpen = false 
}) => {
    const [isOpen, setIsOpen] = useState(isInitiallyOpen);

    return (
        <div className="border-b border-gray-200">
            {/* Başlık Butonu (Aç/Kapat) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
                <span className="font-semibold">{title}</span>
                {isOpen ? (
                    <FiChevronDown className="w-5 h-5 text-gray-500" />
                ) : (
                    <FiChevronRight className="w-5 h-5 text-gray-500" />
                )}
            </button>
            
            {/* Açık olduğunda gösterilecek içerik */}
            {isOpen && (
                // DÜZELTME: İçeriğin başlığa yapışmaması için pt-3 ve border-t eklendi
                <div className="px-4 pb-4 pt-3 border-t border-gray-200">
                    {children}
                </div>
            )}
        </div>
    );
};

export default CollapsibleStep;