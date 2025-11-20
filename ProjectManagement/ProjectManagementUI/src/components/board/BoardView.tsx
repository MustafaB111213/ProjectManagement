// src/components/board/BoardView.tsx

import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
    fetchViewsForBoard,
    createBoardView,
    setActiveViewId,
    selectBoardViews,
    selectActiveViewId,
    selectActiveView,
    clearBoardViews,
    selectBoardViewStatus,
    selectBoardViewError,
    deleteBoardView,
    updateBoardView
} from '../../store/features/boardViewSlice';
import {
    fetchGroupsForBoard,
    reorderGroupsLocally,
    updateGroupOrder,
    selectAllGroups,
    createGroup
} from '../../store/features/groupSlice';
import {
    fetchColumnsForBoard,
    reorderColumnsLocally,
    updateColumnOrder,
    selectAllColumns
} from '../../store/features/columnSlice';
import {
    fetchItemsForBoard,
    moveItem,
    reorderItems,
    selectAllItemsFlat, // <--- 1. DÜZELTME: Selector import edildi
    type MoveItemArgs
} from '../../store/features/itemSlice';

// --- DND-KIT Imports ---
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
    type DropAnimation
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
import ItemRow from '../item/ItemRow'; // Overlay için

import { getRandomColor } from '../../utils/colors';
import { FiPlus } from 'react-icons/fi';
import { DEFAULT_ZOOM_INDEX } from '../common/constants';

// Overlay için drop animasyonu ayarı (daha yumuşak görünmesi için)
const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: { opacity: '0.5' },
        },
    }),
};

const BoardView: React.FC = () => {
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    // Selectors
    const boardViews = useAppSelector(selectBoardViews);
    const activeViewId = useAppSelector(selectActiveViewId);
    const activeView = useAppSelector(selectActiveView);
    const viewsStatus = useAppSelector(selectBoardViewStatus);
    const viewsError = useAppSelector(selectBoardViewError);
    const groups = useAppSelector(selectAllGroups);
    const columns = useAppSelector(selectAllColumns);

    // --- 2. DÜZELTME: Doğru Selector Kullanımı ---
    // Hata 1 ve Hata 2 burada çözülüyor. Artık 'allItems' Item[] tipinde.
    const allItems = useAppSelector(selectAllItemsFlat);

    // State
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
    const [ganttZoomIndex, setGanttZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
    // --- YARDIMCI DEĞİŞKEN ---

    // --- DND STATE ---
    const [activeId, setActiveId] = useState<string | null>(null);
    const [activeDragType, setActiveDragType] = useState<'GROUP' | 'ITEM' | 'COLUMN' | null>(null);
    const [activeDragData, setActiveDragData] = useState<any>(null); // Sürüklenen objenin verisi
    // Şu an aktif olarak bir GRUP mu sürükleniyor?
    const isDraggingGroup = activeDragType === 'GROUP';
    // --- SENSORS ---
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px sürüklemeden drag başlamasın (tıklamaları engellememek için)
            },
        }),
        useSensor(KeyboardSensor)
    );

    // --- DATA FETCHING ---
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

        // Tipine göre varsayılan bir isim belirleyelim
        let defaultName = 'Yeni Görünüm';
        if (type === 'table') defaultName = 'Tablo Görünümü';
        if (type === 'gantt') defaultName = 'Gantt Görünümü';
        if (type === 'calendar') defaultName = 'Takvim';

        // Redux Action'ı tetikle
        dispatch(createBoardView({
            boardId: selectedBoardId,
            payload: {
                name: defaultName,
                type: type // Backend'e 'table' veya 'gantt' stringi gidecek
            }
        }));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setActiveDragType(active.data.current?.type);
        setActiveDragData(active.data.current);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        setActiveDragType(null);
        setActiveDragData(null);

        if (!over || !selectedBoardId) return;

        // 1. GRUP SIRALAMA (Değişiklik yok, aynen kalıyor)
        if (active.data.current?.type === 'GROUP') {
            if (active.id !== over.id) {
                const oldIndex = groups.findIndex(g => `group-${g.id}` === active.id);
                const newIndex = groups.findIndex(g => `group-${g.id}` === over.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newGroups = arrayMove(groups, oldIndex, newIndex);
                    dispatch(reorderGroupsLocally({ orderedGroups: newGroups }));

                    // Backend Sync
                    const orderedGroupIds = newGroups.map(g => g.id);
                    dispatch(updateGroupOrder({ boardId: selectedBoardId, orderedGroupIds }));
                }
            }
        }

        // 2. SÜTUN SIRALAMA
        if (active.data.current?.type === 'COLUMN') {
            // ID string'ine bakmak yerine data objesindeki gerçek column ID'lerine bakıyoruz.
            // GroupSection içinde data: { type: 'COLUMN', column: ... } vermiştik.

            const activeColumnId = active.data.current.column.id;

            // Over (üzerine gelinen) da bir sütun mu kontrol et
            if (over.data.current?.type === 'COLUMN') {
                const overColumnId = over.data.current.column.id;

                if (activeColumnId !== overColumnId) {
                    // Global 'columns' listesindeki indeksleri buluyoruz
                    const oldIndex = columns.findIndex(c => c.id === activeColumnId);
                    const newIndex = columns.findIndex(c => c.id === overColumnId);

                    if (oldIndex !== -1 && newIndex !== -1) {
                        const newColumns = arrayMove(columns, oldIndex, newIndex);

                        // Redux Update (Tüm grupları etkiler)
                        dispatch(reorderColumnsLocally({ orderedColumns: newColumns }));

                        // Backend Update
                        const orderedColumnIds = newColumns.map(c => c.id);
                        dispatch(updateColumnOrder({ boardId: selectedBoardId, orderedColumnIds }));
                    }
                }
            }
        }

        // 3. ITEM SIRALAMA VE TAŞIMA
        if (active.data.current?.type === 'ITEM') {
            const activeItemId = active.data.current.item.id;
            const sourceGroupId = active.data.current.groupId;

            let destinationGroupId = sourceGroupId;

            // Hedefin ne olduğunu belirle (Item mı, Grup mu?)
            if (over.id.toString().startsWith('item-')) {
                const overItem = allItems.find(i => `item-${i.id}` === over.id);
                if (overItem) {
                    destinationGroupId = overItem.groupId;
                }
            } else if (over.id.toString().startsWith('group-')) {
                const groupIdStr = over.id.toString().replace('group-', '');
                destinationGroupId = parseInt(groupIdStr);
            }

            // --- DÜZELTME BAŞLANGICI ---

            // 1. İlgili gruptaki item'ları bul (Sıralama hesaplamak için)
            // allItems listesi Redux'tan geliyor, mevcut sıralamayı temsil ediyor.
            const sourceGroupItems = allItems.filter(i => i.groupId === sourceGroupId);
            const destGroupItems = allItems.filter(i => i.groupId === destinationGroupId);

            // 2. İndeksleri Hesapla
            const sourceIndex = sourceGroupItems.findIndex(i => i.id === activeItemId);

            let destinationIndex = 0;

            if (over.id.toString().startsWith('item-')) {
                // Bir item'ın üzerine bırakıldıysa, o item'ın indeksini al
                const overItemId = parseInt(over.id.toString().replace('item-', ''));
                destinationIndex = destGroupItems.findIndex(i => i.id === overItemId);

                // Eğer aynı grupta aşağı doğru sürüklüyorsak ve indeks kayması gerekiyorsa
                // (dnd-kit arrayMove mantığı bazen +1/-1 ayarı gerektirmez, genellikle findIndex yeterlidir)
            } else {
                // Gruba (boş alana) bırakıldıysa sona ekle
                destinationIndex = destGroupItems.length;
            }

            // Eğer indeks bulunamadıysa işlem yapma (Hata önleyici)
            if (sourceIndex === -1) return;

            // Değişiklik var mı kontrol et
            if (active.id !== over.id || sourceGroupId !== destinationGroupId) {

                const moveArgs: MoveItemArgs = {
                    boardId: selectedBoardId,
                    itemId: activeItemId,
                    sourceGroupId,
                    destinationGroupId,
                    sourceIndex: sourceIndex,         // <-- ARTIK DOĞRU DEĞER
                    destinationIndex: destinationIndex // <-- ARTIK DOĞRU DEĞER
                };

                // 1. Redux State'ini Anında Güncelle (Optimistic UI)
                // Bu sayede item "snap" olmadan yeni yerinde kalır.
                dispatch(reorderItems(moveArgs));

                // 2. Backend'e İstek Gönder
                dispatch(moveItem(moveArgs)).catch((error) => {
                    console.error("Taşıma hatası:", error);
                    // Hata olursa eski haline getirmek için fetch yapılabilir
                    dispatch(fetchItemsForBoard(selectedBoardId));
                });
            }
            // --- DÜZELTME SONU ---
        }
    };

    // --- RENDER HELPERS ---
    const activeViewType = activeView?.type?.toLowerCase();
    const isGanttView = activeViewType === 'gantt';

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

    // --- RENDER ---
    return (
        <div className={`flex flex-col ${isGanttView ? 'h-full' : ''}`}> {/* p-4'ü buradan kaldırdım, aşağıya içerik kısmına ekleyebilirsin veya tasarım tercihine göre bırakabilirsin */}

            {/* --- BİRLEŞİK HEADER BAŞLANGICI --- */}
            {/* 1. bg-white: Hepsinin arkası beyaz olsun.
                2. shadow-sm veya border-b: Sadece en altta tek bir çizgi/gölge olsun.
                3. z-30: İçeriğin üstünde kalsın.
            */}
            <div className="sticky top-0 z-30 bg-white ">

                {/* 1. BoardHeader: Padding'i biraz azalttık ve alt çizgiyi kaldırdık */}
                <div className="px-6 pt-5 pb-2">
                    <BoardHeader />
                </div>

                {/* 2. BoardViewTabs: Alt çizgiyi kaldırdık, header ile bütünleşti */}
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

                {/* 3. BoardActionbar: Tablo görünümündeyse gösterilir. Padding eklendi. */}
                {activeViewType === 'table' && (
                    <>
                        {/* Tabs ile Actionbar arasına hafif bir ayırıcı çizgi (Opsiyonel) */}
                        <div className="h-px bg-gray-200 mx-6"></div>

                        <div className="px-6 py-3">
                            <BoardActionbar />
                        </div>
                    </>
                )}
            </div>
            {/* --- BİRLEŞİK HEADER SONU --- */}

            {/* Content */}
            {viewsStatus === 'loading' && <div>Yükleniyor...</div>}
            {viewsStatus === 'succeeded' && (
                <div className={isGanttView ? 'flex-1 overflow-hidden' : 'bg-white'}>
                    {activeViewType === 'gantt' ? (
                        // 3. DÜZELTME: boardId prop'u için fallback eklendi (selectedBoardId || 0)
                        <GanttView
                            boardId={selectedBoardId || 0}
                            viewId={activeView!.id}
                            settingsJson={activeView!.settingsJson}
                            zoomIndex={ganttZoomIndex}
                            onZoomIndexChange={setGanttZoomIndex}
                        />
                    ) : (
                        // --- TABLE VIEW (DND CONTEXT BAŞLANGICI) ---
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            <div className="p-2">
                                <SortableContext
                                    items={groups.map(g => `group-${g.id}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-4 px-1 pb-4">
                                        {groups.map((group) => (
                                            <GroupSection
                                                key={group.id}
                                                group={group}
                                                isCollapsed={isDraggingGroup ? true : collapsedGroupIds.has(group.id)}
                                                onToggleCollapse={() => handleToggleGroup(group.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                <button onClick={handleCreateGroupAtBottom} className="mt-4 ml-1 flex items-center gap-x-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 border rounded-md">
                                    <FiPlus /> Yeni Grup Ekle
                                </button>
                            </div>

                            {/* --- DRAG OVERLAY (Görsel Efekt) --- */}
                            <DragOverlay dropAnimation={dropAnimation}>
                                {activeId ? (
                                    activeDragType === 'GROUP' ? (
                                        <div className="opacity-90 rotate-2 cursor-grabbing">
                                            <GroupSection
                                                group={activeDragData.group}
                                                isCollapsed={true}
                                                onToggleCollapse={() => { }}
                                                isOverlay={true}
                                            />
                                        </div>
                                    ) : activeDragType === 'ITEM' ? (
                                        <div className="opacity-90 rotate-1 cursor-grabbing">
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
                                        // Sürüklerken görünen hayalet kutu
                                        <div className="bg-gray-100 border border-gray-300 text-gray-600 p-2 rounded shadow-xl opacity-90 text-xs uppercase font-bold w-[150px] h-10 flex items-center justify-center">
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