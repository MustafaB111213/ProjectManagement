import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Item, Column } from '../../types';
import { ColumnType } from '../../types'; // ColumnType enum'ını import et

// YENİ: State yönetimi için importlar
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { deleteItem, updateItem } from '../../store/features/itemSlice'; // Yeni thunk'ı import et

// YENİ: İkon importu
import { FiGrid, FiTrash2 } from 'react-icons/fi';

// Hücre component'leri
import StatusCell from './StatusCell';
import DateCell from './DateCell';
import TimelineCell from './TimelineCell';
import DocumentCell from './DocumentCell';
import PersonCell from './PersonCell';
import TextCell from './TextCell';
import DependencyCell from './DependencyCell';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

interface ItemRowProps {
    item: Item;
    color: string;
    columns: Column[];
    gridTemplateColumns: string;
    dragHandleProps?: DraggableProvidedDragHandleProps | null | undefined;
    boardId: number;
}

const ItemRow: React.FC<ItemRowProps> = ({ item, color, columns, gridTemplateColumns, dragHandleProps, boardId }) => {

    // --- YENİ: Inline Editing için State ve Hook'lar ---
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector(state => state.boards);
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const inputRef = useRef<HTMLInputElement>(null);

    // Düzenleme moduna geçildiğinde input'a odaklan
    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
        }
    }, [isEditing]);

    // Component'in item prop'u (Redux'tan gelen) değişirse, local state'i de güncelle
    // Bu, başka bir yerde yapılan değişikliğin buraya yansımasını sağlar
    useEffect(() => {
        if (!isEditing) {
            setName(item.name);
        }
    }, [item.name, isEditing]);


    // --- YENİ: Fonksiyonu 'async' yap ---
    // ItemRow.tsx

    const handleSave = async () => {
        if (name.trim() === '' || name === item.name) {
            setIsEditing(false);
            setName(item.name);
            return;
        }

        if (selectedBoardId) {
            try {
                await dispatch(updateItem({
                    boardId: selectedBoardId,
                    itemId: item.id,
                    groupId: item.groupId, // <-- YENİ: 'groupId'Yİ BURADA GÖNDER
                    itemData: { name: name.trim() }
                })).unwrap();

                setIsEditing(false);

            } catch (error) {
                // Hata artık 'Unexpected end of JSON' olmayacak.
                // Backend'den gelen (varsa) validasyon hatası olacak.
                console.error("Item güncellenemedi:", error);
            }

        } else {
            setIsEditing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            setName(item.name); // İptal et, eski değere dön
            setIsEditing(false);
        }
    };
    // --- Inline Editing Logic Sonu ---


    // --- YENİ: Silme Fonksiyonu ---
    const handleDeleteItem = useCallback(() => {
        // Kullanıcıdan onay al
        if (window.confirm(`"${item.name}" görevini silmek istediğinizden emin misiniz?`)) {
            dispatch(deleteItem({
                boardId: boardId,
                itemId: item.id,
                groupId: item.groupId // Reducer'ın hangi gruptan sileceğini bilmesi için gerekli
            }));
            // Hata yönetimi thunk içinde veya extraReducer'da yapılabilir.
        }
    }, [dispatch, boardId, item.id, item.groupId, item.name]); // Bağımlılıkları ekle
    // ----------------------------
    
    // --- Dinamik Hücre Render Etme ---
    const renderCellContent = (column: Column) => {
        const columnType = column.type as ColumnType;

        switch (columnType) {
            case ColumnType.Status:
                return <StatusCell item={item} column={column} />;
            case ColumnType.Date:
                return <DateCell item={item} column={column} />;
            case ColumnType.Timeline:
                return <TimelineCell item={item} column={column} />;
            case ColumnType.Document:
                return <DocumentCell item={item} column={column} />;
            case ColumnType.Person:
                return <PersonCell item={item} column={column} />;
            case ColumnType.Dependency:
                return <DependencyCell item={item} column={column} />;
            case ColumnType.Text:
            default:
                return <TextCell item={item} column={column} />;
        }
    };

    return (
        <div
            // GÜNCELLENDİ: 'borderLeft' buradan kaldırıldı
            className="grid items-center border-b border-gray-100 last:border-b-0 hover:bg-gray-50 text-sm group"
            style={{ gridTemplateColumns }}
        >
            {/* Checkbox Alanı (Sticky) */}
            <div className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-4 py-3 border-r border-gray-200 h-full flex items-center">
                {/* Renk çubuğu artık ilk hücrenin içinde */}
                <div
                    className="absolute top-0 left-0 bottom-0 w-1"
                    style={{ backgroundColor: color }}
                ></div>
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            </div>

            {/* Görev Adı (Sticky ve Düzenlenebilir) */}
            <div
                className="sticky z-10 bg-white group-hover:bg-gray-50 :bg-gray-800 :group-hover:bg-gray-700/[0.5] px-2 py-3 border-r border-gray-200 :border-gray-700 h-full flex items-center justify-between gap-x-2" // justify-between eklendi
                style={{ left: '60px' }}
                onDoubleClick={() => !isEditing && setIsEditing(true)} // Sadece düzenlemede değilken çift tıkla
                title={item.name}
            >
                {/* Sol Taraf: Drag Handle ve İsim/Input */}
                <div className="flex items-center gap-x-2 flex-grow min-w-0"> {/* flex-grow ve min-w-0 eklendi */}
                    <div {...dragHandleProps} className="text-gray-400 hover:text-gray-700 :hover:text-gray-300 cursor-grab p-1 flex-shrink-0"> {/* flex-shrink-0 */}
                        <FiGrid size={14} />
                    </div>
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className="w-full h-full bg-white :bg-gray-700 text-gray-900 :text-gray-100 outline-none ring-2 ring-indigo-500 rounded px-1 -ml-1"
                        />
                    ) : (
                        <span className="truncate w-full text-gray-800 :text-gray-100">{item.name}</span>
                    )}
                </div>

                {/* Sağ Taraf: Silme Butonu (Hover'da Görünür) */}
                <button
                    onClick={handleDeleteItem}
                    className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 :hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 focus:opacity-100" // focus:opacity-100 eklendi
                    title="Görevi Sil"
                >
                    <FiTrash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Dinamik Sütunlar */}
            {columns.map(column => (
                <div
                    key={column.id}
                    className="h-full border-r border-gray-200"
                >
                    <div className="w-full h-full">
                        {renderCellContent(column)}
                    </div>
                </div>
            ))}

            {/* + Sütunu için boşluk */}
            <div></div>
        </div>
    );
};

export default ItemRow;