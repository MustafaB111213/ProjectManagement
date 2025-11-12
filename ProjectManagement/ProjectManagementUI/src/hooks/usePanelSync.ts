// src/hooks/usePanelSync.ts (GÜNCELLENMİŞ HALİ)

import { useCallback, type RefObject,  } from 'react';

/**
 * Sol ve Sağ Gantt panellerinin dikey kaydırmasını senkronize eder.
 * @param debouncedLoadMore Yatay kaydırma sırasında tembel yüklemeyi tetikleyen fonksiyon.
 * @param leftPanelInnerRef Sol panelin kaydırılacak iç div'inin ref'i.
 * @param rightPanelScrollRef Sağ panelin (ana) kaydırılabilir div'inin ref'i.
 */
export const usePanelSync = (
    debouncedLoadMore: (scrollLeft: number, scrollWidth: number, offsetWidth: number) => void,
    leftPanelInnerRef: RefObject<HTMLDivElement | null>,
    rightPanelScrollRef: RefObject<HTMLDivElement | null>
) => {
    
    // Ref'ler artık dışarıdan (GanttView'den) geliyor.

    // Sağ panel (ana scroll) kaydığında tetiklenir
    const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
        const { scrollLeft, scrollTop, scrollWidth, offsetWidth } = event.currentTarget;

        // 1. Dikey kaydırmayı sol panele anında uygula (React render'ı yok)
        if (leftPanelInnerRef.current) {
            leftPanelInnerRef.current.style.transform = `translateY(-${scrollTop}px)`;
        }

        // 2. Yatay kaydırma için tembel yüklemeyi tetikle
        debouncedLoadMore(scrollLeft, scrollWidth, offsetWidth);
    }, [debouncedLoadMore, leftPanelInnerRef]);

    // Sol panel üzerinde fare tekerleği döndüğünde tetiklenir
    const handleLeftPanelWheel = useCallback((deltaY: number) => {
        const rightPanel = rightPanelScrollRef.current;
        if (!rightPanel) return;

        // 1. Sağ panelin kaydırmasını programatik olarak ayarla
        const newScrollTop = rightPanel.scrollTop + deltaY;
        rightPanel.scrollTop = newScrollTop;

        // 2. Sol paneli de manuel senkronize et (çünkü scrollTop'u ayarlamak 'onScroll'u tetiklemez)
        if (leftPanelInnerRef.current) {
            leftPanelInnerRef.current.style.transform = `translateY(-${newScrollTop}px)`;
        }
    }, [leftPanelInnerRef, rightPanelScrollRef]);

    return {
        // Ref'leri döndürmeye gerek yok, zaten parent'ta (GanttView) tanımlılar
        handleScroll,
        handleLeftPanelWheel
    };
};