// src/components/common/Popover.tsx (GÜNCELLENMİŞ VE ÇALIŞIYOR)

import React, { useRef, useEffect, useState } from 'react';

// Olası pozisyonları tanımla
type PopoverPosition =
    | 'bottom-start' // Alt-Sol (Varsayılan)
    | 'bottom-end'   // Alt-Sağ
    | 'top-start'    // Üst-Sol
    | 'top-end';     // Üst-Sağ

// Props arayüzü
interface PopoverProps<T extends HTMLElement> {
    isOpen: boolean;            // Popover açık mı?
    onClose: () => void;        // Kapatma fonksiyonu
    targetRef: React.RefObject<T | null>; // Tetikleyici elementin ref'i
    children: React.ReactNode;  // Popover içeriği
    position?: PopoverPosition; // İstenen pozisyon (opsiyonel)
    className?: string;         // Ekstra dış stil sınıfları (opsiyonel)
    widthClass?: string;        // Genişlik sınıfı (opsiyonel, örn: 'w-64')
    paddingClass?: string;      // İç padding sınıfı (opsiyonel, örn: 'p-4')
}

// Generic Popover Component'i
const Popover = <T extends HTMLElement>({
    isOpen,
    onClose,
    targetRef,
    children,
    position = 'bottom-start',  // Varsayılan pozisyon
    className = '',             // Ekstra sınıf yok
    widthClass = 'w-auto max-w-xs', // Varsayılan genişlik: içeriğe göre, maks 'xs'
    paddingClass = 'p-2'        // Varsayılan iç padding
}: PopoverProps<T>) => {
    const popoverRef = useRef<HTMLDivElement>(null); // Popover'ın kendi ref'i
    // GÜNCELLEME: position: 'fixed' olarak başlar
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({
        opacity: 0,
        position: 'fixed', // <-- KRİTİK: Viewport'a göre sınırlama için fixed kullanmalıyız
        zIndex: 50,
        pointerEvents: 'none',
    });

    // Dışarıya tıklandığında kapatma (Aynı)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
                targetRef.current && !targetRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, targetRef]);

    // Konumlandırma mantığı (GÜNCELLENDİ)
    useEffect(() => {
        // Sadece popover açıkken VE hem hedef hem de popover ref'leri mevcutken çalış
        if (isOpen && targetRef.current && popoverRef.current) {
            const targetElement = targetRef.current;

            // Viewport'a göre hedef boyutları al
            const targetRect = targetElement.getBoundingClientRect();
            const popoverRect = popoverRef.current.getBoundingClientRect(); // Genişliği hesaplamak için

            let top = 0;
            let left = 0;
            const offset = 8; // Hedef ile popover arasındaki boşluk (px)
            const padding = 10; // Ekran kenar boşluğu

            // 1. Başlangıç Konumlandırma (Viewport'a Göre)
            switch (position) {
                case 'bottom-end':
                    top = targetRect.bottom + offset;
                    left = targetRect.right - popoverRect.width;
                    break;
                case 'top-start':
                    top = targetRect.top - popoverRect.height - offset;
                    left = targetRect.left;
                    break;
                case 'top-end':
                    top = targetRect.top - popoverRect.height - offset;
                    left = targetRect.right - popoverRect.width;
                    break;
                case 'bottom-start': // Varsayılan
                default:
                    top = targetRect.bottom + offset;
                    left = targetRect.left;
                    break;
            }

            // =========================================================
            // 2. VIEWPORT SINIRLAMASI (Taşmayı Engelleme)
            // =========================================================

            // Yatay Sınırlama
            if (left + popoverRect.width > window.innerWidth) {
                // Sağa taşıyorsa: Sağ kenarı ekranın sağına hizala
                left = window.innerWidth - popoverRect.width - padding;
            }
            if (left < padding) {
                // Sola taşıyorsa: Sol kenarı 10px'e hizala
                left = padding;
            }

            // Dikey Sınırlama
            if (top + popoverRect.height > window.innerHeight) {
                // Aşağı taşıyorsa: Popover'ı yukarı kaydır
                top = targetRect.top - popoverRect.height - offset;

                // Eğer yukarı kaydırdıktan sonra bile hala taşma varsa (uzun popover)
                if (top < padding) {
                    top = padding;
                }
            }
            // (Yukarı taşmayı zaten 'top-start' mantığı ele almalı, ancak genel bir minimum sınır koyarız)
            if (top < padding) {
                top = padding;
            }


            // Hesaplanan stili ayarla ve görünür yap
            setPopoverStyle(prev => ({
                ...prev,
                position: 'fixed', // <-- KRİTİK: Fixed, viewport'a göre pozisyonlama için
                top: `${top}px`,
                left: `${left}px`,
                opacity: 1,
                pointerEvents: 'auto',
                transition: 'opacity 150ms ease-out',
            }));

        } else {
            // Kapalıyken veya ref yokken görünmez ve tıklanamaz yap, pozisyonu sıfırla
            setPopoverStyle(prev => ({
                ...prev,
                opacity: 0,
                pointerEvents: 'none',
                top: undefined,
                left: undefined,
            }));
        }
        // Bağımlılıklar: isOpen, targetRef, position ve children (içerik değişince boyut değişebilir)
    }, [isOpen, targetRef, position, children]);


    // isOpen false ise render etme (DOM'dan kaldır)
    if (!isOpen) {
        return null;
    }

    // Render edilecek JSX
    return (
        <div
            ref={popoverRef}
            // Stil Güncellemeleri: Yumuşak border, shadow, dış className, genişlik
            className={`bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden ${widthClass} ${className}`}
            style={popoverStyle} // Hesaplanan stili uygula
        >
            {/* İçeriğe padding uygula */}
            <div className={paddingClass}>
                {children}
            </div>
        </div>
    );
};

export default Popover;