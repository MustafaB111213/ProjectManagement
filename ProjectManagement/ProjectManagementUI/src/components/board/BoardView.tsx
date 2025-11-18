// src/components/board/BoardView.tsx

// React ve DND importları
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult, type DragUpdate } from '@hello-pangea/dnd';

// --- Redux hook'ları ve Slice action/selector'ları ---
import { useAppDispatch, useAppSelector } from '../../store/hooks';

// Board Views Slice (Yeni)
import {
    fetchViewsForBoard,
    createBoardView,
    setActiveViewId,
    selectBoardViews,
    selectActiveViewId,
    selectActiveView, // Aktif görünüm nesnesini almak için
    clearBoardViews, // Pano değiştiğinde temizlemek için
    selectBoardViewStatus,
    selectBoardViewError,
    deleteBoardView,
    updateBoardView
} from '../../store/features/boardViewSlice';

// Diğer Slice'lar
import {
    fetchGroupsForBoard,
    reorderGroupsLocally,
    updateGroupOrder,
    selectAllGroups,
    createGroup
} from '../../store/features/groupSlice';
import {
    fetchColumnsForBoard,
    reorderColumnsLocally as reorderColumnsLocally_COL,
    updateColumnOrder,
    selectAllColumns
} from '../../store/features/columnSlice';
import {
    fetchItemsForBoard,
    moveItem,
    reorderItems,
    type MoveItemArgs
} from '../../store/features/itemSlice';
// ----------------------------------------------------

// Component importları
import BoardHeader from './BoardHeader';
import GroupSection from '../group/GroupSection';
import BoardActionbar from './BoardActionbar';
// BoardViewTabs'dan gerekli tipleri import et (güncellenmiş hali)
import BoardViewTabs, { type BoardViewTabInfo } from './BoardViewTabs'; // BoardViewTabInfo tipini de alıyoruz
import GanttView from './GanttView';

// Yardımcı fonksiyonlar ve ikonlar
import { getRandomColor } from '../../utils/colors';
import { FiPlus } from 'react-icons/fi';
import { DEFAULT_ZOOM_INDEX } from '../common/constants';

// Sabitler
const AUTO_SCROLL_SPEED = 8;
const AUTO_SCROLL_THRESHOLD = 100;


const BoardView: React.FC = () => {
    // --- Redux State ve Dispatch ---
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    // Board Views Slice'tan veriler
    const boardViews = useAppSelector(selectBoardViews); // Görünüm listesi
    const activeViewId = useAppSelector(selectActiveViewId); // Aktif görünümün ID'si (number | null)
    const activeView = useAppSelector(selectActiveView);     // Aktif görünüm nesnesi (BoardViewData | null)
    const viewsStatus = useAppSelector(selectBoardViewStatus); // Yüklenme durumu
    const viewsError = useAppSelector(selectBoardViewError);   // Hata mesajı

    // Diğer Slice'lardan veriler
    const groups = useAppSelector(selectAllGroups);
    const columns = useAppSelector(selectAllColumns);
    // ----------------------------

    // --- Component State'leri ---
    const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<number>>(new Set());
    const [autoScrollSpeed, setAutoScrollSpeed] = useState(0);

    // Gantt zoom state'i burada kalıyor (sekmeler arası kalıcılık için)
    const [ganttZoomIndex, setGanttZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
    // ----------------------------

    // --- Ref'ler ---
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const mouseYRef = useRef(0);
    // ----------------------------

    // --- Hesaplanan Değerler ---
    // Aktif görünüm tipini küçük harfe çevir ('table', 'gantt' veya undefined)
    const activeViewType = activeView?.type?.toLowerCase();
    const isGanttView = activeViewType === 'gantt'; // Gantt özel muamele gerektirir
    // ----------------------------

    // --- Popover'dan seçilen tipe göre görünüm ekleme ---
    const handleAddViewTypeSelected = useCallback((viewType: BoardViewTabInfo['type']) => {
        if (!selectedBoardId) return;

        // Seçilen tipe göre varsayılan isim belirle
        const defaultName = viewType === 'table' ? 'Yeni Tablo' : 'Yeni Gantt';
        // Backend'e gönderilecek tip adı (Büyük harfle)
        const backendType = viewType === 'table' ? 'Table' : 'Gantt';

        const newViewPayload = {
            name: defaultName,
            type: backendType,
        };
        console.log("Yeni görünüm ekleniyor:", newViewPayload);
        dispatch(createBoardView({ boardId: selectedBoardId, payload: newViewPayload }));

    }, [dispatch, selectedBoardId]);

    const handleDeleteView = useCallback((viewId: number) => {
        if (!selectedBoardId) return;
        dispatch(deleteBoardView({ boardId: selectedBoardId, viewId }));
    }, [dispatch, selectedBoardId]);

    const handleRenameView = useCallback((viewId: number, newName: string) => {
        if (!selectedBoardId) return;
        dispatch(updateBoardView({
            boardId: selectedBoardId,
            viewId: viewId,
            payload: { name: newName }
        }));
    }, [dispatch, selectedBoardId]);

    // --- Olay Yöneticileri ---
    const handleCreateGroupAtBottom = () => {
        if (selectedBoardId) {
            const defaultGroupData = { title: 'Yeni Grup', color: getRandomColor() };
            dispatch(createGroup({ boardId: selectedBoardId, groupData: defaultGroupData, position: 'bottom' }));
        }
    };

    const handleToggleGroup = useCallback((groupId: number) => {
        setCollapsedGroupIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(groupId)) {
                newSet.delete(groupId);
            } else {
                newSet.add(groupId);
            }
            return newSet;
        });
    }, []);
    // ------------------------

    // --- Veri Getirme (useEffect) ---
    useEffect(() => {
        if (selectedBoardId) {
            // Önce panoya ait GÖRÜNÜMLERİ getir
            dispatch(fetchViewsForBoard(selectedBoardId));
            // Sonra diğer verileri getir
            dispatch(fetchGroupsForBoard(selectedBoardId));
            dispatch(fetchColumnsForBoard(selectedBoardId));
            dispatch(fetchItemsForBoard(selectedBoardId));
        } else {
            // Pano seçimi kaldırıldığında tüm ilgili state'leri temizle
            dispatch(clearBoardViews());
            // dispatch(clearGroups()); // İlgili slice'larda clear action'ları oluşturulmalı
            // dispatch(clearColumns());
            // dispatch(clearItems());
        }
    }, [selectedBoardId, dispatch]);
    // ------------------------------

    // --- Sürükle Bırak İşleyicileri ---
    const handleGlobalMouseMove = useCallback((event: MouseEvent) => { mouseYRef.current = event.clientY; }, []);
    const onDragStart = useCallback(() => { window.addEventListener('mousemove', handleGlobalMouseMove); }, [handleGlobalMouseMove]);
    const onDragEnd = useCallback((result: DropResult) => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        setAutoScrollSpeed(0);
        const { source, destination, draggableId, type } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

        // GRUP SÜRÜKLEME
        if (type === 'GROUP' && selectedBoardId) {
            const start = source.index;
            const end = destination.index;
            const currentGroups = Array.from(groups);
            const [removed] = currentGroups.splice(start, 1);
            currentGroups.splice(end, 0, removed);
            dispatch(reorderGroupsLocally({ orderedGroups: currentGroups }));
            const orderedGroupIds = currentGroups.map(group => group.id);
            dispatch(updateGroupOrder({ boardId: selectedBoardId, orderedGroupIds }))
                .unwrap().catch((error) => {
                    console.error("Grup sırası backend'de güncellenemedi:", error);
                    dispatch(reorderGroupsLocally({ orderedGroups: groups }));
                });
            return;
        }
        // SÜTUN SÜRÜKLEME
        if (type === 'COLUMN' && selectedBoardId) {
            const STATIC_OFFSET = 2;
            const start = source.index - STATIC_OFFSET;
            const end = destination.index - STATIC_OFFSET;
            if (start < 0 || end < 0 || start >= columns.length || end >= columns.length) return;
            const originalColumns = Array.from(columns);
            const reorderedColumns = Array.from(columns);
            const [removed] = reorderedColumns.splice(start, 1);
            reorderedColumns.splice(end, 0, removed);
            dispatch(reorderColumnsLocally_COL({ orderedColumns: reorderedColumns }));
            const orderedColumnIds = reorderedColumns.map(col => col.id);
            dispatch(updateColumnOrder({ boardId: selectedBoardId, orderedColumnIds }))
                .unwrap().catch((error) => {
                    console.error("Sütun sırası backend'de güncellenemedi:", error);
                    dispatch(reorderColumnsLocally_COL({ orderedColumns: originalColumns }));
                });
            return;
        }
        // ITEM SÜRÜKLEME
        if (type === 'ITEM' && selectedBoardId) {
            const sourceGroupId = parseInt(source.droppableId.split('-')[1]);
            const destinationGroupId = parseInt(destination.droppableId.split('-')[1]);
            const itemId = parseInt(draggableId.split('-')[1]);
            if (isNaN(sourceGroupId) || isNaN(destinationGroupId) || isNaN(itemId)) return;
            const moveArgs: MoveItemArgs = {
                boardId: selectedBoardId, itemId, sourceGroupId, sourceIndex: source.index, destinationGroupId, destinationIndex: destination.index
            };
            dispatch(reorderItems(moveArgs));
            dispatch(moveItem(moveArgs))
                .unwrap().catch((error) => {
                    console.error("Item taşıma backend'de güncellenemedi:", error);
                    dispatch(fetchItemsForBoard(selectedBoardId)); // Hata durumunda yeniden fetch
                });
        }
    }, [groups, columns, dispatch, selectedBoardId, handleGlobalMouseMove]);
    // ------------------------------------

    // --- Otomatik Kaydırma Mantığı ---
    const onDragUpdate = useCallback((update: DragUpdate) => {
        // Sadece tablo görünümünde (dış scroll) çalış
        if (activeViewType !== 'table' || !scrollContainerRef.current) {
            setAutoScrollSpeed(0);
            return;
        }
        if (!scrollContainerRef.current) { setAutoScrollSpeed(0); return; }
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const clientY = mouseYRef.current;
        const isNearTop = clientY < (containerRect.top + AUTO_SCROLL_THRESHOLD);
        const isNearBottom = clientY > (containerRect.bottom - AUTO_SCROLL_THRESHOLD);
        if (isNearTop) setAutoScrollSpeed(-AUTO_SCROLL_SPEED);
        else if (isNearBottom) setAutoScrollSpeed(AUTO_SCROLL_SPEED);
        else setAutoScrollSpeed(0);
    }, [activeViewType]);
    useEffect(() => {
        // Sadece tablo görünümünde (dış scroll) çalış
        if (activeViewType !== 'table') return;

        let animationFrameId: number;
        const performScroll = () => {
            if (autoScrollSpeed !== 0 && scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop += autoScrollSpeed;
                animationFrameId = requestAnimationFrame(performScroll);
            }
        };
        if (autoScrollSpeed !== 0) { animationFrameId = requestAnimationFrame(performScroll); }
        return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
    }, [autoScrollSpeed, activeViewType]);
    // ----------------------------------

    // --- Ana Render ---
    return (
        // Orijinal ana div (arka plan rengi yok)
        // Ana konteyner. Gantt ise ekranı kaplar (h-full),
        // Tablo ise sayfanın normal akışında kalır (h-full YOK).
        <div className={`p-4 flex flex-col ${isGanttView ? 'h-full' : ''}`}>
            {/* --- YENİ YAPIŞKAN BAŞLIK BLOĞU --- */}
            {/* 1. 'sticky top-0' ile tüm bloğu yapışkan yap.
                2. 'bg-white' ile arka planı ver.
                3. 'z-20' ile içeriğin üzerinde kalmasını sağla.
                4. 'shadow-sm' ve 'border-b' ile hafifçe yükselt (Monday'de bu var).
                5. İçeriğin (Board) kaydırılabilir alana yapışmaması için 'mb-4' ekle.
            */}
            {/* Tüm başlıklar artık bu tek yapışkan bloğun içinde */}
            <div className="sticky top-0 bg-main-bg z-30 mb-2 ">
                {/* 1. BoardHeader */}
                <div className="px-4 pt-4 border-b">
                    <BoardHeader />
                </div>

                {/* 2. BoardViewTabs (padding'i 'px-4' yap) */}
                <div className="px-4 border-b">
                    <BoardViewTabs
                        views={boardViews.map(v => ({
                            id: v.id,
                            name: v.name,
                            type: v.type.toLowerCase() as ('table' | 'gantt' | 'calendar')
                        }))}
                        activeViewId={activeViewId}
                        onViewChange={(viewId) => dispatch(setActiveViewId(viewId as number))}
                        onAddViewTypeSelected={handleAddViewTypeSelected}
                        onDeleteView={handleDeleteView}
                        onRenameView={handleRenameView}
                    />
                </div>
                {/* 3. BoardActionbar (Sadece Tablo görünümünde göster) */}
                {activeViewType === 'table' && (
                    <div className="p-4">
                        <BoardActionbar />
                    </div>
                )}
            </div>

            {/* --- YAPIŞKAN BAŞLIK BLOĞU SONU --- */}

            {/* Hata veya Yüklenme Durumu Gösterimi */}
            {viewsStatus === 'loading' && <div className="p-4 text-center">Görünümler yükleniyor...</div>}
            {viewsStatus === 'failed' && <div className="p-4 text-center text-red-600">Hata: {viewsError}</div>}

            {/* Sürükle Bırak Alanı (views yüklenince göster) */}
            {
                viewsStatus === 'succeeded' && (
                    <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart} >
                        {/* İçerik Alanı */}
                        {/* Gantt ise: Kalan alanı kapla (flex-1) ve iç scroll'u GanttView'e bırak (overflow-hidden) */}
                        {/* Tablo ise: Hiçbir stil alma, sayfanın normal kaymasına izin ver. */}
                        <div className={isGanttView ? 'flex-1 overflow-hidden' : 'bg-gray-50 rounded-md shadow-inner'}>
                            {!selectedBoardId ? (
                                <div className="text-center p-8 text-gray-500">Lütfen bir pano seçin.</div>
                            ) : !activeView ? (
                                <div className="text-center p-8 text-gray-500">Aktif görünüm bulunamadı veya hiç görünüm yok.</div>
                            ) : (
                                // Aktif görünüme göre içeriği render et
                                <>
                                    {/* Gantt Görünümü */}
                                    {activeViewType === 'gantt' && (
                                        <div className="h-full">
                                            <GanttView
                                                boardId={selectedBoardId}
                                                viewId={activeView.id}
                                                settingsJson={activeView.settingsJson}
                                                zoomIndex={ganttZoomIndex}
                                                onZoomIndexChange={setGanttZoomIndex}
                                            />
                                        </div>
                                    )}

                                    {/* Tablo Görünümü */}
                                    {activeViewType === 'table' && (
                                        <Droppable droppableId={selectedBoardId ? `board-${selectedBoardId}-groups` : 'board-disabled'} type="GROUP" >
                                            {(providedDroppable) => (
                                                <div
                                                    {...providedDroppable.droppableProps}
                                                    // Ref'i artık hem DND hem de auto-scroll için kullan
                                                    ref={(el) => {
                                                        providedDroppable.innerRef(el);
                                                        (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                                                    }}
                                                    // 'h-full' ve 'overflow-y-auto' kaldırıldı.
                                                    // Sayfa kaydırması artık etkin.
                                                    className="p-2"
                                                >
                                                    <div className="space-y-4 px-1 pb-4"> {/* Gruplar arası boşluk ve padding */}
                                                        {groups.map((group, index) => (
                                                            <Draggable key={group.id} draggableId={`group-${group.id}`} index={index} >
                                                                {(providedDraggable, snapshot) => (
                                                                    <div ref={providedDraggable.innerRef} {...providedDraggable.draggableProps} className="outline-none" style={{ ...providedDraggable.draggableProps.style, boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none' }}>
                                                                        <GroupSection
                                                                            key={group.id}
                                                                            group={group}
                                                                            dragHandleProps={providedDraggable.dragHandleProps}
                                                                            droppableId={`group-${group.id}`}
                                                                            isCollapsed={collapsedGroupIds.has(group.id)}
                                                                            onToggleCollapse={() => handleToggleGroup(group.id)}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))}
                                                        {providedDroppable.placeholder}
                                                    </div>
                                                    {/* Yeni Grup Butonu (Orijinal hali) */}
                                                    <button onClick={handleCreateGroupAtBottom} className="mt-4 mb-4 ml-1 flex items-center gap-x-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500" >
                                                        <FiPlus className="w-4 h-4" /> Yeni Grup Ekle
                                                    </button>
                                                </div>
                                            )}
                                        </Droppable>
                                    )}
                                </>
                            )}
                        </div> {/* flex-1 sonu */}
                    </DragDropContext>
                )
            }
        </div >

    );
};

export default BoardView;