using AutoMapper;
using ProjectManagement.Application.DTOs.Board;
using ProjectManagement.Application.DTOs.BoardView;
using ProjectManagement.Application.DTOs.Column;
using ProjectManagement.Application.DTOs.Group;
using ProjectManagement.Application.DTOs.Item;
using ProjectManagement.Application.DTOs.ItemValue;
using ProjectManagement.Application.DTOs.User;
using ProjectManagement.Domain.Entities;

namespace ProjectManagement.Application.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // READ
            CreateMap<Board, BoardDto>();

            // CREATE
            CreateMap<CreateBoardDto, Board>();

            // UPDATE
            CreateMap<UpdateBoardDto, Board>();


            //GROUP MAPPINGS
            CreateMap<Group, GroupDto>();
            CreateMap<CreateGroupDto, Group>();
            CreateMap<UpdateGroupDto, Group>();
            CreateMap<MoveItemDto, Group>();

            //ITEM MAPPINGS
            CreateMap<Item, ItemDto>();
            CreateMap<CreateItemDto, Item>();
            CreateMap<UpdateItemDto, Item>();
            CreateMap<MoveItemDto, Item>();

            //Column Mappings
            CreateMap<Column, ColumnDto>();
            CreateMap<CreateColumnDto, Column>();
            CreateMap<UpdateColumnDto, Column>();
            CreateMap<ReorderColumnsDto, Column>();

            //ItemValue Mappings
            CreateMap<ItemValue, ItemValueDto>();
            CreateMap<UpdateItemValueDto, ItemValue>();

            //BoardView Mappings
            CreateMap<BoardView, BoardViewDto>()
             .ForMember(dest => dest.Type, opt => opt.MapFrom(src => src.Type.ToString()));

            //User Mappings
            CreateMap<User, UserDto>();

            // CreateUserDto'dan User'a maplerken Password'ü ignore et
            // (Çünkü onu manuel hash'leyip PasswordHash'e atayacağız)
            CreateMap<CreateUserDto, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore());

            CreateMap<UpdateUserDto, User>();
        }
    }
}
