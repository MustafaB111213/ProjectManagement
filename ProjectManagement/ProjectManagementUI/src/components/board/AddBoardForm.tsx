// src/components/board/AddBoardForm.tsx

import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { createBoard } from '../../store/features/boardSlice';
import { createBoardView } from '../../store/features/boardViewSlice';
import { createGroup } from '../../store/features/groupSlice';
import { createItem } from '../../store/features/itemSlice';
import { getRandomColor } from '../../utils/colors'; // Renk utils dosyan varsa

interface BoardFormData {
    name: string;
    description: string;
}

interface AddBoardFormProps {
    onClose: () => void;
}

const AddBoardForm: React.FC<AddBoardFormProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BoardFormData>();

    const onSubmit: SubmitHandler<BoardFormData> = async (data) => {
        try {
            // 1. ADIM: Panoyu oluştur
            const newBoard = await dispatch(createBoard(data)).unwrap();

            if (newBoard && newBoard.id) {
                const boardId = newBoard.id;

                // 2. ADIM: Varsayılan 'Tablo' görünümünü oluştur
                await dispatch(createBoardView({
                    boardId,
                    payload: { name: 'Ana Tablo', type: 'table' }
                })).unwrap();

                // 3. ADIM: Başlangıç Grubunu oluştur
                const newGroup = await dispatch(createGroup({
                    boardId,
                    groupData: { 
                        title: 'Yeni Grup', 
                        color: getRandomColor() || '#579bfc' // Rastgele veya sabit bir renk
                    },
                    position: 'bottom'
                })).unwrap();

                // 4. ADIM: Eğer grup oluştuysa içine 3 tane varsayılan proje (Item) ekle
                if (newGroup && newGroup.id) {
                    // İşlemleri hızlandırmak için Promise.all ile paralel gönderiyoruz
                    await Promise.all([
                        dispatch(createItem({ 
                            boardId, 
                            groupId: newGroup.id, 
                            itemData: { name: 'Proje 1' } 
                        })),
                        dispatch(createItem({ 
                            boardId, 
                            groupId: newGroup.id, 
                            itemData: { name: 'Proje 2' } 
                        })),
                        dispatch(createItem({ 
                            boardId, 
                            groupId: newGroup.id, 
                            itemData: { name: 'Proje 3' } 
                        }))
                    ]);
                }
            }

            // Her şey bittiğinde modalı kapat
            onClose();

        } catch (error) {
            console.error("Başlangıç verileri oluşturulurken hata:", error);
            // Hata olsa bile modalı kapatabiliriz veya kullanıcıya bildirebiliriz.
            onClose();
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Pano Adı</label>
                <input
                    id="name"
                    {...register('name', { required: 'Pano adı zorunludur' })}
                    placeholder="Örn: Pazarlama Projeleri"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama (Opsiyonel)</label>
                <textarea
                    id="description"
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button 
                    type="button" 
                    onClick={onClose} 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                    İptal
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
            </div>
        </form>
    );
};

export default AddBoardForm;