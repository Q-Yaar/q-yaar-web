export const templateResponse = {
    "count": 7,
    "next": null,
    "previous": null,
    "results": [
        {
            "question_id": "319e0f3f-4221-4593-bc39-f9d4bc55854e",
            "template": "My nearest metro line is {{ metro_line }}. Is your nearest metro line the same?",
            "category": {
                "category_id": "aa020bb6-4d12-4f8c-ae9b-d25a3b3aef93",
                "category_name": "Matching",
                "reward": {
                    "reward_id": "bbbb2f06-0789-4319-856b-f92442377d8e",
                    "reward_name": "Draw 3 Pick 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 3,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:57:32.902371Z",
                    "modified": "2026-05-23T13:57:32.902394Z"
                },
                "priority": 6,
                "created": "2026-05-23T14:01:10.259354Z",
                "modified": "2026-05-23T14:01:10.259719Z"
            },
            "answer_instruction_type": "AREAS",
            "geo": {
                "count": 1
            },
            "created": "2026-05-23T14:04:22.603953Z",
            "modified": "2026-05-23T14:04:22.603979Z"
        },
        {
            "question_id": "806a962d-cea4-4a47-9989-189c71293639",
            "template": "I am currently in {{ gba_corporation }} GBA Corporation. Are you in the same GBA Corporation as me?",
            "category": {
                "category_id": "aa020bb6-4d12-4f8c-ae9b-d25a3b3aef93",
                "category_name": "Matching",
                "reward": {
                    "reward_id": "bbbb2f06-0789-4319-856b-f92442377d8e",
                    "reward_name": "Draw 3 Pick 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 3,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:57:32.902371Z",
                    "modified": "2026-05-23T13:57:32.902394Z"
                },
                "priority": 6,
                "created": "2026-05-23T14:01:10.259354Z",
                "modified": "2026-05-23T14:01:10.259719Z"
            },
            "answer_instruction_type": "AREAS",
            "geo": {
                "count": 1
            },
            "created": "2026-05-23T14:07:44.199524Z",
            "modified": "2026-05-23T14:07:44.199550Z"
        },
        {
            "question_id": "8b9cf099-62be-4846-88e3-0f39fb5728c8",
            "template": "Compared to me, are you closer to or further from {{ landmark_name }}?",
            "category": {
                "category_id": "34059e87-faaf-4c49-8ea6-bffc5656d2b0",
                "category_name": "Measuring",
                "reward": {
                    "reward_id": "bbbb2f06-0789-4319-856b-f92442377d8e",
                    "reward_name": "Draw 3 Pick 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 3,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:57:32.902371Z",
                    "modified": "2026-05-23T13:57:32.902394Z"
                },
                "priority": 5,
                "created": "2026-05-23T14:01:23.095286Z",
                "modified": "2026-05-23T14:01:23.095312Z"
            },
            "answer_instruction_type": "DRAW_CIRCLE_2_POINTS",
            "geo": {
                "count": 1
            },
            "created": "2026-05-23T14:09:54.141560Z",
            "modified": "2026-05-23T14:28:53.352456Z"
        },
        {
            "question_id": "06e9bee5-a181-4dce-9792-497ead9732f8",
            "template": "Are you within {{ distance }} metres of me?",
            "category": {
                "category_id": "02588604-868f-41d1-ab96-ad4f92f3514e",
                "category_name": "Radar",
                "reward": {
                    "reward_id": "381f76c0-58e4-47ee-9367-8cf69b5ab931",
                    "reward_name": "Draw 2 Pick 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 2,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:57:21.202654Z",
                    "modified": "2026-05-23T13:57:21.202680Z"
                },
                "priority": 3,
                "created": "2026-05-23T14:02:17.020069Z",
                "modified": "2026-05-23T14:02:17.020094Z"
            },
            "answer_instruction_type": "DRAW_CIRCLE_POINT_RADIUS",
            "geo": {
                "count": 1
            },
            "created": "2026-05-23T14:15:41.621701Z",
            "modified": "2026-05-23T14:17:21.770643Z"
        },
        {
            "question_id": "c5d88c25-9488-4afc-88cb-081b8c6fcf3f",
            "template": "Are you {{ direction }} of me?",
            "category": {
                "category_id": "47cc4c38-c578-4ab0-b856-96234c5fe805",
                "category_name": "Relative",
                "reward": {
                    "reward_id": "ad92564f-9062-4256-a807-43644894a285",
                    "reward_name": "Draw 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 1,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:56:54.831280Z",
                    "modified": "2026-05-23T13:56:54.831574Z"
                },
                "priority": 1,
                "created": "2026-05-23T14:03:00.837002Z",
                "modified": "2026-05-23T14:03:00.837027Z"
            },
            "answer_instruction_type": "SPLIT_BY_DIRECTION",
            "geo": {
                "count": 1
            },
            "created": "2026-05-23T14:20:21.138123Z",
            "modified": "2026-05-23T14:21:17.563719Z"
        },
        {
            "question_id": "17b4c363-d953-488c-b646-168bc5097b63",
            "template": "I've just travelled {{ distance }} metres. Am I hotter or colder?",
            "category": {
                "category_id": "8f8067e7-42ac-4c74-ad9f-b092081c35cf",
                "category_name": "Thermometer",
                "reward": {
                    "reward_id": "381f76c0-58e4-47ee-9367-8cf69b5ab931",
                    "reward_name": "Draw 2 Pick 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 2,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:57:21.202654Z",
                    "modified": "2026-05-23T13:57:21.202680Z"
                },
                "priority": 4,
                "created": "2026-05-23T14:02:06.934216Z",
                "modified": "2026-05-23T14:02:06.934245Z"
            },
            "answer_instruction_type": "AREAS",
            "geo": {
                "count": 2
            },
            "created": "2026-05-23T14:30:51.430856Z",
            "modified": "2026-08-15T14:21:28.732956Z"
        },
        {
            "question_id": "08efb887-da74-4ed3-b0df-6894c660e4c0",
            "template": "Send a photo of {{ photo }}",
            "category": {
                "category_id": "03101ca4-f7ba-4e5a-af35-62fd61ef0c75",
                "category_name": "Photos",
                "reward": {
                    "reward_id": "ad92564f-9062-4256-a807-43644894a285",
                    "reward_name": "Draw 1",
                    "reward_type": "CARD_DRAW",
                    "reward_meta": {
                        "draw": 1,
                        "pick": 1
                    },
                    "created": "2026-05-23T13:56:54.831280Z",
                    "modified": "2026-05-23T13:56:54.831574Z"
                },
                "priority": 2,
                "created": "2026-05-23T14:02:50.378511Z",
                "modified": "2026-05-23T14:02:50.378535Z"
            },
            "answer_instruction_type": "NO_INSTRUCTION",
            "geo": {
                "count": 0
            },
            "created": "2026-08-15T13:41:59.379212Z",
            "modified": "2026-08-15T13:42:18.277659Z"
        }
    ]
}