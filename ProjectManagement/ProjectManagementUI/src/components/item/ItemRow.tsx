// src/components/item/ItemRow.tsx

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import type { Item, Column } from '../../types';
import { ColumnType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createItem, deleteItem, updateItem } from '../../store/features/itemSlice';
import { FiGrid, FiTrash2, FiPlus, FiChevronRight, FiChevronDown } from 'react-icons/fi'; // FiX eklenebilir kapatmak için ama şimdilik gerek yok

import StatusCell from './StatusCell';
import DateCell from './DateCell';
import TimelineCell from './TimelineCell';
import DocumentCell from './DocumentCell';
import PersonCell from './PersonCell';
import TextCell from './TextCell';
import DependencyCell from './DependencyCell';

const INDENT_STEP = 40; 

interface ItemRowProps {
    item: Item;
    color: string;
    columns: Column[];
    gridTemplateColumns: string;
    boardId: number;
    isOverlay?: boolean;
    depth?: number;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
    item,
    color,
    columns,
    gridTemplateColumns,
    boardId,
    isOverlay,
    depth = 0,
    hasChildren = false,
    isCollapsed = false,
    onToggleCollapse
}) => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector(state => state.boards);

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `item-${item.id}`,
        data: {
            type: 'ITEM',
            item: item,
            groupId: item.groupId
        }
    });

    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing) inputRef.current?.focus();
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing) setName(item.name);
    }, [item.name, isEditing]);

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
        else if (e.key === 'Escape') {
            setName(item.name);
            setIsEditing(false);
        }
    };

    const handleDeleteItem = useCallback(() => {
        if (window.confirm(`"${item.name}" silinsin mi?`)) {
            dispatch(deleteItem({ boardId, itemId: item.id, groupId: item.groupId }));
        }
    }, [dispatch, boardId, item]);

    const [showSubtaskInput, setShowSubtaskInput] = useState(false);
    const [subtaskName, setSubtaskName] = useState('');

    const toggleSubtaskInput = () => {
        setShowSubtaskInput(prev => !prev);
    };

    const handleCreateSubtask = async () => {
        const trimmed = subtaskName.trim();
        if (!trimmed || !selectedBoardId) return;

        try {
            await dispatch(createItem({
                boardId: selectedBoardId,
                groupId: item.groupId,
                itemData: { name: trimmed, parentItemId: item.id }
            })).unwrap();

            setSubtaskName('');
            // 🔴 DÜZELTME: Ekleme başarılı olunca inputu kapatıyoruz.
            setShowSubtaskInput(false); 
        } catch (err) {
            console.error("Alt görev eklenemedi", err);
        }
    };

    const handleSubtaskKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCreateSubtask();
        } else if (e.key === 'Escape') {
            setSubtaskName('');
            setShowSubtaskInput(false);
        }
    };

    const mainRowStyle = {
        gridTemplateColumns,
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: 'relative' as 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };

    const renderCellContent = (column: Column) => {
        const columnType = column.type as ColumnType;
        switch (columnType) {
            case ColumnType.Status: return <StatusCell item={item} column={column} />;
            case ColumnType.Date: return <DateCell item={item} column={column} />;
            case ColumnType.Timeline: return <TimelineCell item={item} column={column} />;
            case ColumnType.Document: return <DocumentCell item={item} column={column} />;
            case ColumnType.Person: return <PersonCell item={item} column={column} align={'center'} />;
            case ColumnType.Dependency: return <DependencyCell item={item} column={column} />;
            default: return <TextCell item={item} column={column} />;
        }
    };

    const dynamicPaddingLeft = `${depth * INDENT_STEP + 8}px`;

    return (
        <>
            {/* ANA GÖREV SATIRI */}
            <div
                ref={setNodeRef}
                style={mainRowStyle}
                className={`grid items-center border-b border-gray-100 last:border-b-0 text-base group ${
                    isOverlay ? 'bg-white shadow-xl border rounded' : 'hover:bg-gray-50'
                }`}
            >
                {/* Checkbox */}
                <div className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-4 py-3 border-r border-gray-200 h-full flex items-center">
                    <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
                    <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                </div>

                {/* GÖREV ADI ALANI */}
                <div
                    className="sticky z-10 bg-white group-hover:bg-gray-50 px-2 py-3 border-r border-gray-200 h-full flex items-center justify-between gap-x-2"
                    style={{
                        left: '60px',
                        paddingLeft: dynamicPaddingLeft
                    }}
                    onDoubleClick={() => !isEditing && setIsEditing(true)}
                >
                    <div className="flex items-center gap-x-2 flex-grow min-w-0"> 
                        <div {...attributes} {...listeners} className="text-gray-400 hover:text-gray-700 cursor-grab p-1 flex-shrink-0 focus:outline-none">
                            <FiGrid size={14} />
                        </div>

                        {/* YENİ: Expand/Collapse İkonu */}
                        {hasChildren ? (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation(); // Satırın double-click eventini engelle
                                    onToggleCollapse?.();
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded text-gray-500 flex-shrink-0"
                            >
                                {isCollapsed ? <FiChevronRight size={14} /> : <FiChevronDown size={14} />}
                            </button>
                        ) : (
                            // Hiza bozulmasın diye boşluk bırakabiliriz veya bırakmayız.
                            // Eğer hiyerarşi çizgisi yoksa boşluk bırakmaya gerek yok, 
                            // depth zaten padding veriyor.
                            null
                        )}
                        
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onBlur={handleSave}
                                onKeyDown={handleKeyDown}
                                className="w-full h-full outline-none ring-2 ring-indigo-500 rounded px-1 -ml-1 text-sm"
                            />
                        ) : (
                            <span 
                                className="truncate w-full text-gray-800 text-sm block cursor-text" 
                                title={item.name}
                            >
                                {item.name}
                            </span>
                        )}
                    </div>
                    
                    <div className='flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0'>
                        <button type="button" onClick={toggleSubtaskInput} className="p-1 rounded text-gray-400 hover:text-blue-600" title="Alt Görev Ekle"><FiPlus size={14} /></button>
                        <button type="button" onClick={handleDeleteItem} className="p-1 rounded text-gray-400 hover:text-red-600" title="Görevi Sil"><FiTrash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                {/* Diğer Sütunlar */}
                {columns.map(column => (
                    <div key={column.id} className="h-full border-r border-gray-200">
                        <div className="w-full h-full">
                            {renderCellContent(column)}
                        </div>
                    </div>
                ))}
                <div></div>
            </div>

            {/* ALT GÖREV EKLEME SATIRI */}
            {showSubtaskInput && (
                <div className="grid items-center border-b border-gray-100 text-base bg-gray-50" style={{ gridTemplateColumns }}>
                    <div className="sticky left-0 z-10 bg-white px-4 py-2 border-r border-gray-200 h-full flex items-center">
                        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: color }}></div>
                    </div>
                    
                    {/* Alt görev input alanı */}
                    <div 
                        className="sticky z-10 bg-white px-2 py-2 border-r border-gray-200 h-full flex items-center group/subinput" 
                        style={{ left: '60px', paddingLeft: `${(depth + 1) * INDENT_STEP + 8}px` }}
                    >
                        <input 
                            type="text" 
                            value={subtaskName} 
                            onChange={(e) => setSubtaskName(e.target.value)} 
                            onKeyDown={handleSubtaskKeyDown} 
                            placeholder="Yeni alt görev..." 
                            className="w-full h-full bg-transparent outline-none text-sm pr-8"
                            autoFocus // Otomatik odaklansın
                        />
                        {/* Kapatma veya Ekleme butonu */}
                        <div className="flex items-center">
                             <button 
                                type="button" 
                                onClick={handleCreateSubtask} 
                                className="ml-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 text-blue-600 flex-shrink-0"
                            >
                                <FiPlus size={14} />
                            </button>
                        </div>
                       
                    </div>

                    {columns.map(col => <div key={`subtask-empty-${item.id}-${col.id}`} className="border-r border-gray-200 h-10 bg-white" />)}
                    <div className="h-10 bg-white" />
                </div>
            )}
        </>
    );
};

export default ItemRow;