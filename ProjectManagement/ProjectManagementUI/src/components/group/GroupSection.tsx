import React, { useMemo, useState } from 'react';
import type { Group, Column } from '../../types'; // Column tipini de import ediyoruz
import { useAppDispatch, useAppSelector } from '../../store/hooks';

// Gerekli tüm Redux Action'ları
import { createItem, makeSelectItemsByGroup } from '../../store/features/itemSlice';
// Group ve Column action'ları
import { deleteGroup } from '../../store/features/groupSlice';
import { deleteColumn } from '../../store/features/columnSlice';

// Gerekli Component'ler ve İkonlar
import ItemRow from '../item/ItemRow';
import Modal from '../common/Modal'; // Modal component'iniz
import AddColumnForm from '../column/AddColumnForm'; // Yeni sütun ekleme formu
import EditGroupForm from './EditGroupForm'; // Grup düzenleme formu
import EditColumnForm from '../column/EditColumnForm'; // Sütun düzenleme formu
import { FiPlus, FiEdit, FiTrash2, FiChevronRight, FiChevronDown } from 'react-icons/fi';
// DND props tipini import et (opsiyonel ama önerilir)
import { Droppable, Draggable, type DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';

// Component Props Arayüzü
interface GroupSectionProps {
    group: Group;
    // Sürükle-bırak için drag handle props (BoardView'dan gelir)
    dragHandleProps?: DraggableProvidedDragHandleProps | null | undefined;
    droppableId: string;
    isCollapsed: boolean; // <-- YENİ PROP
    onToggleCollapse: () => void; // <-- YENİ PROP
}

const GroupSection: React.FC<GroupSectionProps> = ({ group, dragHandleProps, droppableId, isCollapsed, onToggleCollapse }) => {
    // --- State Yönetimi ---
    const dispatch = useAppDispatch();
    const { selectedBoardId } = useAppSelector((state) => state.boards);

    // Component'e özel state'ler (modal'ların ve yeni item input'unun durumunu yönetir).
    const [newItemName, setNewItemName] = useState(''); // Yeni item ekleme input'u için state
    const [isColumnModalOpen, setColumnModalOpen] = useState(false); // "Yeni Sütun Ekle" modalı açık mı?
    const [isEditModalOpen, setEditModalOpen] = useState(false); // "Grubu Düzenle" modalı açık mı?
    const [editingColumn, setEditingColumn] = useState<Column | null>(null); // Hangi sütunun düzenlendiğini tutar (null ise modal kapalı)

    // --- Redux'tan Veri Seçme ---

    // 1. Her render'da yeni bir selector oluşturmamak için, selector fabrikasını useMemo ile hafızaya alıyoruz.
    const selectItemsForGroup = useMemo(makeSelectItemsByGroup, []);

    // 2. Hafızaya alınmış selector'ı, bu component'e özel 'group.id' ile çağırıyoruz.
    const items = useAppSelector(state => selectItemsForGroup(state, group.id));

    // Tüm sütunları Redux store'dan alıyoruz.
    const columns = useAppSelector((state) => state.columns.items);

    // --- Türetilmiş Değerler ---

    // Tablonun grid yapısını hesapla: Checkbox(auto), Görev Adı(1fr), Dinamik Sütunlar(150px), + Buton(60px)
    const gridTemplateColumns = useMemo(() =>
        // Checkbox + Görev Adı + Dinamik Sütunlar + Yeni Sütun Butonu
        `60px minmax(200px, 1fr) ${columns.map(() => '150px').join(' ')} 60px`, [columns]); // Sadece columns değiştiğinde yeniden hesapla


    // --- Olay Yöneticileri (Event Handlers) ---

    // Yeni item ekleme formunu gönderildiğinde çalışır.
    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault(); // Sayfanın yeniden yüklenmesini engelle
        if (newItemName.trim() && selectedBoardId) {
            dispatch(createItem({
                boardId: selectedBoardId,
                groupId: group.id,
                itemData: { name: newItemName.trim() }
            }));
            setNewItemName(''); // Input'u temizle
        }
    };

    // Grubu silme butonuna tıklandığında çalışır.
    const handleDeleteGroup = (e: React.MouseEvent) => {
        e.stopPropagation(); // Sürüklemeyi tetiklemesin
        // Kullanıcıya onay sorusu göster (window.confirm yerine daha iyi bir modal kullanabilirsin)
        if (window.confirm(`"${group.title}" grubunu ve içindeki tüm görevleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            if (selectedBoardId) {
                dispatch(deleteGroup({ boardId: selectedBoardId, groupId: group.id }));
            }
        }
    };

    // Bir sütunu silme butonuna tıklandığında çalışır.
    const handleDeleteColumn = (e: React.MouseEvent, columnId: number, columnName: string) => {
        e.stopPropagation();
        if (window.confirm(`"${columnName}" sütununu ve içindeki tüm verileri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            if (selectedBoardId) {
                dispatch(deleteColumn({ boardId: selectedBoardId, columnId }));
            }
        }
    };

    // Sütun düzenleme modal'ını açar.
    const openEditColumnModal = (e: React.MouseEvent, column: Column) => {
        e.stopPropagation();
        setEditingColumn(column);
    };

    // Sütun düzenleme modal'ını kapatır.
    const closeEditColumnModal = () => {
        setEditingColumn(null);
    };

    const openEditGroupModal = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditModalOpen(true);
    };

    // --- RENDER ---
    return (
        <> {/* Fragment: Section ve Modal'ları sarmalar */}
            {/* Grup Bölümü Ana Konteyneri */}
            <section className="mb-6"> {/* Gruplar arası boşluk */}
                {/* Grup Başlığı Alanı */}
                <div
                    // Sürükle-bırak tutamacını buraya bağlıyoruz
                    {...dragHandleProps}
                    // 'group' sınıfı, içindeki 'group-hover'ların çalışmasını sağlar
                    className="group flex items-center justify-between mb-2 px-1 " // Alt boşluk ve cursor
                >
                    {/* Başlık Sol Taraf */}
                    <div className="flex items-center gap-x-2 flex-grow min-w-0 ">
                        {/* YENİ: Aç/Kapat Butonu */}
                        <button
                            onClick={onToggleCollapse} // Fonksiyonu bağla
                            className="p-1 text-gray-400 hover:text-gray-700 focus:outline-none flex-shrink-0"
                            title={isCollapsed ? "Grubu Aç" : "Grubu Kapat"}
                            // Sürüklemeyi başlatmaması için olay yayılımını durdur
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronDown size={16} />}
                        </button>
                        {/* Grup Başlığı */}
                        <h3 className="text-base font-semibold truncate cursor-grab" style={{ color: group.color }} onClick={onToggleCollapse}> {/* Başlığa tıklayınca da açılsın */}
                            {group.title}
                        </h3>
                        {/* Görev Sayısı */}
                        <span className="text-xs font-medium text-gray-400 flex-shrink-0">({items.length} Görev)</span>
                    </div>

                    {/* Başlık Sağ Taraf (Hover'da Görünür Butonlar) */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                            onClick={openEditGroupModal} // Düzeltildi: e parametresini alıyor
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
                            title="Grubu Düzenle"
                        >
                            <FiEdit size={14} />
                        </button>
                        <button
                            onClick={handleDeleteGroup} // Düzeltildi: e parametresini alıyor
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                            title="Grubu Sil"
                        >
                            <FiTrash2 size={14} />
                        </button>
                        {/* Opsiyonel: Daha fazla seçenek butonu */}
                        {/* <button className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded" title="Daha Fazla">
                            <FiMoreHorizontal size={14} />
                        </button> */}
                    </div>
                </div>

                {/* Görev Tablosu Konteyneri */}
                {!isCollapsed && (
                    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
                        {/* Yatay kaydırma için ek sarmalayıcı (isteğe bağlı, gerekirse) */}
                        <div className="overflow-x-auto">
                            <div className="min-w-max"> {/* İçeriğin daralmasını engelle */}

                                {/* === SÜTUN BAŞLIĞI (DROPPABLE ALAN) === */}
                                <Droppable
                                    droppableId="board-columns" // Tüm gruplar için aynı ID, çünkü tek bir başlık sırası var
                                    type="COLUMN"
                                    direction="horizontal"
                                >
                                    {(providedDroppable) => (
                                        <div
                                            {...providedDroppable.droppableProps}
                                            ref={providedDroppable.innerRef}
                                            className="relative grid border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-500 tracking-wider items-center"
                                            style={{ gridTemplateColumns }}
                                        >

                                            {/* --- 1. SABİT BAŞLIK: Checkbox (Sürüklenemez) --- */}
                                            <Draggable draggableId="static-col-checkbox" index={0} isDragDisabled={true}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="sticky left-0 z-20 bg-gray-50 px-4 py-2 border-r border-gray-200 h-10 flex items-center"                                                    ></div>
                                                )}
                                            </Draggable>

                                            {/* --- 2. SABİT BAŞLIK: Görev Adı (Sürüklenemez) --- */}
                                            <Draggable draggableId="static-col-name" index={1} isDragDisabled={true}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        // "sticky z-20..." class'ları doğru
                                                        className="sticky z-20 bg-gray-50 px-2 py-2 border-r border-gray-200 h-10 flex items-center"

                                                        // --- EKSİK OLAN KISIM BURASI ---
                                                        // İlk sütunun genişliği 60px olduğu için,
                                                        // bu eleman 60px içeriden yapışmalı.
                                                        style={{ left: '60px' }}
                                                    >
                                                        Görev Adı
                                                    </div>
                                                )}
                                            </Draggable>

                                            {/* --- 3. DİNAMİK SÜTUN BAŞLIKLARI (Sürüklenebilir) --- */}
                                            {columns.map((col, index) => (
                                                <Draggable key={col.id} draggableId={`column-${col.id}`} index={index + 2}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps} // Tüm başlığı tutamaç yap
                                                            style={{
                                                                // DND'nin çalışması için GEREKLİ stiller (transform, vb.)
                                                                ...provided.draggableProps.style,

                                                                // --- SÜRÜKLEME STİLLERİ ---
                                                                // Sürüklenme başladığında (isDragging true ise)
                                                                // grid'den koptuğu için stilini kaybeden elemana
                                                                // stilini manuel olarak geri veriyoruz.
                                                                ...(snapshot.isDragging && {
                                                                    width: '150px', // gridTemplateColumns'taki genişlik
                                                                    backgroundColor: '#ffffff', // Normalde gri olan başlığı BEYAZ yap (gölgeli)
                                                                    boxSizing: 'border-box', // Genişliğin (150px) border/padding içermesini sağla
                                                                }),
                                                                // --- SÜRÜKLEME STİLLERİ SONU ---

                                                                // Gölge ve z-index (bunlar zaten vardı, ama isDragging'e bağlı)
                                                                boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                                                                zIndex: snapshot.isDragging ? 50 : 1,
                                                            }}
                                                            className="group relative flex items-center justify-center text-center px-2 py-2 border-r border-gray-200 h-10 cursor-grab"
                                                        >
                                                            <span className="truncate">{col.title}</span>
                                                            {/* Sütun Düzenle/Sil butonları */}
                                                            <div className="absolute top-1 right-1 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-100 rounded shadow-sm z-10">
                                                                <button onClick={(e) => openEditColumnModal(e, col)} className="p-0.5 text-gray-500 hover:text-blue-600" title="Sütunu Düzenle"><FiEdit size={11} /></button>
                                                                <button onClick={(e) => handleDeleteColumn(e, col.id, col.title)} className="p-0.5 text-gray-500 hover:text-red-600" title="Sütunu Sil"><FiTrash2 size={11} /></button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}

                                            {/* Placeholder, dinamik sütunlardan SONRA gelmeli */}
                                            {providedDroppable.placeholder}

                                            {/* --- 4. SABİT BAŞLIK: Yeni Sütun Ekle (Sürüklenemez) --- */}
                                            <Draggable draggableId="static-col-add" index={columns.length + 2} isDragDisabled={true}>
                                                {(provided) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className="flex justify-center items-center h-10"
                                                    >
                                                        <button
                                                            onClick={() => setColumnModalOpen(true)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                                                            title="Yeni Sütun Ekle"
                                                        >
                                                            <FiPlus size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </Draggable>
                                        </div>
                                    )}
                                </Droppable>
                                {/* === SÜTUN BAŞLIĞI DROPPABLE ALAN SONU === */}
                               
                                {/* === ITEM'LAR İÇİN DROPPABLE (BIRAKILABİLİR ALAN) === */}
                                <Droppable droppableId={droppableId} type="ITEM">
                                    {(providedDroppable, snapshotDroppable) => (
                                        <div
                                            ref={providedDroppable.innerRef}
                                            {...providedDroppable.droppableProps}
                                            // Sürüklerken arka planı hafifçe değiştir (görsel geri bildirim)
                                            className={`item-list transition-colors ${snapshotDroppable.isDraggingOver ? 'bg-blue-50' : 'bg-white'}`}
                                        >
                                            {/* Görevlerin Listesi (Draggable ile sarmalandı) */}
                                            {items.map((item, index) => (
                                                <Draggable
                                                    key={item.id}
                                                    draggableId={`item-${item.id}`} // Benzersiz ID (tip içeriyor)
                                                    index={index} // Sıralama indeksi
                                                >
                                                    {(providedDraggable, snapshotDraggable) => (
                                                        <div
                                                            ref={providedDraggable.innerRef}
                                                            {...providedDraggable.draggableProps}
                                                            style={{
                                                                ...providedDraggable.draggableProps.style,
                                                                // Sürüklenirken gölge ekle
                                                                boxShadow: snapshotDraggable.isDragging ? '0 3px 10px rgba(0,0,0,0.15)' : 'none',
                                                            }}
                                                            className="outline-none" // Seçim çerçevesini kaldır
                                                        >
                                                            {/* ItemRow'a dragHandle'ı ilet */}
                                                            {/* ItemRow'a boardId prop'unu ekle */}
                                                        {selectedBoardId && ( // Board ID varsa ilet
                                                             <ItemRow
                                                                item={item}
                                                                color={group.color}
                                                                columns={columns}
                                                                gridTemplateColumns={gridTemplateColumns}
                                                                dragHandleProps={providedDraggable.dragHandleProps}
                                                                boardId={selectedBoardId} // <-- EKLENDİ
                                                            />
                                                        )}
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {providedDroppable.placeholder} {/* Bırakma alanı yer tutucusu */}
                                        </div>
                                    )}
                                </Droppable>
                                {/* === DROPPABLE ALAN SONU === */}

                                {/* Yeni Görev Ekleme Satırı */}
                                <div className="grid items-center border-t border-gray-200" style={{ gridTemplateColumns }}>
                                    {/* Renkli Çizgi ve Checkbox Hizalaması */}
                                    <div className="sticky left-0 z-10 bg-white relative border-r border-gray-200 h-10">                                        <div
                                        className="absolute top-0 left-0 bottom-0 w-1" // Sol kenarda 1px çizgi
                                        style={{ backgroundColor: group.color }}
                                    ></div>
                                        <div className="px-4 h-full flex items-center">
                                            <input type="checkbox" className="h-4 w-4 invisible" />
                                        </div>
                                    </div>
                                    {/* Form Input Alanı */}
                                    <div
                                        className="sticky z-10 bg-white border-r border-gray-200 h-10"
                                        style={{ left: '60px' }}
                                    >                                        <form onSubmit={handleAddItem} className="h-full">
                                            <input
                                                type="text"
                                                placeholder="+ Yeni görev ekle"
                                                value={newItemName}
                                                onChange={(e) => setNewItemName(e.target.value)}
                                                className="w-full h-full bg-transparent outline-none px-2 text-sm text-gray-500 placeholder-gray-400 focus:ring-0 focus:border-transparent border-transparent"
                                            />
                                        </form>
                                    </div>
                                    {/* Kalan Sütunlar İçin Boş Alanlar */}
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

            {/* --- MODAL'LAR --- */}
            {selectedBoardId && (
                <>
                    <Modal isOpen={isColumnModalOpen} onClose={() => setColumnModalOpen(false)} title="Yeni Sütun Ekle">
                        <AddColumnForm boardId={selectedBoardId} onClose={() => setColumnModalOpen(false)} />
                    </Modal>
                    <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title={`"${group.title}" Grubunu Düzenle`}>
                        <EditGroupForm boardId={selectedBoardId} group={group} onClose={() => setEditModalOpen(false)} />
                    </Modal>
                    {editingColumn && (
                        <Modal isOpen={!!editingColumn} onClose={closeEditColumnModal} title={`"${editingColumn.title}" Sütununu Düzenle`}>
                            <EditColumnForm boardId={selectedBoardId} column={editingColumn} onClose={closeEditColumnModal} />
                        </Modal>
                    )}
                </>
            )}
        </>
    );
};

export default GroupSection;