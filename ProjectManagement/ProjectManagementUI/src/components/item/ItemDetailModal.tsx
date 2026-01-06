// src/components/item/ItemDetailModal.tsx

import React, { useState, useMemo, useRef, useCallback } from 'react';
import Modal from '../common/Modal';
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { type Item, type Group, type Column, ColumnType } from '../../types';
import { FiFileText, FiActivity, FiCheck, FiX, FiPaperclip, FiPlus } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    updateItemValue,
    updateItem,
    reorderItems,
    moveItem
} from '../../store/features/itemSlice';
import { selectAllGroups } from '../../store/features/groupSlice';
import Popover from '../common/Popover';
import Pill from '../common/Pill';
import DependencyCell from './DependencyCell';
import PersonCell from './PersonCell';
import { STATUS_OPTIONS } from '../common/constants';

// Türkçe yerelleştirme
registerLocale('tr', tr);

// --- CSS STİLLERİ (Pano Görünümü İçin) ---
// Bu stiller takvimin varsayılan gri yapısını modern ve düz hale getirir.
const customDatePickerStyles = `
  .react-datepicker {
    font-family: inherit;
    border: 1px solid #e2e8f0; /* gray-200 */
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    background-color: white;
  }
  .react-datepicker__header {
    background-color: white;
    border-bottom: 1px solid #f1f5f9;
    border-top-left-radius: 0.5rem;
    border-top-right-radius: 0.5rem;
    padding-top: 10px;
  }
  .react-datepicker__current-month {
    font-weight: 600;
    color: #1e293b; /* slate-800 */
    margin-bottom: 5px;
  }
  .react-datepicker__day-name {
    color: #64748b; /* slate-500 */
    font-weight: 500;
  }
  .react-datepicker__day {
    color: #334155; /* slate-700 */
    border-radius: 0.375rem;
    transition: background-color 0.2s;
  }
  .react-datepicker__day:hover {
    background-color: #f1f5f9; /* slate-100 */
  }
  .react-datepicker__day--selected, 
  .react-datepicker__day--keyboard-selected,
  .react-datepicker__day--in-range,
  .react-datepicker__day--in-selecting-range {
    background-color: #3b82f6 !important; /* blue-500 */
    color: white !important;
  }
  .react-datepicker__day--today {
    font-weight: bold;
    color: #2563eb;
  }
  .react-datepicker__triangle {
    display: none;
  }
  .react-datepicker__navigation-icon::before {
    border-color: #64748b; /* Ok renkleri */
  }
`;

// --- İZOLE EDİLMİŞ EDİTÖR BİLEŞENLERİ ---

// 1. Tarih Editörü
interface DateEditorProps {
    initialValue: string;
    onSave: (val: string) => void;
    onClose: () => void;
}
const DateEditor: React.FC<DateEditorProps> = ({ initialValue, onSave, onClose }) => {
    const dateValue = useMemo(() => (initialValue ? parseISO(initialValue) : null), [initialValue]);
    
    return (
        <div onClick={(e) => e.stopPropagation()} className="relative z-50">
            <DatePicker
                selected={dateValue && isValid(dateValue) ? dateValue : null}
                onChange={(date: Date | null) => {
                    onSave(date ? format(date, 'yyyy-MM-dd') : "");
                }}
                dateFormat="d MMM yyyy"
                locale="tr"
                placeholderText="Tarih seçin"
                className="w-full border border-blue-400 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer bg-white shadow-sm"
                autoFocus
                startOpen={true}
                onClickOutside={onClose}
                shouldCloseOnSelect={true}
                popperProps={{ strategy: 'fixed' }} // Modal içinde kaymayı engeller
            />
        </div>
    );
};

// 2. Timeline Editörü
interface TimelineEditorProps {
    initialValue: string;
    onSave: (val: string) => void;
    onClose: () => void;
}
const TimelineEditor: React.FC<TimelineEditorProps> = ({ initialValue, onSave, onClose }) => {
    const [start, end] = useMemo(() => {
        if (!initialValue) return [null, null];
        const parts = initialValue.split('/');
        return [
            parts[0] ? parseISO(parts[0]) : null,
            parts[1] ? parseISO(parts[1]) : null
        ];
    }, [initialValue]);

    const [startDate, setStartDate] = useState<Date | null>(start);
    const [endDate, setEndDate] = useState<Date | null>(end);

    const handleChange = (dates: [Date | null, Date | null]) => {
        const [s, e] = dates;
        setStartDate(s);
        setEndDate(e);
        
        if (s && e) {
            const valStr = `${format(s, 'yyyy-MM-dd')}/${format(e, 'yyyy-MM-dd')}`;
            onSave(valStr);
        }
    };

    return (
        <div onClick={(e) => e.stopPropagation()} className="relative z-50">
             <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={handleChange}
                isClearable={true}
                dateFormat="d MMM yyyy"
                locale="tr"
                placeholderText="Başlangıç - Bitiş"
                className="w-full border border-blue-400 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer bg-white shadow-sm"
                autoFocus
                startOpen={true}
                onClickOutside={onClose}
                shouldCloseOnSelect={true}
                popperProps={{ strategy: 'fixed' }}
            />
        </div>
    );
}

// 3. Text Editörü
interface TextEditorProps {
    initialValue: string;
    onSave: (val: string) => void;
    onClose: () => void;
}
const TextEditor: React.FC<TextEditorProps> = ({ initialValue, onSave, onClose }) => {
    const [text, setText] = useState(initialValue);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") onSave(text);
        if (e.key === "Escape") onClose();
    };

    return (
        <div onClick={(e) => e.stopPropagation()}>
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={() => onSave(text)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="border border-blue-400 rounded px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
            />
        </div>
    );
};


// --- Satır Bileşeni (Memoized) ---
interface DetailRowProps {
    label: string;
    children: React.ReactNode;
    onClick?: () => void;
    valueRef?: React.Ref<HTMLDivElement>;
}
const DetailRow: React.FC<DetailRowProps> = React.memo(({ label, children, onClick, valueRef }) => (
    <div
        className={`flex py-3 border-b border-gray-100 items-center transition-colors min-h-[50px] ${onClick ? 'cursor-pointer hover:bg-gray-50 group' : ''}`}
        onClick={onClick}
    >
        <div className="w-1/3 text-sm font-medium text-gray-500 px-2 flex items-center gap-2 select-none">
            {label}
        </div>
        <div
            className="w-2/3 text-sm text-gray-800 px-2 flex items-center relative"
            ref={valueRef}
        >
            {children}
        </div>
    </div>
));
DetailRow.displayName = 'DetailRow';


// --- Ana Modal Bileşeni ---

type ItemDetailTab = 'updates' | 'files' | 'activity' | 'more';
type EditingField = number | 'group' | null;

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item;
    group: Group | null;
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
    const allGroups = useAppSelector(selectAllGroups);

    // --- State'ler ---
    const [activeTab, setActiveTab] = useState<ItemDetailTab>('updates');
    const tabs = [
        { key: 'updates', label: 'Güncellemeler', icon: <FiFileText /> },
        { key: 'files', label: 'Dosyalar', icon: <FiPaperclip /> },
        { key: 'activity', label: 'Etkinlik Günlüğü', icon: <FiActivity /> },
        { key: 'more', label: '', icon: <FiPlus /> }
    ];

    const [itemName, setItemName] = useState(item.name);
    const [isEditingName, setIsEditingName] = useState(false);
    const [editingField, setEditingField] = useState<EditingField>(null);

    const rowRefs = useRef<Map<number | string, HTMLDivElement | null>>(new Map());

    // --- Handler'lar ---
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
            dispatch(updateItem({
                boardId: group ? group.boardId : 0,
                itemId: item.id,
                groupId: item.groupId,
                itemData: { name: itemName }
            }));
        }
    };

    const handleValueChange = useCallback((columnId: number, newValue: string) => {
        dispatch(updateItemValue({
            itemId: item.id,
            columnId: columnId,
            value: newValue,
        }));
        setEditingField(null);
    }, [dispatch, item.id]);

    const handleGroupChange = (newGroupId: number) => {
        if (newGroupId === item.groupId || !group) {
            setEditingField(null);
            return;
        }
        const args = {
            boardId: group.boardId,
            itemId: item.id,
            sourceGroupId: item.groupId,
            sourceIndex: item.order,
            destinationGroupId: newGroupId,
            destinationIndex: 0,
        };
        dispatch(reorderItems(args));
        dispatch(moveItem(args));
        setEditingField(null);
        onClose();
    };

    const detailFields = useMemo(() => {
        return columns.map(col => {
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
        <Modal isOpen={isOpen} onClose={onClose} title="" size="7xl">
            {/* Özel Takvim Stillerini Enjekte Et */}
            <style>{customDatePickerStyles}</style>

            <button
                onClick={onClose}
                className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 z-20 transition-colors"
                aria-label="Kapat"
            >
                <FiX size={20} />
            </button>
            <div className="flex h-[80vh] gap-4">
                {/* SOL PANEL */}
                <div className="w-full lg:w-2/3 h-full overflow-y-auto p-6 bg-white rounded-md shadow-sm custom-scrollbar">
                    {/* Başlık */}
                    <div className="pb-4 border-b border-gray-200 relative mb-2">
                        {isEditingName ? (
                            <input
                                type="text"
                                value={itemName}
                                onChange={handleNameChange}
                                onBlur={handleNameBlur}
                                onKeyDown={(e) => e.key === 'Enter' && handleNameBlur()}
                                autoFocus
                                className="text-2xl font-bold text-gray-900 w-full border-b-2 border-blue-500 outline-none pb-1"
                            />
                        ) : (
                            <h1
                                className="text-2xl font-bold text-gray-900 cursor-pointer hover:bg-gray-50 rounded px-2 -ml-2 transition-colors py-1"
                                onClick={() => setIsEditingName(true)}
                            >
                                {itemName}
                            </h1>
                        )}
                        <div className="text-sm text-gray-500 mb-1 mt-1 px-1">
                            Pano / <span className="font-medium text-gray-700">{boardName}</span>
                        </div>
                    </div>

                    {/* Alanlar */}
                    <div className="py-2">
                        {/* Grup */}
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
                                        className="font-medium cursor-pointer px-2 py-1 rounded hover:bg-gray-100 inline-block"
                                    >
                                        {group.title}
                                    </span>
                                ) : 'Grup Bulunamadı'}
                            </DetailRow>
                        </div>

                        <Popover
                            isOpen={editingField === 'group'}
                            onClose={() => setEditingField(null)}
                            targetRef={{ current: rowRefs.current.get('group') || null }}
                        >
                            <ul className="py-1 w-48 max-h-60 overflow-y-auto">
                                {allGroups.map(g => (
                                    <li
                                        key={g.id}
                                        onClick={() => handleGroupChange(g.id)}
                                        className="flex justify-between items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                    >
                                        <span style={{ color: g.color }}>{g.title}</span>
                                        {item.groupId === g.id && <FiCheck className="text-blue-500" />}
                                    </li>
                                ))}
                            </ul>
                        </Popover>

                        {/* Dinamik Alanlar */}
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
                                        onClick={isEditable ? () => setEditingField(field.id) : undefined}
                                        valueRef={(el) => {
                                            rowRefs.current.set(field.id, el);
                                        }}
                                    >
                                        {(() => {
                                            // --- DÜZENLEME MODU ---
                                            if (editingField === field.id) {
                                                if (field.type === ColumnType.Text) {
                                                    return (
                                                        <TextEditor 
                                                            initialValue={field.value}
                                                            onSave={(val) => handleValueChange(field.id, val)}
                                                            onClose={() => setEditingField(null)}
                                                        />
                                                    );
                                                }
                                                if (field.type === ColumnType.Date) {
                                                    return (
                                                        <DateEditor
                                                            initialValue={field.value}
                                                            onSave={(val) => handleValueChange(field.id, val)}
                                                            onClose={() => setEditingField(null)}
                                                        />
                                                    );
                                                }
                                                if (field.type === ColumnType.Timeline) {
                                                    return (
                                                        <TimelineEditor
                                                            initialValue={field.value}
                                                            onSave={(val) => handleValueChange(field.id, val)}
                                                            onClose={() => setEditingField(null)}
                                                        />
                                                    );
                                                }
                                            }

                                            // --- GÖRÜNTÜLEME MODU ---
                                            switch (field.type) {
                                                case ColumnType.Status:
                                                    return <Pill text={currentOption.text} colorClasses={currentOption.classes} />;
                                                
                                                case ColumnType.Dependency:
                                                    return <DependencyCell item={item} column={columns.find(c => c.id === field.id)!} align={'left'} />;
                                                
                                                case ColumnType.Person:
                                                    return <PersonCell item={item} column={columns.find(c => c.id === field.id)!} align='left' />;
                                                
                                                case ColumnType.Date:
                                                    return (
                                                        <span className={`text-sm w-full h-full flex items-center ${field.value ? 'text-gray-800' : 'text-gray-400 italic group-hover:text-blue-500 transition-colors gap-1'}`}>
                                                            {field.value 
                                                                ? format(parseISO(field.value), 'd MMM yyyy', { locale: tr }) 
                                                                : <><FiPlus size={14} /> Tarih Ekle</>
                                                            }
                                                        </span>
                                                    );

                                                case ColumnType.Timeline:
                                                    if (!field.value) return <span className="text-gray-400 italic group-hover:text-blue-500 transition-colors flex items-center gap-1 w-full h-full"><FiPlus size={14}/> Zaman Aralığı</span>;
                                                    const [s, e] = field.value.split('/');
                                                    try {
                                                        const sd = parseISO(s);
                                                        const ed = parseISO(e);
                                                        if (isValid(sd) && isValid(ed)) {
                                                            return (
                                                                <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-xs font-medium whitespace-nowrap">
                                                                    {format(sd, 'd MMM', { locale: tr })} - {format(ed, 'd MMM yyyy', { locale: tr })}
                                                                </div>
                                                            );
                                                        }
                                                    } catch { }
                                                    return <span className="text-gray-800">{field.value}</span>;
                                                
                                                case ColumnType.Text:
                                                    return <span className="text-gray-800 break-words w-full h-full flex items-center">{field.value || <span className="text-gray-400 italic group-hover:text-blue-500 transition-colors flex items-center gap-1"><FiPlus size={14} /> Ekle...</span>}</span>;
                                                
                                                default:
                                                    return <span className="text-gray-500">{field.value || '...'}</span>;
                                            }
                                        })()}
                                    </DetailRow>

                                    {/* Status Popover */}
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
                                                        className="flex justify-between items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className={`w-3 h-3 rounded-full border border-gray-300 ${option.classes.split(' ')[0]}`} />
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

                {/* AYIRICI */}
                <div className="hidden lg:flex items-center">
                    <div className="w-px bg-gray-200 h-full mx-2" aria-hidden="true" />
                </div>

                {/* SAĞ PANEL */}
                <div className="w-full lg:w-3/4 h-full bg-gray-50 rounded-md overflow-hidden flex flex-col border border-gray-200">
                    <div className="flex-shrink-0 sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-2">
                        <div className="flex gap-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as ItemDetailTab)}
                                    className={`flex items-center gap-2 py-3 px-1 text-sm font-medium transition-all relative
                                        ${activeTab === tab.key 
                                            ? 'text-blue-600' 
                                            : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                                    {activeTab === tab.key && (
                                        <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-gray-50">
                        {activeTab === 'files' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800">Görev Belgeleri</h3>
                                {columns.filter(col => col.type === ColumnType.Document).map(docColumn => {
                                    const docValue = item.itemValues.find(v => v.columnId === docColumn.id)?.value || '';
                                    return (
                                        <div key={docColumn.id} className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{docColumn.title}</p>
                                            {docValue ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                                                        <FiFileText size={24} />
                                                    </div>
                                                    <a href={docValue} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium hover:underline text-sm break-all">
                                                        {docValue.substring(docValue.lastIndexOf('/') + 1)}
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-400 flex items-center gap-2 italic">
                                                    <FiPaperclip /> Belge atanmamış.
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {columns.filter(c => c.type === ColumnType.Document).length === 0 && (
                                    <div className="text-center py-10 text-gray-400 bg-white rounded-lg border border-dashed border-gray-300">
                                        <FiFileText size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>Bu panoda dosya sütunu bulunmamaktadır.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'updates' && (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <FiActivity size={48} className="mb-4 opacity-30" />
                                <h3 className="text-lg font-semibold mb-1 text-gray-600">Görev Güncellemeleri</h3>
                                <p className="text-sm">Henüz bir güncelleme notu eklenmemiş.</p>
                            </div>
                        )}
                        {activeTab === 'activity' && (
                             <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <FiActivity size={48} className="mb-4 opacity-30" />
                                <h3 className="text-lg font-semibold mb-1 text-gray-600">Etkinlik Günlüğü</h3>
                                <p className="text-sm">Henüz kayıt bulunamadı.</p>
                            </div>
                        )}
                        {activeTab === 'more' && (
                             <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <FiPlus size={48} className="mb-4 opacity-30" />
                                <h3 className="text-lg font-semibold mb-1 text-gray-600">Daha Fazlası</h3>
                                <p className="text-sm">Ek özellikler yakında eklenecek.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default ItemDetailModal;