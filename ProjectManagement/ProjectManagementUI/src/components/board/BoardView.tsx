import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    fetchViewsForBoard, createBoardView, setActiveViewId, selectBoardViews,
    selectActiveViewId, selectActiveView, clearBoardViews, selectBoardViewStatus,
    deleteBoardView, updateBoardView
} from '../../store/features/boardViewSlice';
import {
    fetchGroupsForBoard, reorderGroupsLocally, updateGroupOrder, selectAllGroups, createGroup
} from '../../store/features/groupSlice';
import {
    fetchColumnsForBoard, reorderColumnsLocally, updateColumnOrder, selectAllColumns
} from '../../store/features/columnSlice';
import {
    fetchItemsForBoard, fetchItemTree, moveItem, reorderItemsLocally as reorderItems, selectAllItemsFlat, type MoveItemArgs
} from '../../store/features/itemSlice';

// --- DND-KIT Imports ---
import {
    DndContext,
    closestCenter,
    pointerWithin, 
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
    type DropAnimation,
    type CollisionDetection
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';

// Componentler
import BoardHeader from './BoardHeader';
import GroupSection from '../group/GroupSection';
import BoardActionbar from './BoardActionbar';
import BoardViewTabs from './BoardViewTabs';
import GanttView from './GanttView';
import ItemRow from '../item/ItemRow';

import { getRandomColor } from '../../utils/colors';
import { FiPlus } from 'react-icons/fi';
import { DEFAULT_ZOOM_INDEX } from '../common/constants';
import type { Item } from '../../types';

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: { active: { opacity: '0.5' } },
    }),
};

// AYAR: Her 40px sağa çekiş 1 seviye derinlik demektir.
export const INDENT_STEP = 40; 

const BoardView: React.FC = () => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    // Selectors
    const boardViews = useAppSelector(selectBoardViews);
    const activeViewId = useAppSelector(selectActiveViewId);
    const activeView = useAppSelector(selectActiveView);
    const viewsStatus = useAppSelector(selectBoardViewStatus);
    const groups = useAppSelector(selectAllGroups);
    const columns = useAppSelector(selectAllColumns);
    const allItems = useAppSelector(selectAllItemsFlat);

    // State
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
    const [ganttZoomIndex, setGanttZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);

    // --- DND STATE ---
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeDragType, setActiveDragType] = useState<'GROUP' | 'ITEM' | 'COLUMN' | null>(null);
    const [activeDragData, setActiveDragData] = useState<any>(null);

    // Drag Projection State
    const [dragOverItemId, setDragOverItemId] = useState<number | null>(null);
    const [projectedDepth, setProjectedDepth] = useState(0);

    const isDraggingGroup = activeDragType === 'GROUP';

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        if (selectedBoardId) {
            dispatch(fetchViewsForBoard(selectedBoardId));
            dispatch(fetchGroupsForBoard(selectedBoardId));
            dispatch(fetchColumnsForBoard(selectedBoardId));
            dispatch(fetchItemsForBoard(selectedBoardId));
        } else {
            dispatch(clearBoardViews());
        }
    }, [selectedBoardId, dispatch]);

    // --- HANDLERS ---
    const handleCreateView = (type: 'table' | 'gantt' | 'calendar') => {
        if (!selectedBoardId) return;
        let defaultName = type === 'table' ? 'Tablo Görünümü' : type === 'gantt' ? 'Gantt Görünümü' : 'Takvim';
        dispatch(createBoardView({
            boardId: selectedBoardId,
            payload: { name: defaultName, type: type }
        }));
    };

    const handleCreateGroupAtBottom = () => {
        if (selectedBoardId) {
            dispatch(createGroup({ boardId: selectedBoardId, groupData: { title: 'Yeni Grup', color: getRandomColor() }, position: 'bottom' }));
        }
    };

    const handleToggleGroup = (groupId: number) => {
        setCollapsedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) newSet.delete(groupId);
            else newSet.add(groupId);
            return newSet;
        });
    };

    // Custom Collision Detection
    const customCollisionDetection: CollisionDetection = (args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length === 0) {
            return closestCenter(args);
        }
        return pointerCollisions;
    };

    // --- DRAG HANDLERS ---

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveDragType(active.data.current?.type);
        setActiveDragData(active.data.current);
        setDragOverItemId(null);
        setProjectedDepth(0);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        
        if (!over || active.data.current?.type !== 'ITEM') {
            setDragOverItemId(null);
            setProjectedDepth(0);
            return;
        }

        // Eğer bir ITEM'ın üzerine gelindiyse
        if (over.data.current?.type === 'ITEM') {
            const overId = Number(over.id.toString().replace('item-', ''));
            const activeIdNum = Number(active.id.toString().replace('item-', ''));

            if (overId === activeIdNum) return; 

            setDragOverItemId(overId);

            // PROJEKSİYON HESABI (Derinlik)
            const initialLeft = active.rect.current.initial?.left ?? 0;
            const currentLeft = active.rect.current.translated?.left ?? 0;
            const deltaX = currentLeft - initialLeft;

            // Eşik değeri aşan her INDENT_STEP için derinlik artar
            const steps = Math.floor(deltaX / INDENT_STEP);
            const clampedSteps = Math.max(0, steps); 
            
            setProjectedDepth(clampedSteps);
        } else {
            setDragOverItemId(null);
            setProjectedDepth(0);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        
        setActiveId(null);
        setActiveDragType(null);
        setActiveDragData(null);
        setDragOverItemId(null);
        setProjectedDepth(0);

        if (!over || !selectedBoardId) return;

        // 1. GROUP REORDER
        if (active.data.current?.type === 'GROUP') {
            if (active.id !== over.id) {
                const oldIndex = groups.findIndex(g => `group-${g.id}` === active.id);
                const newIndex = groups.findIndex(g => `group-${g.id}` === over.id);
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newGroups = arrayMove(groups, oldIndex, newIndex);
                    dispatch(reorderGroupsLocally({ orderedGroups: newGroups }));
                    const orderedGroupIds = newGroups.map(g => g.id);
                    dispatch(updateGroupOrder({ boardId: selectedBoardId, orderedGroupIds }));
                }
            }
            return;
        }

        // 2. COLUMN REORDER
        if (active.data.current?.type === 'COLUMN' && over.data.current?.type === 'COLUMN') {
            const activeColumnId = active.data.current.column.id;
            const overColumnId = over.data.current.column.id;
            if (activeColumnId !== overColumnId) {
                const oldIndex = columns.findIndex(c => c.id === activeColumnId);
                const newIndex = columns.findIndex(c => c.id === overColumnId);
                if (oldIndex !== -1 && newIndex !== -1) {
                    const newColumns = arrayMove(columns, oldIndex, newIndex);
                    dispatch(reorderColumnsLocally({ orderedColumns: newColumns }));
                    const orderedColumnIds = newColumns.map(c => c.id);
                    dispatch(updateColumnOrder({ boardId: selectedBoardId, orderedColumnIds }));
                }
            }
            return;
        }

        // 3. ITEM REORDER & HIERARCHY
        if (active.data.current?.type === 'ITEM') {
            const draggedItem = active.data.current.item as Item;
            const sourceGroupId = active.data.current.groupId as number;

            // Container'a bırakıldı (Grup sonu)
            if (over.data.current?.type === 'CONTAINER') {
                const destGroupId = over.data.current.groupId as number;
                const destItems = allItems.filter(i => i.groupId === destGroupId);
                handleMoveItemLogic(draggedItem, sourceGroupId, destGroupId, destItems.length, null);
                return;
            }

            // Item üzerine bırakıldı
            if (over.data.current?.type === 'ITEM') {
                const targetItem = over.data.current.item as Item;
                const destGroupId = over.data.current.groupId as number;

                const destItems = allItems
                    .filter(i => i.groupId === destGroupId)
                    .sort((a, b) => a.order - b.order);

                const overIndex = destItems.findIndex(i => i.id === targetItem.id);
                if (overIndex === -1) return;

                // Index Kararı (Üstüne mi altına mı?)
                // Dnd-kit'in SortableContext'i, bırakılan öğenin nerede olduğu bilgisini over.rect ile verir.
                const isBelowOverItem = over.rect.top + over.rect.height / 2 < active.rect.current.translated!.top;
                let newIndex = isBelowOverItem ? overIndex + 1 : overIndex;
                
                // Hiyerarşi Kararı (Girinti)
                const initialLeft = active.rect.current.initial?.left ?? 0;
                const currentLeft = active.rect.current.translated?.left ?? 0;
                const deltaX = currentLeft - initialLeft;
                const isIndent = deltaX > INDENT_STEP; // Eşik değeri geçti mi?

                let finalParentId: number | null | undefined;

                if (isIndent) {
                    // Sağa çekildi -> Target'ın çocuğu
                    finalParentId = targetItem.id;
                    // Çocuk olarak eklenecekse, hedef index, target'ın hemen altı (bu, çocuk olarak ekleneceği için listenin sonu gibi davranır)
                    // newIndex değeri sıralamayı temsil ettiği için, dnd-kit'in hesapladığı newIndex'i kullanmak en doğrusudur.
                } else {
                    // Düz taşındı -> Target'ın kardeşi (aynı parent)
                    finalParentId = targetItem.parentItemId ?? null;
                }

                if (finalParentId === draggedItem.id) return; // Kendi çocuğu olamaz

                handleMoveItemLogic(draggedItem, sourceGroupId, destGroupId, newIndex, finalParentId);
            }
        }
    };

    const handleMoveItemLogic = (
        draggedItem: Item, 
        sourceGroupId: number, 
        destGroupId: number, 
        destinationIndex: number, 
        parentItemId: number | null | undefined
    ) => {
        const moveArgs: MoveItemArgs = {
            boardId: selectedBoardId!,
            itemId: draggedItem.id,
            sourceGroupId,
            destinationGroupId: destGroupId,
            sourceIndex: 0, // Dışarıdan gelen bu index artık kullanılmıyor
            destinationIndex,
            parentItemId
        };

        // 1. Optimistic Update (Hemen arayüzde göster)
        dispatch(reorderItems(moveArgs)); 

        // 2. API Call
        dispatch(moveItem(moveArgs))
            .unwrap()
            .then(() => {
                // Başarılı olursa ağacı yenile
                dispatch(fetchItemTree({ boardId: selectedBoardId!, groupId: sourceGroupId }));
                if (sourceGroupId !== destGroupId) {
                    dispatch(fetchItemTree({ boardId: selectedBoardId!, groupId: destGroupId }));
                }
            })
            .catch((err) => {
                console.error("Move Failed:", err);
                // Hata olursa her şeyi geri yükle
                dispatch(fetchItemsForBoard(selectedBoardId!));
            });
    };

    // 🔴 DÜZELTME: Güvenli Tip Kontrolü
    const isGanttView = activeView?.type?.toUpperCase() === 'GANTT';

    return (
        <div className={`flex flex-col ${isGanttView ? 'h-full' : ''}`}>
            <div className="sticky top-0 z-30 bg-white">
                <div className="px-6 pt-5 pb-2"><BoardHeader /></div>
                <div className="px-6">
                    <BoardViewTabs
                        views={boardViews.map(v => ({ id: v.id, name: v.name, type: v.type.toLowerCase() as any }))}
                        activeViewId={activeViewId}
                        onViewChange={(id) => dispatch(setActiveViewId(id as number))}
                        onAddViewTypeSelected={handleCreateView}
                        onDeleteView={(id) => dispatch(deleteBoardView({ boardId: selectedBoardId!, viewId: id }))}
                        onRenameView={(id, name) => dispatch(updateBoardView({ boardId: selectedBoardId!, viewId: id, payload: { name } }))}
                    />
                </div>
                {/* Sadece TABLE görünümünde Actionbar göster (GANTT değilse) */}
                {!isGanttView && (
                    <>
                        <div className="h-px bg-gray-200 mx-6"></div>
                        <div className="px-6 py-3"><BoardActionbar /></div>
                    </>
                )}
            </div>

            {viewsStatus === 'succeeded' && (
                <div className={isGanttView ? 'flex-1 overflow-hidden' : 'bg-white p-4 min-h-[calc(100vh-200px)]'}>
                    {isGanttView ? (
                        <GanttView
                            boardId={selectedBoardId || 0}
                            viewId={activeView!.id}
                            settingsJson={activeView!.settingsJson}
                            zoomIndex={ganttZoomIndex}
                            onZoomIndexChange={setGanttZoomIndex}
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={customCollisionDetection} 
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={groups.map(g => `group-${g.id}`)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-6">
                                    {groups.map((group) => (
                                        <GroupSection
                                            key={group.id}
                                            group={group}
                                            isCollapsed={activeDragType === 'GROUP' ? true : collapsedGroupIds.has(group.id)}
                                            onToggleCollapse={() => handleToggleGroup(group.id)}
                                            
                                            // DND Props
                                            dragOverItemId={dragOverItemId}
                                            projectedDepth={dragOverItemId && activeDragType === 'ITEM' ? projectedDepth : 0}
                                        />
                                    ))}
                                </div>
                            </SortableContext>

                            <button onClick={handleCreateGroupAtBottom} className="mt-8 ml-1 flex items-center gap-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-300 rounded-md transition-colors shadow-sm">
                                <FiPlus /> Yeni Grup Ekle
                            </button>

                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeId ? (
                                    activeDragType === 'GROUP' ? (
                                        <div className="opacity-90 rotate-2 cursor-grabbing">
                                            <GroupSection group={activeDragData.group} isCollapsed={true} onToggleCollapse={() => { }} isOverlay={true} dragOverItemId={null} projectedDepth={0} />
                                        </div>
                                    ) : activeDragType === 'ITEM' ? (
                                        <div className="opacity-95 cursor-grabbing bg-white shadow-2xl rounded-md border border-blue-500 overflow-hidden">
                                            <ItemRow
                                                item={activeDragData.item}
                                                color="#ccc"
                                                columns={columns}
                                                gridTemplateColumns={`60px minmax(200px, 1fr) ${columns.map(() => '150px').join(' ')} 60px`}
                                                boardId={selectedBoardId || 0}
                                                isOverlay={true}
                                            />
                                        </div>
                                    ) : activeDragType === 'COLUMN' ? (
                                        <div className="bg-gray-800 text-white p-2 rounded shadow-xl text-xs uppercase font-bold w-[150px] h-10 flex items-center justify-center">
                                            {activeDragData.column.title}
                                        </div>
                                    ) : null
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            )}
        </div>
    );
};

export default BoardView;