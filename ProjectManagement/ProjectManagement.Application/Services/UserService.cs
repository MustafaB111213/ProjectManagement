using AutoMapper;
using ProjectManagement.Application.DTOs.User;
using ProjectManagement.Application.Interfaces;
using ProjectManagement.Domain.Entities;
using ProjectManagement.Domain.Interfaces;

namespace ProjectManagement.Application.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IMapper _mapper;

        public UserService(IUserRepository userRepository, IMapper mapper)
        {
            _userRepository = userRepository;
            _mapper = mapper;
        }

        public async Task<UserDto> CreateUserAsync(CreateUserDto createUserDto)
        {

            if(!await _userRepository.IsEmailUniqueAsync(createUserDto.Email) || !await _userRepository.IsUsernameUniqueAsync(createUserDto.Username))
                throw new Exception("Email or Username already exists.");

            var userEntity = _mapper.Map<User>(createUserDto);

            // --- GÜVENLİK ---
            // TODO: Parolayı burada HASH'leyin. Asla düz metin kaydetmeyin!
            // Örn: userEntity.PasswordHash = _passwordHasher.Hash(createUserDto.Password);
            // Şimdilik geçici bir değer atıyorum:
            userEntity.PasswordHash = "TEMPORARY_HASHED_PASSWORD"; // MUTLAKA DEĞİŞTİRİN
            // ---------------

            await _userRepository.AddAsync(userEntity);
            await _userRepository.SaveChangesAsync();
            return _mapper.Map<UserDto>(userEntity);
        }

        public async Task<bool> DeleteUserAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);

            _userRepository.Delete(user);
            await _userRepository.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllAsync();

            return _mapper.Map<IEnumerable<UserDto>>(users);

        }

        public async Task<UserDto> GetUserByIdAsync(int id)
        {
            var user = await _userRepository.GetByIdAsync(id);
            return _mapper.Map<UserDto>(user);
        }

        public async Task<bool> UpdateUserAsync(int userId, UpdateUserDto updateUserDto)
        {
            var userEntity = await _userRepository.GetByIdAsync(userId);
            if (userEntity == null)
            {
                return false;
            }

            // E-posta/Kullanıcı adı değiştiyse benzersizlik kontrolü yap
            if (userEntity.Email != updateUserDto.Email &&
                !await _userRepository.IsEmailUniqueAsync(updateUserDto.Email, userId))
            {
                throw new Exception("E-posta zaten kullanılıyor.");
            }

            if (userEntity.Username != updateUserDto.Username &&
                !await _userRepository.IsUsernameUniqueAsync(updateUserDto.Username, userId))
            {
                throw new Exception("Kullanıcı adı zaten kullanılıyor.");
            }

            // DTO'daki verileri mevcut entity üzerine işle
            _mapper.Map(updateUserDto, userEntity);

            // _userRepository.Update(userEntity); // Update demeye gerek yok, EF izliyor.
            await _userRepository.SaveChangesAsync();
            return true;
        }
    }
}
