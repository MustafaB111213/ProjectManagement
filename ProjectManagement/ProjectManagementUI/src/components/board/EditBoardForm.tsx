import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { updateBoard } from '../../store/features/boardSlice';
import type { Board } from '../../types';

interface BoardFormData {
    name: string;
    description: string;
}

interface EditBoardFormProps {
    board: Board; // Düzenlenecek panonun verilerini prop olarak al
    onClose: () => void;
}

const EditBoardForm: React.FC<EditBoardFormProps> = ({ board, onClose }) => {
    const dispatch = useAppDispatch();
    const { register, handleSubmit, formState: { errors } } = useForm<BoardFormData>({
        // Formu, düzenlenecek panonun mevcut verileriyle doldur
        defaultValues: {
            name: board.name,
            description: board.description || '',
        }
    });

    const onSubmit: SubmitHandler<BoardFormData> = (data) => {
        dispatch(updateBoard({ boardId: board.id, boardData: data }));
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Pano Adı</label>
                <input
                    id="name"
                    {...register('name', { required: 'Pano adı zorunludur' })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama (Opsiyonel)</label>
                <textarea
                    id="description"
                    {...register('description')}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                />
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Kaydet</button>
            </div>
        </form>
    );
};

export default EditBoardForm;