// src/hooks/useGanttScroll.ts

import { useRef, useState, useCallback, useEffect } from 'react';

export const useGanttScroll = (containerRef: React.RefObject<HTMLDivElement>) => {
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef({ x: 0, y: 0 });
    const scrollPos = useRef({ left: 0, top: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        // Sadece sol tık (button 0) ile çalışsın
        if (e.button !== 0) return;

        // Eğer tıklanan yer bir Gantt Barı veya Resize Handle ise, scroll işlemini başlatma.
        // (Bunu kontrol etmek için event'in defaultPrevented olup olmadığına veya
        // tıklanan elementin bir bar olup olmadığına bakabiliriz.
        // Genellikle bar drag olaylarında e.stopPropagation() kullanılır, 
        // ancak biz burada garanti olsun diye class kontrolü de yapabiliriz veya 
        // e.defaultPrevented kontrolü ekleyebiliriz).
        if (e.defaultPrevented) return;

        if (!containerRef.current) return;

        setIsDragging(true);
        startPos.current = { x: e.clientX, y: e.clientY };
        scrollPos.current = {
            left: containerRef.current.scrollLeft,
            top: containerRef.current.scrollTop
        };

        // İmleci ve seçimi ayarla
        containerRef.current.style.cursor = 'grabbing';
        containerRef.current.style.userSelect = 'none';
    }, [containerRef]);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        
        e.preventDefault();
        
        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;

        // Fareyi sola çekince (dx negatif) içerik sağa kaymalı, bu yüzden çıkarma işlemi yapıyoruz.
        containerRef.current.scrollLeft = scrollPos.current.left - dx;
        containerRef.current.scrollTop = scrollPos.current.top - dy;
    }, [isDragging, containerRef]);

    const onMouseUp = useCallback(() => {
        if (!isDragging || !containerRef.current) return;
        
        setIsDragging(false);
        containerRef.current.style.cursor = 'grab'; // Default haline dön
        containerRef.current.style.removeProperty('user-select');
    }, [isDragging, containerRef]);

    // Mouse div dışına çıksa bile sürüklemenin devam etmesi için window listener kullanıyoruz
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        } else {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDragging, onMouseMove, onMouseUp]);

    return { 
        scrollEvents: { 
            onMouseDown,
            style: { cursor: isDragging ? 'grabbing' : 'grab' } 
        },
        isDragging 
    };
};