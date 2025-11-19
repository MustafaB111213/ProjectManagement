// src/components/group/GroupSection.tsx

import React, { useMemo, useState } from 'react';
import type { Group, Column } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createItem, makeSelectItemsByGroup } from '../../store/features/itemSlice';
import { deleteGroup } from '../../store/features/groupSlice';
import { deleteColumn } from '../../store/features/columnSlice';

// dnd-kit
import { useSortable, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Componentler
import ItemRow from '../item/ItemRow';
import Modal from '../common/Modal';
import AddColumnForm from '../column/AddColumnForm';
import EditGroupForm from './EditGroupForm';
import EditColumnForm from '../column/EditColumnForm';
import { FiPlus, FiEdit, FiTrash2, FiChevronRight, FiChevronDown, FiGrid } from 'react-icons/fi';
import { useDroppable } from '@dnd-kit/core';

// --- YENİ: Sürüklenebilir Sütun Başlığı Bileşeni ---
const SortableColumnHeader = ({ column, openEdit, deleteCol }: { column: Column, openEdit: any, deleteCol: any }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `column-${column.id}`,
        data: { type: 'COLUMN', column }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width: '150px', // Sabit genişlik (Grid ile uyumlu olmalı)
        zIndex: isDragging ? 999 : 'auto'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group relative flex items-center justify-center text-center px-2 py-2 border-r border-gray-200 h-10 cursor-grab bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider"
        >
            <span className="truncate">{column.title}</span>
            <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 rounded shadow-sm z-10">
                <button onClick={(e) => openEdit(e, column)} className="p-0.5 hover:text-blue-600"><FiEdit size={11} /></button>
                <button onClick={(e) => deleteCol(e, column.id, column.title)} className="p-0.5 hover:text-red-600"><FiTrash2 size={11} /></button>
            </div>
        </div>
    );
};
// ---------------------------------------------------


interface GroupSectionProps {
    group: Group;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isOverlay?: boolean; // Overlay için
}

const GroupSection: React.FC<GroupSectionProps> = ({ group, isCollapsed, onToggleCollapse, isOverlay }) => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    // --- DND-KIT: Grup Sürükleme ---
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: `group-${group.id}`,
        data: { type: 'GROUP', group }
    });

    const groupStyle = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: 'relative' as 'relative',
        zIndex: isDragging ? 999 : 'auto',
    };
    // --------------------------------
    // --- YENİ KOD BAŞLANGICI: Grubun Gövdesi için Droppable ---
    // Bu kısım, item'ları boş bir gruba veya listenin altına sürüklemek için gereklidir.
    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id: `group-container-${group.id}`, // Benzersiz bir ID veriyoruz
        data: { type: 'CONTAINER', groupId: group.id }
    });
    // --- YENİ KOD SONU ---

    const [newItemName, setNewItemName] = useState('');
    const [isColumnModalOpen, setColumnModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);

    // Selector
    const selectItemsForGroup = useMemo(makeSelectItemsByGroup, []);
    const items = useAppSelector(state => selectItemsForGroup(state, group.id));
    const columns = useAppSelector((state) => state.columns.items);

    // DND-KIT için ID listeleri
    const itemIds = useMemo(() => items.map(i => `item-${i.id}`), [items]);
    const columnIds = useMemo(() => columns.map(c => `column-${c.id}`), [columns]);

    const gridTemplateColumns = useMemo(() =>
        `60px minmax(200px, 1fr) ${columns.map(() => '150px').join(' ')} 60px`, [columns]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItemName.trim() && selectedBoardId) {
            dispatch(createItem({ boardId: selectedBoardId, groupId: group.id, itemData: { name: newItemName.trim() } }));
            setNewItemName('');
        }
    };

    const handleDeleteGroup = (e: React.MouseEvent) => {
        e.stopPropagation(); // Tutamaç değil butona basıldı
        if (window.confirm(`"${group.title}" grubunu silmek istediğinizden emin misiniz?`)) {
            if (selectedBoardId) dispatch(deleteGroup({ boardId: selectedBoardId, groupId: group.id }));
        }
    };

    const handleDeleteColumn = (e: React.MouseEvent, columnId: number, columnName: string) => {
        e.preventDefault(); // Sürüklemeyi engelle
        e.stopPropagation();
        if (window.confirm(`"${columnName}" sütununu silmek istediğinizden emin misiniz?`)) {
            if (selectedBoardId) dispatch(deleteColumn({ boardId: selectedBoardId, columnId }));
        }
    };

    const openEditColumnModal = (e: React.MouseEvent, column: Column) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingColumn(column);
    };

    return (
        <>
            <section
                ref={setNodeRef}
                style={groupStyle}
                className={`mb-6 ${isOverlay ? 'bg-white shadow-2xl rounded-lg border-2 border-blue-400 p-2' : ''}`}
            >
                {/* Grup Başlığı */}
                <div className="group flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-x-2 flex-grow min-w-0">
                        {/* GRUP SÜRÜKLEME TUTAMACI (Handle) */}
                        <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-600">
                            <FiGrid size={16} />
                        </div>

                        <button onClick={onToggleCollapse} onMouseDown={e => e.stopPropagation()} className="p-1 text-gray-400 hover:text-gray-700">
                            {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                        </button>
                        
                        <h3 className="text-base font-semibold truncate cursor-pointer" style={{ color: group.color }} onClick={onToggleCollapse}>
                            {group.title}
                        </h3>
                        <span className="text-xs font-medium text-gray-400">({items.length} Görev)</span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); setEditModalOpen(true); }} className="p-1.5 text-gray-500 hover:text-blue-600"><FiEdit size={14} /></button>
                         <button onClick={handleDeleteGroup} className="p-1.5 text-gray-500 hover:text-red-600"><FiTrash2 size={14} /></button>
                    </div>
                </div>

                {/* Görev Tablosu */}
                {!isCollapsed && (
                    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <div className="min-w-max">
                                
                                {/* --- SÜTUN BAŞLIKLARI --- */}
                                <div className="grid border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider items-center" style={{ gridTemplateColumns }}>
                                    {/* Sabitler */}
                                    <div className="sticky left-0 z-20 bg-gray-50 px-4 py-2 border-r border-gray-200 h-10 flex items-center"></div>
                                    <div className="sticky z-20 bg-gray-50 px-2 py-2 border-r border-gray-200 h-10 flex items-center" style={{ left: '60px' }}>Görev Adı</div>
                                    
                                    {/* Sürüklenebilir Sütunlar */}
                                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                                        {columns.map((col) => (
                                            <SortableColumnHeader 
                                                key={col.id} 
                                                column={col} 
                                                openEdit={openEditColumnModal} 
                                                deleteCol={handleDeleteColumn} 
                                            />
                                        ))}
                                    </SortableContext>

                                    {/* Yeni Sütun Ekle */}
                                    <div className="flex justify-center items-center h-10">
                                        <button onClick={() => setColumnModalOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200">
                                            <FiPlus size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* --- ITEM LİSTESİ --- */}
                                {/* Context'i burada başlatıyoruz, böylece ItemRow'lar useSortable kullanabilir */}
                                <div className="bg-white">
                                    <SortableContext id={`group-${group.id}-items`} items={itemIds} strategy={verticalListSortingStrategy}>
                                        {items.map((item) => (
                                            <ItemRow
                                                key={item.id}
                                                item={item}
                                                color={group.color}
                                                columns={columns}
                                                gridTemplateColumns={gridTemplateColumns}
                                                boardId={selectedBoardId || 0}
                                            />
                                        ))}
                                    </SortableContext>
                                </div>

                                {/* Yeni Görev Ekleme */}
                                <div className="grid items-center border-t border-gray-200" style={{ gridTemplateColumns }}>
                                     {/* (Tasarım aynı kalıyor, sadece form kodunu kopyaladım) */}
                                    <div className="sticky left-0 z-10 bg-white relative border-r border-gray-200 h-10">
                                        <div className="absolute top-0 left-0 bottom-0 w-1" style={{ backgroundColor: group.color }}></div>
                                        <div className="px-4 h-full flex items-center"><input type="checkbox" className="h-4 w-4 invisible" /></div>
                                    </div>
                                    <div className="sticky z-10 bg-white border-r border-gray-200 h-10" style={{ left: '60px' }}>
                                        <form onSubmit={handleAddItem} className="h-full">
                                            <input type="text" placeholder="+ Yeni görev ekle" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="w-full h-full bg-transparent outline-none px-2 text-sm" />
                                        </form>
                                    </div>
                                    {columns.map(col => <div key={`footer-${col.id}`} className="border-r border-gray-200 h-10"></div>)}
                                    <div className="h-10"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Modal Render'ları (Aynı kalıyor) */}
            {selectedBoardId && (
                <>
                   <Modal isOpen={isColumnModalOpen} onClose={() => setColumnModalOpen(false)} title="Yeni Sütun Ekle"><AddColumnForm boardId={selectedBoardId} onClose={() => setColumnModalOpen(false)} /></Modal>
                   <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Grubu Düzenle"><EditGroupForm boardId={selectedBoardId} group={group} onClose={() => setEditModalOpen(false)} /></Modal>
                   {editingColumn && <Modal isOpen={!!editingColumn} onClose={() => setEditingColumn(null)} title="Sütunu Düzenle"><EditColumnForm boardId={selectedBoardId} column={editingColumn} onClose={() => setEditingColumn(null)} /></Modal>}
                </>
            )}
        </>
    );
};

export default GroupSection;