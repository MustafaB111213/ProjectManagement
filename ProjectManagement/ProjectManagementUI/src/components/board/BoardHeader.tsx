import React, { useRef, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { FiChevronDown } from 'react-icons/fi';
import Popover from '../common/Popover';
import BoardInfoPopover from './BoardInfoPopover';
import { selectSelectedBoard } from '../../store/features/boardSlice';

const BoardHeader: React.FC = () => {
    const selectedBoard = useAppSelector(selectSelectedBoard);

    const [isInfoPopoverOpen, setInfoPopoverOpen] = useState(false);
    
    // Referansı, bağlanacağı elementin tam tipi olan 'HTMLButtonElement' olarak tanımlıyoruz.
    const popoverTargetRef = useRef<HTMLButtonElement>(null);
    
    if (!selectedBoard) return null;

    return (
        // Bu 'relative' kapsayıcı, içindeki 'absolute' pozisyonlu Popover için bir referans noktasıdır.
        <div className="relative">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div>
                        <div className="flex items-center gap-x-2">
                            <h2 className="font-title text-h1 font-bold text-text-primary truncate tracking-h1">
                                {selectedBoard.name}
                            </h2>
                            <button 
                                ref={popoverTargetRef}
                                onClick={() => setInfoPopoverOpen(prev => !prev)}
                                className="p-2 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                            >
                               <FiChevronDown size={24} />
                            </button>
                        </div>
                    </div>
                    
                </div>
            </div>

            <Popover
                isOpen={isInfoPopoverOpen}
                onClose={() => setInfoPopoverOpen(false)}
                targetRef={popoverTargetRef}
                position="bottom-start"
            >
                <BoardInfoPopover />
            </Popover>
        </div>
    );
};

export default BoardHeader;