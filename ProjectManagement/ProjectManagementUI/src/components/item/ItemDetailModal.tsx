import React, { useState, useMemo, useRef, useCallback } from 'react';
import Modal from '../common/Modal';
import { format, parseISO } from 'date-fns'; // <-- HATA DÜZELTMESİ (TS2552, TS2304)
import { type Item, type Group, type Column, ColumnType, type DependencyType, type DependencyLink, type User } from '../../types';
import { FiCheckSquare, FiFileText, FiActivity, FiCheck, FiX, FiPlus, FiUsers } from 'react-icons/fi';

// --- Redux Hook'ları ve Eylemleri ---
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    updateItemValue,
    updateItem,
    reorderItems,
    moveItem
} from '../../store/features/itemSlice';
import { selectAllGroups } from '../../store/features/groupSlice';

// --- Ortak Bileşenler (Popover ve Pill) ---
import Popover from '../common/Popover';
import Pill from '../common/Pill';
import { selectAllUsers } from '../../store/features/userSlice';

// --- YENİ YARDIMCI FONKSİYONLAR ---
// (PersonCell.tsx'teki ile aynı)
// Backend 'User' tipini, bileşenin beklediği 'ViewUser' tipine dönüştür
const transformUserForView = (user: ReturnType<typeof selectAllUsers>[0]) => {
    const initials = `${user.firstName[0] || ''}${user.lastName[0] || ''}`.toUpperCase();
    return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        avatarUrl: undefined,
        initials: initials || user.username[0].toUpperCase(),
    };
};
// ---------------------------------

// --- Satır Bileşeni (GÜNCELLENDİ) ---
interface DetailRowProps {
    label: string;
    children: React.ReactNode;
    onClick?: () => void; // Tıklanabilir satırlar için
    // YENİ: Değer (sağ taraf) için bir ref prop'u
    valueRef?: React.Ref<HTMLDivElement>;
}
const DetailRow: React.FC<DetailRowProps> = ({ label, children, onClick, valueRef }) => (
    <div
        className={`flex py-3 border-b border-gray-100 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={onClick}
    >
        {/* Etiket (Sol Taraf) */}
        <div className="w-1/3 text-sm font-medium text-gray-500 px-2">{label}</div>

        {/* Değer (Sağ Taraf) - YENİ: 'valueRef' eklendi */}
        <div
            className="w-2/3 text-sm text-gray-800 px-2"
            ref={valueRef}
            // Tıklamanın 'DetailRow'a yayılmasını engelle (iç içe tıklamayı önler)
            onClick={(e) => e.stopPropagation()}
        >
            {children}
        </div>
    </div>
);
// --- GÜNCELLEME SONU ---

// --- StatusCell'deki Mantık (Modal içine taşındı) ---
const STATUS_OPTIONS = [
    { text: 'Yapılıyor', classes: 'bg-orange-100 text-orange-800' },
    { text: 'Tamamlandı', classes: 'bg-green-100 text-green-800' },
    { text: 'Takıldı', classes: 'bg-red-100 text-red-800' },
    { text: 'Beklemede', classes: 'bg-blue-100 text-blue-800' },
    { text: 'Belirsiz', classes: 'bg-gray-100 text-gray-800' },
];


// Bağımlılık Çipi
const DependencyChip: React.FC<{ text: string, onClick?: () => void }> = ({ text, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-gray-200 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full flex items-center ${onClick ? 'cursor-pointer hover:bg-gray-300' : ''}`}
    >
        {text}
    </div>
);

// Bağımlılıkları işlemek için tip
type ProcessedDependency = DependencyLink & { name: string };

interface DependencyCellProps {
    item: Item;
    columnId: number;
    value: string; // JSON string
    allItems: Item[];
}

const DependencyCell: React.FC<DependencyCellProps> = ({ item, columnId, value, allItems }) => {
    const dispatch = useAppDispatch();

    // --- State'ler ---
    const [isViewOpen, setIsViewOpen] = useState(false); // '...daha fazla' popover'ı
    const [isAddOpen, setIsAddOpen] = useState(false); // 'Ekle' popover'ı
    const [depType, setDepType] = useState<DependencyType>('FS'); // Yeni eklenecek tipi tut

    // --- Ref'ler ---
    const viewRef = useRef<HTMLDivElement>(null); // '+1' çipi için ref
    const addRef = useRef<HTMLButtonElement>(null); // '+' butonu için ref

    // --- Veri İşleme ---
    // 1. JSON string'ini DependencyLink[] dizisine çevir
    const dependencies = useMemo((): DependencyLink[] => {
        try {
            const parsed = JSON.parse(value || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }, [value]);

    // 2. ID'leri, 'allItems' kullanarak proje adlarına çevir
    const processedDeps = useMemo((): ProcessedDependency[] => {
        return dependencies
            .filter(link => allItems.some(i => i.id === link.id))
            .map(link => {
                const linkedItem = allItems.find(i => i.id === link.id)!;
                return { ...link, name: linkedItem.name };
            });
    }, [dependencies, allItems]);

    // 3. Mevcut bağımlılık ID'leri (listede tekrar göstermemek için)
    const existingIds = useMemo(() => new Set(dependencies.map(d => d.id)), [dependencies]);

    // 4. Eklenebilecek görevler (kendisi ve zaten ekli olanlar hariç)
    const addableItems = useMemo(() => {
        return allItems.filter(i => i.id !== item.id && !existingIds.has(i.id));
    }, [allItems, item.id, existingIds]);

    // --- Handler'lar ---
    const updateDependencies = (newDeps: DependencyLink[]) => {
        const newValue = JSON.stringify(newDeps);
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: columnId,
            value: newValue
        }));
    };

    const handleAddDep = (newItemId: number) => {
        const newLink: DependencyLink = { id: newItemId, type: depType };
        updateDependencies([...dependencies, newLink]);
        setIsAddOpen(false); // Ekleme popover'ını kapat
    };

    const handleRemoveDep = (idToRemove: number) => {
        const newDeps = dependencies.filter(d => d.id !== idToRemove);
        updateDependencies(newDeps);
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. İlk Çip (varsa) */}
            {processedDeps.length > 0 && (
                <DependencyChip text={`${processedDeps[0].type}: ${processedDeps[0].name}`} />
            )}

            {/* 2. '...daha fazla' Sayacı (varsa) */}
            {processedDeps.length > 1 && (
                <div ref={viewRef}>
                    <DependencyChip
                        text={`+${processedDeps.length - 1}`}
                        onClick={() => setIsViewOpen(true)}
                    />
                </div>
            )}

            {/* 3. Ekle Butonu */}
            <button
                ref={addRef}
                onClick={() => setIsAddOpen(true)}
                className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
            >
                <FiPlus size={16} />
            </button>

            {/* 4. Tümünü Gör Popover'ı */}
            <Popover
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                targetRef={viewRef}
                widthClass="w-64"
                paddingClass="p-2"
            >
                <ul className="max-h-60 overflow-y-auto">
                    {processedDeps.map(dep => (
                        <li key={dep.id} className="flex items-center justify-between p-2 text-sm text-gray-800 hover:bg-gray-50 rounded">
                            <span><span className="font-semibold">{dep.type}</span>: {dep.name}</span>
                            <button
                                onClick={() => handleRemoveDep(dep.id)}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <FiX size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            </Popover>

            {/* 5. Yeni Ekle Popover'ı */}
            <Popover
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                targetRef={addRef}
                widthClass="w-72" // Biraz daha geniş
                paddingClass="p-3"
            >
                <div className="flex flex-col">
                    <div className="font-medium text-sm mb-2">Bağımlılık Türü</div>
                    <select
                        value={depType}
                        onChange={(e) => setDepType(e.target.value as DependencyType)}
                        className="w-full border-gray-300 rounded-md shadow-sm text-sm mb-3"
                    >
                        <option value="FS">Finish to Start (FS)</option>
                        <option value="SS">Start to Start (SS)</option>
                        <option value="FF">Finish to Finish (FF)</option>
                        <option value="SF">Start to Finish (SF)</option>
                    </select>

                    <div className="font-medium text-sm mb-2">Görev Seç</div>
                    <ul className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                        {addableItems.length > 0 ? (
                            addableItems.map(addItem => (
                                <li
                                    key={addItem.id}
                                    onClick={() => handleAddDep(addItem.id)}
                                    className="p-2 text-sm text-gray-800 hover:bg-gray-100 cursor-pointer truncate"
                                    title={addItem.name}
                                >
                                    {addItem.name}
                                </li>
                            ))
                        ) : (
                            <li className="p-2 text-sm text-gray-500 text-center">Eklenecek görev yok.</li>
                        )}
                    </ul>
                </div>
            </Popover>
        </div>
    );
};


// Kişi Avatar Çipi (İsimsiz, sadece avatar/baş harf)
const AvatarChip: React.FC<{ user: ReturnType<typeof transformUserForView>, title: string, onClick?: () => void }> = ({ user, title, onClick }) => (
    <div
        onClick={onClick}
        title={title}
        className={`inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold ${onClick ? 'cursor-pointer' : ''}`}
    >
        {user.avatarUrl ? (
            <img className="h-full w-full rounded-full object-cover" src={user.avatarUrl} alt={user.name} />
        ) : (
            user.initials
        )}
    </div>
);

// Kişi Sayacı Çipi (+N)
const CountChip: React.FC<{ count: number, onClick: () => void }> = ({ count, onClick }) => (
    <div
        onClick={onClick}
        title={`${count} kişi daha`}
        className="inline-flex items-center justify-center h-7 w-7 rounded-full ring-2 ring-white bg-gray-200 text-gray-600 text-xs font-bold cursor-pointer"
    >
        +{count}
    </div>
);


interface PersonEditorProps {
    item: Item;
    columnId: number;
    value: string; // JSON string (örn: "[1, 3]")
}

const PersonEditor: React.FC<PersonEditorProps> = ({ item, columnId, value }) => {
    const dispatch = useAppDispatch();

    const allUsers = useAppSelector(selectAllUsers);
    
    // --- State'ler ---
    const [isViewOpen, setIsViewOpen] = useState(false); // Atananları gör popover'ı
    const [isAddOpen, setIsAddOpen] = useState(false); // Yeni kişi ekle popover'ı

    // --- Ref'ler ---
    const viewRef = useRef<HTMLDivElement>(null); // '+N' sayacı için ref
    const addRef = useRef<HTMLButtonElement>(null); // '+' butonu için ref

    // --- Veri İşleme (PersonCell.tsx'den) ---
    // 1. JSON string'ini ID dizisine çevir
    const selectedUserIds = useMemo((): number[] => {
        try {
            const parsed = JSON.parse(value || '[]');
            if (Array.isArray(parsed) && parsed.every(id => typeof id === 'number')) {
                return parsed as number[];
            }
        } catch { }
        return [];
    }, [value]);

    // 2. ID'leri User nesnelerine çevir
    const assignedUsers = useMemo(() => {
        const idSet = new Set(selectedUserIds);
        return allUsers
        .filter(user => idSet.has(user.id))
        .map(transformUserForView);
    }, [selectedUserIds, allUsers]);

    // 3. Eklenebilecek kullanıcılar (zaten atanmamış olanlar)
    const addableUsers = useMemo(() => {
        const idSet = new Set(selectedUserIds);
        return allUsers
        .filter(user => !idSet.has(user.id))
        .map(transformUserForView);
    }, [selectedUserIds, allUsers]);

    // --- Handler'lar ---
    const updateAssignedUsers = (newUserIds: number[]) => {
        const newValue = JSON.stringify(newUserIds);
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: columnId,
            value: newValue
        }));
    };

    const handleAddUser = (userId: number) => {
        const newIds = [...selectedUserIds, userId];
        updateAssignedUsers(newIds);
        // (Ekleme popover'ı açık kalabilir)
    };

    const handleRemoveUser = (userId: number) => {
        const newIds = selectedUserIds.filter(id => id !== userId);
        updateAssignedUsers(newIds);
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. İlk Avatar (varsa) */}
            {assignedUsers.length > 0 && (
                <div ref={viewRef} className="-mr-1.5"> {/* Popover'ın hizalanması için ref burada */}
                    <AvatarChip
                        user={assignedUsers[0]}
                        title={assignedUsers[0].name}
                        onClick={() => setIsViewOpen(true)} // Tıklandığında listeyi aç
                    />
                </div>
            )}

            {/* 2. '+N' Sayacı (varsa) */}
            {assignedUsers.length > 1 && (
                // Eğer ilk avatar gösterildiyse, ref'i buna taşı
                <div ref={assignedUsers.length > 0 ? undefined : viewRef}>
                    <CountChip
                        count={assignedUsers.length - 1}
                        onClick={() => setIsViewOpen(true)}
                    />
                </div>
            )}

            {/* 3. Ekle Butonu */}
            <button
                ref={addRef}
                onClick={() => setIsAddOpen(true)}
                className={`w-7 h-7 rounded-full flex items-center justify-center 
                    ${assignedUsers.length === 0
                        ? 'border-2 border-dashed border-gray-300 text-gray-400 hover:bg-blue-100 hover:border-blue-300 hover:text-blue-500' // Placeholder
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600' // Standart '+' butonu
                    }`}
            >
                {/* Atama yoksa FiUsers, varsa FiPlus göster */}
                {assignedUsers.length === 0 ? <FiUsers size={16} /> : <FiPlus size={16} />}
            </button>

            {/* 4. Atananları Gör Popover'ı */}
            <Popover
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                targetRef={viewRef}
                widthClass="w-60"
                paddingClass="p-2"
            >
                <h4 className="font-semibold text-sm mb-2 text-gray-700 px-1.5">Atanan Kişiler</h4>
                <ul className="max-h-60 overflow-y-auto">
                    {assignedUsers.map(user => (
                        <li key={user.id} className="flex items-center justify-between p-1.5 text-sm text-gray-800 hover:bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                                <AvatarChip user={user} title={user.name} />
                                <span>{user.name}</span>
                            </div>
                            <button
                                onClick={() => handleRemoveUser(user.id)}
                                className="text-gray-400 hover:text-red-500 p-1"
                            >
                                <FiX size={14} />
                            </button>
                        </li>
                    ))}
                </ul>
            </Popover>

            {/* 5. Yeni Ekle Popover'ı */}
            <Popover
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                targetRef={addRef}
                widthClass="w-60"
                paddingClass="p-2"
            >
                <h4 className="font-semibold text-sm mb-2 text-gray-700 px-1.5">Kişi Ekle</h4>
                <div className="max-h-48 overflow-y-auto mb-2 space-y-1">
                    {addableUsers.length > 0 ? (
                        addableUsers.map(user => (
                            <label
                                key={user.id}
                                onClick={() => handleAddUser(user.id)}
                                className="flex items-center p-1.5 rounded hover:bg-gray-100 cursor-pointer"
                            >
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold mr-2 flex-shrink-0">
                                    {user.avatarUrl ? (
                                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        user.initials
                                    )}
                                </div>
                                <span className="text-sm text-gray-800 truncate">{user.name}</span>
                            </label>
                        ))
                    ) : (
                        <div className="p-1.5 text-sm text-gray-500 text-center">Tüm kullanıcılar atanmış.</div>
                    )}
                </div>
            </Popover>
        </div>
    );
};


// --- Ana Modal Bileşeni ---

type ItemDetailTab = 'updates' | 'docs' | 'activity';
// State'i artık 'status' gibi stringler yerine 'columnId' (number) veya 'group' ile tutacağız
type EditingField = number | 'group' | null;

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item;
    group: Group | null; // 'group' prop'u mevcut grubu (gerçek veya sanal) temsil eder
    columns: Column[];
    boardName: string;
    allItems: Item[];
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    isOpen,
    onClose,
    item,
    group,
    columns,
    boardName,
    allItems,
}) => {
    const dispatch = useAppDispatch();
    // Pano gruplarını (taşımak için) Redux'tan çek
    const allGroups = useAppSelector(selectAllGroups);

    // --- State'ler ---
    const [activeTab, setActiveTab] = useState<ItemDetailTab>('updates');
    const [itemName, setItemName] = useState(item.name);
    const [isEditingName, setIsEditingName] = useState(false);

    // Hangi popover'ın açık olduğunu yönet (artık string değil, number|'group'|null)
    const [editingField, setEditingField] = useState<EditingField>(null);

    // YENİ: Text input'u için geçici state
    const [editingText, setEditingText] = useState<string>("");

    // Zaman Çizelgesi düzenlemesi için geçici state'ler
    const [timelineStart, setTimelineStart] = useState('');
    const [timelineEnd, setTimelineEnd] = useState('');

    // Popover'ların konumlanması için satırların ref'lerini tut
    const rowRefs = useRef<Map<number | string, HTMLDivElement | null>>(new Map());

    // --- Proje Adı Güncelleme ---
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setItemName(e.target.value);
    };

    // --- HATA DÜZELTMESİ (TS2353) ---
    const handleNameBlur = () => {
        setIsEditingName(false);
        if (itemName.trim() === '') {
            setItemName(item.name);
            return;
        }
        if (itemName !== item.name) {
            // 'updateItem' thunk'ı 'UpdateItemArgs' tipinde bir nesne bekliyor
            // (itemSlice.ts dosyanızdaki tanıma göre)
            dispatch(updateItem({
                boardId: group ? group.boardId : 0, // 'group' prop'undan boardId'yi al
                itemId: item.id,
                groupId: item.groupId,
                itemData: { name: itemName }
            }));
        }
    };
    // --- DÜZELTME SONU ---

    // --- Diğer Alanları Güncelleme ---
    const handleValueChange = (columnId: number, newValue: string) => {
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: columnId,
            value: newValue,
        }));
        setEditingField(null); // Popover'ı kapat
    };

    // --- YENİ: Zaman Çizelgesi Güncelleme ---
    const handleTimelineChange = (newStart: string, newEnd: string, columnId: number) => {
        // Sadece iki tarih de doluysa güncelle
        if (newStart && newEnd) {
            // (Opsiyonel) Bitiş, başlangıçtan önceyse güncelleme
            if (parseISO(newEnd) < parseISO(newStart)) {
                console.warn("Bitiş tarihi, başlangıç tarihinden önce olamaz.");
                // Burada kullanıcıya bir hata gösterebilirsiniz
                return;
            }
            // Değeri anında dispatch et
            dispatch(updateItemValue({
                itemId: item.id,
                columnId: columnId,
                value: `${newStart}/${newEnd}`,
            }));
        }
    };

    // --- YENİ: Grup Değiştirme ---
    const handleGroupChange = (newGroupId: number) => {
        if (newGroupId === item.groupId || !group) {
            setEditingField(null);
            return;
        }

        const args = {
            boardId: group.boardId, // 'group' prop'undan boardId'yi al
            itemId: item.id,
            sourceGroupId: item.groupId,
            sourceIndex: item.order, // 'item' prop'undan 'order'ı al
            destinationGroupId: newGroupId,
            destinationIndex: 0, // Yeni grubun en üstüne taşı
        };

        // 1. İyimser Güncelleme (UI'ın anında tepki vermesi için)
        dispatch(reorderItems(args));
        // 2. API Çağrısı (Sunucuyu güncellemek için)
        dispatch(moveItem(args));

        setEditingField(null); // Popover'ı kapat

        // Öğe artık bu modalın temsil ettiği grupta (veya sanal grupta) olmayabilir,
        // bu yüzden modalı kapatmak en güvenli yoldur.
        onClose();
    };

    // --- 'useMemo' Alanları (Aynı) ---
    const detailFields = useMemo(() => {
        return columns
            // .filter(col =>
            //     col.type === ColumnType.Person ||
            //     col.type === ColumnType.Status ||
            //     col.type === ColumnType.Date ||
            //     col.type === ColumnType.Timeline ||
            //     col.type === ColumnType.Dependency
            // )
            .map(col => {
                const value = item.itemValues.find(v => v.columnId === col.id)?.value || '';
                return {
                    id: col.id,
                    label: col.title,
                    value: value,
                    type: col.type
                };
            });
    }, [columns, item.itemValues]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="2xl" >
            <div className="flex flex-col h-[80vh]">
                {/* Sol Panel: Detaylar */}
                <div className="w-full h-full overflow-y-auto p-6 ">
                    {/* ... (Başlık Alanı ve Düzenlenebilir Proje Adı aynı) ... */}
                    <div className="pb-4 border-b border-gray-200 relative">

                        {isEditingName ? (
                            <input
                                type="text"
                                value={itemName}
                                onChange={handleNameChange}
                                onBlur={handleNameBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                                autoFocus
                                className="text-2xl font-bold text-gray-900 w-full border-b-2 border-blue-500 outline-none"
                            />
                        ) : (
                            <h1
                                className="text-2xl font-bold text-gray-900 cursor-pointer"
                                onClick={() => setIsEditingName(true)}
                            >
                                {itemName}
                            </h1>
                        )}
                        <div className="text-sm text-gray-500 mb-1">
                            Pano → <span className="font-medium text-gray-700">{boardName}</span>
                        </div>
                    </div>

                    {/* Alanlar (Sütunlar) (GÜNCELLENDİ) */}
                    <div className="py-4">

                        {/* GÜNCELLENDİ: Tıklanabilir Grup Satırı */}
                        <div key="group-row">
                            <DetailRow
                                label="Grup"
                                // GÜNCELLEME: Tıklama 'DetailRow' yerine 'valueRef' div'ine eklendi
                                // (Tüm satıra tıklamak yerine sadece değere tıklamayı sağlar)
                                valueRef={(el) => {
                                    rowRefs.current.set('group', el);
                                    if (el) el.onclick = () => setEditingField('group');
                                }}
                            >
                                {group ? (
                                    <span
                                        style={{ color: group.color || '#333' }}
                                        className="font-medium cursor-pointer"
                                    >
                                        {group.title}
                                    </span>
                                ) : 'Grup Bulunamadı'}
                            </DetailRow>
                        </div>
                        {/* GÜNCELLEME: Grup Değiştirme Popover'ı */}
                        <Popover
                            isOpen={editingField === 'group'}
                            onClose={() => setEditingField(null)}
                            // Ref'i 'group' ID'si ile al (doğru ref)
                            targetRef={{ current: rowRefs.current.get('group') || null }}
                        >
                            <ul className="py-1 w-48">
                                {allGroups.map(g => (
                                    <li
                                        key={g.id}
                                        onClick={() => handleGroupChange(g.id)}
                                        className="flex justify-between items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                    >
                                        <span style={{ color: g.color }}>{g.title}</span>
                                        {item.groupId === g.id && <FiCheck className="text-blue-500" />}
                                    </li>
                                ))}
                            </ul>
                        </Popover>


                        {/* Dinamik Alanlar (Artık Tıklanabilir) */}
                        {detailFields.map(field => {
                            const currentOption = STATUS_OPTIONS.find(opt => opt.text === field.value) || STATUS_OPTIONS[4];

                            // Hangi alanların düzenlenebilir olduğunu tanımla
                            const isEditable = [
                                ColumnType.Status,
                                ColumnType.Date,
                                ColumnType.Timeline,
                                ColumnType.Text, // <-- YENİ
                            ].includes(field.type);

                            return (
                                <div key={field.id}>
                                    <DetailRow
                                        label={field.label}
                                        valueRef={(el) => {
                                            rowRefs.current.set(field.id, el);
                                            // Tıklama olayını ayarla
                                            if (isEditable && el) {
                                                el.onclick = () => {
                                                    setEditingField(field.id);
                                                    // State'leri doldur
                                                    if (field.type === ColumnType.Timeline && field.value) {
                                                        const [start, end] = field.value.split('/');
                                                        setTimelineStart(start || '');
                                                        setTimelineEnd(end || '');
                                                    } else if (field.type === ColumnType.Text) {
                                                        setEditingText(field.value);
                                                    }
                                                };
                                            }
                                            // (Dependency ve Person kendi tıklamalarını yönetir)
                                        }}
                                    >
                                        {/* Değeri Göster VEYA Düzenleyiciyi Göster */}
                                        {(() => {
                                            // --- Düzenleme modu ---
                                            if (editingField === field.id) {
                                                // 🟦 Text türü
                                                if (field.type === ColumnType.Text) {
                                                    return (
                                                        <input
                                                            type="text"
                                                            value={editingText}
                                                            onChange={(e) => setEditingText(e.target.value)}
                                                            onBlur={() => {
                                                                handleValueChange(field.id, editingText);
                                                                setEditingField(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") {
                                                                    handleValueChange(field.id, editingText);
                                                                    setEditingField(null);
                                                                }
                                                                if (e.key === "Escape") {
                                                                    setEditingField(null);
                                                                }
                                                            }}
                                                            autoFocus
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    );
                                                }

                                                // 🟨 Date türü
                                                if (field.type === ColumnType.Date) {
                                                    const currentValue = field.value || "";
                                                    return (
                                                        <input
                                                            type="date"
                                                            value={currentValue}
                                                            onChange={(e) => handleValueChange(field.id, e.target.value)}
                                                            onBlur={() => setEditingField(null)}
                                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                    );
                                                }

                                                // 🟩 Timeline türü — aynı date görünümünde iki input yanyana
                                                if (field.type === ColumnType.Timeline) {
                                                    return (
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="date"
                                                                value={timelineStart}
                                                                onChange={(e) => setTimelineStart(e.target.value)}
                                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                            <input
                                                                type="date"
                                                                value={timelineEnd}
                                                                onChange={(e) => {
                                                                    const newEnd = e.target.value;
                                                                    setTimelineEnd(newEnd);
                                                                    handleTimelineChange(timelineStart, newEnd, field.id);
                                                                }}
                                                                onBlur={() => setEditingField(null)}
                                                                className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    );
                                                }
                                            }


                                            // --- Statik mod (Tüm tipler) ---
                                            switch (field.type) {
                                                case ColumnType.Status:
                                                    return <Pill text={currentOption.text} colorClasses={currentOption.classes} />;

                                                // --- YENİ: Bağımlılık ---
                                                case ColumnType.Dependency:
                                                    return <DependencyCell
                                                        item={item}
                                                        columnId={field.id}
                                                        value={field.value}
                                                        allItems={allItems}
                                                    />;
                                                // YENİ: Kişi (Person)
                                                case ColumnType.Person:
                                                    return <PersonEditor
                                                        item={item}
                                                        columnId={field.id}
                                                        value={field.value}
                                                    />;

                                                // --- Diğer tipler (Aynı) ---
                                                case ColumnType.Person:
                                                    return <span className="text-gray-500">{field.value || 'Atanmadı'}</span>;
                                                case ColumnType.Date:
                                                    return <span>{field.value ? format(parseISO(field.value), 'MMM d') : 'Tarih Yok'}</span>;
                                                case ColumnType.Timeline:
                                                    return <span>{field.value ? field.value.replace('/', ' - ') : 'Zaman Çizelgesi Yok'}</span>;
                                                case ColumnType.Text:
                                                    return <span className="text-gray-800">{field.value || '...'}</span>;
                                                default:
                                                    return <span className="text-gray-500">{field.value || '...'}</span>;
                                            }
                                        })()}
                                    </DetailRow>

                                    {/* --- DÜZENLEME POPOVER'LARI --- */}

                                    {/* 1. Durum Popover'ı (Sadece Popover kullanan bu kaldı) */}
                                    {field.type === ColumnType.Status && (
                                        <Popover
                                            isOpen={editingField === field.id}
                                            onClose={() => setEditingField(null)}
                                            // Ref'i 'field.id' ile al (doğru ref)
                                            targetRef={{ current: rowRefs.current.get(field.id) || null }}
                                        >
                                            <ul className="py-1 w-48">
                                                {STATUS_OPTIONS.map(option => (
                                                    <li
                                                        key={option.text}
                                                        onClick={() => handleValueChange(field.id, option.text)}
                                                        className="flex justify-between items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                                    >
                                                        {/* YENİ: Renk Önizlemesi */}
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                // Arka plan rengini (bg-...) alıyoruz ve border ekliyoruz
                                                                className={`w-3 h-3 rounded-full border border-gray-300 ${option.classes.split(' ')[0]}`}
                                                                title={option.text}
                                                            ></span>
                                                            <span>{option.text}</span>
                                                        </div>
                                                        {/* Onay İkonu */}
                                                        {field.value === option.text && <FiCheck className="text-blue-500" />}
                                                    </li>
                                                ))}
                                            </ul>
                                        </Popover>
                                    )}

                                    {/* 2. Tarih Popover'ı (KALDIRILDI, inline oldu) */}
                                    {/* 3. Zaman Çizelgesi Popover'ı (KALDIRILDI, inline oldu) */}

                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
export default ItemDetailModal;