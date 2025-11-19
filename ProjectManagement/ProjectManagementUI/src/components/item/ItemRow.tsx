// src/components/item/ItemRow.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable'; // DND-KIT importu
import type { Item, Column } from '../../types';
import { ColumnType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { deleteItem, updateItem } from '../../store/features/itemSlice';
import { FiGrid, FiTrash2 } from 'react-icons/fi';

// Hücre component'leri (importlar aynı kalıyor)
import StatusCell from './StatusCell';
import DateCell from './DateCell';
import TimelineCell from './TimelineCell';
import DocumentCell from './DocumentCell';
import PersonCell from './PersonCell';
import TextCell from './TextCell';
import DependencyCell from './DependencyCell';

interface ItemRowProps {
    item: Item;
    color: string;
    columns: Column[];
    gridTemplateColumns: string;
    boardId: number;
    isOverlay?: boolean; // Sürükleme efekti için (opsiyonel görsel düzenleme)
}

const ItemRow: React.FC<ItemRowProps> = ({ item, color, columns, gridTemplateColumns, boardId, isOverlay }) => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector(state => state.boards);

    // --- DND-KIT Hook ---
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `item-${item.id}`, // Unique ID
        data: {
            type: 'ITEM',
            item: item, // Item verisini taşıyoruz (BoardView'da kullanmak için)
            groupId: item.groupId
        }
    });

    // Inline editing state'leri...
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);
    useEffect(() => { if (!isEditing) setName(item.name); }, [item.name, isEditing]);

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
                    groupId: item.groupId,
                    itemData: { name: name.trim() }
                })).unwrap();
                setIsEditing(false);
            } catch (error) {
                console.error("Hata:", error);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        else if (e.key === 'Escape') { setName(item.name); setIsEditing(false); }
    };

    const handleDeleteItem = useCallback(() => {
        if (window.confirm(`"${item.name}" silinsin mi?`)) {
            dispatch(deleteItem({ boardId, itemId: item.id, groupId: item.groupId }));
        }
    }, [dispatch, boardId, item]);

    // --- DND Stilleri ---
    const style = {
        gridTemplateColumns,
        transform: CSS.Translate.toString(transform), // Translate kullanmak CSS Grid'i daha az bozar
        transition,
        opacity: isDragging ? 0.3 : 1, // Sürüklenen orijinal öğeyi silikleştir
        position: 'relative' as 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };

    const renderCellContent = (column: Column) => {
         // (Buradaki switch-case yapısı aynı kalıyor)
         const columnType = column.type as ColumnType;
         switch (columnType) {
            case ColumnType.Status: return <StatusCell item={item} column={column} />;
            case ColumnType.Date: return <DateCell item={item} column={column} />;
            case ColumnType.Timeline: return <TimelineCell item={item} column={column} />;
            case ColumnType.Document: return <DocumentCell item={item} column={column} />;
            case ColumnType.Person: return <PersonCell item={item} column={column} align={'center'} />;
            case ColumnType.Dependency: return <DependencyCell item={item} column={column}  />;
            default: return <TextCell item={item} column={column} />;
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`grid items-center border-b border-gray-100 last:border-b-0 text-base group ${isOverlay ? 'bg-white shadow-xl border rounded' : 'hover:bg-gray-50'}`}
        >
            {/* Checkbox (Sticky) */}
            <div className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-4 py-3 border-r border-gray-200 h-full flex items-center">
                <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            </div>

            {/* İsim ve Drag Handle */}
            <div
                className="sticky z-10 bg-white group-hover:bg-gray-50 px-2 py-3 border-r border-gray-200 h-full flex items-center justify-between gap-x-2"
                style={{ left: '60px', maxWidth: '400px' }}
                onDoubleClick={() => !isEditing && setIsEditing(true)}
            >
                <div className="flex items-center gap-x-2 flex-grow min-w-0">
                    {/* --- DRAG HANDLE BURADA --- */}
                    {/* attributes ve listeners SADECE ikona verilir */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="text-gray-400 hover:text-gray-700 cursor-grab p-1 flex-shrink-0 focus:outline-none"
                    >
                        <FiGrid size={14} />
                    </div>

                    {isEditing ? (
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleSave}
                            onKeyDown={handleKeyDown}
                            className="w-full h-full outline-none ring-2 ring-indigo-500 rounded px-1 -ml-1"
                        />
                    ) : (
                        <span className="truncate w-full text-gray-800">{item.name}</span>
                    )}
                </div>
                <button onClick={handleDeleteItem} className="p-1 rounded text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100">
                    <FiTrash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Sütunlar */}
            {columns.map(column => (
                <div key={column.id} className="h-full border-r border-gray-200">
                    <div className="w-full h-full">
                        {renderCellContent(column)}
                    </div>
                </div>
            ))}
            <div></div>
        </div>
    );
};

export default ItemRow;