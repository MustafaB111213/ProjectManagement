import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { FiStar, FiBell } from 'react-icons/fi';
import { BsKanban } from 'react-icons/bs';
import { selectSelectedBoard } from '../../store/features/boardSlice';

const InfoRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <div className="text-text-primary font-medium flex items-center gap-x-2">
            {children}
        </div>
    </div>
);

const BoardInfoPopover: React.FC = () => {
    const selectedBoard = useAppSelector(selectSelectedBoard);

    if (!selectedBoard) return null;

    return (
        <div className="p-4 space-y-4">
            {/* Üst Kısım: Başlık ve İkonlar */}
            <div className="flex items-center justify-between">
                <h3 className="font-title text-lg font-bold text-text-primary truncate">{selectedBoard.name}</h3>
                <div className="flex items-center">
                    <button className="p-2 text-text-secondary hover:bg-gray-100 rounded-md"><FiStar /></button>
                </div>
            </div>

            {/* Açıklama */}
            {selectedBoard.description && (
                <p className="text-sm text-text-secondary">{selectedBoard.description}</p>
            )}

            {/* Ayırıcı Çizgi */}
            <div className="border-b border-border-color-soft"></div>

            {/* Pano Bilgisi */}
            <div className="space-y-3">
                <InfoRow label="Pano Türü">
                    <BsKanban /> <span>Ana</span>
                </InfoRow>
                <InfoRow label="Sahip">
                    <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-800 flex items-center justify-center text-xs">M</div>
                    <span>Mister</span>
                </InfoRow>
                <InfoRow label="Tarafından oluşturuldu">
                    <span>Oct 13, 2025'de</span>
                </InfoRow>
                <InfoRow label="Bildirimler">
                    <FiBell /> <span>Her şey</span>
                </InfoRow>
            </div>
        </div>
    );
};

export default BoardInfoPopover;