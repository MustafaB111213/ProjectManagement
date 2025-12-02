// src/components/group/GroupSection.tsx

import React, { useMemo, useState } from 'react';
import { type Group, type Column, ColumnType } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createItem, makeSelectItemsByGroup } from '../../store/features/itemSlice';
import { deleteGroup } from '../../store/features/groupSlice';
import { deleteColumn } from '../../store/features/columnSlice';

// dnd-kit
import { useSortable, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core'; // Droppable importu

// Componentler
import ItemRow from '../item/ItemRow';
import Modal from '../common/Modal';
import AddColumnForm from '../column/AddColumnForm';
import EditGroupForm from './EditGroupForm';
import EditColumnForm from '../column/EditColumnForm';
import { FiPlus, FiEdit, FiTrash2, FiChevronRight, FiChevronDown, FiGrid } from 'react-icons/fi';
import { selectShowOnlyCompleted } from '../../store/features/boardViewSlice';

// 1. SortableColumnHeader (Değişiklik yok)
const SortableColumnHeader = ({ column, groupId, openEdit, deleteCol }: { column: Column, groupId: number, openEdit: any, deleteCol: any }) => {
    const uniqueId = `group-${groupId}-column-${column.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: uniqueId,
        data: {
            type: 'COLUMN',
            column,
            groupId
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        width: '150px',
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


interface GroupSectionProps {
    group: Group;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isOverlay?: boolean;
}

const GroupSection: React.FC<GroupSectionProps> = ({ group, isCollapsed, onToggleCollapse, isOverlay }) => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    // Filtre durumunu çek
    const showOnlyCompleted = useAppSelector(selectShowOnlyCompleted);
    
    // --- DND-KIT: Grup Sürükleme (Sortable) ---
    const {
        attributes,
        listeners,
        setNodeRef, // Sortable Ref
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
    
    // --- DND-KIT: Grup İçine Bırakma (Droppable) ---
    // Bu, item'ları boş bir gruba veya listenin altına sürüklemek için gereklidir.
    const { setNodeRef: setDroppableNodeRef } = useDroppable({
        id: `group-container-${group.id}`,
        data: { type: 'CONTAINER', groupId: group.id }
    });

    const [newItemName, setNewItemName] = useState('');
    const [isColumnModalOpen, setColumnModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);

    // Selector
    const selectItemsForGroup = useMemo(makeSelectItemsByGroup, []);
    
    // DÜZELTME 1: Değişken adını 'allItems' yaptık (Filtre mantığı ile uyumlu olması için)
    const allItems = useAppSelector(state => selectItemsForGroup(state, group.id));
    
    const columns = useAppSelector((state) => state.columns.items);

    // DÜZELTME 2: 'displayedItems' hesaplamasını 'itemIds'den ÖNCEYE aldık.
    // --- FİLTRELEME MANTIĞI ---
    const displayedItems = useMemo(() => {
        // Eğer filtre kapalıysa hepsini göster
        if (!showOnlyCompleted) return allItems;

        // Statü kolonunu bul
        const statusColumn = columns.find(c => c.type === ColumnType.Status);
        
        // Eğer statü kolonu yoksa filtreleme yapamaz, hepsini döndür
        if (!statusColumn) return allItems;

        // Sadece "Tamamlandı" olanları filtrele
        return allItems.filter(item => {
            const statusVal = item.itemValues.find(v => v.columnId === statusColumn.id)?.value;
            return statusVal === 'Tamamlandı' || statusVal === 'Done'; 
        });
    }, [allItems, showOnlyCompleted, columns]);

    // DND-KIT için ID listeleri (Artık displayedItems tanımlı olduğu için hata vermez)
    const itemIds = useMemo(() => displayedItems.map(i => `item-${i.id}`), [displayedItems]);
    
    const columnIds = useMemo(() =>
        columns.map(c => `group-${group.id}-column-${c.id}`),
        [columns, group.id]);

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
        e.stopPropagation();
        if (window.confirm(`"${group.title}" grubunu silmek istediğinizden emin misiniz?`)) {
            if (selectedBoardId) dispatch(deleteGroup({ boardId: selectedBoardId, groupId: group.id }));
        }
    };

    const handleDeleteColumn = (e: React.MouseEvent, columnId: number, columnName: string) => {
        e.preventDefault();
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
                ref={setNodeRef} // Sortable Ref'i (Grup sıralaması için)
                style={groupStyle}
                className={`mb-6 ${isOverlay ? 'bg-white shadow-2xl rounded-lg border-2 border-blue-400 p-2' : ''}`}
            >
                {/* Grup Başlığı */}
                <div className="group flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-x-2 flex-grow min-w-0">
                        {/* GRUP SÜRÜKLEME TUTAMACI */}
                        <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-600">
                            <FiGrid size={16} />
                        </div>

                        <button onClick={onToggleCollapse} onMouseDown={e => e.stopPropagation()} className="p-1 text-gray-400 hover:text-gray-700">
                            {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                        </button>

                        <h3 className="text-base font-semibold truncate cursor-pointer" style={{ color: group.color }} onClick={onToggleCollapse}>
                            {group.title}
                        </h3>
                        <span className="text-xs font-medium text-gray-400">({itemIds.length} Görev)</span>
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
                                    <div className="sticky left-0 z-20 bg-gray-50 px-4 py-2 border-r border-gray-200 h-10 flex items-center"></div>
                                    <div className="sticky z-20 bg-gray-50 px-2 py-2 border-r border-gray-200 h-10 flex items-center" style={{ left: '60px' }}>Görev Adı</div>

                                    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                                        {columns.map((col) => (
                                            <SortableColumnHeader
                                                key={col.id}
                                                column={col}
                                                groupId={group.id}
                                                openEdit={openEditColumnModal}
                                                deleteCol={handleDeleteColumn}
                                            />
                                        ))}
                                    </SortableContext>

                                    <div className="flex justify-center items-center h-10">
                                        <button onClick={() => setColumnModalOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200">
                                            <FiPlus size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* --- ITEM LİSTESİ --- */}
                                {/* DÜZELTME 3: Droppable Ref'i buraya veriyoruz. Item'lar buraya bırakılacak. */}
                                <div className="bg-white" ref={setDroppableNodeRef}>
                                    <SortableContext id={`group-${group.id}-items`} items={itemIds} strategy={verticalListSortingStrategy}>
                                        {displayedItems.length > 0 ? (
                                            displayedItems.map((item) => (
                                                <ItemRow
                                                    key={item.id}
                                                    item={item}
                                                    color={group.color}
                                                    columns={columns}
                                                    gridTemplateColumns={gridTemplateColumns}
                                                    boardId={selectedBoardId || 0}
                                                />
                                            ))
                                        ) : (
                                            // Liste boşsa veya filtrelenmişse bilgilendirme
                                            <div className="p-4 text-center text-sm text-gray-400 italic">
                                                {showOnlyCompleted 
                                                    ? "Bu grupta tamamlanan görev yok." 
                                                    : "Henüz görev eklenmemiş. Sürükleyip bırakabilirsiniz."}
                                            </div>
                                        )}
                                    </SortableContext>
                                </div>

                                {/* Yeni Görev Ekleme */}
                                <div
                                    className="grid items-center border-t border-gray-200"
                                    style={{ gridTemplateColumns }}
                                >
                                    {/* Sol renk + checkbox */}
                                    <div className="sticky left-0 z-10 bg-white relative border-r border-gray-200 h-10">
                                        <div
                                            className="absolute top-0 left-0 bottom-0 w-1"
                                            style={{ backgroundColor: group.color }}
                                        ></div>
                                        <div className="px-4 h-full flex items-center">
                                            <input type="checkbox" className="h-4 w-4 invisible" />
                                        </div>
                                    </div>

                                    {/* Yeni görev ekle input + + butonu */}
                                    <div
                                        className="sticky z-10 bg-white border-r border-gray-200 h-10"
                                        style={{ left: '60px' }}
                                    >
                                        <form onSubmit={handleAddItem} className="relative h-full">
                                            <input
                                                type="text"
                                                placeholder="Yeni görev ekle"
                                                value={newItemName}
                                                onChange={(e) => setNewItemName(e.target.value)}
                                                className="w-full h-full bg-transparent outline-none pl-2 pr-8 text-sm"
                                            />
                                            <button
                                                type="submit"
                                                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 transition"
                                                title="Görev Ekle"
                                            >
                                                <span className="text-lg leading-none text-gray-500">+</span>
                                            </button>
                                        </form>
                                    </div>

                                    {/* Diğer kolonlar için boş hücreler */}
                                    {columns.map(col => (
                                        <div key={`footer-${col.id}`} className="border-r border-gray-200 h-10"></div>
                                    ))}
                                    <div className="h-10"></div>
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* Modal Render'ları */}
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