import React from 'react'; // Popover için hook'lar
import {
    FiFilter, FiCalendar, FiChevronDown, FiPlus,
    FiMinus, FiMoreHorizontal, FiSettings
} from 'react-icons/fi';

export type ViewModeOption = 'day' | 'week' | 'month' | 'quarter' | 'year';

interface GanttToolbarProps {
    // Gantt Kontrolleri
    scrollToDate: (date: Date) => void;
    currentLevel: ViewModeOption;
    onViewModeChange: (mode: ViewModeOption) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    zoomIndex: number;
    maxZoomIndex: number;
    // --- GÜNCELLENEN PROPLAR ---
    // Sadece "Ayarlar"a tıklandığında ne yapılacağı
    onSettingsClick: () => void; 
    // Ayarlar ikonunun aktif (vurgulu) olup olmayacağı
    isSettingsOpen: boolean;
    onAutoFit: () => void;
}

// Görünüm modları için etiketler (Dropdown'da göstermek için)
const VIEW_MODE_LABELS: Record<ViewModeOption, string> = {
    day: 'Gün',
    week: 'Hafta',
    month: 'Ay',
    quarter: 'Çeyrek',
    year: 'yıl',
};

const GanttToolbar: React.FC<GanttToolbarProps> = ({
    scrollToDate,
    currentLevel,
    onViewModeChange,
    onZoomIn,
    onZoomOut,
    zoomIndex,
    maxZoomIndex,
    onSettingsClick,     
    isSettingsOpen,
    onAutoFit
}) => {
    // Temel stil class'ları 
    const buttonBase = "flex items-center gap-x-2 px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50";
    const iconButtonBase = "p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50";

    // Handler'lar
    const handleTodayClick = () => scrollToDate(new Date());
    const handlePresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        onViewModeChange(event.target.value as ViewModeOption);
    };
    
    // Zoom butonlarının disable durumu
    const isZoomInDisabled = zoomIndex >= maxZoomIndex;
    const isZoomOutDisabled = zoomIndex <= 0;

    return (
        // Ana Toolbar - Artık 'justify-between'
        <div className="flex items-center justify-between p-2 border-b border-gray-500 bg-white">
            
            {/* Sol Taraf: Filtreler */}
            <div className="flex items-center gap-x-2">
                <h1 className="text-xl font-semibold text-gray-900">Gantt</h1>
                <button className={iconButtonBase} title="Gelişmiş Filtre">
                    <FiFilter className="w-5 h-5" />
                </button>
            </div>

            {/* Sağ Taraf: Araçlar */}
            <div className="flex items-center gap-x-3">
                
                <button type="button" className={buttonBase} onClick={handleTodayClick}>
                    <FiCalendar className="w-4 h-4" />
                    <span>Bugün</span>
                </button>

                <button type="button" className={buttonBase} onClick={onAutoFit}>
                    <span>Otomatik Sığdırma</span>
                </button>
                
                {/* Ayırıcı Çizgi */}
                <div className="w-px h-6 bg-gray-300"></div>

                {/* Preset Dropdown */}
                <div className="relative">
                    <select
                        onChange={handlePresetChange}
                        value={currentLevel} // Aktif modu göster
                        className={`${buttonBase} appearance-none pr-8 bg-gray-100`}
                        title="Görünüm Seç"
                    >
                        {(Object.keys(VIEW_MODE_LABELS) as ViewModeOption[]).map(mode => (
                            <option key={mode} value={mode}>
                                {VIEW_MODE_LABELS[mode]}
                            </option>
                        ))}
                    </select>
                    <FiChevronDown className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>

                {/* Zoom Butonları */}
                <div className="flex items-center border border-gray-300 rounded-md">
                    <button
                        type="button"
                        onClick={onZoomOut}
                        disabled={isZoomOutDisabled}
                        className={`${iconButtonBase} rounded-r-none border-r border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Uzaklaştır"
                    >
                        <FiMinus className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={onZoomIn}
                        disabled={isZoomInDisabled}
                        className={`${iconButtonBase} rounded-l-none disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Yakınlaştır"
                    >
                        <FiPlus className="w-4 h-4" />
                    </button>
                </div>

                {/* --- DÜZENLENDİ: Artık Popover/Koşul yok --- */}
                {/* "Daha Fazla" menüsü kaldırıldı, Ayarlar butonu hep görünür */}
                
                <button 
                    onClick={onSettingsClick} // Gelen prop'u direkt bağla
                    className={`${iconButtonBase} ${isSettingsOpen ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    title="Widget Ayarları"
                >
                    <FiSettings className="w-5 h-5" />
                </button>

                {/* Opsiyonel: Diğer Seçenekler Menüsü hala kalabilir */}
                <button type="button" className={iconButtonBase} title="Diğer Seçenekler">
                    <FiMoreHorizontal className="w-5 h-5" />
                </button>
                {/* --------------------------------------------- */}
            </div>
        </div>
    );
};

export default GanttToolbar;