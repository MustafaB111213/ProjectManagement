namespace ProjectManagement.Domain.Interfaces
{
    public interface IGenericRepository<T> where T : class
    {
        Task<IReadOnlyList<T>> GetAllAsync();
        Task<T?> GetByIdAsync(int id);
        Task AddAsync(T entity);
        void Update(T entity); // Update ve Delete genellikle senkron olur, çünkü sadece state değiştirirler.
        void Delete(T entity);
        Task <int> SaveChangesAsync();
    }
}
