export const askedQuestionsResponse = {
    "count": 15,
    "next": null,
    "previous": null,
    "results": [
        {
            "question_id": "d2f5b33b-aed6-4e38-a779-89f3247fb112",
            "question_template_id": "06e9bee5-a181-4dce-9792-497ead9732f8",
            "rendered_question": "Are you within 2000 metres of me?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0242969",
                        "lon": "77.6325497"
                    }
                ]
            },
            "answer_meta": {
                "result": false,
                "metadata": {
                    "text": "Distance from center: 2639m (radius: 2000m)",
                    "confidence": 100,
                    "auto_answered": true,
                    "computation_method": "point_in_circle"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0242969",
                        "lon": "77.6325497"
                    }
                ],
                "radius": "2000",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T10:06:03.788732Z",
            "modified": "2026-08-16T10:08:22.144226Z"
        },
        {
            "question_id": "3f8b9916-aa90-4b77-a46f-c71fa45277ce",
            "question_template_id": "17b4c363-d953-488c-b646-168bc5097b63",
            "rendered_question": "I've just travelled custom metres. Am I hotter or colder?",
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
            "geo": {
                "count": 2
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0275464",
                        "lon": "77.6324109"
                    },
                    {
                        "lat": "13.0275464",
                        "lon": "77.6324109"
                    },
                    {
                        "lat": "13.028092",
                        "lon": "77.6325942"
                    }
                ]
            },
            "answer_meta": {
                "result": false,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0275464",
                        "lon": "77.6324109"
                    },
                    {
                        "lat": "13.0275464",
                        "lon": "77.6324109"
                    },
                    {
                        "lat": "13.028092",
                        "lon": "77.6325942"
                    }
                ],
                "radius": "custom",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T09:43:20.372565Z",
            "modified": "2026-08-16T09:47:51.520510Z"
        },
        {
            "question_id": "1348a426-c210-4a75-a384-d2eb55504c75",
            "question_template_id": "08efb887-da74-4ed3-b0df-6894c660e4c0",
            "rendered_question": "Send a photo of Tallest Building visible from where you are",
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
            "geo": {
                "count": 0
            },
            "question_meta": {
                "location_points": null
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": null,
                "radius": "",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T09:38:09.344801Z",
            "modified": "2026-08-16T09:44:13.236833Z"
        },
        {
            "question_id": "e8021c76-d63e-4d52-939d-061560f57e90",
            "question_template_id": "08efb887-da74-4ed3-b0df-6894c660e4c0",
            "rendered_question": "Send a photo of Yourself",
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
            "geo": {
                "count": 0
            },
            "question_meta": {
                "location_points": null
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": null,
                "radius": "",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T09:30:55.433699Z",
            "modified": "2026-08-16T09:35:28.394396Z"
        },
        {
            "question_id": "28e2318b-f18e-4210-9c54-25bfbc122674",
            "question_template_id": "06e9bee5-a181-4dce-9792-497ead9732f8",
            "rendered_question": "Are you within custom metres of me?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0258173",
                        "lon": "77.6306463"
                    }
                ]
            },
            "answer_meta": {
                "result": false,
                "metadata": {
                    "text": "Nope"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0258173",
                        "lon": "77.6306463"
                    }
                ],
                "radius": "custom",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T09:26:36.898654Z",
            "modified": "2026-08-16T09:27:57.895855Z"
        },
        {
            "question_id": "85b7311c-3d29-4109-b0c8-4873cbf3209d",
            "question_template_id": "08efb887-da74-4ed3-b0df-6894c660e4c0",
            "rendered_question": "Send a photo of Tallest Building Visible from Transit Station",
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
            "geo": {
                "count": 0
            },
            "question_meta": {
                "location_points": null
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": null,
                "radius": "",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T08:58:15.170195Z",
            "modified": "2026-08-16T09:04:09.861974Z"
        },
        {
            "question_id": "0bb2ab1d-db84-43ad-b79e-b0df2ef986dc",
            "question_template_id": "08efb887-da74-4ed3-b0df-6894c660e4c0",
            "rendered_question": "Send a photo of Your Transit Station",
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
            "geo": {
                "count": 0
            },
            "question_meta": {
                "location_points": null
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": null,
                "radius": "",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T08:51:27.558329Z",
            "modified": "2026-08-16T08:57:25.556896Z"
        },
        {
            "question_id": "f03ba59b-a38f-485e-bfa3-49942130e92c",
            "question_template_id": "17b4c363-d953-488c-b646-168bc5097b63",
            "rendered_question": "I've just travelled custom metres. Am I hotter or colder?",
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
            "geo": {
                "count": 2
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0319035",
                        "lon": "77.622181"
                    },
                    {
                        "lat": "13.0319035",
                        "lon": "77.622181"
                    },
                    {
                        "lat": "13.0320502",
                        "lon": "77.6218265"
                    }
                ]
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": "East of Nagavara main road"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0319035",
                        "lon": "77.622181"
                    },
                    {
                        "lat": "13.0319035",
                        "lon": "77.622181"
                    },
                    {
                        "lat": "13.0320502",
                        "lon": "77.6218265"
                    }
                ],
                "radius": "custom",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T08:40:16.645699Z",
            "modified": "2026-08-16T08:45:12.395109Z"
        },
        {
            "question_id": "1595353b-67e6-47cb-a823-138d7f56913b",
            "question_template_id": "08efb887-da74-4ed3-b0df-6894c660e4c0",
            "rendered_question": "Send a photo of Widest Street in your hiding zone",
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
            "geo": {
                "count": 0
            },
            "question_meta": {
                "location_points": null
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": "Sent photo"
                }
            },
            "fact_meta": {
                "points": null,
                "radius": "",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": false,
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
            "created": "2026-08-16T07:49:37.125554Z",
            "modified": "2026-08-16T08:04:25.754471Z"
        },
        {
            "question_id": "7e742970-093a-423c-a0bb-2a7a84ec8137",
            "question_template_id": "8b9cf099-62be-4846-88e3-0f39fb5728c8",
            "rendered_question": "Compared to me, are you closer to or further from Richmond town?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0297918",
                        "lon": "77.6306198"
                    },
                    {
                        "lat": "12.965321432846949",
                        "lon": "77.60113232694749"
                    }
                ]
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": "Hiding: 4522m, Seeking: 7848m to target",
                    "confidence": 100,
                    "auto_answered": true,
                    "computation_method": "relative_distance_comparison"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0297918",
                        "lon": "77.6306198"
                    },
                    {
                        "lat": "12.965321432846949",
                        "lon": "77.60113232694749"
                    }
                ],
                "radius": "",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T07:48:44.286637Z",
            "modified": "2026-08-16T07:55:38.919397Z"
        },
        {
            "question_id": "c61e78ba-81d5-417d-bc56-bb40c7388eee",
            "question_template_id": "06e9bee5-a181-4dce-9792-497ead9732f8",
            "rendered_question": "Are you within custom metres of me?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.029775",
                        "lon": "77.6306095"
                    }
                ]
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.029775",
                        "lon": "77.6306095"
                    }
                ],
                "radius": "custom",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T07:42:01.931152Z",
            "modified": "2026-08-16T07:43:47.072381Z"
        },
        {
            "question_id": "c58638cd-be2d-46c5-a22a-a463718fc995",
            "question_template_id": "17b4c363-d953-488c-b646-168bc5097b63",
            "rendered_question": "I've just travelled 1000 metres. Am I hotter or colder?",
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
            "geo": {
                "count": 2
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0257094",
                        "lon": "77.6394838"
                    },
                    {
                        "lat": "13.0257094",
                        "lon": "77.6394838"
                    },
                    {
                        "lat": "13.0300314",
                        "lon": "77.6309925"
                    }
                ]
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": "Hotter"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0257094",
                        "lon": "77.6394838"
                    },
                    {
                        "lat": "13.0257094",
                        "lon": "77.6394838"
                    },
                    {
                        "lat": "13.0300314",
                        "lon": "77.6309925"
                    }
                ],
                "radius": "1000",
                "hider_location": "",
                "split_direction": "",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T07:30:09.551362Z",
            "modified": "2026-08-16T07:38:22.028478Z"
        },
        {
            "question_id": "f2e342c3-ec43-4a38-91f9-e9eaa99acb18",
            "question_template_id": "c5d88c25-9488-4afc-88cb-081b8c6fcf3f",
            "rendered_question": "Are you west of me?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "13.0004199",
                        "lon": "77.6761761"
                    }
                ]
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": "Yes"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "13.0004199",
                        "lon": "77.6761761"
                    }
                ],
                "radius": "",
                "hider_location": "",
                "split_direction": "west",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T07:02:21.803768Z",
            "modified": "2026-08-16T07:12:13.248749Z"
        },
        {
            "question_id": "3ff3e0af-02c2-4a1f-a0ad-cc8f7fb42c2f",
            "question_template_id": "c5d88c25-9488-4afc-88cb-081b8c6fcf3f",
            "rendered_question": "Are you east of me?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "12.9754154",
                        "lon": "77.6071572"
                    }
                ]
            },
            "answer_meta": {
                "result": false,
                "metadata": {
                    "text": "Seeker: (12.975415, 77.607157), Hider: (12.999597, 77.623023), Heading: South/West",
                    "confidence": 100,
                    "auto_answered": true,
                    "computation_method": "relative_heading_comparison"
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "12.9754154",
                        "lon": "77.6071572"
                    }
                ],
                "radius": "",
                "hider_location": "",
                "split_direction": "east",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T06:24:15.329404Z",
            "modified": "2026-08-16T06:26:18.566256Z"
        },
        {
            "question_id": "4749878a-a77d-4b2f-a3d4-a12ac0631e02",
            "question_template_id": "c5d88c25-9488-4afc-88cb-081b8c6fcf3f",
            "rendered_question": "Are you north of me?",
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
            "geo": {
                "count": 1
            },
            "question_meta": {
                "location_points": [
                    {
                        "lat": "12.999635",
                        "lon": "77.6768034"
                    }
                ]
            },
            "answer_meta": {
                "result": true,
                "metadata": {
                    "text": ""
                }
            },
            "fact_meta": {
                "points": [
                    {
                        "lat": "12.999635",
                        "lon": "77.6768034"
                    }
                ],
                "radius": "",
                "hider_location": "",
                "split_direction": "north",
                "preferred_point": "",
                "area_op_type": "",
                "uploaded_area": "",
                "text": "",
                "closer_further": "",
                "selected_line_index": 0,
                "polygon_geo_json": {},
                "feature_name": ""
            },
            "answered": true,
            "accepted": true,
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
            "created": "2026-08-16T06:04:06.402440Z",
            "modified": "2026-08-16T06:12:57.337201Z"
        }
    ]
}