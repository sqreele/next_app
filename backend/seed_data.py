import json
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from my_app.database import SessionLocal, engine
from my_app.models import Base, Room, Property
from datetime import datetime

# JSON data with the corrupted entry removed.
room_data_json = """
[
    {
        "room_id": 173,
        "name": "1100",
        "room_type": "Bath Room  Floor  1 st",
        "is_active": true,
        "created_at": "2025-04-04T09:46:22.301000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 174,
        "name": "1200",
        "room_type": "Bath Room  Floor  3st",
        "is_active": true,
        "created_at": "2025-04-04T09:46:45.139000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 7,
        "name": "329",
        "room_type": "Chinatown Suite",
        "is_active": true,
        "created_at": "2025-03-26T14:44:51.082000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 14,
        "name": "409",
        "room_type": "Chinatown Suite",
        "is_active": true,
        "created_at": "2025-03-26T14:46:32.411000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 8,
        "name": "429",
        "room_type": "Chinatown Suite",
        "is_active": true,
        "created_at": "2025-03-26T14:45:00.965000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 9,
        "name": "529",
        "room_type": "Chinatown Suite",
        "is_active": true,
        "created_at": "2025-03-26T14:45:12.345000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 10,
        "name": "629",
        "room_type": "Chinatown Suite",
        "is_active": true,
        "created_at": "2025-03-26T14:45:23.984000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 175,
        "name": "1400",
        "room_type": "Kitchen Room",
        "is_active": true,
        "created_at": "2025-04-04T09:47:49.248000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 176,
        "name": "Lift No1",
        "room_type": "Lift pasenger",
        "is_active": true,
        "created_at": "2025-06-06T09:01:30.313820+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 177,
        "name": "Lift No2.",
        "room_type": "Lift pasenger",
        "is_active": true,
        "created_at": "2025-06-06T09:01:53.759350+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 172,
        "name": "1000",
        "room_type": "Lobby Area",
        "is_active": true,
        "created_at": "2025-04-04T09:45:18.051000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 171,
        "name": "1412",
        "room_type": "Marasca SD",
        "is_active": true,
        "created_at": "2025-03-27T11:16:39.965000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 159,
        "name": "1201",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:12:54.831000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 160,
        "name": "1202",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:13:03.801000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 161,
        "name": "1203",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:13:13.449000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 162,
        "name": "1204",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:13:23.231000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 163,
        "name": "1205",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:13:33.418000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 164,
        "name": "1206",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:14:03.950000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 165,
        "name": "1207",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:14:17.426000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 166,
        "name": "1208",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:14:47.213000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 167,
        "name": "1209",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:14:58.166000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 168,
        "name": "1210",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:15:07.711000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 169,
        "name": "1211",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:15:18.592000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 170,
        "name": "1212",
        "room_type": "Pratunam Deluxe",
        "is_active": true,
        "created_at": "2025-03-27T11:15:35.060000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 19,
        "name": "322",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:47:51.462000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 21,
        "name": "323",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:48:08.667000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 22,
        "name": "324",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:48:18.097000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 23,
        "name": "325",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:48:27.031000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 24,
        "name": "326",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:48:36.775000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 25,
        "name": "327",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:48:45.064000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 20,
        "name": "328",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:47:59.408000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 26,
        "name": "330",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:49:00.716000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 27,
        "name": "331",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:49:09.989000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 28,
        "name": "332",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:49:18.396000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 29,
        "name": "333",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:49:26.969000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 30,
        "name": "422",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:49:42.885000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 32,
        "name": "423",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:50:01.094000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 33,
        "name": "424",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:50:08.403000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 34,
        "name": "425",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:50:17.492000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 35,
        "name": "426",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:50:26.633000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 36,
        "name": "427",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:50:35.400000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 31,
        "name": "428",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:49:51.773000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 37,
        "name": "430",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:51:12.312000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 38,
        "name": "431",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:51:21.952000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 39,
        "name": "432",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:51:29.816000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 40,
        "name": "433",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:51:36.788000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 41,
        "name": "522",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:52:15.002000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 42,
        "name": "523",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:52:23.123000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 43,
        "name": "524",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:52:31.252000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 44,
        "name": "525",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:52:40.969000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 45,
        "name": "526",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:52:50.175000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 46,
        "name": "527",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:52:59.501000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 47,
        "name": "528",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:53:10.633000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 48,
        "name": "530",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:53:26.497000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 49,
        "name": "531",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:53:34.891000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 50,
        "name": "532",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:53:42.991000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 51,
        "name": "533",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:53:50.257000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 52,
        "name": "622",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:54:10.681000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 53,
        "name": "623",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:54:18.478000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 54,
        "name": "624",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:54:26.402000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 55,
        "name": "625",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:54:34.179000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 56,
        "name": "626",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:54:42.787000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 57,
        "name": "627",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:54:51.305000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 58,
        "name": "628",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:55:01.386000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 59,
        "name": "630",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:55:20.020000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 60,
        "name": "631",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:55:28.766000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 61,
        "name": "632",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:55:37.032000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 62,
        "name": "633",
        "room_type": "Sampeng Lane Twin",
        "is_active": true,
        "created_at": "2025-03-26T14:55:46.648000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 148,
        "name": "1401",
        "room_type": "Siam Square Double",
        "is_active": true,
        "created_at": "2025-03-27T11:09:25.933000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 149,
        "name": "1404",
        "room_type": "Siam Square Double",
        "is_active": true,
        "created_at": "2025-03-27T11:09:37.736000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 150,
        "name": "1405",
        "room_type": "Siam Square Double",
        "is_active": true,
        "created_at": "2025-03-27T11:09:56.264000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 151,
        "name": "1406",
        "room_type": "Siam Square Double",
        "is_active": true,
        "created_at": "2025-03-27T11:10:18.291000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 152,
        "name": "1411",
        "room_type": "Siam Square Double",
        "is_active": true,
        "created_at": "2025-03-27T11:10:35.592000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 153,
        "name": "1402",
        "room_type": "Siam Square Twin",
        "is_active": true,
        "created_at": "2025-03-27T11:11:08.678000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 154,
        "name": "1403",
        "room_type": "Siam Square Twin",
        "is_active": true,
        "created_at": "2025-03-27T11:11:29.166000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 155,
        "name": "1407",
        "room_type": "Siam Square Twin",
        "is_active": true,
        "created_at": "2025-03-27T11:11:51.351000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 156,
        "name": "1408",
        "room_type": "Siam Square Twin",
        "is_active": true,
        "created_at": "2025-03-27T11:12:01.815000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 157,
        "name": "1409",
        "room_type": "Siam Square Twin",
        "is_active": true,
        "created_at": "2025-03-27T11:12:13.945000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 158,
        "name": "1410",
        "room_type": "Siam Square Twin",
        "is_active": true,
        "created_at": "2025-03-27T11:12:31.721000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 4,
        "name": "321",
        "room_type": "Siam Yot Loft",
        "is_active": true,
        "created_at": "2025-03-26T14:44:06.617000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 5,
        "name": "421",
        "room_type": "Siam Yot Loft",
        "is_active": true,
        "created_at": "2025-03-26T14:44:18.215000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 6,
        "name": "521",
        "room_type": "Siam Yot Loft",
        "is_active": true,
        "created_at": "2025-03-26T14:44:28.232000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 131,
        "name": "240",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:09:52.620000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 1,
        "name": "301",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T13:19:47.009000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 2,
        "name": "302",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:40:36.354000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 3,
        "name": "303",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:40:53.524000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 63,
        "name": "304",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:56:28.145000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 64,
        "name": "305",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:56:39.176000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 65,
        "name": "306",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:56:50.313000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 66,
        "name": "307",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:57:00.570000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 67,
        "name": "310",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:57:12.535000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 69,
        "name": "312",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:57:35.381000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 70,
        "name": "314",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:57:45.413000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 71,
        "name": "315",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:57:55.163000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 72,
        "name": "316",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:58:11.003000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 73,
        "name": "317",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:58:20.595000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 74,
        "name": "318",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:58:34.926000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 75,
        "name": "319",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:58:43.336000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 76,
        "name": "320",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:58:53.116000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 77,
        "name": "401",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:59:04.108000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 78,
        "name": "402",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:59:13.310000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 79,
        "name": "403",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:59:23+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 80,
        "name": "404",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:59:41.433000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 81,
        "name": "405",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:59:50.034000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 82,
        "name": "406",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T14:59:59.913000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 83,
        "name": "407",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:00:09.787000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 84,
        "name": "410",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:00:35.992000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 85,
        "name": "411",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:00:59.716000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 86,
        "name": "412",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:01:15.943000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 87,
        "name": "414",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:01:27.612000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 88,
        "name": "415",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:01:35.849000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 89,
        "name": "416",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:01:43.391000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 90,
        "name": "417",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:01:50.642000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 91,
        "name": "418",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:01:58.103000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 92,
        "name": "419",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:02:07.834000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 93,
        "name": "420",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:02:15.982000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 94,
        "name": "501",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:02:43.682000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 95,
        "name": "502",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:02:53.007000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 96,
        "name": "503",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:03:01.410000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 97,
        "name": "504",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:03:11.808000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 98,
        "name": "505",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:03:19.902000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 99,
        "name": "506",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:03:28.887000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 100,
        "name": "507",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:03:38.591000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 101,
        "name": "510",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:00.765000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 103,
        "name": "511",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:24.403000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 102,
        "name": "512",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:17.322000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 104,
        "name": "514",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:32.473000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 105,
        "name": "515",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:39.373000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 106,
        "name": "516",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:47.829000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 107,
        "name": "517",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:04:55.126000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 108,
        "name": "518",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:02.621000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 109,
        "name": "519",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:10.470000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 110,
        "name": "520",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:18.248000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 111,
        "name": "601",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:33.499000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 112,
        "name": "602",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:41.884000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 113,
        "name": "603",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:49.472000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 114,
        "name": "604",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:05:57.302000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 115,
        "name": "605",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:06:04.894000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 116,
        "name": "606",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:06:12.361000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 117,
        "name": "607",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:06:24.716000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 118,
        "name": "610",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:06:59.691000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 119,
        "name": "611",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:07:13.552000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 120,
        "name": "612",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:07:22.979000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 121,
        "name": "614",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:07:35.239000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 122,
        "name": "615",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:07:44.514000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 123,
        "name": "616",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:07:57.578000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 124,
        "name": "617",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:08:19.576000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 125,
        "name": "618",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:08:30.262000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 126,
        "name": "619",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:08:38.743000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 127,
        "name": "620",
        "room_type": "Talad Noi King",
        "is_active": true,
        "created_at": "2025-03-26T15:08:50.667000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 134,
        "name": "1301",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:05:10.475000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 135,
        "name": "1302",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:05:24.423000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 137,
        "name": "1303",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:06:24.476000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 136,
        "name": "1304",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:05:45.246000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 138,
        "name": "1305",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:06:39.730000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 139,
        "name": "1306",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:07:09.199000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 140,
        "name": "1307",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:07:23.544000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 141,
        "name": "1308",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:07:34.283000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 142,
        "name": "1309",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:07:44.783000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 143,
        "name": "1310",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:08:03.360000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 144,
        "name": "1311",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:08:13.769000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 145,
        "name": "1312",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:08:26.493000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 146,
        "name": "1313",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:08:40.144000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 147,
        "name": "1314",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-27T11:08:50.681000+07:00",
        "properties": [
            2
        ]
    },
    {
        "room_id": 128,
        "name": "210",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-26T15:09:03.245000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 129,
        "name": "220",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-26T15:09:10.623000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 130,
        "name": "230",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-26T15:09:20.611000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 132,
        "name": "250",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-26T15:10:05.494000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 133,
        "name": "260",
        "room_type": "Tribe Hideout",
        "is_active": true,
        "created_at": "2025-03-26T15:10:15.445000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 178,
        "name": "621",
        "room_type": "Twin",
        "is_active": true,
        "created_at": "2025-06-08T09:03:11.831691+07:00",
        "properties": [
            2,
            1
        ]
    },
    {
        "room_id": 11,
        "name": "308",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:45:48.416000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 12,
        "name": "309",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:46:01.754000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 13,
        "name": "408",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:46:22.670000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 15,
        "name": "508",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:46:48.112000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 16,
        "name": "509",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:46:57.438000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 17,
        "name": "608",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:47:10.514000+07:00",
        "properties": [
            1
        ]
    },
    {
        "room_id": 18,
        "name": "609",
        "room_type": "Yaowarat King",
        "is_active": true,
        "created_at": "2025-03-26T14:47:21.875000+07:00",
        "properties": [
            1
        ]
    }
]
"""

async def seed_rooms():
    async with SessionLocal() as db:
        try:
            # Create tables if they don't exist
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            # Ensure properties exist
            from sqlalchemy import select
            
            # Check if properties exist and create them if they don't
            prop1 = await db.get(Property, 1)
            if not prop1:
                prop1 = Property(id=1, name="MaintenancePro Thailand")
                db.add(prop1)
            
            prop2 = await db.get(Property, 2)
            if not prop2:
                prop2 = Property(id=2, name="MaintenancePro China")
                db.add(prop2)
            
            await db.commit()

            rooms_data = json.loads(room_data_json)
            
            rooms_added = 0
            rooms_skipped = 0
            
            for room_item in rooms_data:
                # Check if room already exists to avoid duplicates
                result = await db.execute(
                    select(Room).where(
                        Room.name == room_item["name"],
                        Room.property_id == room_item["properties"][0] # Check against property as well
                    )
                )
                existing_room = result.scalar_one_or_none()
                
                if existing_room:
                    print(f"Room '{room_item['name']}' in property '{room_item['properties'][0]}' already exists. Skipping.")
                    rooms_skipped += 1
                    continue

                # Assuming the first property in the list is the primary one
                primary_property_id = room_item["properties"][0]
                
                new_room = Room(
                    name=room_item["name"],
                    number=room_item.get("number", room_item["name"]), # Use number if present, else name
                    room_type=room_item["room_type"],
                    is_active=room_item["is_active"],
                    property_id=primary_property_id
                )
                db.add(new_room)
                rooms_added += 1
            
            await db.commit()
            print(f"Successfully seeded rooms data. Added: {rooms_added}, Skipped: {rooms_skipped}")

        except Exception as e:
            print(f"Error seeding rooms: {e}")
            await db.rollback()
            raise

async def main():
    print("Seeding database with initial room data...")
    await seed_rooms()
    print("Seeding finished.")

if __name__ == "__main__":
    asyncio.run(main())
