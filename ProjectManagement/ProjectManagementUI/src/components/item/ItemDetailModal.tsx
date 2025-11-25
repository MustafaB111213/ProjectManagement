import React, { useState, useMemo, useRef } from 'react';
import Modal from '../common/Modal';
import { format, parseISO } from 'date-fns'; // <-- HATA DÜZELTMESİ (TS2552, TS2304)
import { type Item, type Group, type Column, ColumnType } from '../../types';
import { FiFileText, FiActivity, FiCheck, FiX, FiPaperclip, FiPlus } from 'react-icons/fi';
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
import DependencyCell from './DependencyCell';
import PersonCell from './PersonCell';
import { STATUS_OPTIONS } from '../common/constants';

// --- Satır Bileşeni ---
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


// --- Ana Modal Bileşeni ---

type ItemDetailTab = 'updates' | 'files' | 'activity' | 'more';
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
}) => {
    const dispatch = useAppDispatch();
    // Pano gruplarını (taşımak için) Redux'tan çek
    const allGroups = useAppSelector(selectAllGroups);

    // --- State'ler ---
    const [activeTab, setActiveTab] = useState<ItemDetailTab>('updates' as ItemDetailTab);

    const tabs = [
        { key: 'updates', label: 'Güncellemeler', icon: <FiFileText /> }, // FiFileText [8]
        { key: 'files', label: 'Dosyalar', icon: <FiPaperclip/> }, // FiCheckSquare [8]
        { key: 'activity', label: 'Etkinlik Günlüğü', icon: <FiActivity /> }, // FiActivity [8]
        { key: 'more', label: '', icon: <FiPlus/>}
    ];
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

    // --- Diğer Alanları Güncelleme ---
    const handleValueChange = (columnId: number, newValue: string) => {
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: columnId,
            value: newValue,
        }));
        setEditingField(null); // Popover'ı kapat
    };

    // --- Zaman Çizelgesi Güncelleme ---
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

    // --- Grup Değiştirme ---
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
        dispatch(reorderItems(args));
        // 2. API Çağrısı (Sunucuyu güncellemek için)
        dispatch(moveItem(args));

        setEditingField(null); // Popover'ı kapat

        // Öğe artık bu modalın temsil ettiği grupta (veya sanal grupta) olmayabilir,
        // bu yüzden modalı kapatmak en güvenli yoldur.
        onClose();
    };

    // --- 'useMemo' Alanları ---
    const detailFields = useMemo(() => {
        return columns
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
        /* --- Modal içeriği: sol/ayırıcı/sağ düzeni --- */
        <Modal isOpen={isOpen} onClose={onClose} title="" size="7xl" >
            <button
                onClick={onClose}
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 z-20"
                aria-label="Kapat"
            >
                <FiX size={18} />
            </button>
            {/* Ana yatay kapsayıcı: sol (detaylar) | ayırıcı | sağ (sekmeler) */}
            <div className="flex h-[80vh] gap-4">
                {/* SOL PANEL */}
                <div className="w-full lg:w-2/3 h-full overflow-y-auto p-6 bg-white rounded-md shadow-sm">
                    {/* Başlık ve düzenlenebilir isim */}
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

                    {/* Alanlar (Sütunlar) */}
                    <div className="py-4">
                        {/* Grup satırı (DetailRow kullanıyor) */}
                        <div key="group-row">
                            <DetailRow
                                label="Grup"
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

                        {/* Grup değiştir popover — aynı kod */}
                        <Popover
                            isOpen={editingField === 'group'}
                            onClose={() => setEditingField(null)}
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

                        {/* Dinamik alanlar (detailFields) — senin mevcut render mantığın burada aynı çalışır */}
                        {detailFields.map(field => {
                            const currentOption = STATUS_OPTIONS.find(opt => opt.text === field.value) || STATUS_OPTIONS[4];
                            const isEditable = [
                                ColumnType.Status,
                                ColumnType.Date,
                                ColumnType.Timeline,
                                ColumnType.Text,
                            ].includes(field.type);

                            return (
                                <div key={field.id}>
                                    <DetailRow
                                        label={field.label}
                                        valueRef={(el) => {
                                            rowRefs.current.set(field.id, el);
                                            if (isEditable && el) {
                                                el.onclick = () => {
                                                    setEditingField(field.id);
                                                    if (field.type === ColumnType.Timeline && field.value) {
                                                        const [start, end] = field.value.split('/');
                                                        setTimelineStart(start || '');
                                                        setTimelineEnd(end || '');
                                                    } else if (field.type === ColumnType.Text) {
                                                        setEditingText(field.value);
                                                    }
                                                };
                                            }
                                        }}
                                    >
                                        {(() => {
                                            if (editingField === field.id) {
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

                                            switch (field.type) {
                                                case ColumnType.Status:
                                                    return <Pill text={currentOption.text} colorClasses={currentOption.classes} />;

                                                case ColumnType.Dependency:
                                                    return <DependencyCell
                                                        item={item}
                                                        column={columns.find(c => c.id === field.id)!}
                                                        align={'left'}
                                                    />;
                                                case ColumnType.Person:
                                                    return <PersonCell item={item} column={columns.find(c => c.id === field.id)!} align='left' />;

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

                                    {/* Status popover (aynı şekilde) */}
                                    {field.type === ColumnType.Status && (
                                        <Popover
                                            isOpen={editingField === field.id}
                                            onClose={() => setEditingField(null)}
                                            targetRef={{ current: rowRefs.current.get(field.id) || null }}
                                        >
                                            <ul className="py-1 w-48">
                                                {STATUS_OPTIONS.map(option => (
                                                    <li
                                                        key={option.text}
                                                        onClick={() => handleValueChange(field.id, option.text)}
                                                        className="flex justify-between items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span
                                                                className={`w-3 h-3 rounded-full border border-gray-300 ${option.classes.split(' ')[0]}`}
                                                                title={option.text}
                                                            ></span>
                                                            <span>{option.text}</span>
                                                        </div>
                                                        {field.value === option.text && <FiCheck className="text-blue-500" />}
                                                    </li>
                                                ))}
                                            </ul>
                                        </Popover>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ORTADAKİ DİKEY AYIRICI */}
                <div className="hidden lg:flex items-center">
                    {/* görünürlük büyük ekranlarda; mobilde sağ panel alt satıra iner */}
                    <div className="w-px bg-gray-200 h-full mx-2" aria-hidden="true" />
                </div>

                {/* SAĞ PANEL (sekmeler) */}
                <div className="w-full lg:w-3/4 h-full bg-gray-50 rounded-md overflow-hidden flex flex-col">
                    {/* Sekme başlığı (sticky) */}
                    <div className="flex-shrink-0 sticky top-0 z-10 bg-gray-50 border-b border-gray-200 px-4">
                        <div className="flex gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as ItemDetailTab)}
                                    className={`flex items-center gap-2 py-3 px-3 text-sm font-medium transition-colors rounded-t-sm
                ${activeTab === tab.key ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sekme içerikleri — kaydırılabilir */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'files' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Görev Belgeleri</h3>
                                {columns.filter(col => col.type === ColumnType.Document).map(docColumn => {
                                    const docValue = item.itemValues.find(v => v.columnId === docColumn.id)?.value || '';
                                    return (
                                        <div key={docColumn.id} className="p-3 border rounded-md bg-white">
                                            <p className="text-xs font-medium text-gray-500 mb-1">{docColumn.title}</p>
                                            {docValue ? (
                                                <a href={docValue} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm break-all">
                                                    {docValue.substring(docValue.lastIndexOf('/') + 1)}
                                                </a>
                                            ) : (
                                                <p className="text-sm text-gray-400">Belge atanmamış.</p>
                                            )}
                                        </div>
                                    );
                                })}
                                {columns.filter(c => c.type === ColumnType.Document).length === 0 && (
                                    <p className="text-sm text-gray-500">Bu panoda dosya sütunu bulunmamaktadır.</p>
                                )}
                            </div>
                        )}

                        {activeTab === 'updates' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Görev Güncellemeleri</h3>
                                <p className="text-sm text-gray-600">Güncellemeler buraya gelecek. (API/Redux entegrasyonu gerektirir.)</p>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Etkinlik Günlüğü</h3>
                                <p className="text-sm text-gray-600">Tarih/saat bazlı tüm değişiklikler burada listelenecek.</p>
                            </div>
                        )}

                        {activeTab === 'more' && (
                            <div>
                                <h3 className="text-lg font-semibold mb-2">Daha Fazlası</h3>
                                <p className="text-sm text-gray-600">Ek aksiyonlar, entegrasyonlar veya bağlantılar buraya gelebilir.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
export default ItemDetailModal;