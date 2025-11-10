// Bu fonksiyon, projenin herhangi bir yerinden çağrılarak rastgele bir renk kodu döndürecek.
export const getRandomColor = () => {
    const colors = ['#579BFC', '#66CCFF', '#4ECCC6', '#9CD326', '#FDAB3D', '#FF6D3B', '#E50073', '#9D50DD'];
    return colors[Math.floor(Math.random() * colors.length)];
};