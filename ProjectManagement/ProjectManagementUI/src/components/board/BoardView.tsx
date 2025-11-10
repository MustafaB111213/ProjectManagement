// src/components/board/BoardView.tsx

// React ve DND importları
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult, type DragUpdate, type DragStart } from '@hello-pangea/dnd';

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

// Sabitler
const AUTO_SCROLL_SPEED = 8;
const AUTO_SCROLL_THRESHOLD = 100;

// Gantt için Zoom Sabitleri
const DEFAULT_ZOOM_INDEX = 4; // Varsayılan olarak 'day' (40px)

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
    // ----------------------------

    // --- YENİ: Popover'dan seçilen tipe göre görünüm ekleme ---
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

    // --- YENİ: Görünüm Yönetimi Handler'ları ---
    const handleAddView = useCallback(() => {
        if (!selectedBoardId) return;

        // TODO: Burası idealde bir modal veya dropdown açmalı
        // Şimdilik önceki gibi otomatik eklemeye devam etsin
        const isNextTable = boardViews.length % 2 === 0;
        const newViewPayload = {
            name: `Yeni ${isNextTable ? 'Tablo' : 'Gantt'}`,
            type: isNextTable ? 'Table' : 'Gantt',
        };
        dispatch(createBoardView({ boardId: selectedBoardId, payload: newViewPayload }));

    }, [dispatch, selectedBoardId, boardViews.length]);

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
        if (!scrollContainerRef.current) { setAutoScrollSpeed(0); return; }
        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const clientY = mouseYRef.current;
        const isNearTop = clientY < (containerRect.top + AUTO_SCROLL_THRESHOLD);
        const isNearBottom = clientY > (containerRect.bottom - AUTO_SCROLL_THRESHOLD);
        if (isNearTop) setAutoScrollSpeed(-AUTO_SCROLL_SPEED);
        else if (isNearBottom) setAutoScrollSpeed(AUTO_SCROLL_SPEED);
        else setAutoScrollSpeed(0);
    }, []);
    useEffect(() => {
        let animationFrameId: number;
        const performScroll = () => {
            if (autoScrollSpeed !== 0 && scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop += autoScrollSpeed;
                animationFrameId = requestAnimationFrame(performScroll);
            }
        };
        if (autoScrollSpeed !== 0) { animationFrameId = requestAnimationFrame(performScroll); }
        return () => { if (animationFrameId) cancelAnimationFrame(animationFrameId); };
    }, [autoScrollSpeed]);
    // ----------------------------------

    // --- Ana Render ---
    return (
        // Orijinal ana div (arka plan rengi yok)
        <div className="p-4 h-full flex flex-col">
            <BoardHeader />
            {/* Orijinal Yapışkan Üst Alan (arka plan rengi yok) */}
            <div className="sticky top-0 bg-white z-20 pt-2 mb-4"> {/* mb-4 eklendi, bg-white kaldı (orijinalde vardı) */}
                {/* Orijinal Sekme Konteyneri (arka plan rengi yok, shadow yok) */}
                <div className="border-b border-gray-200">
                    <BoardViewTabs
                        views={boardViews.map(v => ({
                            id: v.id,
                            name: v.name,
                            type: v.type.toLowerCase() as ('table' | 'gantt') // Tipi küçük harfe çevir
                        }))}
                        activeViewId={activeViewId}
                        onViewChange={(viewId) => dispatch(setActiveViewId(viewId as number))}
                        // --- DEĞİŞTİ: onAddView yerine onAddViewTypeSelected ---
                        onAddViewTypeSelected={handleAddViewTypeSelected}
                        // ----------------------------------------------------
                        onDeleteView={handleDeleteView}
                        onRenameView={handleRenameView}
                    />
                </div>
                {/* Orijinal Aksiyon Çubuğu Konteyneri (sadece tablo için, arka plan rengi yok, shadow yok) */}
                <div className="py-2 border-b border-gray-200">
                    <BoardActionbar />
                </div>
                {/* Orijinal kodda Gantt için ActionBar yoktu, o yüzden kaldırıldı */}
                {/* {activeViewType === 'gantt' && (...) } */}
            </div>

            {/* Hata veya Yüklenme Durumu Gösterimi */}
            {viewsStatus === 'loading' && <div className="p-4 text-center">Görünümler yükleniyor...</div>}
            {viewsStatus === 'failed' && <div className="p-4 text-center text-red-600">Hata: {viewsError}</div>}

            {/* Sürükle Bırak Alanı (views yüklenince göster) */}
            {viewsStatus === 'succeeded' && (
                <DragDropContext onDragEnd={onDragEnd} onDragUpdate={onDragUpdate} onDragStart={onDragStart} >
                    {/* İçerik Alanı */}
                    <div className="flex-1 overflow-hidden"> {/* Tüm alanı kapla ve iç scroll'ları yönet */}
                        {!selectedBoardId ? (
                            <div className="text-center p-8 text-gray-500">Lütfen bir pano seçin.</div>
                        ) : !activeView ? (
                            <div className="text-center p-8 text-gray-500">Aktif görünüm bulunamadı veya hiç görünüm yok.</div>
                        ) : (
                            // Aktif görünüme göre içeriği render et
                            <>
                                {/* Gantt Görünümü (GÜNCELLENDİ) */}
                                {activeViewType === 'gantt' && (
                                    <GanttView
                                        boardId={selectedBoardId}
                                        // GÜNCELLENDİ: Sadece viewId ve settingsJson'ı geç
                                        // (veya tüm 'activeView' nesnesini)
                                        viewId={activeView.id}
                                        settingsJson={activeView.settingsJson}

                                        // Zoom state'i hala burada, sekmeler arası kalıcılık için
                                        zoomIndex={ganttZoomIndex}
                                        onZoomIndexChange={setGanttZoomIndex}
                                    />
                                )}

                                {/* Tablo Görünümü */}
                                {activeViewType === 'table' && (
                                    <Droppable droppableId={selectedBoardId ? `board-${selectedBoardId}-groups` : 'board-disabled'} type="GROUP" >
                                        {(providedDroppable) => (
                                            <div
                                                {...providedDroppable.droppableProps}
                                                ref={(el) => { if (el) { providedDroppable.innerRef(el); (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el; } }}
                                                className="h-full overflow-y-auto" // Dikey scroll sadece burada
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
            )}
        </div>
    );
};

export default BoardView;