import React, { useState, useRef, useMemo } from 'react';
import type { Item, Column, User } from '../../types'; // User tipini import et
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateItemValue } from '../../store/features/itemSlice';
import Popover from '../common/Popover';
import { FiPlus, FiUsers } from 'react-icons/fi'; // FiUsers ikonu eklendi
import { selectAllUsers } from '../../store/features/userSlice';


// --- YENİ YARDIMCI FONKSİYONLAR ---
// Backend 'User' tipini, bileşenin beklediği 'ViewUser' tipine dönüştür
const transformUserForView = (user: ReturnType<typeof selectAllUsers>[0]) => {
    // TODO: Gravatar veya başka bir servis için e-posta kullanılabilir
    // Şimdilik avatarUrl'i kaldırıyoruz, 'initials' kullanacağız.
    const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
    return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        avatarUrl: undefined, // Backend'den gelmediği için 'undefined'
        initials: initials || user.username[0].toUpperCase(),
    };
};
// ---------------------------------


// Props arayüzü
interface PersonCellProps {
    item: Item;
    column: Column;
}

// Popover içindeki içeriği yönetecek alt component
const PersonPopoverContent: React.FC<{
    initialSelectedIds: number[]; // Artık number dizisi
    onSave: (newUserIds: number[]) => void;
}> = ({ initialSelectedIds, onSave }) => {

    // Global Redux state'inden TÜM kullanıcıları çek
    const allUsers = useAppSelector(selectAllUsers);
    // Kullanıcıları bileşenin beklediği formata dönüştür
    const viewUsers = useMemo(() => allUsers.map(transformUserForView), [allUsers]);

    // Popover içindeki seçili ID'leri tutan state (number Set'i)
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedIds));

    // Checkbox değiştiğinde state'i güncelle
    const handleCheckboxChange = (userId: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    // Kaydet butonuna tıklandığında
    const handleSave = () => {
        onSave(Array.from(selectedIds)); // Set'i diziye çevirip gönder
    };

    return (
        <div className="w-60 p-2 bg-white rounded-md shadow-lg border border-gray-200">
            <h4 className="font-semibold text-sm mb-2 text-gray-700 px-1.5">Kişi Ata</h4>
            <div className="max-h-48 overflow-y-auto mb-2 space-y-1">
                
                {viewUsers.map(user => (
                    <label key={user.id} className="flex items-center p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                        <input
                            type="checkbox"
                            className="h-4 w-4 rounded mr-2 border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedIds.has(user.id)}
                            onChange={() => handleCheckboxChange(user.id)}
                        />
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.initials
                            )}
                        </div>
                        <span className="text-sm text-gray-800 truncate">{user.name}</span>
                    </label>
                ))}
            </div>
            <button
                onClick={handleSave}
                className="w-full bg-main-purple text-white text-sm font-semibold py-1.5 rounded hover:bg-dark-purple focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-main-purple"
            >
                Kaydet
            </button>
        </div>
    );
};

// Ana PersonCell Component'i
const PersonCell: React.FC<PersonCellProps> = ({ item, column }) => {
    const dispatch = useAppDispatch();
    const [isPopoverOpen, setPopoverOpen] = useState(false);
    const cellRef = useRef<HTMLDivElement>(null);

    // Global state'ten tüm kullanıcıları çek
    const allUsers = useAppSelector(selectAllUsers);

    // Mevcut JSON değerini al (örn: '[1, 3]')
    const currentValue = item.itemValues.find(v => v.columnId === column.id)?.value || '[]';

    // JSON'u parse et ve ID dizisini al (useMemo ile)
    const selectedUserIds = useMemo((): number[] => {
        try {
            const parsed = JSON.parse(currentValue);
            // Gelen verinin bir sayı dizisi olduğundan emin ol
            if (Array.isArray(parsed) && parsed.every(id => typeof id === 'number')) {
                return parsed as number[];
            }
        } catch {
            // Parse hatası olursa veya format yanlışsa boş dizi döndür
            console.warn(`PersonCell: Item ${item.id} için JSON parse hatası veya geçersiz format. Değer: ${currentValue}`);
        }
        return []; // Hata veya boş değer durumunda
    }, [currentValue, item.id]);

    // ID'lere karşılık gelen User nesnelerini bul
    const assignedUsers = useMemo(() => {
        const idSet = new Set(selectedUserIds);
        return allUsers.filter(user => idSet.has(user.id)).map(transformUserForView);
    }, [selectedUserIds, allUsers]);

    // Popover'dan gelen ID dizisini JSON'a çevirip kaydet
    const handleSave = (newUserIds: number[]) => {
        // Diziyi JSON string'ine çevir
        const valueToSave = JSON.stringify(newUserIds);

        dispatch(updateItemValue({
            itemId: item.id,
            columnId: column.id,
            value: valueToSave, // JSON string'ini kaydet
        }));
        setPopoverOpen(false); // Popover'ı kapat
    };

    // Çoklu avatar gösterme limiti
    const maxAvatarsToShow = 2;

    return (
        <>
            <div
                ref={cellRef}
                onClick={() => setPopoverOpen(true)}
                className="w-full h-full flex items-center justify-center cursor-pointer group p-1" // Padding ayarlandı
            >
                {assignedUsers.length > 0 ? (
                    // Eğer kullanıcı(lar) atanmışsa, avatarları göster
                    <div className="flex -space-x-2 overflow-hidden items-center"> {/* Avatarları üst üste bindir */}
                        {assignedUsers.slice(0, maxAvatarsToShow).map(user => (
                            <div
                                key={user.id}
                                className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold" // Boyut ve ring eklendi
                                title={user.name}>
                                {user.avatarUrl ? (
                                    <img className="h-full w-full rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
                                ) : (
                                    user.initials
                                )}
                            </div>
                        ))}
                        {/* Eğer limitten fazla kişi varsa "+X" göster */}
                        {assignedUsers.length > maxAvatarsToShow && (
                            <div
                                className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-white bg-gray-200 text-gray-600 text-xs font-bold"
                                title={`${assignedUsers.length - maxAvatarsToShow} kişi daha`}
                            >
                                +{assignedUsers.length - maxAvatarsToShow}
                            </div>
                        )}
                    </div>
                ) : (
                    // Eğer kimse atanmamışsa, "+" ikonu göster (stil güncellendi)
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 text-gray-400 group-hover:bg-blue-100 group-hover:border-blue-300 group-hover:text-blue-500 flex items-center justify-center transition-colors">
                        <FiUsers className="w-4 h-4" /> {/* FiPlus yerine FiUsers */}
                    </div>
                )}
            </div>

            <Popover
                isOpen={isPopoverOpen}
                onClose={() => setPopoverOpen(false)}
                targetRef={cellRef}
                position="bottom-start"
                widthClass="w-60" // Popover genişliğini ayarla
                paddingClass="" // Popover içeriği kendi padding'ini yönetiyor
            >
                <PersonPopoverContent
                    initialSelectedIds={selectedUserIds}
                    onSave={handleSave}
                />
            </Popover>
        </>
    );
};

export default PersonCell;