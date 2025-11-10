import React from 'react';
import { useAppSelector } from '../store/hooks';

const GroupList: React.FC = () => {
    // Group state'ini store'dan çekiyoruz
    const { items: groups, status, error } = useAppSelector((state) => state.groups);

    if (status === 'loading') {
        return <div className="p-4 text-center">Gruplar Yükleniyor...</div>;
    }

    if (status === 'failed') {
        return <div className="p-4 text-center text-red-500">Hata: {error}</div>;
    }

    if (status !== 'succeeded' || groups.length === 0) {
        return <div className="p-4 text-center text-gray-500">Bu panoda gösterilecek grup yok.</div>;
    }
    
    return (
        <div className="p-4 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Gruplar</h2>
            <div className="space-y-4">
                {groups.map((group) => (
                    <div key={group.id} className="p-3 rounded-md" style={{ borderLeft: `5px solid ${group.color}` }}>
                        <h3 className="font-bold text-lg">{group.title}</h3>
                        {/* Buraya ileride Item'lar (görevler) gelecek */}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GroupList;