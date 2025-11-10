import React from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useAppDispatch } from '../../store/hooks';
import { updateGroup } from '../../store/features/groupSlice';
import type { Group } from '../../types';

interface GroupFormData {
    title: string;
    color: string;
}

interface EditGroupFormProps {
    boardId: number;
    group: Group; // Düzenlenecek grubun verilerini prop olarak al
    onClose: () => void;
}

const EditGroupForm: React.FC<EditGroupFormProps> = ({ boardId, group, onClose }) => {
    const dispatch = useAppDispatch();
    const { register, handleSubmit } = useForm<GroupFormData>({
        // Formu, düzenlenecek grubun mevcut verileriyle doldur
        defaultValues: {
            title: group.title,
            color: group.color,
        }
    });

    const onSubmit: SubmitHandler<GroupFormData> = (data) => {
        dispatch(updateGroup({ boardId, groupId: group.id, groupData: data }));
        onClose();
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Inputlar AddGroupForm ile aynı */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">Grup Adı</label>
                <input id="title" {...register('title', { required: true })} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"/>
            </div>
            <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">Renk</label>
                <input id="color" type="color" {...register('color', { required: true })} className="mt-1 block w-full h-10 border border-gray-300 rounded-md"/>
            </div>
            <div className="flex justify-end space-x-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md">İptal</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Kaydet</button>
            </div>
        </form>
    );
};

export default EditGroupForm;