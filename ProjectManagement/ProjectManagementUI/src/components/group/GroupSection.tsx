// src/components/group/GroupSection.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { type Group, type Column, ColumnType, type ItemTree } from '../../types';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { createItem, fetchItemTree, deleteItem } from '../../store/features/itemSlice';
import { deleteGroup } from '../../store/features/groupSlice';
import { deleteColumn } from '../../store/features/columnSlice';
import { INDENT_STEP } from '../board/BoardView'; 
import {
    useSortable, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import ItemRow from '../item/ItemRow';
import Modal from '../common/Modal';
import AddColumnForm from '../column/AddColumnForm';
import EditGroupForm from './EditGroupForm';
import EditColumnForm from '../column/EditColumnForm';
import {
    FiPlus, FiEdit, FiTrash2,
    FiChevronRight, FiChevronDown, FiGrid
} from 'react-icons/fi';
import { selectShowOnlyCompleted } from '../../store/features/boardViewSlice';

// ... (DropLineIndicator ve SortableColumnHeader aynı kalıyor) ...
const DropLineIndicator = ({ depth, isActive }: { depth: number, isActive: boolean }) => {
    if (!isActive) return null;
    const leftOffset = 60 + (depth * INDENT_STEP);
    return (
        <div 
            className="absolute h-[2px] bg-blue-500 z-50 pointer-events-none transition-all duration-150 ease-out"
            style={{ left: `${leftOffset}px`, right: 0, top: '-1px' }}
        >
            <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-blue-500 rounded-full shadow-sm border border-white" />
        </div>
    );
};

const SortableColumnHeader = ({ column, groupId, openEdit, deleteCol }: any) => {
    // ... (Aynı kod) ...
    const uniqueId = `group-${groupId}-column-${column.id}`;
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: uniqueId, data: { type: 'COLUMN', column, groupId }
    });
    return (
        <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1, width: '150px', zIndex: isDragging ? 999 : 'auto' }} {...attributes} {...listeners} className="group relative flex items-center justify-center text-center px-2 py-2 border-r border-gray-200 h-10 cursor-grab bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider">
            <span className="truncate px-2" title={column.title}>{column.title}</span>
            <div className="absolute top-1 right-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-0.5 bg-gray-100 rounded shadow-sm">
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
    dragOverItemId: number | null;
    projectedDepth: number;
}

const GroupSection: React.FC<GroupSectionProps> = ({
    group, isCollapsed, onToggleCollapse, isOverlay,
    dragOverItemId, projectedDepth
}) => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector(s => s.boards);
    const columns = useAppSelector(s => s.columns.items);
    const showOnlyCompleted = useAppSelector(selectShowOnlyCompleted);
    const rawItemTree = useAppSelector(s => s.items.itemTreeByGroup[group.id]);
    const itemTree: ItemTree[] = rawItemTree ?? [];

    // --- YENİ STATE: Alt görevleri kapalı olan itemların ID'leri ---
    const [collapsedItemIds, setCollapsedItemIds] = useState<Set<number>>(new Set());

    const toggleItemCollapse = (itemId: number) => {
        setCollapsedItemIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) newSet.delete(itemId);
            else newSet.add(itemId);
            return newSet;
        });
    };

    const statusColumn = useMemo(() => columns.find(c => c.type === ColumnType.Status) || null, [columns]);
    const filteredItemTree: ItemTree[] = useMemo(() => {
        if (!showOnlyCompleted || !statusColumn) return itemTree;
        const isDone = (node: ItemTree) => {
            const val = node.itemValues?.find(v => v.columnId === statusColumn.id)?.value;
            // Buradaki kontrol AutomationLogic ile uyumlu olmalı
            const s = val?.toLowerCase() || '';
            return s === 'tamamlandı' || s === 'done' || s === 'bitti';
        };
        const filterNodes = (nodes: ItemTree[]): ItemTree[] => {
            return nodes.reduce<ItemTree[]>((acc, node) => {
                const children = node.children ? filterNodes(node.children) : [];
                // Kendisi tamamlanmışsa VEYA altlarında gösterilecek bir şey varsa ekle
                if (isDone(node) || children.length > 0) acc.push({ ...node, children });
                return acc;
            }, []);
        };
        return filterNodes(itemTree);
    }, [itemTree, showOnlyCompleted, statusColumn]);

    // Toplam görünür öğe sayısı (Kapalı olanların çocuklarını saymamalıyız)
    const totalVisibleItems = useMemo(() => {
        const countNodes = (nodes: ItemTree[]): number => {
            return nodes.reduce((acc, n) => {
                // Eğer bu item kapalıysa, çocuklarını sayma
                const childrenCount = (n.children && !collapsedItemIds.has(n.id)) 
                    ? countNodes(n.children) 
                    : 0;
                return acc + 1 + childrenCount;
            }, 0);
        };
        return countNodes(filteredItemTree);
    }, [filteredItemTree, collapsedItemIds]);

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `group-${group.id}`, data: { type: 'GROUP', group }
    });
    const { setNodeRef: setDropRef } = useDroppable({
        id: `group-container-${group.id}`, data: { type: 'CONTAINER', groupId: group.id }
    });

    const groupStyle = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 999 : 'auto'
    };

    const [newItemName, setNewItemName] = useState('');
    const [isColumnModalOpen, setColumnModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [editingColumn, setEditingColumn] = useState<Column | null>(null);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim() || !selectedBoardId) return;
        dispatch(createItem({ boardId: selectedBoardId, groupId: group.id, itemData: { name: newItemName.trim() } }));
        setNewItemName('');
    };

    useEffect(() => {
        if (selectedBoardId) dispatch(fetchItemTree({ boardId: selectedBoardId, groupId: group.id }));
    }, [selectedBoardId, group.id, dispatch]);

    const gridTemplateColumns = useMemo(() =>
        `60px minmax(350px, 1fr) ${columns.map(() => '150px').join(' ')} 60px`, 
    [columns]);

    const columnIds = useMemo(() => columns.map(c => `group-${group.id}-column-${c.id}`), [columns, group.id]);
    
    // SortableContext için ID listesini hazırlarken, kapalı item'ların çocuklarını DAHİL ETMEMELİYİZ
    // Yoksa dnd-kit görünmeyen elemanları sıralamaya çalışır ve hata verebilir.
    const allItemIds = useMemo(() => {
        const ids: string[] = [];
        const walk = (nodes: ItemTree[]) => {
            nodes.forEach(node => { 
                ids.push(`item-${node.id}`); 
                // Sadece açık olanların çocuklarını gez
                if (node.children && !collapsedItemIds.has(node.id)) {
                    walk(node.children);
                }
            });
        };
        walk(filteredItemTree);
        return ids;
    }, [filteredItemTree, collapsedItemIds]);

    // --- RENDER TREE (Recursive) ---
    const renderTree = (nodes: ItemTree[], depth = 0): React.ReactNode[] =>
        nodes.flatMap(node => {
            const rowKey = `item-${node.id}`;
            const children = node.children ?? [];
            const hasChildren = children.length > 0;
            const isItemCollapsed = collapsedItemIds.has(node.id);

            const out: React.ReactNode[] = [];
            const isTarget = dragOverItemId === node.id;
            const isDraggingThis = dragOverItemId === node.id;
            
            // Satırı Render Et
            out.push(
                <div key={rowKey} className={isDraggingThis ? "opacity-30 grayscale transition-all" : "transition-all relative"}>
                    {isTarget && (
                        <DropLineIndicator depth={projectedDepth} isActive={true} />
                    )}
                    
                    {/* ItemRow'a gerekli prop'ları geçiyoruz */}
                    <div className="relative">
                        {/* Aç/Kapa Butonu (ItemRow'un soluna, ismin yanına denk gelecek şekilde ItemRow içinde de yönetilebilir ama burada absolute ile koymak daha kolay olabilir) */}
                        {/* Not: En temiz yöntem ItemRow'un içinde bu propu karşılamaktır. */}
                        
                        <ItemRow
                            item={node} 
                            color={group.color} 
                            columns={columns} 
                            depth={depth}
                            boardId={selectedBoardId || 0} 
                            gridTemplateColumns={gridTemplateColumns}
                            // YENİ PROPLAR (ItemRow'a eklenmesi gerekir)
                            hasChildren={hasChildren}
                            isCollapsed={isItemCollapsed}
                            onToggleCollapse={() => toggleItemCollapse(node.id)}
                        />
                    </div>
                </div>
            );

            // Eğer alt görevler varsa ve kapalı DEĞİLSE, onları da render et
            if (hasChildren && !isItemCollapsed) {
                out.push(...renderTree(children, depth + 1));
            }
            
            return out;
        });

    return (
        <>
            <section ref={setNodeRef} style={groupStyle} className={`mb-6 ${isOverlay ? 'bg-white shadow-2xl rounded-lg border-2 border-blue-400 p-2' : ''}`}>
                <div className="group flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-x-2 flex-grow min-w-0">
                        <div {...attributes} {...listeners} className="cursor-grab text-gray-300 hover:text-gray-600"><FiGrid size={16} /></div>
                        <button onClick={onToggleCollapse} className="p-1 text-gray-400 hover:text-gray-700">
                            {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                        </button>
                        <h3 className="text-base font-semibold truncate cursor-pointer" style={{ color: group.color }} onClick={onToggleCollapse}>{group.title}</h3>
                        <span className="text-xs font-medium text-gray-400">({totalVisibleItems} Görev)</span>
                    </div>
                    {/* ... (Grup Düzenle/Sil Butonları Aynı) ... */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                        <button onClick={() => setEditModalOpen(true)} className="p-1.5 text-gray-500 hover:text-blue-600"><FiEdit size={14} /></button>
                        <button onClick={() => { if (selectedBoardId && window.confirm(`"${group.title}" silinsin mi?`)) dispatch(deleteGroup({ boardId: selectedBoardId, groupId: group.id })); }} className="p-1.5 text-gray-500 hover:text-red-600"><FiTrash2 size={14} /></button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="bg-white rounded-lg border border-gray-100 overflow-x-auto shadow-sm">
                        {/* ... (Header Aynı) ... */}
                        <div className="grid border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider items-center" style={{ gridTemplateColumns }}>
                            <div className="sticky left-0 z-20 bg-gray-50 px-4 py-2 border-r border-gray-200 h-10" />
                            <div className="sticky z-20 bg-gray-50 px-2 py-2 border-r border-gray-200 h-10 truncate" style={{ left: '60px' }}>Görev Adı</div>
                            <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
                                {columns.map(col => (
                                    <SortableColumnHeader key={col.id} column={col} groupId={group.id} openEdit={(e: any, c: Column) => setEditingColumn(c)} deleteCol={(e: any, id: number, title: string) => { if (selectedBoardId && window.confirm(`"${title}" silinsin mi?`)) dispatch(deleteColumn({ boardId: selectedBoardId, columnId: id })); }} />
                                ))}
                            </SortableContext>
                            <div className="sticky right-0 z-20 bg-gray-50 border-l border-gray-200 flex justify-center items-center h-10">
                                <button onClick={() => setColumnModalOpen(true)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500"><FiPlus size={16} /></button>
                            </div>
                        </div>

                        {/* --- BODY --- */}
                        <div className="bg-white min-h-[50px]" ref={setDropRef}>
                            {filteredItemTree.length === 0 && showOnlyCompleted ? (
                                <div className="p-4 text-center text-sm text-gray-400 italic">Bu grupta tamamlanan görev yok.</div>
                            ) : (
                                <SortableContext id={`group-${group.id}-items`} items={allItemIds} strategy={verticalListSortingStrategy}>
                                    {renderTree(filteredItemTree)}
                                </SortableContext>
                            )}
                        </div>

                        {/* ... (Footer Aynı) ... */}
                        <form onSubmit={handleAddItem} className="grid items-center hover:bg-gray-50 transition-colors" style={{ gridTemplateColumns }}>
                            <div className="sticky left-0 z-10 bg-inherit border-t border-r border-gray-200 h-10 flex items-center px-4">
                                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: group.color }} />
                            </div>
                            <div className="sticky z-10 bg-inherit border-t border-r border-gray-200 h-10 relative flex items-center" style={{ left: '60px' }}>
                                <input type="text" placeholder="Yeni görev ekle" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full h-full bg-transparent outline-none pl-2 pr-8 text-sm truncate" />
                                <button type="submit" className="absolute right-2 w-5 h-5 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold" title="Ekle">+</button>
                            </div>
                            {columns.map(col => <div key={col.id} className="border-t border-r border-gray-200 h-10 bg-inherit" />)}
                            <div className="sticky right-0 z-10 bg-white border-t h-10" />
                        </form>
                    </div>
                )}
            </section>
            
            {/* ... (Modallar Aynı) ... */}
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