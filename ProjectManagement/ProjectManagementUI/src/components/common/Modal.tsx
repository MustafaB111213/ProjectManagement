// src/components/common/Modal.tsx (GÜNCELLENDİ)

import React from 'react';
import { IoClose } from 'react-icons/io5';

type ModalSize = 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '9xl';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: ModalSize;
    disableContentScroll?: boolean; // <-- YENİ PROP
}

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md',
    disableContentScroll = false // <-- YENİ PROP'U AL
}) => {
    if (!isOpen) return null;

    const sizeClass = {
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        '6xl': 'max-w-6xl',
        '7xl': 'max-w-7xl',
        '9xl': 'max-w-9xl',
    }[size];

    const hasTitle = title && title.trim() !== "";

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={onClose} 
        >
            <div 
                className={`bg-white rounded-lg shadow-xl w-full ${sizeClass} relative flex flex-col overflow-hidden`} // <-- 'overflow-hidden' BURAYA TAŞINDI
                style={{ maxHeight: '90vh' }}
                onClick={(e) => e.stopPropagation()} 
            >
                <button 
                    onClick={onClose}
                    className={`absolute top-3 right-4 text-gray-400 hover:text-gray-600 z-10 ${!hasTitle && 'top-3 right-2'}`}
                >
                    <IoClose size={24} />
                </button>
                
                {hasTitle && (
                    <h2 className="text-2xl font-bold p-6 pb-4">{title}</h2>
                )}
                
                <div className={`flex-1 ${disableContentScroll ? 'overflow-hidden' : 'overflow-auto'} ${hasTitle ? 'px-6 pb-6' : 'p-0'}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;