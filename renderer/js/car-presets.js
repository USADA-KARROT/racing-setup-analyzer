/**
 * 車種預設資料庫 — Car Preset Database
 * 街車模式：選車後自動帶入底盤基本參數，使用者只需調可調項目
 *
 * Sources:
 *   - Porsche: Albert Motorsport, Elephant Racing, Rennlist, Suspension Secrets
 *   - Toyota: GR-Zoo.com, gr-yaris.co.uk, Toyota official specs
 *   - BMW: Aftermarket tuning sources
 *   - Ferrari/Lambo: Press specs + engineering estimates (spring rates not published)
 *
 * 資料信心度 legend:
 *   confirmed  = 有明確來源佐證
 *   estimated  = 合理工程推算
 *   unknown    = 無公開數據，使用推估值
 */

var CAR_PRESETS = {
    // ============================================================
    // Porsche 911 GT3
    // ============================================================
    "porsche_996_gt3": {
        "name": "Porsche 911 GT3 (996)",
        "name_zh": "保時捷 911 GT3 (996)",
        "category": "sports_car",
        "years": "1999-2004",
        "layout": "RR",  // Rear engine, rear drive
        "params": {
            "front_spring_rate": 40,       // N/mm (996.2), confirmed
            "rear_spring_rate": 95,        // N/mm (996.2), confirmed
            "front_arb": 180,              // Nm/deg estimated from 26.8mm tube
            "rear_arb": 80,               // Nm/deg estimated from 20.7mm tube
            "front_track": 1485,           // mm, confirmed
            "rear_track": 1495,            // mm, confirmed
            "front_motion_ratio": 1.0,     // MacPherson ~1:1
            "rear_motion_ratio": 0.90,     // Multi-link estimated
            "weight_front_pct": 38.0,      // confirmed
            "total_weight": 1380,          // kg, confirmed
            "cg_height": 470,              // mm, estimated
            "wheelbase": 2355              // mm, confirmed
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s",
            "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41,  // bar (PS4S)
            "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8,
            "rear_camber_deg": -1.7,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport N4",
        "oem_tire_size": "F: 235/40 R18 / R: 295/30 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 18},
            "rear":  {"width": 295, "aspect": 30, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "非電控避震，手動可調車高",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    "porsche_997_gt3": {
        "name": "Porsche 911 GT3 (997)",
        "name_zh": "保時捷 911 GT3 (997)",
        "category": "sports_car",
        "years": "2006-2011",
        "layout": "RR",
        "params": {
            "front_spring_rate": 49,       // N/mm (997.2), confirmed
            "rear_spring_rate": 115,       // N/mm (997.2), confirmed
            "front_arb": 200,              // estimated from ~27mm
            "rear_arb": 120,              // estimated from 25.2mm tube
            "front_track": 1497,           // confirmed
            "rear_track": 1524,            // confirmed
            "front_motion_ratio": 1.0,
            "rear_motion_ratio": 0.90,
            "weight_front_pct": 39.0,      // confirmed (997.2)
            "total_weight": 1395,
            "cg_height": 381,              // measured! (Pelican Parts)
            "wheelbase": 2355
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2",
            "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8,
            "rear_camber_deg": -1.8,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup+",
        "oem_tire_size": "F: 235/35 R19 / R: 305/30 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,  // PASM option
        "damper_defaults": {"front_bump_force": 90, "front_rebound_force": 130, "rear_bump_force": 110, "rear_rebound_force": 160},
        "arb_adjustable": true,
        "notes": "997.2 有 PASM 電控避震選配",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "confirmed",  // Pelican Parts measured
            "motion_ratio": "estimated"
        }
    },

    "porsche_991_gt3": {
        "name": "Porsche 911 GT3 (991)",
        "name_zh": "保時捷 911 GT3 (991)",
        "category": "sports_car",
        "years": "2013-2019",
        "layout": "RR",
        "params": {
            "front_spring_rate": 45,
            "rear_spring_rate": 120,
            "front_arb": 250,              // ~30-31mm, estimated
            "rear_arb": 150,              // ~27.5mm, estimated
            "front_track": 1551,
            "rear_track": 1555,
            "front_motion_ratio": 1.0,
            "rear_motion_ratio": 0.90,
            "weight_front_pct": 39.0,
            "total_weight": 1430,
            "cg_height": 455,              // estimated
            "wheelbase": 2457
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2",
            "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8,
            "rear_camber_deg": -1.8,
            "front_toe_deg": -0.03,  // slight toe-out
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 N1",
        "oem_tire_size": "F: 245/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link + 後輪轉向",
        "damper_adjustable": true,  // PASM standard
        "damper_defaults": {"front_bump_force": 95, "front_rebound_force": 140, "rear_bump_force": 120, "rear_rebound_force": 170},
        "arb_adjustable": true,
        "notes": "首代後輪轉向；球型軸承 camber plate",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    "porsche_992_gt3": {
        "name": "Porsche 911 GT3 (992)",
        "name_zh": "保時捷 911 GT3 (992)",
        "category": "sports_car",
        "years": "2021+",
        "layout": "RR",
        "params": {
            "front_spring_rate": 67,       // progressive, ~equivalent
            "rear_spring_rate": 108,       // progressive, ~equivalent
            "front_arb": 280,              // estimated (larger than 991)
            "rear_arb": 170,
            "front_track": 1601,
            "rear_track": 1553,
            "front_motion_ratio": 0.95,    // double wishbone, estimated
            "rear_motion_ratio": 0.90,
            "weight_front_pct": 40.0,      // confirmed (most forward GT3)
            "total_weight": 1418,          // manual
            "cg_height": 454,              // Car and Driver measured
            "wheelbase": 2457
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2",
            "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5,
            "rear_camber_deg": -2.0,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 255/35 R20 / R: 315/30 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 315, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: 雙A臂 (Double Wishbone) / R: Multi-link + 後輪轉向",
        "damper_adjustable": true,
        "damper_defaults": {"front_bump_force": 100, "front_rebound_force": 150, "rear_bump_force": 130, "rear_rebound_force": 180},
        "arb_adjustable": true,
        "notes": "首代雙A臂前懸吊 (源自 991 RSR 賽車)；漸進式彈簧",
        "confidence": {
            "spring_rate": "estimated",  // progressive rates
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "confirmed",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Toyota GR Yaris
    // ============================================================
    "toyota_gr_yaris": {
        "name": "Toyota GR Yaris (Standard)",
        "name_zh": "豐田 GR Yaris",
        "category": "hot_hatch",
        "years": "2020+",
        "layout": "FF-AWD",  // Front engine, AWD
        "params": {
            "front_spring_rate": 36,       // confirmed
            "rear_spring_rate": 36,        // confirmed (equal F/R!)
            "front_arb": 90,              // estimated from 23.2mm solid
            "rear_arb": 65,               // estimated from 21.3mm
            "front_track": 1536,
            "rear_track": 1572,            // rear wider than front!
            "front_motion_ratio": 1.0,     // MacPherson
            "rear_motion_ratio": 0.85,     // double wishbone rear
            "weight_front_pct": 59.0,      // confirmed (front-heavy!)
            "total_weight": 1280,
            "cg_height": 500,              // estimated
            "wheelbase": 2560
        },
        "tire_defaults": {
            "front_compound": "yokohama_ad08r",
            "rear_compound": "yokohama_ad08r",
            "front_optimal_pressure": 2.14,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.4,      // confirmed -1°23'
            "rear_camber_deg": -1.9,       // confirmed -1°55'
            "front_toe_deg": 0.05,         // 1.8mm toe-in
            "rear_toe_deg": 0.07           // 2.2mm toe-in
        },
        "oem_tire": "Dunlop SP Sport MAXX 050",
        "oem_tire_size": "F: 225/40 ZR18 / R: 225/40 ZR18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: 雙A臂 (Double Wishbone)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "前重 59%，等前後彈簧率 36/36 是特殊設計；AWD 中差會過熱",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    "toyota_gr_yaris_circuit": {
        "name": "Toyota GR Yaris Circuit Pack",
        "name_zh": "豐田 GR Yaris Circuit Pack",
        "category": "hot_hatch",
        "years": "2020+",
        "layout": "FF-AWD",
        "params": {
            "front_spring_rate": 36,       // same rate, stiffer construction
            "rear_spring_rate": 36,
            "front_arb": 100,              // 24.2mm (thicker than standard)
            "rear_arb": 65,
            "front_track": 1536,
            "rear_track": 1572,
            "front_motion_ratio": 1.0,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 59.0,
            "total_weight": 1280,
            "cg_height": 500,
            "wheelbase": 2560
        },
        "tire_defaults": {
            "front_compound": "yokohama_ad08r",
            "rear_compound": "yokohama_ad08r",
            "front_optimal_pressure": 2.14,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.4,
            "rear_camber_deg": -1.9,
            "front_toe_deg": 0.05,
            "rear_toe_deg": 0.07
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 225/40 ZR18 / R: 225/40 ZR18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double Wishbone",
        "damper_adjustable": false,        // circuit-tuned but not adjustable
        "arb_adjustable": false,
        "notes": "Circuit Pack: 前後 Torsen LSD、BBS 鍛造輪圈 (8.8kg)、加粗前 ARB",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "confirmed",     // Powerflex bush catalog confirms 24.2mm
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Ferrari (spring rates / ARB not published — all estimated)
    // ============================================================
    "ferrari_488_gtb": {
        "name": "Ferrari 488 GTB",
        "name_zh": "法拉利 488 GTB",
        "category": "supercar",
        "years": "2015-2019",
        "layout": "MR",  // Mid engine, rear drive
        "params": {
            "front_spring_rate": 55,       // ESTIMATED (not published)
            "rear_spring_rate": 90,        // ESTIMATED
            "front_arb": 200,
            "rear_arb": 120,
            "front_track": 1679,
            "rear_track": 1647,
            "front_motion_ratio": 0.85,    // double wishbone
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 41.5,      // confirmed
            "total_weight": 1475,          // curb
            "cg_height": 460,              // estimated
            "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "continental_ecf",
            "rear_compound": "continental_ecf",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -1.7,
            "rear_camber_deg": -2.2,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: 雙A臂 / R: Multi-link (磁流變避震 SCM2)",
        "damper_adjustable": true,         // magnetorheological
        "damper_defaults": {"front_bump_force": 85, "front_rebound_force": 125, "rear_bump_force": 105, "rear_rebound_force": 155},
        "arb_adjustable": false,
        "notes": "彈簧率/ARB 為推估值 — Ferrari 不公開；磁流變避震自動控制",
        "confidence": {
            "spring_rate": "unknown",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "unknown",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    "ferrari_488_pista": {
        "name": "Ferrari 488 Pista",
        "name_zh": "法拉利 488 Pista",
        "category": "supercar",
        "years": "2018-2019",
        "layout": "MR",
        "params": {
            "front_spring_rate": 65,       // ESTIMATED (stiffer than GTB)
            "rear_spring_rate": 110,       // ESTIMATED
            "front_arb": 180,              // thinner ARB than GTB (Pista design)
            "rear_arb": 100,
            "front_track": 1679,
            "rear_track": 1649,
            "front_motion_ratio": 0.85,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 41.5,
            "total_weight": 1385,
            "cg_height": 450,
            "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2",
            "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0,
            "rear_camber_deg": -2.5,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 K2",
        "oem_tire_size": "F: 245/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: 雙A臂 / R: Multi-link (磁流變避震 SCM-E)",
        "damper_adjustable": true,
        "damper_defaults": {"front_bump_force": 95, "front_rebound_force": 140, "rear_bump_force": 120, "rear_rebound_force": 170},
        "arb_adjustable": false,
        "notes": "比 GTB 輕 90kg；彈簧率/ARB 為推估值",
        "confidence": {
            "spring_rate": "unknown",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "unknown",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    "ferrari_296_gtb": {
        "name": "Ferrari 296 GTB",
        "name_zh": "法拉利 296 GTB",
        "category": "supercar",
        "years": "2022+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 55,
            "rear_spring_rate": 95,
            "front_arb": 200,
            "rear_arb": 130,
            "front_track": 1665,
            "rear_track": 1632,
            "front_motion_ratio": 0.85,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 40.5,
            "total_weight": 1570,          // PHEV 較重
            "cg_height": 450,
            "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2",
            "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5,
            "rear_camber_deg": -2.0,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S K1",
        "oem_tire_size": "F: 245/35 R20 / R: 305/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: 雙A臂 / R: Multi-link",
        "damper_adjustable": true,
        "damper_defaults": {"front_bump_force": 80, "front_rebound_force": 120, "rear_bump_force": 100, "rear_rebound_force": 150},
        "arb_adjustable": false,
        "notes": "V6 + 電動馬達 PHEV；彈簧率/ARB 為推估值",
        "confidence": {
            "spring_rate": "unknown",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "unknown",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // BMW M3/M4
    // ============================================================
    "bmw_m4_comp_g82": {
        "name": "BMW M4 Competition (G82)",
        "name_zh": "BMW M4 Competition (G82)",
        "category": "sports_car",
        "years": "2021+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28,       // approximate from aftermarket
            "rear_spring_rate": 32,
            "front_arb": 150,
            "rear_arb": 100,
            "front_track": 1617,
            "rear_track": 1605,
            "front_motion_ratio": 1.0,     // MacPherson variant
            "rear_motion_ratio": 0.90,
            "weight_front_pct": 54.0,      // front-engine!
            "total_weight": 1730,
            "cg_height": 525,
            "wheelbase": 2857
        },
        "tire_defaults": {
            "front_compound": "continental_ecf",
            "rear_compound": "continental_ecf",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0,
            "rear_camber_deg": -1.5,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 275/35 R19 / R: 285/30 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: 雙接頭彈簧柱 / R: 五連桿",
        "damper_adjustable": true,
        "damper_defaults": {"front_bump_force": 75, "front_rebound_force": 110, "rear_bump_force": 85, "rear_rebound_force": 130},
        "arb_adjustable": false,
        "notes": "前置引擎 54% 前重；彈簧率為近似值",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Lamborghini
    // ============================================================
    "lamborghini_huracan": {
        "name": "Lamborghini Huracan LP 610-4",
        "name_zh": "藍寶堅尼 Huracan LP 610-4",
        "category": "supercar",
        "years": "2014-2024",
        "layout": "MR-AWD",
        "params": {
            "front_spring_rate": 50,
            "rear_spring_rate": 85,
            "front_arb": 200,
            "rear_arb": 120,
            "front_track": 1668,
            "rear_track": 1620,
            "front_motion_ratio": 0.85,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 43.0,
            "total_weight": 1553,
            "cg_height": 465,
            "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_r",
            "rear_compound": "pirelli_trofeo_r",
            "front_optimal_pressure": 1.86,
            "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5,
            "rear_camber_deg": -2.0,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/30 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 30, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: 雙A臂 / R: 雙A臂",
        "damper_adjustable": true,         // magnetorheological option
        "damper_defaults": {"front_bump_force": 80, "front_rebound_force": 120, "rear_bump_force": 100, "rear_rebound_force": 150},
        "arb_adjustable": false,
        "notes": "AWD；彈簧率/ARB 為推估值",
        "confidence": {
            "spring_rate": "unknown",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "unknown",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Mercedes-AMG
    // ============================================================
    "amg_gt_c190": {
        "name": "Mercedes-AMG GT (C190)",
        "name_zh": "賓士 AMG GT",
        "category": "sports_car",
        "years": "2014-2021",
        "layout": "FMR",  // Front-mid engine, rear drive
        "params": {
            "front_spring_rate": 45,
            "rear_spring_rate": 65,
            "front_arb": 180,
            "rear_arb": 120,
            "front_track": 1679,
            "rear_track": 1651,
            "front_motion_ratio": 0.85,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 47.3,      // near 50:50
            "total_weight": 1645,
            "cg_height": 490,
            "wheelbase": 2630
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2",
            "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.07,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2,
            "rear_camber_deg": -1.8,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 265/35 R19 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: 雙A臂 / R: 雙A臂 (前中置引擎 + 後置變速箱)",
        "damper_adjustable": true,
        "damper_defaults": {"front_bump_force": 85, "front_rebound_force": 125, "rear_bump_force": 95, "rear_rebound_force": 140},
        "arb_adjustable": false,
        "notes": "前中置引擎+後置變速箱 Transaxle 配置，接近 50:50；彈簧率為推估",
        "confidence": {
            "spring_rate": "unknown",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "unknown",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Honda
    // ============================================================
    "honda_s2000": {
        "name": "Honda S2000 (AP2)",
        "name_zh": "本田 S2000",
        "category": "sports_car",
        "years": "1999-2009",
        "layout": "FR",
        "params": {
            "front_spring_rate": 25,
            "rear_spring_rate": 29,
            "front_arb": 120,
            "rear_arb": 100,
            "front_track": 1470,
            "rear_track": 1510,
            "front_motion_ratio": 0.70,
            "rear_motion_ratio": 0.70,
            "weight_front_pct": 50.0,
            "total_weight": 1250,
            "cg_height": 475,
            "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs",
            "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.28,
            "rear_optimal_pressure": 2.28
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5,
            "rear_camber_deg": -1.5,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone RE050",
        "oem_tire_size": "F: 215/45R17 / R: 245/40R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 245, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: 雙A臂 / R: 雙A臂（全車四輪獨立雙A臂）",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "經典前置後驅跑車，9000rpm VTEC 高轉引擎，四輪雙A臂懸吊，接近 50:50 配重",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    "honda_civic_type_r_fl5": {
        "name": "Honda Civic Type R (FL5)",
        "name_zh": "本田 Civic Type R (FL5)",
        "category": "hot_hatch",
        "years": "2023+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 45,
            "rear_spring_rate": 40,
            "front_arb": 150,
            "rear_arb": 80,
            "front_track": 1585,
            "rear_track": 1575,
            "front_motion_ratio": 0.90,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 62.0,
            "total_weight": 1446,
            "cg_height": 510,
            "wheelbase": 2740
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s",
            "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41,
            "rear_optimal_pressure": 2.28
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5,
            "rear_camber_deg": -2.0,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4 S",
        "oem_tire_size": "265/30ZR19",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 30, "rim": 19},
            "rear":  {"width": 265, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Dual-Axis MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "第六代 Type R，Dual-Axis 前懸吊減少扭力轉向，紐柏林 FF 最速紀錄保持者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Toyota 86 / GR86
    // ============================================================
    "toyota_86_zn6": {
        "name": "Toyota 86 (ZN6)",
        "name_zh": "豐田 86 (ZN6)",
        "category": "sports_car",
        "years": "2012-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 31,
            "rear_spring_rate": 36,
            "front_arb": 90,
            "rear_arb": 50,
            "front_track": 1520,
            "rear_track": 1540,
            "front_motion_ratio": 0.75,
            "rear_motion_ratio": 0.70,
            "weight_front_pct": 53.0,
            "total_weight": 1250,
            "cg_height": 460,
            "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "yokohama_ad08r",
            "rear_compound": "yokohama_ad08r",
            "front_optimal_pressure": 2.14,
            "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7,
            "rear_camber_deg": -1.5,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Primacy HP",
        "oem_tire_size": "205/55R16 (base) / 215/45R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: 雙A臂",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "與 Subaru BRZ 共同開發，水平對臥引擎超低重心 460mm，入門 FR 跑車經典",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "confirmed",
            "motion_ratio": "estimated"
        }
    },

    "toyota_gr86_zn8": {
        "name": "Toyota GR86 (ZN8)",
        "name_zh": "豐田 GR86 (ZN8)",
        "category": "sports_car",
        "years": "2022+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 33,
            "rear_spring_rate": 32,
            "front_arb": 95,
            "rear_arb": 55,
            "front_track": 1520,
            "rear_track": 1550,
            "front_motion_ratio": 0.75,
            "rear_motion_ratio": 0.70,
            "weight_front_pct": 53.0,
            "total_weight": 1270,
            "cg_height": 455,
            "wheelbase": 2575
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s",
            "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41,
            "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7,
            "rear_camber_deg": -1.5,
            "front_toe_deg": 0,
            "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "215/40R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 40, "rim": 18},
            "rear":  {"width": 215, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "第二代 86，引擎升級至 2.4L 水平對臥，底盤強化，前後彈簧率更均衡",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // BMW E46
    // ============================================================
    "bmw_e46_m3": {
        "name": "BMW M3 (E46)",
        "name_zh": "BMW M3 (E46)",
        "category": "sports_car",
        "years": "2001-2006",
        "layout": "FR",
        "params": {
            "front_spring_rate": 100,
            "rear_spring_rate": 60,
            "front_arb": 200,
            "rear_arb": 120,
            "front_track": 1507,
            "rear_track": 1527,
            "front_motion_ratio": 0.90,
            "rear_motion_ratio": 0.85,
            "weight_front_pct": 50.3,
            "total_weight": 1570,
            "cg_height": 490,
            "wheelbase": 2731
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs",
            "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.48,
            "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0,
            "rear_camber_deg": -1.8,
            "front_toe_deg": 0.1,
            "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 225/45R18 / R: 255/40R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 255, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link（M 專用副車架）",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S54 直六自然進氣經典，前 100 N/mm 彈簧率較硬，50:50 配重，賽道改裝熱門車型",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_s14": {
        "name": "Nissan Silvia S14",
        "name_zh": "日產 Silvia S14",
        "category": "sports_car",
        "years": "1993-1998",
        "layout": "FR",
        "params": {
            "front_spring_rate": 31, "rear_spring_rate": 44,
            "front_arb": 85, "rear_arb": 65,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1220,
            "cg_height": 465, "wheelbase": 2525
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 205/55 R16 / R: 205/55 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 205, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S14 車身較 S13 加寬，重量增加約 70kg，但操控穩定性提升。前後配重仍為 55:45，搭配 SR20DET 引擎，是甩尾與賽道兼用的熱門選擇。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_s15": {
        "name": "Nissan Silvia S15 Spec-R",
        "name_zh": "日產 Silvia S15 Spec-R",
        "category": "sports_car",
        "years": "1999-2002",
        "layout": "FR",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 49,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1240,
            "cg_height": 455, "wheelbase": 2525
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S15 Spec-R 是 Silvia 系列最終版本，配備六速手排與 Helical LSD，彈簧與阻尼較前代強化。車身剛性提升，被視為原廠狀態下最均衡的 S 底盤。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r32_gtr": {
        "name": "Nissan Skyline GT-R R32",
        "name_zh": "日產 Skyline GT-R R32",
        "category": "sports_car",
        "years": "1989-1994",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 53, "rear_spring_rate": 62,
            "front_arb": 140, "rear_arb": 98,
            "front_track": 1480, "rear_track": 1480,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1430,
            "cg_height": 480, "wheelbase": 2615
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE71",
        "oem_tire_size": "F: 225/50 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "R32 GT-R 搭載 RB26DETT 雙渦輪引擎與 ATTESA E-TS 四驅系統，前後多連桿懸吊。原廠前偏重配置為 57:43，強化前軸抓地力。因其統治性的賽道表現被譽為「戰神」。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r33_gtr": {
        "name": "Nissan Skyline GT-R R33",
        "name_zh": "日產 Skyline GT-R R33",
        "category": "sports_car",
        "years": "1995-1998",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 53, "rear_spring_rate": 62,
            "front_arb": 150, "rear_arb": 105,
            "front_track": 1480, "rear_track": 1480,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1540,
            "cg_height": 485, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 245/45 R17 / R: 245/45 R17",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 17},
            "rear":  {"width": 245, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "R33 軸距加長至 2720mm，車身剛性大幅提升，高速穩定性優於 R32。車重增加約 110kg，但 ATTESA E-TS Pro 與 Super HICAS 的升級彌補了靈活性的損失。曾於紐柏林創下 7 分 59 秒紀錄。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r34_gtr": {
        "name": "Nissan Skyline GT-R R34 V-Spec",
        "name_zh": "日產 Skyline GT-R R34 V-Spec",
        "category": "sports_car",
        "years": "1999-2002",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 64,
            "front_arb": 156, "rear_arb": 110,
            "front_track": 1490, "rear_track": 1490,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1560,
            "cg_height": 475, "wheelbase": 2665
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE040",
        "oem_tire_size": "F: 245/40 R18 / R: 245/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 245, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "R34 V-Spec 軸距縮短至 2665mm 回歸靈活性，配備主動式 LSD 與強化的車體結構。碳纖維後擾流板產生有效下壓力，是 RB26 時代 GT-R 的集大成之作。V-Spec 標配 BREMBO 煞車系統。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r35_gtr": {
        "name": "Nissan GT-R R35",
        "name_zh": "日產 GT-R R35",
        "category": "sports_car",
        "years": "2007-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 70, "rear_spring_rate": 63,
            "front_arb": 200, "rear_arb": 150,
            "front_track": 1590, "rear_track": 1600,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1740,
            "cg_height": 465, "wheelbase": 2780
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Dunlop SP Sport Maxx GT 600 DSST CTT",
        "oem_tire_size": "F: 255/40 R20 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "R35 搭載 VR38DETT 3.8L 雙渦輪引擎與獨立式變速箱（後置式 transaxle），實現接近 54:46 的配重。Bilstein DampTronic 電子可調避震器可依駕駛模式自動調整。後期車型馬力提升至 570ps 以上。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_z34_370z": {
        "name": "Nissan 370Z",
        "name_zh": "日產 370Z",
        "category": "sports_car",
        "years": "2009-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 46, "rear_spring_rate": 63,
            "front_arb": 130, "rear_arb": 95,
            "front_track": 1540, "rear_track": 1565,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1496,
            "cg_height": 460, "wheelbase": 2550
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan Sport V103",
        "oem_tire_size": "F: 225/50 R18 / R: 245/45 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 18},
            "rear":  {"width": 245, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "370Z 搭載 VQ37VHR 3.7L V6 自然進氣引擎，前雙 A 臂後多連桿懸吊與短軸距 2550mm 賦予銳利的轉向反應。NISMO 版本配備專用調校避震器與更硬的彈簧。SynchroRev Match 自動補油功能為一大特色。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_z_rz34": {
        "name": "Nissan Z (RZ34)",
        "name_zh": "日產 Z (RZ34)",
        "category": "sports_car",
        "years": "2022-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 52, "rear_spring_rate": 68,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1545, "rear_track": 1565,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1570,
            "cg_height": 465, "wheelbase": 2550
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S007",
        "oem_tire_size": "F: 255/40 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "新世代 Z 沿用 370Z 的 2550mm 軸距平台，搭載 VR30DDTT 3.0L V6 雙渦輪引擎（405ps）。前雙 A 臂後多連桿維持 Z 系列傳統，懸吊幾何經重新調校，前彈簧較 370Z 強化約 13%。Performance 版配備機械式 LSD。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_s2000_ap1": {
        "name": "Honda S2000 AP1",
        "name_zh": "本田 S2000 AP1",
        "category": "sports_car",
        "years": "1999-2003",
        "layout": "FR",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 31,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1470, "rear_track": 1510,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 1250,
            "cg_height": 430, "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S-02",
        "oem_tire_size": "F: 205/55 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S2000 AP1 搭載 F20C 2.0L VTEC 引擎（紅線 9000rpm），前後雙 A 臂懸吊與 50:50 完美配重是其操控核心。重心高度僅約 430mm，得益於引擎低置設計。後期 AP1 升級為 17 吋輪圈（F:215/45R17 R:245/40R17）。轉向極為精準但極限操控需要經驗。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_civic_ek9": {
        "name": "Honda Civic Type R EK9",
        "name_zh": "本田 Civic Type R EK9",
        "category": "hot_hatch",
        "years": "1997-2000",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 90, "rear_arb": 50,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1050,
            "cg_height": 440, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.13, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 195/55 R15 / R: 195/55 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 15},
            "rear":  {"width": 195, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "EK9 是初代 Civic Type R，搭載 B16B 1.6L VTEC 引擎（185ps/8200rpm）。前後雙 A 臂懸吊在同級中極為罕見，車重僅 1050kg，功率重量比優異。手感直接的液壓轉向與 Helical LSD 是駕駛樂趣的關鍵。紅頭引擎需高轉速才能發揮全部性能。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_civic_fd2": {
        "name": "Honda Civic Type R FD2",
        "name_zh": "本田 Civic Type R FD2",
        "category": "sedan",
        "years": "2007-2010",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 31,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1495, "rear_track": 1500,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1270,
            "cg_height": 470, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Potenza RE070",
        "oem_tire_size": "F: 225/40 R18 / R: 225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "FD2 是四門轎車型態的 Type R，搭載 K20A 2.0L i-VTEC 引擎（225ps/8000rpm）。前懸吊改為麥花臣，後雙 A 臂保留。軸距加長至 2700mm 提升高速穩定性，Helical LSD 與強化車體結構確保賽道性能。日本市場專賣車型。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_civic_fk8": {
        "name": "Honda Civic Type R FK8",
        "name_zh": "本田 Civic Type R FK8",
        "category": "hot_hatch",
        "years": "2017-2021",
        "layout": "FF",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 80,
            "front_track": 1535, "rear_track": 1565,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.82,
            "weight_front_pct": 62.0, "total_weight": 1390,
            "cg_height": 455, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 245/30 R20 / R: 245/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 30, "rim": 20},
            "rear":  {"width": 245, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut (dual-axis) / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "FK8 搭載 K20C1 2.0L VTEC Turbo 引擎（320ps），首次採用渦輪增壓的 Type R。前懸吊為專利 dual-axis strut 設計，有效抑制扭力轉向。自適應避震器可依 Comfort/Sport/+R 模式切換阻尼。曾於 2017 年創下紐柏林前驅車圈速紀錄（7 分 43 秒 80）。20 吋輪圈搭配 245/30 低扁平比輪胎。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_nsx_na1": {
        "name": "Honda NSX NA1",
        "name_zh": "本田 NSX NA1",
        "category": "sports_car",
        "years": "1990-2005",
        "layout": "MR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 35,
            "front_arb": 78, "rear_arb": 96,
            "front_track": 1510, "rear_track": 1530,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 42.0, "total_weight": 1370,
            "cg_height": 440, "wheelbase": 2530
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama A008",
        "oem_tire_size": "F: 215/45 R16 / R: 245/40 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 16},
            "rear":  {"width": 245, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "全鋁車身中置後驅超跑，前後雙A臂懸吊由 Ayrton Senna 協助調校。前後異尺寸輪圈為其特色，重心極低。C30A 3.0L V6 VTEC 自然進氣。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_integra_dc2": {
        "name": "Honda Integra Type R DC2",
        "name_zh": "本田 Integra Type R DC2",
        "category": "sports_car",
        "years": "1995-2001",
        "layout": "FF",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 22,
            "front_arb": 100, "rear_arb": 50,
            "front_track": 1480, "rear_track": 1480,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1060,
            "cg_height": 450, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 195/55 R15 / R: 195/55 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 15},
            "rear":  {"width": 195, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "前後雙A臂是本車最大特色，B18C 1.8L VTEC 紅頭引擎搭配僅 1060kg 車重。輕量化標竿，手感教科書級的前驅跑車。限滑差速器為標配。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_ae86": {
        "name": "Toyota AE86 Sprinter Trueno",
        "name_zh": "豐田 AE86 Sprinter Trueno",
        "category": "sports_car",
        "years": "1983-1987",
        "layout": "FR",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 22,
            "front_arb": 60, "rear_arb": 55,
            "front_track": 1355, "rear_track": 1340,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.72,
            "weight_front_pct": 54.0, "total_weight": 940,
            "cg_height": 460, "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Bridgestone SF-325",
        "oem_tire_size": "F: 185/70 R13 / R: 185/70 R13",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 70, "rim": 13},
            "rear":  {"width": 185, "aspect": 70, "rim": 13}
        },
        "suspension_type": "F: MacPherson / R: 4-link rigid axle",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "傳奇甩尾車，4A-GE 雙凸輪 1.6L 引擎搭配後輪驅動。後四連桿硬軸懸吊是甩尾的關鍵特性。輕量短軸距帶來極高的靈活性。頭文字D 主角車。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_sw20_mr2": {
        "name": "Toyota MR2 SW20 Turbo",
        "name_zh": "豐田 MR2 SW20 Turbo",
        "category": "sports_car",
        "years": "1989-1999",
        "layout": "MR",
        "params": {
            "front_spring_rate": 29, "rear_spring_rate": 39,
            "front_arb": 65, "rear_arb": 90,
            "front_track": 1470, "rear_track": 1480,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 42.0, "total_weight": 1260,
            "cg_height": 440, "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 205/55 R15 / R: 225/50 R15",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 15},
            "rear":  {"width": 225, "aspect": 50, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "中置後驅渦輪小跑車，3S-GTE 引擎。短軸距加上後重偏配讓操控極具挑戰性，突然的 snap oversteer 是其惡名。Rev3 以後懸吊經過大幅修正改善。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_jza80_supra": {
        "name": "Toyota Supra JZA80 RZ",
        "name_zh": "豐田 Supra JZA80 RZ",
        "category": "sports_car",
        "years": "1993-2002",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1520, "rear_track": 1540,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 1510,
            "cg_height": 470, "wheelbase": 2550
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Expedia S-01",
        "oem_tire_size": "F: 235/45 R17 / R: 255/40 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "傳奇 2JZ-GTE 雙渦輪直六引擎，改裝潛力無限。前雙A臂後多連桿懸吊提供出色的高速穩定性。RZ 為日規輕量運動版。接近完美的前後配重。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_a90_supra": {
        "name": "Toyota GR Supra A90",
        "name_zh": "豐田 GR Supra A90",
        "category": "sports_car",
        "years": "2019+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 35,
            "front_arb": 120, "rear_arb": 85,
            "front_track": 1595, "rear_track": 1590,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.0, "total_weight": 1520,
            "cg_height": 455, "wheelbase": 2470
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 255/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "與 BMW Z4 共用平台（J29），B58 3.0L 直六渦輪引擎。極短軸距賦予靈敏轉向反應，主動式電子差速器為標配。前麥花臣附鍛造鋁合金下臂。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_na_miata": {
        "name": "Mazda MX-5 Miata NA",
        "name_zh": "馬自達 MX-5 Miata NA",
        "category": "sports_car",
        "years": "1989-1997",
        "layout": "FR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 19,
            "front_arb": 65, "rear_arb": 50,
            "front_track": 1400, "rear_track": 1420,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 960,
            "cg_height": 430, "wheelbase": 2265
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone SF-325",
        "oem_tire_size": "F: 185/60 R14 / R: 185/60 R14",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 60, "rim": 14},
            "rear":  {"width": 185, "aspect": 60, "rim": 14}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "經典輕量敞篷跑車，前後雙A臂懸吊配上完美配重。以駕駛樂趣著稱，全球賽道日最受歡迎車款之一。改裝零件市場極為豐富。人馬一體哲學的代表作。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_nb_miata": {
        "name": "Mazda MX-5 Miata NB",
        "name_zh": "馬自達 MX-5 Miata NB",
        "category": "sports_car",
        "years": "1998-2005",
        "layout": "FR",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 21,
            "front_arb": 70, "rear_arb": 55,
            "front_track": 1410, "rear_track": 1430,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 1065,
            "cg_height": 435, "wheelbase": 2265
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 195/50 R15 / R: 195/50 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 50, "rim": 15},
            "rear":  {"width": 195, "aspect": 50, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "NA 的進化版，車身剛性大幅提升，維持前後雙A臂。底盤基本延續 NA 但經過全面強化，操控更精確。BP 1.8L 引擎可靠耐用，Mazdaspeed 版附渦輪。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_nd_miata": {
        "name": "Mazda MX-5 Miata ND",
        "name_zh": "馬自達 MX-5 Miata ND",
        "category": "sports_car",
        "years": "2015+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 24,
            "front_arb": 75, "rear_arb": 60,
            "front_track": 1495, "rear_track": 1505,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.82,
            "weight_front_pct": 52.0, "total_weight": 1060,
            "cg_height": 425, "wheelbase": 2310
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S001",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SKYACTIV 世代的 MX-5，回歸輕量化初衷，僅 1060kg。前雙A臂後多連桿為新設計，重心比 NA 還低。SKYACTIV-G 2.0L 引擎高轉延伸性佳。RF 硬頂版重約 45kg 多。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_rx7_fd": {
        "name": "Mazda RX-7 FD3S",
        "name_zh": "馬自達 RX-7 FD3S",
        "category": "sports_car",
        "years": "1992-2002",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 39,
            "front_arb": 100, "rear_arb": 110,
            "front_track": 1460, "rear_track": 1460,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 52.0, "total_weight": 1260,
            "cg_height": 430, "wheelbase": 2425
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Expedia S-01",
        "oem_tire_size": "F: 235/45 R17 / R: 255/40 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "13B-REW 雙渦輪轉子引擎，前後雙A臂懸吊。極低的重心與緊湊的車身尺寸帶來銳利操控。初期型為 225/50R16 及 255/40R16，後期升級 17 吋。Spirit R 為最終限定版。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_gc8_sti": {
        "name": "Subaru Impreza WRX STI GC8",
        "name_zh": "速霸陸 Impreza WRX STI GC8",
        "category": "sports_car",
        "years": "1994-2000",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 29,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1470, "rear_track": 1460,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 59.0, "total_weight": 1260,
            "cg_height": 490, "wheelbase": 2520
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 205/50 R16 / R: 205/50 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 50, "rim": 16},
            "rear":  {"width": 205, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "WRC 霸主的公路版，EJ20 水平對臥渦輪引擎搭配對稱式 AWD。DCCD 中央差速器可調前後扭力分配。前後麥花臣結構簡單但經拉力賽驗證。Ver.V/VI 為最受追捧的型號。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_exige_s3": {
        "name": "Lotus Exige S V6",
        "name_zh": "蓮花 Exige S V6",
        "category": "sports_car",
        "years": "2012-2021",
        "layout": "MR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 52,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1490, "rear_track": 1530,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 39.0, "total_weight": 1176,
            "cg_height": 420, "wheelbase": 2370
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 205/45 R17 / R: 265/35 R18",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 265, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "V6 機械增壓動力搭配輕量車身，賽道利器。雙叉臂懸吊可調性高，前後防傾桿均可調整。原廠減震器具備阻尼調整功能。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_emira": {
        "name": "Lotus Emira V6",
        "name_zh": "蓮花 Emira",
        "category": "sports_car",
        "years": "2022+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 45,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1580, "rear_track": 1570,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 42.0, "total_weight": 1405,
            "cg_height": 440, "wheelbase": 2575
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.28, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Goodyear Eagle F1 SuperSport",
        "oem_tire_size": "F: 245/35 R20 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "蓮花最新中置跑車，兼顧日常與賽道。鋁合金底盤搭配雙叉臂懸吊，操控精準。可選配賽道套件含可調減震器。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_570s": {
        "name": "McLaren 570S",
        "name_zh": "麥拉倫 570S",
        "category": "sports_car",
        "years": "2015-2021",
        "layout": "MR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 80,
            "front_arb": 120, "rear_arb": 100,
            "front_track": 1600, "rear_track": 1590,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 1313,
            "cg_height": 430, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.21, "rear_optimal_pressure": 2.28
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 225/35 R19 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "碳纖維單體殼底盤，液壓互連懸吊系統。三種駕駛模式（Normal/Sport/Track）改變減震器阻尼設定。無傳統防傾桿，由液壓系統替代。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_720s": {
        "name": "McLaren 720S",
        "name_zh": "麥拉倫 720S",
        "category": "sports_car",
        "years": "2017+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 90,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1600, "rear_track": 1590,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 1283,
            "cg_height": 420, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.21, "rear_optimal_pressure": 2.28
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.12
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 245/35 R19 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "第二代超級系列，Proactive Chassis Control II 液壓互連懸吊。碳纖維單體殼比570S更輕更剛。無傳統防傾桿，液壓系統提供主動側傾控制。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "caterham_7_420r": {
        "name": "Caterham Seven 420R",
        "name_zh": "卡特漢姆 Seven 420R",
        "category": "sports_car",
        "years": "2016+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 60, "rear_arb": 0,
            "front_track": 1350, "rear_track": 1400,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.85,
            "weight_front_pct": 48.0, "total_weight": 560,
            "cg_height": 350, "wheelbase": 2230
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 1.93, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Avon ZZR",
        "oem_tire_size": "F: 185/55 R15 / R: 205/50 R16",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 15},
            "rear":  {"width": 205, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: De Dion",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "極致輕量化道路賽車，重心極低。De Dion 後軸提供獨立懸吊般的操控特性。無後防傾桿，後軸側傾剛度靠彈簧提供。對路面品質敏感，適合賽道使用。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "confirmed",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mini_jcw_f56": {
        "name": "MINI John Cooper Works F56",
        "name_zh": "MINI JCW (F56)",
        "category": "hot_hatch",
        "years": "2015+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 25,
            "front_arb": 100, "rear_arb": 50,
            "front_track": 1500, "rear_track": 1520,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1280,
            "cg_height": 490, "wheelbase": 2495
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Hankook Ventus S1 evo3",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "前驅鋼砲，短軸距帶來靈活操控。前輪負載高，注意推頭傾向。後多連桿懸吊提供良好的後軸循跡性。可選配電子避震器。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_v8_vantage": {
        "name": "Aston Martin V8 Vantage (2018+)",
        "name_zh": "奧斯頓馬丁 V8 Vantage",
        "category": "sports_car",
        "years": "2018+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1600, "rear_track": 1570,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 49.0, "total_weight": 1530,
            "cg_height": 450, "wheelbase": 2704
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.28, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/40 R20 / R: 295/35 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 20},
            "rear":  {"width": 295, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "AMG 4.0T V8 動力，前中置引擎佈局接近50:50配重。自適應阻尼懸吊搭配雙叉臂結構。前後防傾桿可調，底盤調校偏向運動。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_4c": {
        "name": "Alfa Romeo 4C",
        "name_zh": "愛快羅密歐 4C",
        "category": "sports_car",
        "years": "2013-2020",
        "layout": "MR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 42,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1510, "rear_track": 1540,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.95,
            "weight_front_pct": 40.0, "total_weight": 895,
            "cg_height": 420, "wheelbase": 2380
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero AR",
        "oem_tire_size": "F: 205/45 R17 / R: 235/40 R18",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "碳纖維單體殼結構，無動力轉向。前雙叉臂後麥花臣佈局特殊。極輕車重帶來出色的功率重量比。轉向手感直接但需要適應無助力特性。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_f430": {
        "name": "Ferrari F430",
        "name_zh": "法拉利 F430",
        "category": "sports_car",
        "years": "2004-2009",
        "layout": "MR",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 65,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1590, "rear_track": 1570,
            "front_motion_ratio": 0.73, "rear_motion_ratio": 0.73,
            "weight_front_pct": 43.0, "total_weight": 1450,
            "cg_height": 440, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.12
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 225/35 R19 / R: 285/35 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "4.3L V8 自然進氣經典中置跑車。E-Diff 電子差速器首次應用。可選配磁流變減震器。前後雙叉臂提供優秀的幾何控制，但車重較現代車型偏高。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "fiat_abarth_595": {
        "name": "Abarth 595 Competizione",
        "name_zh": "阿巴斯 595 Competizione",
        "category": "hot_hatch",
        "years": "2012+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 22,
            "front_arb": 80, "rear_arb": 0,
            "front_track": 1410, "rear_track": 1400,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.65,
            "weight_front_pct": 63.0, "total_weight": 1110,
            "cg_height": 510, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.28, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.2
        },
        "oem_tire": "Pirelli P Zero Nero",
        "oem_tire_size": "F: 205/40 R17 / R: 205/40 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 17},
            "rear":  {"width": 205, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "小車身大馬力的義式鋼砲。後扭力樑懸吊限制了後軸調校空間，無後防傾桿。前驅佈局搭配短軸距，市區靈活但高速穩定性需注意。Koni FSD 減震器為選配。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "maserati_granturismo": {
        "name": "Maserati GranTurismo",
        "name_zh": "瑪莎拉蒂 GranTurismo",
        "category": "sports_car",
        "years": "2007-2019",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 42,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1590, "rear_track": 1570,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 49.0, "total_weight": 1880,
            "cg_height": 470, "wheelbase": 2942
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.28, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 R20 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "GT 定位的大型前置後驅跑車，4.7L V8 自然進氣。Skyhook 自適應懸吊系統。車重偏高但軸距長，高速穩定性佳。底盤調校偏舒適，適合長途巡航。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_giulia_qv": {
        "name": "Alfa Romeo Giulia Quadrifoglio",
        "name_zh": "愛快羅密歐 Giulia QV",
        "category": "sedan",
        "years": "2016+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 45,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1570, "rear_track": 1560,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 1580,
            "cg_height": 480, "wheelbase": 2820
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.28, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 245/35 R19 / R: 285/30 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2.9L V6 雙渦輪增壓，完美50:50配重。前雙叉臂搭配後多連桿，底盤由Ferrari技術團隊調校。主動懸吊與Torque Vectoring差速器為標配。碳纖維傳動軸降低轉動慣量。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_mustang_s550_gt": {
        "name": "Ford Mustang GT S550",
        "name_zh": "福特 Mustang GT (S550)",
        "category": "sports_car",
        "years": "2015-2023",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.0, "total_weight": 1720,
            "cg_height": 510, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/40 R19 / R: 275/40 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 19},
            "rear":  {"width": 275, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Integral link",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "5.0L Coyote V8，首代獨立後懸吊 Mustang。前頭重，可透過加粗後防傾桿改善轉向特性。Performance Pack 包含更大煞車與 Torsen LSD。MagneRide 為 PP2 選配。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_mustang_s650_gt": {
        "name": "Ford Mustang GT S650",
        "name_zh": "福特 Mustang GT (S650)",
        "category": "sports_car",
        "years": "2024+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 37,
            "front_arb": 135, "rear_arb": 105,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.0, "total_weight": 1735,
            "cg_height": 505, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 255/40 R19 / R: 275/40 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 19},
            "rear":  {"width": 275, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Integral link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "最新世代 Mustang，5.0L V8 升級至486hp。MagneRide 3.0 列為 Performance Pack 標配。底盤結構強化，後副車架剛性提升。電子差速器取代機械式 LSD。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_mustang_gt350": {
        "name": "Ford Mustang Shelby GT350",
        "name_zh": "福特 Mustang Shelby GT350",
        "category": "sports_car",
        "years": "2016-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 57, "rear_spring_rate": 57,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.0, "total_weight": 1705,
            "cg_height": 490, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.3, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 295/35 R19 / R: 305/35 R19",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Integral link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "5.2L Voodoo 平曲軸 V8，8250rpm紅線。MagneRide 標配，彈簧率顯著高於標準 GT。寬體輪拱容納超寬輪胎。賽道取向調校，日常舒適性妥協明顯。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_camaro_ss_6g": {
        "name": "Chevrolet Camaro SS (6th Gen)",
        "name_zh": "雪佛蘭 Camaro SS (6th Gen)",
        "category": "sports_car",
        "years": "2016-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 37, "rear_spring_rate": 32,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1680,
            "cg_height": 500, "wheelbase": 2811
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Goodyear Eagle F1 Asymmetric 3",
        "oem_tire_size": "F: 245/40 R20 / R: 275/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 20},
            "rear":  {"width": 275, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "6.2L LT1 V8，Alpha 平台比前代大幅減重。MagneRide 為1LE套件標配。前麥花臣搭配五連桿後懸吊，操控表現超越同級。1LE套件加入電子限滑差速器。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_corvette_c7_z06": {
        "name": "Chevrolet Corvette C7 Z06",
        "name_zh": "雪佛蘭 Corvette C7 Z06",
        "category": "sports_car",
        "years": "2015-2019",
        "layout": "FR",
        "params": {
            "front_spring_rate": 63, "rear_spring_rate": 55,
            "front_arb": 160, "rear_arb": 140,
            "front_track": 1610, "rear_track": 1600,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 1598,
            "cg_height": 450, "wheelbase": 2710
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.21, "rear_optimal_pressure": 2.28
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 285/30 R19 / R: 335/25 R20",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 30, "rim": 19},
            "rear":  {"width": 335, "aspect": 25, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "6.2L LT4 機械增壓 V8，鋁合金車架。前後雙叉臂搭配 MagneRide 3.0 磁流變減震器。Z07套件增加碳纖維空力套件產生巨大下壓力。已知高溫賽道散熱問題。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_corvette_c8": {
        "name": "Chevrolet Corvette C8",
        "name_zh": "雪佛蘭 Corvette C8",
        "category": "sports_car",
        "years": "2020+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 60,
            "front_arb": 110, "rear_arb": 100,
            "front_track": 1590, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 40.0, "total_weight": 1527,
            "cg_height": 440, "wheelbase": 2722
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.21, "rear_optimal_pressure": 2.28
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.12
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 245/35 R19 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "首代中置引擎 Corvette，6.2L LT2 V8。MagneRide 4.0 標配（Z51套件）。從前置轉為中置佈局，重量分佈大幅改善。乾式油底殼設計降低重心。電子限滑差速器標配。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dodge_challenger_hellcat": {
        "name": "Dodge Challenger SRT Hellcat",
        "name_zh": "道奇 Challenger SRT Hellcat",
        "category": "sports_car",
        "years": "2015+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1590, "rear_track": 1600,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 2025,
            "cg_height": 540, "wheelbase": 2946
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/40 R20 / R: 275/40 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 40, "rim": 20},
            "rear":  {"width": 275, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "6.2L HEMI 機械增壓 V8，717hp+。車重超過兩噸，前頭重比例高。Bilstein 自適應減震器標配。直線加速為主要設計取向，彎道性能受限於車重與前軸負載。寬體版增加輪距。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tesla_model_3_perf": {
        "name": "Tesla Model 3 Performance",
        "name_zh": "特斯拉 Model 3 Performance",
        "category": "electric",
        "years": "2019+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 38,
            "front_arb": 120, "rear_arb": 90,
            "front_track": 1580, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 48.0, "total_weight": 1847,
            "cg_height": 460, "wheelbase": 2875
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.76, "rear_optimal_pressure": 2.83
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 235/35 R20 / R: 265/35 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 20},
            "rear":  {"width": 265, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "雙馬達全驅電動車，電池組位於底盤中央降低重心。車重偏高但重心極低，彎中穩定性佳。電動動力扭矩響應即時，出彎加速優勢明顯。原廠胎壓建議偏高以降低滾阻。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_focus_rs_mk3": {
        "name": "Ford Focus RS Mk3",
        "name_zh": "福特 Focus RS Mk3",
        "category": "hot_hatch",
        "years": "2016-2018",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1560, "rear_track": 1550,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1572,
            "cg_height": 520, "wheelbase": 2648
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2.3L EcoBoost 四驅鋼砲，GKN Twinster 後軸扭矩分配系統可實現甩尾模式。前軸負載高但四驅系統有效改善推頭。原廠配備 Cup 2 半熱熔胎。已知頭墊片問題需注意。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_elantra_n": {
        "name": "Hyundai Elantra N",
        "name_zh": "現代 Elantra N",
        "category": "sedan",
        "years": "2022+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 32,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1498,
            "cg_height": 510, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 245/35 R19 / R: 245/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 245, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2.0T 前驅性能房車，電子控制懸吊（ECS）標配。N Corner Carving Differential (e-LSD) 有效抑制扭矩轉向。N Grin Shift 提供短暫超增壓。賽道模式下 Launch Control 與 Rev Matching 自動啟用。性價比極高的賽道入門車。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e36_m3": {
        "name": "BMW M3 (E36)",
        "name_zh": "BMW M3 (E36)",
        "category": "sports_car",
        "years": "1992-1999",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 32,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1484, "rear_track": 1496,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 52.0, "total_weight": 1460,
            "cg_height": 480, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 225/45 R17 / R: 245/40 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 245, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (Z-axle)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "E36 M3搭載S50/S52直六引擎，後軸採用經典Z-axle多連桿設計。重心適中，前後配重均勻，適合作為入門級駕駛訓練用車。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e92_m3": {
        "name": "BMW M3 (E92)",
        "name_zh": "BMW M3 (E92)",
        "category": "sports_car",
        "years": "2007-2013",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 38,
            "front_arb": 130, "rear_arb": 105,
            "front_track": 1538, "rear_track": 1540,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 52.0, "total_weight": 1655,
            "cg_height": 475, "wheelbase": 2761
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport PS2",
        "oem_tire_size": "F: 245/40 R18 / R: 265/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 265, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "搭載S65 V8自然進氣引擎的E92 M3，高轉速特性鮮明。EDC電子避震可調，前後配重均衡，賽道表現優異。車重較高但底盤剛性出色。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_f80_m3": {
        "name": "BMW M3 (F80)",
        "name_zh": "BMW M3 (F80)",
        "category": "sports_car",
        "years": "2014-2018",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 40,
            "front_arb": 135, "rear_arb": 110,
            "front_track": 1540, "rear_track": 1555,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 52.0, "total_weight": 1560,
            "cg_height": 465, "wheelbase": 2812
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 255/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "F80 M3使用S55雙渦輪直六引擎，大量碳纖維材料減輕車重。自適應M懸吊可調三段阻尼，碳纖維傳動軸降低簧下質量。轉向手感精準但路感回饋較E92少。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_g80_m3": {
        "name": "BMW M3 (G80)",
        "name_zh": "BMW M3 (G80)",
        "category": "sports_car",
        "years": "2021+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 42,
            "front_arb": 140, "rear_arb": 115,
            "front_track": 1585, "rear_track": 1590,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 54.0, "total_weight": 1730,
            "cg_height": 470, "wheelbase": 2857
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 275/35 R19 / R: 285/30 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "G80 M3搭載S58雙渦輪直六引擎，動力大幅提升。車重增加明顯，但底盤調校更為成熟。前後交錯輪圈尺寸(19/20)，後軸抓地力充足。Competition版標配自適應懸吊。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e85_z4m": {
        "name": "BMW Z4 M (E85)",
        "name_zh": "BMW Z4 M (E85)",
        "category": "sports_car",
        "years": "2006-2008",
        "layout": "FR",
        "params": {
            "front_spring_rate": 33, "rear_spring_rate": 36,
            "front_arb": 120, "rear_arb": 95,
            "front_track": 1476, "rear_track": 1504,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 51.0, "total_weight": 1450,
            "cg_height": 450, "wheelbase": 2495
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental ContiSportContact 3",
        "oem_tire_size": "F: 225/45 R18 / R: 255/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 255, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Z4 M搭載E46 M3的S54直六引擎，短軸距帶來極高靈活性。車身重心極低，敞篷結構但底盤剛性仍可接受。後軸容易滑動，需要精準的油門控制。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_f87_m2": {
        "name": "BMW M2 (F87)",
        "name_zh": "BMW M2 (F87)",
        "category": "sports_car",
        "years": "2016-2021",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 37,
            "front_arb": 125, "rear_arb": 100,
            "front_track": 1535, "rear_track": 1555,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 53.0, "total_weight": 1570,
            "cg_height": 460, "wheelbase": 2693
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 245/35 R19 / R: 265/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 265, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "F87 M2基於2系Coupe平台，短軸距配合M差速器帶來極佳的操控樂趣。M2 Competition版搭載S55引擎。自適應懸吊可調，尺寸緊湊適合山路駕駛。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_g87_m2": {
        "name": "BMW M2 (G87)",
        "name_zh": "BMW M2 (G87)",
        "category": "sports_car",
        "years": "2023+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 40,
            "front_arb": 135, "rear_arb": 110,
            "front_track": 1580, "rear_track": 1585,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 54.0, "total_weight": 1725,
            "cg_height": 465, "wheelbase": 2745
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 275/35 R19 / R: 285/30 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "G87 M2使用S58雙渦輪引擎與G80 M3共享動力總成，車重大幅增加。前後交錯輪圈設計(19/20)，標配自適應懸吊。車身尺寸較F87明顯加大。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_718_cayman_s": {
        "name": "Porsche 718 Cayman S",
        "name_zh": "保時捷 718 Cayman S",
        "category": "sports_car",
        "years": "2016+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 50,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1510, "rear_track": 1535,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.97,
            "weight_front_pct": 45.0, "total_weight": 1385,
            "cg_height": 440, "wheelbase": 2475
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 235/40 R19 / R: 265/40 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 19},
            "rear":  {"width": 265, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "718 Cayman S中置引擎佈局提供近乎完美的重心位置。前後均為MacPherson設計，motion ratio接近1:1。PASM可調避震標配，底盤平衡性為保時捷產品線中最佳。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_718_gt4": {
        "name": "Porsche 718 Cayman GT4",
        "name_zh": "保時捷 718 Cayman GT4",
        "category": "sports_car",
        "years": "2020+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 60,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1522, "rear_track": 1540,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.97,
            "weight_front_pct": 44.0, "total_weight": 1420,
            "cg_height": 430, "wheelbase": 2484
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 245/35 R20 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "718 GT4搭載4.0升自然進氣水平對臥六缸引擎，源自992世代。前後防傾桿可調，PASM避震可調。大尾翼提供額外下壓力，賽道取向但保留街道實用性。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_964_rs": {
        "name": "Porsche 911 RS (964)",
        "name_zh": "保時捷 911 RS (964)",
        "category": "sports_car",
        "years": "1992-1994",
        "layout": "RR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 65,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1382, "rear_track": 1394,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 38.0, "total_weight": 1220,
            "cg_height": 450, "wheelbase": 2272
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.07
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone RE71",
        "oem_tire_size": "F: 205/50 R17 / R: 255/40 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 50, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "964 RS為經典輕量化911，大幅減重至1220kg。後軸半乘曳臂設計在極限時較不可預測，需要豐富的駕駛經驗。前後防傾桿可手動調節，彈簧率較標準964大幅提升。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_993_rs": {
        "name": "Porsche 911 RS (993)",
        "name_zh": "保時捷 911 RS (993)",
        "category": "sports_car",
        "years": "1995-1998",
        "layout": "RR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 70,
            "front_arb": 130, "rear_arb": 85,
            "front_track": 1405, "rear_track": 1444,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.85,
            "weight_front_pct": 37.0, "total_weight": 1270,
            "cg_height": 445, "wheelbase": 2272
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.07
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 225/40 R18 / R: 265/35 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 265, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (LSA)",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "993 RS為最後的氣冷911 RS，後軸改用多連桿(LSA)設計大幅改善極限穩定性。自然進氣3.8升水平對臥引擎。輕量化車身配合賽道取向懸吊，是氣冷911的操控巔峰。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_taycan": {
        "name": "Porsche Taycan 4S",
        "name_zh": "保時捷 Taycan 4S",
        "category": "electric",
        "years": "2020+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 60,
            "front_arb": 150, "rear_arb": 120,
            "front_track": 1554, "rear_track": 1560,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.85,
            "weight_front_pct": 49.0, "total_weight": 2140,
            "cg_height": 420, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_rs", "rear_compound": "pirelli_trofeo_rs",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.62
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Elect",
        "oem_tire_size": "F: 225/55 R19 / R: 275/45 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 19},
            "rear":  {"width": 275, "aspect": 45, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Taycan 4S為純電動跑車，電池組安裝於底盤中央使重心極低(420mm)。前雙A臂後多連桿懸吊，PASM標配。車重超過2噸但底盤調校維持保時捷水準。後軸轉向可選配。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_c63_w204": {
        "name": "Mercedes-AMG C63 (W204)",
        "name_zh": "賓士 AMG C63 (W204)",
        "category": "sedan",
        "years": "2008-2014",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 45,
            "front_arb": 135, "rear_arb": 115,
            "front_track": 1546, "rear_track": 1552,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 54.0, "total_weight": 1730,
            "cg_height": 510, "wheelbase": 2760
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Dunlop SP Sport Maxx GT",
        "oem_tire_size": "F: 235/35 R19 / R: 255/30 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 255, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: 3-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "W204 C63搭載M156 6.2升V8自然進氣引擎，動力充沛但車頭較重。前三連桿懸吊為賓士特色設計。Performance Package版配備機械式限滑差速器。底盤偏向舒適但仍具運動性。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_c63s_w205": {
        "name": "Mercedes-AMG C63 S (W205)",
        "name_zh": "賓士 AMG C63 S (W205)",
        "category": "sedan",
        "years": "2015-2021",
        "layout": "FR",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 48,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1562, "rear_track": 1568,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 55.0, "total_weight": 1770,
            "cg_height": 505, "wheelbase": 2840
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 255/35 R19 / R: 285/30 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: 4-link / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "W205 C63 S搭載M177 4.0升雙渦輪V8引擎，動力提升且油耗改善。AMG Ride Control自適應避震可調三段。電子限滑差速器取代機械式，前軸負荷仍然偏高。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_amg_gt": {
        "name": "Mercedes-AMG GT",
        "name_zh": "賓士 AMG GT",
        "category": "sports_car",
        "years": "2015-2021",
        "layout": "FR",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 55,
            "front_arb": 145, "rear_arb": 110,
            "front_track": 1625, "rear_track": 1572,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 47.0, "total_weight": 1615,
            "cg_height": 445, "wheelbase": 2630
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 265/35 R19 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "AMG GT採用前中置引擎佈局，M178 4.0升雙渦輪V8。前後雙A臂懸吊為鋁合金材質。後置變速箱(transaxle)實現47:53前後配重。電子避震三段可調，車身重心極低。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_rs3_8v": {
        "name": "Audi RS3 (8V)",
        "name_zh": "奧迪 RS3 (8V)",
        "category": "hot_hatch",
        "years": "2015-2020",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1534, "rear_track": 1508,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 59.0, "total_weight": 1520,
            "cg_height": 520, "wheelbase": 2631
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "RS3搭載2.5升直列五缸渦輪引擎，Quattro四驅系統前軸偏重明顯。Magnetic Ride磁流變避震可選配。前驅偏重的佈局在高速過彎時傾向推頭，需依賴四驅系統分配動力補償。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_r8_v10": {
        "name": "Audi R8 V10",
        "name_zh": "奧迪 R8 V10",
        "category": "sports_car",
        "years": "2009-2015",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 60,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1592, "rear_track": 1588,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 44.0, "total_weight": 1620,
            "cg_height": 440, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 235/35 R19 / R: 295/30 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "R8 V10中置引擎全鋁車架，前後雙A臂懸吊源自賽車技術。Quattro四驅但後軸驅動偏重。5.2升V10自然進氣引擎，Magnetic Ride磁流變避震標配。重心極低，底盤平衡感極佳。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_ttrs_8j": {
        "name": "Audi TT RS (8J)",
        "name_zh": "奧迪 TT RS (8J)",
        "category": "sports_car",
        "years": "2009-2014",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 85,
            "front_track": 1507, "rear_track": 1492,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 58.0, "total_weight": 1450,
            "cg_height": 480, "wheelbase": 2468
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental ContiSportContact 3",
        "oem_tire_size": "245/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 245, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "TT RS搭載2.5升直列五缸渦輪引擎，與RS3共享動力總成。短軸距配合Quattro四驅，前軸偏重但操控靈活。Magnetic Ride可選配，底盤回饋直接。短車身在彎道中反應敏銳。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_golf_gti_mk7": {
        "name": "Volkswagen Golf GTI Mk7",
        "name_zh": "福斯 Golf GTI Mk7",
        "category": "hot_hatch",
        "years": "2013-2020",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 24,
            "front_arb": 110, "rear_arb": 75,
            "front_track": 1535, "rear_track": 1510,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 60.0, "total_weight": 1349,
            "cg_height": 540, "wheelbase": 2631
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.2
        },
        "oem_tire": "Bridgestone Potenza S001",
        "oem_tire_size": "225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "MQB平台打造的Mk7 GTI是鋼砲標竿，XDS電子限滑差速器補償前驅轉向不足。MK7.5 Performance版配備機械式LSD。後多連桿獨立懸吊(非扭力樑)提供優異的後軸穩定性。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_golf_r_mk7": {
        "name": "Volkswagen Golf R Mk7",
        "name_zh": "福斯 Golf R Mk7",
        "category": "hot_hatch",
        "years": "2014-2020",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 115, "rear_arb": 85,
            "front_track": 1535, "rear_track": 1510,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 59.0, "total_weight": 1477,
            "cg_height": 535, "wheelbase": 2631
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental ContiSportContact 5P",
        "oem_tire_size": "225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Golf R搭載EA888 2.0T引擎配合Haldex四驅系統。DCC自適應避震可選配，電子差速器鎖前後軸。比GTI重約130kg但四驅系統大幅提升出彎牽引力。前軸仍然偏重。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_golf_gti_mk8": {
        "name": "Volkswagen Golf GTI Mk8",
        "name_zh": "福斯 Golf GTI Mk8",
        "category": "hot_hatch",
        "years": "2020+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 115, "rear_arb": 80,
            "front_track": 1540, "rear_track": 1515,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.85,
            "weight_front_pct": 60.0, "total_weight": 1385,
            "cg_height": 535, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.2
        },
        "oem_tire": "Bridgestone Potenza S005",
        "oem_tire_size": "225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Mk8 GTI延續MQB Evo平台，標配DCC自適應避震與Vehicle Dynamics Manager整合控制。EA888 Gen4引擎動力提升至245ps。電子限滑差速器(XDS+)更為精密，底盤電子化程度更高。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_vab_sti": {
        "name": "Subaru WRX STI (VAB)",
        "name_zh": "速霸陸 WRX STI (VAB)",
        "category": "sports_car",
        "years": "2014-2019",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 33,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1530, "rear_track": 1530,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 59.0, "total_weight": 1535,
            "cg_height": 480, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama ADVAN Sport V105",
        "oem_tire_size": "F: 245/35 R19 / R: 245/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 245, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "VAB 末代 STI，DCCD 中央差速器可調，Bilstein 避震可選，前重偏高但後雙 A 臂提供良好循跡性",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_brz_zc6": {
        "name": "Subaru BRZ (ZC6)",
        "name_zh": "速霸陸 BRZ (ZC6)",
        "category": "sports_car",
        "years": "2012-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 27, "rear_spring_rate": 31,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1520, "rear_track": 1540,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.75,
            "weight_front_pct": 53.0, "total_weight": 1230,
            "cg_height": 460, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Primacy HP",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "初代 86/BRZ 共用平台，極低重心（460mm），原廠胎刻意窄以強調駕駛樂趣，後雙 A 臂懸吊幾何優秀",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "confirmed",
            "motion_ratio": "estimated"
        }
    },
    "subaru_brz_zd8": {
        "name": "Subaru BRZ (ZD8)",
        "name_zh": "速霸陸 BRZ (ZD8)",
        "category": "sports_car",
        "years": "2022+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 35,
            "front_arb": 95, "rear_arb": 75,
            "front_track": 1520, "rear_track": 1550,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.75,
            "weight_front_pct": 53.0, "total_weight": 1270,
            "cg_height": 455, "wheelbase": 2575
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 215/40 R18 / R: 215/40 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 40, "rim": 18},
            "rear":  {"width": 215, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "二代 BRZ，剛性提升50%，重心更低，2.4L 水平對臥引擎，鋁製車頂降低重心，內側後輪制動轉向控制",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "confirmed",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_evo9": {
        "name": "Mitsubishi Lancer Evolution IX",
        "name_zh": "三菱 Lancer Evolution IX",
        "category": "sports_car",
        "years": "2005-2007",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 30,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1515, "rear_track": 1515,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1400,
            "cg_height": 480, "wheelbase": 2625
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama ADVAN A046",
        "oem_tire_size": "F: 235/45 R17 / R: 235/45 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "最後的 4G63 渦輪引擎 Evo，ACD/AYC 主動中央/後差速器，MIVEC 可變氣門，拉力血統底盤調校",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_evo10": {
        "name": "Mitsubishi Lancer Evolution X",
        "name_zh": "三菱 Lancer Evolution X",
        "category": "sports_car",
        "years": "2007-2016",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 35,
            "front_arb": 120, "rear_arb": 95,
            "front_track": 1530, "rear_track": 1530,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1535,
            "cg_height": 485, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama ADVAN Sport V105",
        "oem_tire_size": "F: 245/40 R18 / R: 245/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 245, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "末代 Evo，4B11T 引擎搭配 S-AWC 超級全輪控制系統，Eibach 彈簧搭配 Bilstein 避震，Brembo 煞車",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "suzuki_swift_sport_zc33": {
        "name": "Suzuki Swift Sport (ZC33S)",
        "name_zh": "鈴木 Swift Sport (ZC33S)",
        "category": "hot_hatch",
        "years": "2017+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 28,
            "front_arb": 80, "rear_arb": 55,
            "front_track": 1500, "rear_track": 1490,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 1.0,
            "weight_front_pct": 61.0, "total_weight": 970,
            "cg_height": 470, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.2
        },
        "oem_tire": "Continental ContiSportContact 5",
        "oem_tire_size": "F: 195/45 R17 / R: 195/45 R17",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 45, "rim": 17},
            "rear":  {"width": 195, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "不到一噸的渦輪小鋼砲，1.4T BoosterJet，後扭力樑結構簡單但調校出色，Monroe 避震器，極輕車重帶來靈活操控",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_s660": {
        "name": "Honda S660",
        "name_zh": "本田 S660",
        "category": "kei_car",
        "years": "2015-2022",
        "layout": "MR",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 26,
            "front_arb": 60, "rear_arb": 50,
            "front_track": 1300, "rear_track": 1275,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 45.0, "total_weight": 830,
            "cg_height": 410, "wheelbase": 2285
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama BluEarth-A AE50",
        "oem_tire_size": "F: 165/55 R15 / R: 195/45 R16",
        "oem_tire_specs": {
            "front": {"width": 165, "aspect": 55, "rim": 15},
            "rear":  {"width": 195, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: De Dion (H-shape torsion beam)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "中置引擎 K-car，660cc 渦輪，極低重心，後 De Dion 軸式懸吊兼顧空間與操控，前後異尺寸輪胎強調後驅特性",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_veloster_n": {
        "name": "Hyundai Veloster N",
        "name_zh": "現代 Veloster N",
        "category": "hot_hatch",
        "years": "2019-2022",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 100, "rear_arb": 65,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1420,
            "cg_height": 480, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "N 性能部門代表作，2.0T 275ps，電控 e-LSD，可調電子避震，N 模式排氣聲浪放大，後多連桿改善 FF 動態",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_i20n": {
        "name": "Hyundai i20 N",
        "name_zh": "現代 i20 N",
        "category": "hot_hatch",
        "years": "2021+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 22,
            "front_arb": 85, "rear_arb": 50,
            "front_track": 1490, "rear_track": 1500,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 1.0,
            "weight_front_pct": 63.0, "total_weight": 1190,
            "cg_height": 470, "wheelbase": 2580
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.2
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 215/40 R18 / R: 215/40 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 40, "rim": 18},
            "rear":  {"width": 215, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "WRC 血統小鋼砲，1.6T 204ps，後扭力樑有橫向穩定桿補強，機械式 LSD，N 部門調校底盤，輕量化車體",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_ioniq5_n": {
        "name": "Hyundai IONIQ 5 N",
        "name_zh": "現代 IONIQ 5 N",
        "category": "electric",
        "years": "2024+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 65, "rear_spring_rate": 60,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1638, "rear_track": 1646,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 2150,
            "cg_height": 500, "wheelbase": 3000
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Elect",
        "oem_tire_size": "F: 275/35 R21 / R: 275/35 R21",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 21},
            "rear":  {"width": 275, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "電動 N 性能車，雙馬達 AWD 650ps，84kWh 電池，電子避震可調，e-LSD 前後軸皆有，虛擬換檔模擬，50:50 配重",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "kia_stinger_gt": {
        "name": "Kia Stinger GT",
        "name_zh": "起亞 Stinger GT",
        "category": "sports_car",
        "years": "2018-2023",
        "layout": "FR",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 45,
            "front_arb": 115, "rear_arb": 95,
            "front_track": 1596, "rear_track": 1614,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1780,
            "cg_height": 490, "wheelbase": 2905
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 225/40 R19 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 19},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Biermann 主導開發的韓系 GT，3.3T V6 370ps，後驅為主可選 AWD，前後多連桿五連桿設計，Brembo 煞車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_mx5_cup": {
        "name": "Mazda MX-5 Cup Car",
        "name_zh": "馬自達 MX-5 Cup Car",
        "category": "race_car",
        "years": "2016+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 53, "rear_spring_rate": 44,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1495, "rear_track": 1505,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1035,
            "cg_height": 430, "wheelbase": 2310
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "BFGoodrich g-Force Rival S 1.5",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "ND 平台統規賽車，Long Road Racing 打造，防滾籠+賽車座椅，可調 Penske 避震，減重約80kg，統一規格確保公平競爭",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_992_cup": {
        "name": "Porsche 911 GT3 Cup (992)",
        "name_zh": "保時捷 911 GT3 Cup (992)",
        "category": "race_car",
        "years": "2021+",
        "layout": "RR",
        "params": {
            "front_spring_rate": 105, "rear_spring_rate": 85,
            "front_arb": 180, "rear_arb": 120,
            "front_track": 1590, "rear_track": 1570,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 38.0, "total_weight": 1260,
            "cg_height": 420, "wheelbase": 2457
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 1.93, "rear_optimal_pressure": 1.86
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -2.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Michelin S9M (slick) / S9L (wet)",
        "oem_tire_size": "F: 270/65 R18 / R: 310/62 R18",
        "oem_tire_specs": {
            "front": {"width": 270, "aspect": 65, "rim": 18},
            "rear":  {"width": 310, "aspect": 62, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "992 世代統規杯賽車，4.0L 水平對臥六缸 510ps，後置後驅，前 MacPherson 後多連桿可調，序列式 6 速犬牙齒輪箱",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_m4_gt4_g82": {
        "name": "BMW M4 GT4 (G82)",
        "name_zh": "BMW M4 GT4 (G82)",
        "category": "race_car",
        "years": "2023+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 90, "rear_spring_rate": 85,
            "front_arb": 160, "rear_arb": 130,
            "front_track": 1610, "rear_track": 1600,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1520,
            "cg_height": 440, "wheelbase": 2857
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 1.93
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport GT",
        "oem_tire_size": "F: 270/35 R18 / R: 300/30 R18",
        "oem_tire_specs": {
            "front": {"width": 270, "aspect": 35, "rim": 18},
            "rear":  {"width": 300, "aspect": 30, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "G82 M4 基礎的 GT4 級賽車，S58 3.0T 直六，前 MacPherson 後多連桿全可調，KW 四向可調避震，賽用 ABS 可調",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_gr86_cup": {
        "name": "Toyota GR86 Cup Car",
        "name_zh": "豐田 GR86 Cup Car",
        "category": "race_car",
        "years": "2022+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 53, "rear_spring_rate": 58,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1525, "rear_track": 1550,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.75,
            "weight_front_pct": 53.0, "total_weight": 1205,
            "cg_height": 440, "wheelbase": 2575
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.21
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Hankook Ventus RS4",
        "oem_tire_size": "F: 235/40 R18 / R: 235/40 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 18},
            "rear":  {"width": 235, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "GR86 統規賽車版，防滾籠+輕量化，可調避震器，後雙 A 臂幾何經賽事最佳化，ECU 統一管理確保公平性",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_st_evo2": {
        "name": "Lamborghini Huracán Super Trofeo EVO2",
        "name_zh": "藍寶堅尼 Huracán Super Trofeo EVO2",
        "category": "race_car",
        "years": "2022+",
        "layout": "RR",
        "params": {
            "front_spring_rate": 120, "rear_spring_rate": 100,
            "front_arb": 170, "rear_arb": 130,
            "front_track": 1668, "rear_track": 1620,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 1245,
            "cg_height": 400, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 1.86, "rear_optimal_pressure": 1.79
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Pirelli DHE (slick)",
        "oem_tire_size": "F: 325/68 R18 / R: 325/68 R18",
        "oem_tire_specs": {
            "front": {"width": 325, "aspect": 68, "rim": 18},
            "rear":  {"width": 325, "aspect": 68, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "Huracán 統規賽車 EVO2 版，5.2L V10 後驅，雙 A 臂前後可調，序列式 6 速 X-Trac 變速箱，碳纖空力套件",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_296_gt3": {
        "name": "Ferrari 296 GT3",
        "name_zh": "法拉利 296 GT3",
        "category": "race_car",
        "years": "2023+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 130, "rear_spring_rate": 110,
            "front_arb": 180, "rear_arb": 140,
            "front_track": 1680, "rear_track": 1640,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 1250,
            "cg_height": 390, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 1.86, "rear_optimal_pressure": 1.79
        },
        "geometry_defaults": {
            "front_camber_deg": -3.8, "rear_camber_deg": -3.2,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Pirelli DHF2 (slick)",
        "oem_tire_size": "F: 300/68 R18 / R: 310/68 R18",
        "oem_tire_specs": {
            "front": {"width": 300, "aspect": 68, "rim": 18},
            "rear":  {"width": 310, "aspect": 68, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "296 GTB 為基礎的 GT3 級賽車，3.0 V6 雙渦輪（無 Hybrid），前後雙 A 臂全可調，高下壓力空力套件，極低重心",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "radical_sr3": {
        "name": "Radical SR3 RS",
        "name_zh": "Radical SR3 RS",
        "category": "race_car",
        "years": "2018+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 44, "rear_spring_rate": 53,
            "front_arb": 80, "rear_arb": 70,
            "front_track": 1450, "rear_track": 1420,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 680,
            "cg_height": 320, "wheelbase": 2470
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 1.79, "rear_optimal_pressure": 1.86
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Hankook F200 (slick)",
        "oem_tire_size": "F: 205/50 R15 / R: 225/50 R15",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 50, "rim": 15},
            "rear":  {"width": 225, "aspect": 50, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "鋼管車架原型賽車，Ford EcoBoost 1.5L 渦輪約 230ps，極輕車重配高下壓力，前後雙 A 臂 Intrax 可調避震",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ariel_atom_4": {
        "name": "Ariel Atom 4",
        "name_zh": "Ariel Atom 4",
        "category": "race_car",
        "years": "2019+",
        "layout": "MR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 44,
            "front_arb": 70, "rear_arb": 60,
            "front_track": 1580, "rear_track": 1560,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 40.0, "total_weight": 550,
            "cg_height": 340, "wheelbase": 2345
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 1.86, "rear_optimal_pressure": 1.93
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Avon ZZS",
        "oem_tire_size": "F: 195/50 R16 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 50, "rim": 16},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "極致輕量化管狀車架，Honda 2.0T 320ps，無車身面板，前後雙 A 臂不等長設計，Bilstein 可調避震，馬力重量比驚人",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tesla_model_s_plaid": {
        "name": "Tesla Model S Plaid",
        "name_zh": "特斯拉 Model S Plaid",
        "category": "electric",
        "years": "2021+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 50,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1640, "rear_track": 1660,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.80,
            "weight_front_pct": 48.0, "total_weight": 2162,
            "cg_height": 440, "wheelbase": 2960
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.90, "rear_optimal_pressure": 2.90
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 265/35 R21 / R: 265/35 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 21},
            "rear":  {"width": 265, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "三馬達 1020ps，0-100 km/h 2.1 秒，前雙 A 臂後多連桿全鋁懸吊，自適應氣壓避震可調，電池落地低重心",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_i4_m50": {
        "name": "BMW i4 M50",
        "name_zh": "BMW i4 M50",
        "category": "electric",
        "years": "2022+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 45,
            "front_arb": 120, "rear_arb": 100,
            "front_track": 1590, "rear_track": 1600,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 2215,
            "cg_height": 470, "wheelbase": 2856
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza EV",
        "oem_tire_size": "F: 255/35 R19 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "G26 平台電動四門轎跑，雙馬達 544ps，前 MacPherson 後五連桿，自適應 M 懸吊可選，83.9kWh 電池，50:50 配重",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "byd_seal": {
        "name": "BYD Seal Performance",
        "name_zh": "比亞迪 Seal Performance",
        "category": "electric",
        "years": "2023+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 42,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1575, "rear_track": 1585,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 49.0, "total_weight": 2150,
            "cg_height": 470, "wheelbase": 2920
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental EcoContact 6 Q",
        "oem_tire_size": "F: 235/45 R19 / R: 235/45 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 19},
            "rear":  {"width": 235, "aspect": 45, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "CTB 電池車身一體化技術，刀片電池 82.5kWh，雙馬達 530ps，前 MacPherson 後五連桿，iTAC 智能扭矩控制",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_x3m_f97": {
        "name": "BMW X3 M Competition (F97)",
        "name_zh": "BMW X3 M Competition (F97)",
        "category": "suv",
        "years": "2019-2023",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 45,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1614, "rear_track": 1621,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 2060,
            "cg_height": 570, "wheelbase": 2864
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.62
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 255/40 R21 / R: 265/40 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 21},
            "rear":  {"width": 265, "aspect": 40, "rim": 21}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "S58 3.0T 直六 510ps，M xDrive 可切後驅，自適應 M 懸吊，高重心 SUV 但 M 部門強化防傾桿與副車架，主動式 M 差速器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_macan_gts": {
        "name": "Porsche Macan GTS",
        "name_zh": "保時捷 Macan GTS",
        "category": "suv",
        "years": "2020+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 42,
            "front_arb": 125, "rear_arb": 95,
            "front_track": 1610, "rear_track": 1632,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1940,
            "cg_height": 560, "wheelbase": 2807
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.62
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 265/40 R21 / R: 295/35 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 40, "rim": 21},
            "rear":  {"width": 295, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2.9T V6 440ps，PASM 主動氣壓懸吊降低 10mm，PTV Plus 扭矩分導後差速器，Sport Chrono 含賽道模式，SUV 中操控標竿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_s13_sr20": {
        "name": "Nissan Silvia S13 SR20DET",
        "name_zh": "日產 Silvia S13 SR20DET",
        "category": "sports_car",
        "years": "1989-1994",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 52,
            "front_arb": 80, "rear_arb": 60,
            "front_track": 1460, "rear_track": 1470,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1150,
            "cg_height": 460, "wheelbase": 2475
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE88",
        "oem_tire_size": "F: 205/60 R15 / R: 205/60 R15",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 60, "rim": 15},
            "rear":  {"width": 205, "aspect": 60, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S13 是甩尾入門經典車款，SR20DET 渦輪引擎搭配輕量車身，前麥花臣後多連桿懸吊提供良好的操控基礎。原廠彈簧偏軟，多數玩家會升級強化彈簧與可調避震器。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_civic_fl5": {
        "name": "Honda Civic Type R FL5",
        "name_zh": "本田 Civic Type R FL5",
        "category": "hot_hatch",
        "years": "2022+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 34,
            "front_arb": 130, "rear_arb": 60,
            "front_track": 1585, "rear_track": 1575,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.82,
            "weight_front_pct": 62.0, "total_weight": 1430,
            "cg_height": 470, "wheelbase": 2735
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 265/30 R19 / R: 265/30 R19",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 30, "rim": 19},
            "rear":  {"width": 265, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "FL5 世代採用雙軸適應式減震器，前麥花臣後多連桿，原廠即配 Michelin PS4S。前驅鋼砲標竿，紐柏格林 FF 量產車紀錄保持者。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_elise_s2": {
        "name": "Lotus Elise S2",
        "name_zh": "蓮花 Elise S2",
        "category": "sports_car",
        "years": "2001-2011",
        "layout": "MR",
        "params": {
            "front_spring_rate": 29, "rear_spring_rate": 37,
            "front_arb": 80, "rear_arb": 60,
            "front_track": 1460, "rear_track": 1510,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 38.0, "total_weight": 860,
            "cg_height": 410, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama A048",
        "oem_tire_size": "F: 175/55 R16 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 55, "rim": 16},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "超輕量中置引擎跑車，底盤平衡極佳。原廠彈簧偏硬，適合賽道使用。後輪重量分佈高，注意轉向過度傾向。",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e30_m3": {
        "name": "BMW M3 (E30)",
        "name_zh": "BMW M3 (E30)",
        "category": "sports_car",
        "years": "1986-1991",
        "layout": "FR",
        "params": {
            "front_spring_rate": 27, "rear_spring_rate": 29,
            "front_arb": 95, "rear_arb": 75,
            "front_track": 1418, "rear_track": 1432,
            "front_motion_ratio": 0.97, "rear_motion_ratio": 0.82,
            "weight_front_pct": 52.0, "total_weight": 1200,
            "cg_height": 470, "wheelbase": 2562
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin MXX",
        "oem_tire_size": "205/55 R15",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 15},
            "rear":  {"width": 205, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "經典的E30 M3，S14直四引擎，輕量化車身使其操控極為靈活。後懸吊為半乘曳臂設計，極限操控需注意後軸抬升轉向特性。",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_gdb_sti": {
        "name": "Subaru Impreza WRX STI (GDB)",
        "name_zh": "速霸陸 WRX STI (GDB)",
        "category": "sports_car",
        "years": "2002-2007",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 29,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1490, "rear_track": 1490,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 59.0, "total_weight": 1440,
            "cg_height": 490, "wheelbase": 2540
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama ADVAN A046",
        "oem_tire_size": "F: 235/45 R17 / R: 235/45 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "經典 GDB 世代（淚眼/鷹眼），前 MacPherson 後雙 A 臂，對稱式 AWD，前重偏多需注意推頭傾向",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    // ============================================================
    // Nissan — Additional models
    // ============================================================
    "nissan_leaf_nismo": {
        "name": "Nissan Leaf NISMO",
        "name_zh": "日產 Leaf NISMO",
        "category": "electric",
        "years": "2018-2022",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 20,
            "front_arb": 80, "rear_arb": 50,
            "front_track": 1530, "rear_track": 1520,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1580,
            "cg_height": 420, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Ecopia EP150",
        "oem_tire_size": "F: 215/45 R18 / R: 215/45 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 18},
            "rear":  {"width": 215, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "電動車 NISMO 運動版，低重心但車重較大，前驅配置，NISMO 專屬調校懸吊與空力套件，40kWh 電池",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_ariya_nismo": {
        "name": "Nissan Ariya NISMO",
        "name_zh": "日產 Ariya NISMO",
        "category": "electric",
        "years": "2024+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1590, "rear_track": 1595,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 51.0, "total_weight": 2200,
            "cg_height": 510, "wheelbase": 2775
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.7,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental EcoContact 6 Q",
        "oem_tire_size": "F: 255/45 R20 / R: 255/45 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 20},
            "rear":  {"width": 255, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e-4ORCE 雙馬達 AWD 電動 SUV，NISMO 專屬運動懸吊與空力，91kWh 電池，NISMO 調校強化操控回饋",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r35_gtr_nismo": {
        "name": "Nissan GT-R NISMO (R35)",
        "name_zh": "日產 GT-R NISMO (R35)",
        "category": "sports_car",
        "years": "2014+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 70, "rear_spring_rate": 63,
            "front_arb": 200, "rear_arb": 150,
            "front_track": 1600, "rear_track": 1600,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1740,
            "cg_height": 470, "wheelbase": 2780
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop SP Sport MAXX GT 600 DSST CTT",
        "oem_tire_size": "F: 255/40 ZR20 / R: 285/35 ZR20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "VR38DETT 3.8L V6 雙渦輪 600ps，ATTESA E-TS AWD，Bilstein DampTronic 電控避震，NISMO 專屬碳纖維空力與強化車體剛性",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_skyline_v35": {
        "name": "Nissan Skyline V35 (G35)",
        "name_zh": "日產 Skyline V35 (G35)",
        "category": "sports_car",
        "years": "2001-2007",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 32,
            "front_arb": 100, "rear_arb": 85,
            "front_track": 1524, "rear_track": 1535,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1540,
            "cg_height": 480, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE040",
        "oem_tire_size": "F: 225/50 R17 / R: 235/50 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 17},
            "rear":  {"width": 235, "aspect": 50, "rim": 17}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "FM 平台首發，VQ35DE 3.5L V6 280ps，前後多連桿鋁合金副車架，與 Infiniti G35 共用平台，後驅操控佳",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_fairlady_z432": {
        "name": "Nissan Fairlady Z432",
        "name_zh": "日產 Fairlady Z432",
        "category": "sports_car",
        "years": "1969-1973",
        "layout": "FR",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 21,
            "front_arb": 55, "rear_arb": 0,
            "front_track": 1300, "rear_track": 1305,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.90,
            "weight_front_pct": 53.0, "total_weight": 1010,
            "cg_height": 450, "wheelbase": 2305
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.07
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Bridgestone SF-527",
        "oem_tire_size": "175 HR14",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 82, "rim": 14},
            "rear":  {"width": 175, "aspect": 82, "rim": 14}
        },
        "suspension_type": "F: MacPherson / R: Chapman strut",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S20 直六 DOHC 24V 引擎（源自 GT-R），4 氣門 3 化油器 2 凸輪軸，僅生產 420 輛，Chapman 後懸吊輕量設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_pulsar_gtir": {
        "name": "Nissan Pulsar GTI-R",
        "name_zh": "日產 Pulsar GTI-R",
        "category": "hot_hatch",
        "years": "1990-1994",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 25,
            "front_arb": 90, "rear_arb": 60,
            "front_track": 1450, "rear_track": 1440,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1220,
            "cg_height": 480, "wheelbase": 2430
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone RE71",
        "oem_tire_size": "F: 195/55 R15 / R: 195/55 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 15},
            "rear":  {"width": 195, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SR20DET 230ps 四驅小鋼砲，WRC Group A 基礎車型，前重偏高但 AWD 補償抓地力，車身小巧靈活，ATTESA 全時四驅",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_cube_z12": {
        "name": "Nissan Cube (Z12)",
        "name_zh": "日產 Cube (Z12)",
        "category": "hatchback",
        "years": "2008-2020",
        "layout": "FF",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 20,
            "front_arb": 55, "rear_arb": 0,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1190,
            "cg_height": 540, "wheelbase": 2530
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama BluEarth AE-01",
        "oem_tire_size": "F: 175/65 R15 / R: 175/65 R15",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 65, "rim": 15},
            "rear":  {"width": 175, "aspect": 65, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "非對稱設計的方塊車，HR15DE 1.5L 111ps，重心偏高但輕量車體，後扭力樑簡單可靠，適合趣味改裝",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Toyota — Additional models
    // ============================================================
    "toyota_mr2_aw11": {
        "name": "Toyota MR2 AW11 Supercharged",
        "name_zh": "豐田 MR2 AW11 機械增壓",
        "category": "sports_car",
        "years": "1986-1989",
        "layout": "MR",
        "params": {
            "front_spring_rate": 21, "rear_spring_rate": 27,
            "front_arb": 65, "rear_arb": 55,
            "front_track": 1415, "rear_track": 1410,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.90,
            "weight_front_pct": 44.0, "total_weight": 1095,
            "cg_height": 440, "wheelbase": 2320
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone SF-325",
        "oem_tire_size": "F: 185/60 R14 / R: 205/60 R14",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 60, "rim": 14},
            "rear":  {"width": 205, "aspect": 60, "rim": 14}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "初代中置引擎 MR2，4A-GZE 機械增壓 145ps，輕量車體配中置引擎低慣性，後軸敏感需注意急減速時甩尾傾向",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_celica_st185": {
        "name": "Toyota Celica GT-Four (ST185)",
        "name_zh": "豐田 Celica GT-Four (ST185)",
        "category": "sports_car",
        "years": "1989-1993",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 95, "rear_arb": 70,
            "front_track": 1500, "rear_track": 1490,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1380,
            "cg_height": 480, "wheelbase": 2525
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE71",
        "oem_tire_size": "F: 205/55 R15 / R: 205/55 R15",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 15},
            "rear":  {"width": 205, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "WRC 傳奇 Celica，3S-GTE 2.0T 235ps，全時四驅，Carlos Sainz 駕駛奪冠車型，前後 MacPherson 結構簡單易改裝",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_starlet_ep82": {
        "name": "Toyota Starlet GT Turbo (EP82)",
        "name_zh": "豐田 Starlet GT Turbo (EP82)",
        "category": "hot_hatch",
        "years": "1989-1995",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 65, "rear_arb": 35,
            "front_track": 1380, "rear_track": 1370,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 900,
            "cg_height": 450, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.07
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE88",
        "oem_tire_size": "F: 175/65 R14 / R: 175/65 R14",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 65, "rim": 14},
            "rear":  {"width": 175, "aspect": 65, "rim": 14}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "4E-FTE 1.3L 渦輪 135ps，僅 900kg 極輕量車體，馬力重量比出色，後扭力樑簡單但極限高，日本走り屋名車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_aristo_jzs161": {
        "name": "Toyota Aristo V300 (JZS161)",
        "name_zh": "豐田 Aristo V300 (JZS161)",
        "category": "sedan",
        "years": "1997-2005",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1530, "rear_track": 1540,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1620,
            "cg_height": 490, "wheelbase": 2800
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050",
        "oem_tire_size": "F: 235/45 R17 / R: 235/45 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "2JZ-GTE 3.0L 雙渦輪 280ps（自主規制），JDM 版 Lexus GS300，前雙A臂後多連桿，直線加速性能改裝潛力極大",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_hiace_drift": {
        "name": "Toyota HiAce (Drift Spec)",
        "name_zh": "豐田 HiAce (甩尾特裝)",
        "category": "hatchback",
        "years": "2004-2019",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 40,
            "front_arb": 80, "rear_arb": 50,
            "front_track": 1600, "rear_track": 1580,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1830,
            "cg_height": 620, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Bridgestone V600",
        "oem_tire_size": "F: 195/80 R15 / R: 195/80 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 80, "rim": 15},
            "rear":  {"width": 195, "aspect": 80, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: Leaf spring (rigid axle)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "D4D 柴油 FR 商用車改甩尾車！高重心極不穩定但極具娛樂性，板簧後軸容易滑移，需大幅改裝底盤才能安全漂移",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_century_v12": {
        "name": "Toyota Century V12 (GZG50)",
        "name_zh": "豐田 Century V12 (GZG50)",
        "category": "sedan",
        "years": "1997-2017",
        "layout": "FR",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 22,
            "front_arb": 100, "rear_arb": 70,
            "front_track": 1540, "rear_track": 1545,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 2060,
            "cg_height": 510, "wheelbase": 2925
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza ER33",
        "oem_tire_size": "F: 225/55 R17 / R: 225/55 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 17},
            "rear":  {"width": 225, "aspect": 55, "rim": 17}
        },
        "suspension_type": "F: Double wishbone (air) / R: Semi-trailing arm (air)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "1GZ-FE 5.0L V12 280ps，日本國寶級旗艦，全氣壓懸吊極致舒適，手工打造車身，重心高車體重但穩定性佳",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_land_cruiser_300": {
        "name": "Toyota Land Cruiser 300",
        "name_zh": "豐田 Land Cruiser 300",
        "category": "suv",
        "years": "2021+",
        "layout": "4WD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1640, "rear_track": 1645,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.75,
            "weight_front_pct": 53.0, "total_weight": 2490,
            "cg_height": 680, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop Grandtrek AT23",
        "oem_tire_size": "F: 265/55 R20 / R: 265/55 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 55, "rim": 20},
            "rear":  {"width": 265, "aspect": 55, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Trailing arm + lateral links",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "TNGA-F 平台，V35A-FTS 3.5L V6 雙渦輪 415ps，E-KDSS 電控防傾桿，全時四驅加力箱，車重近 2.5 噸高重心但越野能力無敵",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_prius_g": {
        "name": "Toyota Prius (5th Gen)",
        "name_zh": "豐田 Prius (第五代)",
        "category": "hatchback",
        "years": "2023+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 25,
            "front_arb": 70, "rear_arb": 40,
            "front_track": 1550, "rear_track": 1560,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1420,
            "cg_height": 445, "wheelbase": 2750
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza T005A",
        "oem_tire_size": "F: 195/50 R19 / R: 195/50 R19",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 50, "rim": 19},
            "rear":  {"width": 195, "aspect": 50, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "第五代 Prius 改採後雙 A 臂懸吊，TNGA-C 平台大幅提升操控，2.0L 油電 196ps，低風阻車體 Cd 0.27，重心極低",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Lexus — Performance models
    // ============================================================
    "lexus_is350_f_sport": {
        "name": "Lexus IS 350 F Sport (XE30)",
        "name_zh": "凌志 IS 350 F Sport (XE30)",
        "category": "sedan",
        "years": "2013-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1535, "rear_track": 1540,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1640,
            "cg_height": 480, "wheelbase": 2800
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S001",
        "oem_tire_size": "F: 225/40 R18 / R: 255/35 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 255, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2GR-FSE 3.5L V6 318ps，AVS 自適應可調避震，前雙 A 臂後多連桿，F Sport 專屬 LSD 選配，後驅運動房車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lexus_lc500": {
        "name": "Lexus LC 500",
        "name_zh": "凌志 LC 500",
        "category": "gt_car",
        "years": "2017+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 40,
            "front_arb": 140, "rear_arb": 110,
            "front_track": 1600, "rear_track": 1605,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1935,
            "cg_height": 460, "wheelbase": 2870
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S001",
        "oem_tire_size": "F: 245/40 RF21 / R: 275/35 RF21",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 21},
            "rear":  {"width": 275, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2UR-GSE 5.0L V8 471ps，GA-L 後驅平台，前後多連桿全鋁懸吊，AVS 自適應避震，碳纖維車頂選配，GT 旗艦跑車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lexus_rc_f": {
        "name": "Lexus RC F",
        "name_zh": "凌志 RC F",
        "category": "sports_car",
        "years": "2014+",
        "layout": "FR",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 140, "rear_arb": 110,
            "front_track": 1575, "rear_track": 1570,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1790,
            "cg_height": 470, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 255/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2UR-GSE 5.0L V8 472ps，Torsen LSD，TVD 扭矩分導系統，前雙 A 臂後多連桿，AVS 自適應避震，碳纖維引擎蓋選配",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lexus_gs_f": {
        "name": "Lexus GS F",
        "name_zh": "凌志 GS F",
        "category": "sedan",
        "years": "2015-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1830,
            "cg_height": 480, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 255/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "2UR-GSE 5.0L V8 477ps，TVD 扭矩分導差速器，前雙 A 臂後多連桿，AVS 自適應避震標配，最後的 V8 四門運動房車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lexus_is_f": {
        "name": "Lexus IS F",
        "name_zh": "凌志 IS F",
        "category": "sedan",
        "years": "2007-2014",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 34,
            "front_arb": 120, "rear_arb": 95,
            "front_track": 1535, "rear_track": 1540,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1714,
            "cg_height": 475, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport PS2",
        "oem_tire_size": "F: 225/40 R19 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 19},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "2UR-GSE 5.0L V8 423ps，Torsen LSD，首款 Lexus F 性能車，前雙 A 臂後多連桿，專屬強化副車架與彈簧，8 速 SPDS 變速箱",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Honda — Additional models
    // ============================================================
    "honda_city_turbo_2": {
        "name": "Honda City Turbo II (Bulldog)",
        "name_zh": "本田 City Turbo II (鬥牛犬)",
        "category": "hot_hatch",
        "years": "1983-1986",
        "layout": "FF",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 14,
            "front_arb": 45, "rear_arb": 0,
            "front_track": 1305, "rear_track": 1295,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 735,
            "cg_height": 420, "wheelbase": 2220
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 1.93
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE47",
        "oem_tire_size": "F: 175/60 R13 / R: 175/60 R13",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 60, "rim": 13},
            "rear":  {"width": 175, "aspect": 60, "rim": 13}
        },
        "suspension_type": "F: MacPherson / R: Beam axle",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "ER 1.2L 渦輪 110ps 僅 735kg，附贈 Motocompo 折疊摩托車！寬體套件為標配，極輕量前驅小鋼砲",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_cr_z": {
        "name": "Honda CR-Z",
        "name_zh": "本田 CR-Z",
        "category": "sports_car",
        "years": "2010-2016",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 28,
            "front_arb": 75, "rear_arb": 50,
            "front_track": 1490, "rear_track": 1490,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 59.0, "total_weight": 1120,
            "cg_height": 440, "wheelbase": 2435
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 195/55 R16 / R: 195/55 R16",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 16},
            "rear":  {"width": 195, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "CR-X 精神後繼，LEA 1.5L+IMA 油電混合 6MT，輕量車體低重心，精神上的運動油電車，後扭力樑但調校積極",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_e": {
        "name": "Honda e",
        "name_zh": "本田 e",
        "category": "electric",
        "years": "2020-2024",
        "layout": "RR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 26,
            "front_arb": 70, "rear_arb": 55,
            "front_track": 1510, "rear_track": 1505,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 46.0, "total_weight": 1540,
            "cg_height": 410, "wheelbase": 2530
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 205/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "後置馬達後驅電動車！154ps 最小迴轉半徑 4.3m，35.5kWh 電池低重心，後驅配置操控樂趣極高，可惜已停產",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Mazda — Additional models
    // ============================================================
    "mazda_cosmo_110s": {
        "name": "Mazda Cosmo Sport 110S",
        "name_zh": "馬自達 Cosmo Sport 110S",
        "category": "sports_car",
        "years": "1967-1972",
        "layout": "FR",
        "params": {
            "front_spring_rate": 16, "rear_spring_rate": 18,
            "front_arb": 45, "rear_arb": 0,
            "front_track": 1260, "rear_track": 1230,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.90,
            "weight_front_pct": 51.0, "total_weight": 940,
            "cg_height": 430, "wheelbase": 2200
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 1.93, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Bridgestone Super Speed",
        "oem_tire_size": "155 SR15",
        "oem_tire_specs": {
            "front": {"width": 155, "aspect": 82, "rim": 15},
            "rear":  {"width": 155, "aspect": 82, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: De Dion",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "世界首款量產雙轉子引擎車，10A 型 110ps，僅生產 1,519 輛，De Dion 後軸兼顧輕量與剛性，日本汽車工業里程碑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_cx5": {
        "name": "Mazda CX-5 (KF)",
        "name_zh": "馬自達 CX-5 (KF)",
        "category": "suv",
        "years": "2017+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 95, "rear_arb": 65,
            "front_track": 1595, "rear_track": 1595,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1620,
            "cg_height": 560, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Toyo Proxes R46",
        "oem_tire_size": "F: 225/55 R19 / R: 225/55 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 19},
            "rear":  {"width": 225, "aspect": 55, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SKYACTIV 平台 SUV，2.5L NA 190ps 或 2.2D 190ps，G-Vectoring Control Plus 動態控制，同級操控標竿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_eunos_cosmo": {
        "name": "Mazda Eunos Cosmo 20B",
        "name_zh": "馬自達 Eunos Cosmo 20B",
        "category": "gt_car",
        "years": "1990-1995",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 100, "rear_arb": 75,
            "front_track": 1520, "rear_track": 1530,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1620,
            "cg_height": 470, "wheelbase": 2750
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE71",
        "oem_tire_size": "F: 225/50 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "世界唯一量產三轉子引擎 20B-REW 雙渦輪 300ps，豪華 GT 定位，前雙 A 臂後多連桿，電控懸吊，油耗驚人但動力順滑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Subaru — Additional models
    // ============================================================
    "subaru_sambar": {
        "name": "Subaru Sambar (Kei Truck)",
        "name_zh": "速霸陸 Sambar (輕型卡車)",
        "category": "kei_car",
        "years": "2012+",
        "layout": "RR",
        "params": {
            "front_spring_rate": 12, "rear_spring_rate": 18,
            "front_arb": 30, "rear_arb": 0,
            "front_track": 1305, "rear_track": 1300,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 890,
            "cg_height": 520, "wheelbase": 1885
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Bridgestone Ecopia R680",
        "oem_tire_size": "F: 145 R12 LT / R: 145 R12 LT",
        "oem_tire_specs": {
            "front": {"width": 145, "aspect": 82, "rim": 12},
            "rear":  {"width": 145, "aspect": 82, "rim": 12}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "後置引擎 660cc 輕卡，空車時後軸極重，載貨後反而平衡。短軸距敏捷但容易 snap oversteer，Sambar 甩尾王者傳說",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_crosstrek": {
        "name": "Subaru Crosstrek (GU)",
        "name_zh": "速霸陸 Crosstrek (GU)",
        "category": "suv",
        "years": "2023+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 28,
            "front_arb": 80, "rear_arb": 55,
            "front_track": 1555, "rear_track": 1555,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.80,
            "weight_front_pct": 59.0, "total_weight": 1530,
            "cg_height": 550, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Falken Ziex ZE001 A/S",
        "oem_tire_size": "F: 225/55 R18 / R: 225/55 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 18},
            "rear":  {"width": 225, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SGP 平台，FB25 2.5L 水平對臥 182ps，對稱式 AWD，後雙 A 臂懸吊，最低離地高 220mm，跨界 SUV 中操控佳",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Mitsubishi — Additional models
    // ============================================================
    "mitsubishi_colt_ralliart": {
        "name": "Mitsubishi Colt Ralliart",
        "name_zh": "三菱 Colt Ralliart",
        "category": "hot_hatch",
        "years": "2006-2012",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 20,
            "front_arb": 75, "rear_arb": 40,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 1120,
            "cg_height": 470, "wheelbase": 2500
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama S.drive AS01",
        "oem_tire_size": "F: 205/45 R16 / R: 205/45 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 16},
            "rear":  {"width": 205, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "4G15 MIVEC 1.5L 渦輪 163ps，Ralliart 調校底盤，CVT 附模擬 6 速手動模式，輕量前驅小鋼砲",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_fto": {
        "name": "Mitsubishi FTO GPX",
        "name_zh": "三菱 FTO GPX",
        "category": "sports_car",
        "years": "1994-2000",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 90, "rear_arb": 65,
            "front_track": 1495, "rear_track": 1490,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1210,
            "cg_height": 450, "wheelbase": 2500
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama A539",
        "oem_tire_size": "F: 205/50 R16 / R: 205/50 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 50, "rim": 16},
            "rear":  {"width": 205, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "6A12 MIVEC 2.0L V6 200ps，日本年度風雲車，前驅但 MIVEC V6 高轉快感，後多連桿提供良好循跡性，可惜未正式外銷",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_eclipse_2g": {
        "name": "Mitsubishi Eclipse GSX (2G)",
        "name_zh": "三菱 Eclipse GSX (2G)",
        "category": "sports_car",
        "years": "1995-1999",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 100, "rear_arb": 75,
            "front_track": 1505, "rear_track": 1510,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 59.0, "total_weight": 1460,
            "cg_height": 480, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Goodyear Eagle RS-A",
        "oem_tire_size": "F: 215/50 R17 / R: 215/50 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 50, "rim": 17},
            "rear":  {"width": 215, "aspect": 50, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "4G63T 2.0L 渦輪 210ps AWD，與 Evo 共用引擎，DSM 平台最強版本，改裝潛力巨大，Fast & Furious 名車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Other Japanese manufacturers
    // ============================================================
    "isuzu_117_coupe": {
        "name": "Isuzu 117 Coupe",
        "name_zh": "五十鈴 117 Coupe",
        "category": "gt_car",
        "years": "1968-1981",
        "layout": "FR",
        "params": {
            "front_spring_rate": 15, "rear_spring_rate": 16,
            "front_arb": 40, "rear_arb": 0,
            "front_track": 1310, "rear_track": 1295,
            "front_motion_ratio": 1.0, "rear_motion_ratio": 0.90,
            "weight_front_pct": 52.0, "total_weight": 1040,
            "cg_height": 440, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 1.93, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Bridgestone RD-116",
        "oem_tire_size": "165 SR14",
        "oem_tire_specs": {
            "front": {"width": 165, "aspect": 82, "rim": 14},
            "rear":  {"width": 165, "aspect": 82, "rim": 14}
        },
        "suspension_type": "F: Double wishbone / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Giugiaro 設計的日本美學名車，G161 1.6L DOHC 120ps，前雙 A 臂後半曳臂，手工車身（初期型），收藏價值極高",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "daihatsu_midget2": {
        "name": "Daihatsu Midget II",
        "name_zh": "大發 Midget II",
        "category": "kei_car",
        "years": "1996-2001",
        "layout": "RR",
        "params": {
            "front_spring_rate": 10, "rear_spring_rate": 16,
            "front_arb": 20, "rear_arb": 0,
            "front_track": 1080, "rear_track": 1060,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.75,
            "weight_front_pct": 40.0, "total_weight": 530,
            "cg_height": 480, "wheelbase": 1840
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Bridgestone RD-604",
        "oem_tire_size": "F: 135/80 R12 / R: 145/80 R12",
        "oem_tire_specs": {
            "front": {"width": 135, "aspect": 80, "rim": 12},
            "rear":  {"width": 145, "aspect": 80, "rim": 12}
        },
        "suspension_type": "F: MacPherson / R: De Dion",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "660cc 3 氣筒後置引擎單座輕卡，僅 530kg！極短軸距超靈活，三輪車精神後繼，短距離賽道趣味滿點的話題車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "suzuki_ignis": {
        "name": "Suzuki Ignis Sport",
        "name_zh": "鈴木 Ignis Sport",
        "category": "hot_hatch",
        "years": "2003-2006",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 60, "rear_arb": 35,
            "front_track": 1420, "rear_track": 1410,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 950,
            "cg_height": 470, "wheelbase": 2360
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.14, "rear_optimal_pressure": 2.07
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050",
        "oem_tire_size": "F: 185/55 R15 / R: 185/55 R15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 15},
            "rear":  {"width": 185, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "M15A 1.5L 110ps，輕量 950kg 小車運動版，鈴木的隱藏版小鋼砲，後扭力樑但車身極輕，彎道靈活度出色",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Crossovers / Small SUVs — Japanese
    // ============================================================
    "toyota_c_hr": {
        "name": "Toyota C-HR GR Sport",
        "name_zh": "豐田 C-HR GR Sport",
        "category": "suv",
        "years": "2020+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 28,
            "front_arb": 85, "rear_arb": 55,
            "front_track": 1540, "rear_track": 1555,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1380,
            "cg_height": 520, "wheelbase": 2640
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Primacy 4",
        "oem_tire_size": "F: 225/50 R18 / R: 225/50 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 18},
            "rear":  {"width": 225, "aspect": 50, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "TNGA-C 平台，2ZR-FXE 1.8L 油電 122ps，GR Sport 專屬強化懸吊，後雙 A 臂同級少見，低重心造型設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_vezel_rs": {
        "name": "Honda Vezel/HR-V RS",
        "name_zh": "本田 Vezel/HR-V RS",
        "category": "suv",
        "years": "2021+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 26,
            "front_arb": 80, "rear_arb": 50,
            "front_track": 1540, "rear_track": 1545,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1350,
            "cg_height": 530, "wheelbase": 2610
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama BluEarth-GT AE51",
        "oem_tire_size": "F: 225/50 R18 / R: 225/50 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 18},
            "rear":  {"width": 225, "aspect": 50, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e:HEV 1.5L 油電 131ps，RS 版運動懸吊調校，後扭力樑但 Honda 調校出色，Magic Seat 多功能座椅",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_cx3": {
        "name": "Mazda CX-3",
        "name_zh": "馬自達 CX-3",
        "category": "suv",
        "years": "2015+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 26,
            "front_arb": 75, "rear_arb": 50,
            "front_track": 1525, "rear_track": 1520,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1255,
            "cg_height": 520, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama BluEarth-A",
        "oem_tire_size": "F: 215/50 R18 / R: 215/50 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 50, "rim": 18},
            "rear":  {"width": 215, "aspect": 50, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SKYACTIV 平台小型 SUV，P5-VPS 2.0L 148ps，GVC Plus 動態控制，後扭力樑但 Mazda 底盤調校精準，同級操控佳",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_outback": {
        "name": "Subaru Outback (BT)",
        "name_zh": "速霸陸 Outback (BT)",
        "category": "suv",
        "years": "2021+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 28,
            "front_arb": 85, "rear_arb": 60,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1680,
            "cg_height": 570, "wheelbase": 2745
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Geolandar CV G058",
        "oem_tire_size": "F: 225/60 R18 / R: 225/60 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 60, "rim": 18},
            "rear":  {"width": 225, "aspect": 60, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SGP 平台，FA24 2.4L 渦輪水平對臥 260ps，對稱式 AWD，後雙 A 臂，X-MODE 越野模式，最低離地高 213mm",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_outlander_phev": {
        "name": "Mitsubishi Outlander PHEV (GN)",
        "name_zh": "三菱 Outlander PHEV (GN)",
        "category": "suv",
        "years": "2022+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 90, "rear_arb": 65,
            "front_track": 1580, "rear_track": 1585,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 2010,
            "cg_height": 570, "wheelbase": 2705
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama BluEarth-XT AE61",
        "oem_tire_size": "F: 255/45 R20 / R: 255/45 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 20},
            "rear":  {"width": 255, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "CMF-C/D 平台（與 Nissan 共用），2.4L+雙馬達 PHEV 255ps，S-AWC 超級全輪控制，20kWh 電池，純電續航 87km",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Lexus / Toyota SUVs
    // ============================================================
    "lexus_nx350_f_sport": {
        "name": "Lexus NX 350 F Sport",
        "name_zh": "凌志 NX 350 F Sport",
        "category": "suv",
        "years": "2022+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 32,
            "front_arb": 100, "rear_arb": 75,
            "front_track": 1580, "rear_track": 1585,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1810,
            "cg_height": 550, "wheelbase": 2690
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama ADVAN Sport V107",
        "oem_tire_size": "F: 235/50 R20 / R: 235/50 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 50, "rim": 20},
            "rear":  {"width": 235, "aspect": 50, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "TNGA-K 平台，T24A-FTS 2.4T 275ps，AVS 自適應可調避震，後雙 A 臂，F Sport 專屬運動懸吊與煞車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lexus_rx500h": {
        "name": "Lexus RX 500h F Sport Performance",
        "name_zh": "凌志 RX 500h F Sport Performance",
        "category": "suv",
        "years": "2023+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 35,
            "front_arb": 110, "rear_arb": 80,
            "front_track": 1610, "rear_track": 1620,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 2020,
            "cg_height": 560, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama ADVAN Sport V107",
        "oem_tire_size": "F: 235/50 R21 / R: 265/45 R21",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 50, "rim": 21},
            "rear":  {"width": 265, "aspect": 45, "rim": 21}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "TNGA-K 平台，2.4T 油電 371ps，DIRECT4 前後電動馬達驅動力可變分配，AVS 自適應避震，前後異尺寸輪胎強化運動性",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_rav4_prime": {
        "name": "Toyota RAV4 Prime",
        "name_zh": "豐田 RAV4 Prime",
        "category": "suv",
        "years": "2021+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 28,
            "front_arb": 85, "rear_arb": 60,
            "front_track": 1570, "rear_track": 1575,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1920,
            "cg_height": 550, "wheelbase": 2690
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop Grandtrek PT30",
        "oem_tire_size": "F: 235/55 R19 / R: 235/55 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 55, "rim": 19},
            "rear":  {"width": 235, "aspect": 55, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "TNGA-K 平台 PHEV，A25A-FXS 2.5L+雙馬達 306ps，純電續航 68km，18.1kWh 電池，後雙 A 臂，0-100 km/h 6.0 秒",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_zr_v": {
        "name": "Honda ZR-V",
        "name_zh": "本田 ZR-V",
        "category": "suv",
        "years": "2023+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 28,
            "front_arb": 85, "rear_arb": 55,
            "front_track": 1555, "rear_track": 1560,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1500,
            "cg_height": 540, "wheelbase": 2655
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Primacy 4",
        "oem_tire_size": "F: 225/55 R18 / R: 225/55 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 18},
            "rear":  {"width": 225, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e:HEV 2.0L 油電 184ps，Honda 新世代 SUV，後多連桿懸吊提供良好穩定性，Honda SENSING 標配",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_x_trail_e4orce": {
        "name": "Nissan X-Trail e-4ORCE",
        "name_zh": "日產 X-Trail e-4ORCE",
        "category": "suv",
        "years": "2022+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 28,
            "front_arb": 90, "rear_arb": 60,
            "front_track": 1575, "rear_track": 1580,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1860,
            "cg_height": 560, "wheelbase": 2705
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental EcoContact 6",
        "oem_tire_size": "F: 235/55 R19 / R: 235/55 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 55, "rim": 19},
            "rear":  {"width": 235, "aspect": 55, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e-POWER 串聯式油電+雙馬達 AWD，e-4ORCE 精密前後扭矩控制，KR15DDT 1.5T 發電用，煞車時後馬達回生平衡車身姿態",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },

    // ============================================================
    // Electric vehicles — Japanese
    // ============================================================
    "mazda_mx30": {
        "name": "Mazda MX-30 EV",
        "name_zh": "馬自達 MX-30 EV",
        "category": "electric",
        "years": "2020+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 26,
            "front_arb": 75, "rear_arb": 50,
            "front_track": 1565, "rear_track": 1565,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1650,
            "cg_height": 470, "wheelbase": 2655
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza T005A",
        "oem_tire_size": "F: 215/55 R18 / R: 215/55 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 55, "rim": 18},
            "rear":  {"width": 215, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e-SKYACTIV 電動馬達 145ps，35.5kWh 小電池策略，Freestyle 對開門設計，GVC Plus 電動版，續航 256km",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_solterra": {
        "name": "Subaru Solterra",
        "name_zh": "速霸陸 Solterra",
        "category": "electric",
        "years": "2022+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 32,
            "front_arb": 90, "rear_arb": 65,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 2020,
            "cg_height": 480, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Alenza 001",
        "oem_tire_size": "F: 235/60 R18 / R: 235/60 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 60, "rim": 18},
            "rear":  {"width": 235, "aspect": 60, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e-SUBARU GLOBAL 平台（與 bZ4X 共同開發），雙馬達 AWD 218ps，71.4kWh 電池，X-MODE 越野模式，Grip Control",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_bz4x": {
        "name": "Toyota bZ4X",
        "name_zh": "豐田 bZ4X",
        "category": "electric",
        "years": "2022+",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 85, "rear_arb": 60,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 2010,
            "cg_height": 485, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.55, "rear_optimal_pressure": 2.55
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Alenza 001",
        "oem_tire_size": "F: 235/60 R18 / R: 235/60 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 60, "rim": 18},
            "rear":  {"width": 235, "aspect": 60, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "e-TNGA 平台，雙馬達 AWD 218ps，71.4kWh 電池，與 Solterra 共同開發，太陽能車頂選配，低重心電池配置",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_sakura": {
        "name": "Nissan Sakura",
        "name_zh": "日產 Sakura",
        "category": "kei_car",
        "years": "2022+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 16, "rear_spring_rate": 14,
            "front_arb": 45, "rear_arb": 25,
            "front_track": 1295, "rear_track": 1290,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1080,
            "cg_height": 440, "wheelbase": 2495
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop Enasave EC300+",
        "oem_tire_size": "F: 155/65 R14 / R: 155/65 R14",
        "oem_tire_specs": {
            "front": {"width": 155, "aspect": 65, "rim": 14},
            "rear":  {"width": 155, "aspect": 65, "rim": 14}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "日本年度風雲車！輕自動車電動車，EM47 馬達 64ps，20kWh 電池，低重心電池配置，續航 180km，城市通勤最佳",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_n_one_rs": {
        "name": "Honda N-ONE RS",
        "name_zh": "本田 N-ONE RS",
        "category": "kei_car",
        "years": "2020+",
        "layout": "FF",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 16,
            "front_arb": 50, "rear_arb": 30,
            "front_track": 1290, "rear_track": 1285,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 860,
            "cg_height": 460, "wheelbase": 2520
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop Enasave EC204",
        "oem_tire_size": "F: 155/65 R14 / R: 155/65 R14",
        "oem_tire_specs": {
            "front": {"width": 155, "aspect": 65, "rim": 14},
            "rear":  {"width": 155, "aspect": 65, "rim": 14}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam with Buthler linkage",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "S07B 660cc 渦輪 64ps 6MT！N 系列唯一手排，RS 專屬 CVT/6MT 選擇，輕量車體回歸初代 N360 精神，操控樂趣滿點的現代輕自動車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    }
,
    "toyota_supra_jza70": {
        "name": "Toyota Supra (JZA70)",
        "name_zh": "豐田 Supra (JZA70)",
        "category": "sports_car",
        "years": "1986-1993",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1480, "rear_track": 1490,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1550,
            "cg_height": 490, "wheelbase": 2590
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza",
        "oem_tire_size": "F: 225/50 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "第三代 Supra，直六 7M-GTE 渦輪引擎，前後重量分佈良好，GT 風格巡航車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_celica_st205": {
        "name": "Toyota Celica GT-Four (ST205)",
        "name_zh": "豐田 Celica GT-Four (ST205)",
        "category": "sports_car",
        "years": "1994-1999",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 33,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1490, "rear_track": 1480,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1390,
            "cg_height": 470, "wheelbase": 2535
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: MacPherson strut",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "WRC 拉力賽血統，3S-GTE 渦輪引擎搭配全時四驅，前置引擎導致前重偏高",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_chaser_jzx100": {
        "name": "Toyota Chaser Tourer V (JZX100)",
        "name_zh": "豐田 Chaser Tourer V (JZX100)",
        "category": "sedan",
        "years": "1996-2001",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1480, "rear_track": 1470,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.0, "total_weight": 1470,
            "cg_height": 500, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "甩尾神車，1JZ-GTE 渦輪直六搭配後驅，優異的前後配重，漂移文化代表車款",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_mark2_jzx90": {
        "name": "Toyota Mark II (JZX90)",
        "name_zh": "豐田 Mark II (JZX90)",
        "category": "sedan",
        "years": "1992-1996",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 26,
            "front_arb": 100, "rear_arb": 65,
            "front_track": 1470, "rear_track": 1460,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.0, "total_weight": 1450,
            "cg_height": 510, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza",
        "oem_tire_size": "F: 205/55 R16 / R: 205/55 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 205, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "JZX 系列中堅車型，1JZ-GTE 渦輪引擎，舒適取向但仍具改裝潛力，漂移入門選擇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_altezza_sxe10": {
        "name": "Toyota Altezza RS200 (SXE10)",
        "name_zh": "豐田 Altezza RS200 (SXE10)",
        "category": "sedan",
        "years": "1998-2005",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 115, "rear_arb": 75,
            "front_track": 1490, "rear_track": 1480,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1330,
            "cg_height": 480, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE040",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "3S-GE BEAMS 自然進氣高轉引擎，輕量後驅運動房車，海外以 Lexus IS200/300 銷售",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_soarer_jzz30": {
        "name": "Toyota Soarer 2.5GT-T (JZZ30)",
        "name_zh": "豐田 Soarer 2.5GT-T (JZZ30)",
        "category": "gt_car",
        "years": "1991-2000",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1510, "rear_track": 1510,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.0, "total_weight": 1630,
            "cg_height": 480, "wheelbase": 2690
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 225/50 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "豪華 GT 跑車，1JZ-GTE 渦輪引擎，海外以 Lexus SC300/400 銷售，電子懸吊可調",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_crown_athlete": {
        "name": "Toyota Crown Athlete (S210)",
        "name_zh": "豐田 Crown Athlete (S210)",
        "category": "sedan",
        "years": "2012-2018",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 105, "rear_arb": 68,
            "front_track": 1535, "rear_track": 1540,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1600,
            "cg_height": 490, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop SP Sport Maxx",
        "oem_tire_size": "F: 225/45 R18 / R: 225/45 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 225, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "日本皇冠運動版，2.0T 或 3.5L V6 引擎，後驅豪華房車，AVS 自適應懸吊系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_silvia_s13": {
        "name": "Nissan Silvia S13 K's",
        "name_zh": "日產 Silvia S13 K's",
        "category": "sports_car",
        "years": "1988-1993",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 25,
            "front_arb": 100, "rear_arb": 65,
            "front_track": 1465, "rear_track": 1460,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1170,
            "cg_height": 465, "wheelbase": 2475
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan",
        "oem_tire_size": "F: 195/60 R15 / R: 195/60 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 60, "rim": 15},
            "rear":  {"width": 195, "aspect": 60, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Silvia 系列經典車型，CA18DET/SR20DET 渦輪引擎，輕量車身搭配後驅，漂移始祖",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_180sx": {
        "name": "Nissan 180SX Type X",
        "name_zh": "日產 180SX Type X",
        "category": "sports_car",
        "years": "1989-1998",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 105, "rear_arb": 68,
            "front_track": 1465, "rear_track": 1460,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1210,
            "cg_height": 470, "wheelbase": 2475
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan HF",
        "oem_tire_size": "F: 205/55 R16 / R: 205/55 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 205, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "翻燈版 Silvia，SR20DET 渦輪引擎，掀背車身提供更好的空力效果，與 S13 共享底盤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_z32_300zx": {
        "name": "Nissan 300ZX Twin Turbo (Z32)",
        "name_zh": "日產 300ZX Twin Turbo (Z32)",
        "category": "sports_car",
        "years": "1989-2000",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 35,
            "front_arb": 135, "rear_arb": 90,
            "front_track": 1505, "rear_track": 1535,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1560,
            "cg_height": 470, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama A008P",
        "oem_tire_size": "F: 225/50 R16 / R: 245/45 R16",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 16},
            "rear":  {"width": 245, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "VG30DETT 雙渦輪 V6 引擎，四輪多連桿懸吊，前後輪距配置略有差異，操控性優異",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_z33_350z": {
        "name": "Nissan 350Z (Z33)",
        "name_zh": "日產 350Z (Z33)",
        "category": "sports_car",
        "years": "2002-2009",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 125, "rear_arb": 85,
            "front_track": 1520, "rear_track": 1535,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.0, "total_weight": 1470,
            "cg_height": 460, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE040",
        "oem_tire_size": "F: 225/45 R18 / R: 245/45 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 245, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "VQ35DE 自然進氣 V6 引擎，FM 平台前中置引擎配置，重心低且配重優異",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_skyline_er34": {
        "name": "Nissan Skyline 25GT-T (ER34)",
        "name_zh": "日產 Skyline 25GT-T (ER34)",
        "category": "sedan",
        "years": "1998-2002",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1480, "rear_track": 1480,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1440,
            "cg_height": 490, "wheelbase": 2665
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 215/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "四門 Skyline 後驅版，RB25DET NEO 渦輪直六，比 GT-R 輕且更靈活，漂移愛好者首選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_cima_f50": {
        "name": "Nissan Cima (F50)",
        "name_zh": "日產 Cima (F50)",
        "category": "sedan",
        "years": "2001-2010",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 26,
            "front_arb": 95, "rear_arb": 60,
            "front_track": 1535, "rear_track": 1530,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.0, "total_weight": 1790,
            "cg_height": 510, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza",
        "oem_tire_size": "F: 225/55 R17 / R: 225/55 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 17},
            "rear":  {"width": 225, "aspect": 55, "rim": 17}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "日產旗艦豪華房車，VK45DE 4.5L V8 引擎，電子控制懸吊，相當於 Infiniti Q45",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_stagea_260rs": {
        "name": "Nissan Stagea 260RS (WGNC34)",
        "name_zh": "日產 Stagea 260RS (WGNC34)",
        "category": "sedan",
        "years": "1997-2001",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1480, "rear_track": 1480,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1680,
            "cg_height": 530, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "旅行車版 GT-R，搭載 RB26DETT 引擎及 ATTESA E-TS 四驅系統，實用性與性能兼備",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_primera_p11": {
        "name": "Nissan Primera (P11)",
        "name_zh": "日產 Primera (P11)",
        "category": "sedan",
        "years": "1995-2002",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 22,
            "front_arb": 95, "rear_arb": 55,
            "front_track": 1480, "rear_track": 1470,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1260,
            "cg_height": 480, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Turanza",
        "oem_tire_size": "F: 195/65 R15 / R: 195/65 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 65, "rim": 15},
            "rear":  {"width": 195, "aspect": 65, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "BTCC 英國房車賽冠軍血統，SR20DE 引擎，多連桿後懸吊提供優於同級的操控性",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_civic_eg6": {
        "name": "Honda Civic SiR (EG6)",
        "name_zh": "本田 Civic SiR (EG6)",
        "category": "hatchback",
        "years": "1991-1995",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 95, "rear_arb": 50,
            "front_track": 1465, "rear_track": 1455,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 1040,
            "cg_height": 450, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan",
        "oem_tire_size": "F: 195/55 R15 / R: 195/55 R15",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 15},
            "rear":  {"width": 195, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "B16A VTEC 自然進氣引擎，超輕車身僅 1040kg，前後雙 A 臂懸吊，山路利器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_civic_ef9": {
        "name": "Honda Civic SiR (EF9)",
        "name_zh": "本田 Civic SiR (EF9)",
        "category": "hatchback",
        "years": "1989-1991",
        "layout": "FF",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 20,
            "front_arb": 90, "rear_arb": 45,
            "front_track": 1460, "rear_track": 1450,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 960,
            "cg_height": 445, "wheelbase": 2500
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan",
        "oem_tire_size": "F: 185/60 R14 / R: 185/60 R14",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 60, "rim": 14},
            "rear":  {"width": 185, "aspect": 60, "rim": 14}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "首代 VTEC Civic，B16A 引擎，僅 960kg 的極致輕量化，四輪雙 A 臂懸吊先驅",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_prelude_bb4": {
        "name": "Honda Prelude Si VTEC (BB4)",
        "name_zh": "本田 Prelude Si VTEC (BB4)",
        "category": "sports_car",
        "years": "1992-1996",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 105, "rear_arb": 60,
            "front_track": 1490, "rear_track": 1480,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1270,
            "cg_height": 465, "wheelbase": 2550
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE010",
        "oem_tire_size": "F: 205/50 R16 / R: 205/50 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 50, "rim": 16},
            "rear":  {"width": 205, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "H22A VTEC 高轉引擎，前後雙 A 臂懸吊，前驅跑車代表，機械式四輪轉向系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_accord_cl7": {
        "name": "Honda Accord Euro R (CL7)",
        "name_zh": "本田 Accord Euro R (CL7)",
        "category": "sedan",
        "years": "2002-2008",
        "layout": "FF",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 115, "rear_arb": 65,
            "front_track": 1505, "rear_track": 1510,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1340,
            "cg_height": 485, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "K20A 高轉 VTEC 引擎搭配 6 速手排，前後雙 A 臂懸吊，限量運動房車，螺旋式 LSD",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_fit_gk5": {
        "name": "Honda Fit RS (GK5)",
        "name_zh": "本田 Fit RS (GK5)",
        "category": "hatchback",
        "years": "2013-2020",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 20,
            "front_arb": 80, "rear_arb": 40,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1070,
            "cg_height": 465, "wheelbase": 2530
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 185/55 R16 / R: 185/55 R16",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 16},
            "rear":  {"width": 185, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "L15B 直噴引擎搭配 CVT/6MT，超輕量掀背車，One-Make 賽事人氣車款",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_nsx_nc1": {
        "name": "Honda NSX (NC1)",
        "name_zh": "本田 NSX (NC1)",
        "category": "sports_car",
        "years": "2016-2022",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 50,
            "front_arb": 160, "rear_arb": 110,
            "front_track": 1635, "rear_track": 1600,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 42.0, "total_weight": 1780,
            "cg_height": 440, "wheelbase": 2630
        },
        "tire_defaults": {
            "front_compound": "continental_sc7", "rear_compound": "continental_sc7",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 245/35 R19 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "3.5L V6 雙渦輪混合動力超跑，三電動馬達 SH-AWD 四驅系統，磁流變阻尼器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_integra_dc5": {
        "name": "Honda Integra Type R (DC5)",
        "name_zh": "本田 Integra Type R (DC5)",
        "category": "sports_car",
        "years": "2001-2006",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 65,
            "front_track": 1490, "rear_track": 1495,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 62.0, "total_weight": 1180,
            "cg_height": 455, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE070",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "K20A 高轉 VTEC 引擎，8400rpm 紅線，螺旋式 LSD，Type R 最後的前驅純粹駕駛體驗",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_rx7_fc": {
        "name": "Mazda RX-7 FC3S",
        "name_zh": "馬自達 RX-7 FC3S",
        "category": "sports_car",
        "years": "1985-1992",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1450, "rear_track": 1450,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 1280,
            "cg_height": 460, "wheelbase": 2430
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE71",
        "oem_tire_size": "F: 205/55 R16 / R: 205/55 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 205, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "13B-T 渦輪轉子引擎，輕量緊湊車身，近乎 50:50 配重，渦輪轉子的經典代表",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_rx8_se3p": {
        "name": "Mazda RX-8 (SE3P)",
        "name_zh": "馬自達 RX-8 (SE3P)",
        "category": "sports_car",
        "years": "2003-2012",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1500, "rear_track": 1505,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 1340,
            "cg_height": 450, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE040",
        "oem_tire_size": "F: 225/45 R18 / R: 225/45 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 225, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "RENESIS 13B-MSP 自然進氣轉子引擎，9000rpm 紅線，前中置引擎 51:49 完美配重",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_roadster_nc": {
        "name": "Mazda MX-5/Roadster NC (NCEC)",
        "name_zh": "馬自達 MX-5/Roadster NC (NCEC)",
        "category": "sports_car",
        "years": "2005-2015",
        "layout": "FR",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 100, "rear_arb": 60,
            "front_track": 1490, "rear_track": 1495,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 1145,
            "cg_height": 435, "wheelbase": 2330
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "第三代 MX-5，MZR 2.0L 引擎，比 NB 略大但仍保持輕量後驅精神，電動硬頂可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_mazda3_bp": {
        "name": "Mazda3 BP",
        "name_zh": "馬自達 Mazda3 BP",
        "category": "hatchback",
        "years": "2019-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 25,
            "front_arb": 100, "rear_arb": 55,
            "front_track": 1570, "rear_track": 1575,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1380,
            "cg_height": 480, "wheelbase": 2725
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Toyo Proxes Sport",
        "oem_tire_size": "F: 215/45 R18 / R: 215/45 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 18},
            "rear":  {"width": 215, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SKYACTIV-G 2.0L/2.5L 引擎，GVC Plus 動態控制技術，AWD 可選，設計導向掀背車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_mazda6_gj": {
        "name": "Mazda6/Atenza (GJ)",
        "name_zh": "馬自達 Mazda6/Atenza (GJ)",
        "category": "sedan",
        "years": "2012-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 24,
            "front_arb": 100, "rear_arb": 55,
            "front_track": 1585, "rear_track": 1575,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 59.0, "total_weight": 1470,
            "cg_height": 490, "wheelbase": 2830
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop SP Sport Maxx",
        "oem_tire_size": "F: 225/45 R19 / R: 225/45 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 19},
            "rear":  {"width": 225, "aspect": 45, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SKYACTIV-G 2.5L/2.5T 引擎，GVC 動態控制，多連桿後懸吊提供同級領先操控性",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_demio_dj": {
        "name": "Mazda Demio/Mazda2 (DJ)",
        "name_zh": "馬自達 Demio/Mazda2 (DJ)",
        "category": "hatchback",
        "years": "2014-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 80, "rear_arb": 35,
            "front_track": 1495, "rear_track": 1485,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1020,
            "cg_height": 460, "wheelbase": 2570
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama BluEarth-A",
        "oem_tire_size": "F: 185/65 R15 / R: 185/65 R15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 65, "rim": 15},
            "rear":  {"width": 185, "aspect": 65, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "SKYACTIV-G 1.5L 引擎，超輕量小型車，全日本 Mazda Party Race 賽事車款",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_sg5_forester": {
        "name": "Subaru Forester STI (SG5)",
        "name_zh": "速霸陸 Forester STI (SG5)",
        "category": "suv",
        "years": "2002-2007",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1520, "rear_track": 1520,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 59.0, "total_weight": 1460,
            "cg_height": 560, "wheelbase": 2525
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE040",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "EJ25 渦輪水平對臥引擎，STI 調校懸吊與 Brembo 煞車，跨界 SUV 性能版",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_bp5_legacy": {
        "name": "Subaru Legacy GT (BP5)",
        "name_zh": "速霸陸 Legacy GT (BP5)",
        "category": "sedan",
        "years": "2003-2009",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1520, "rear_track": 1520,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 58.0, "total_weight": 1480,
            "cg_height": 490, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan A10",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "EJ20 渦輪水平對臥引擎，全時四驅旅行車，5MT/4AT 可選，兼顧日常與性能",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_levorg_vn5": {
        "name": "Subaru Levorg STI Sport (VN5)",
        "name_zh": "速霸陸 Levorg STI Sport (VN5)",
        "category": "sedan",
        "years": "2020-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 115, "rear_arb": 75,
            "front_track": 1540, "rear_track": 1545,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1570,
            "cg_height": 500, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan Sport V107",
        "oem_tire_size": "F: 225/45 R18 / R: 225/45 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 225, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "CB18 1.8L 直噴渦輪引擎，電子控制阻尼器 STI 調校，EyeSight X 先進駕駛輔助",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "subaru_wrx_vb": {
        "name": "Subaru WRX (VB) 2022+",
        "name_zh": "速霸陸 WRX (VB) 2022+",
        "category": "sedan",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 125, "rear_arb": 85,
            "front_track": 1535, "rear_track": 1545,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1540,
            "cg_height": 480, "wheelbase": 2675
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop SP Sport Maxx GT600A",
        "oem_tire_size": "F: 245/40 R18 / R: 245/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 245, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "FA24 2.4L 直噴渦輪水平對臥引擎，SGP 全球平台，後雙 A 臂懸吊，6MT/CVT 可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_evo5": {
        "name": "Mitsubishi Lancer Evolution V",
        "name_zh": "三菱 Lancer Evolution V",
        "category": "sedan",
        "years": "1998",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 35,
            "front_arb": 135, "rear_arb": 95,
            "front_track": 1510, "rear_track": 1505,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1360,
            "cg_height": 475, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan A048",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "4G63 渦輪引擎 280ps，首度採用 Brembo 煞車與加寬車體，AYC 主動偏擺控制系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_evo6_tme": {
        "name": "Mitsubishi Lancer Evolution VI TME",
        "name_zh": "三菱 Lancer Evolution VI TME",
        "category": "sedan",
        "years": "1999-2001",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 36,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1510, "rear_track": 1505,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1365,
            "cg_height": 475, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan A048",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Tommi Mäkinen Edition，WRC 冠軍紀念版，鈦合金渦輪，強化懸吊與空力套件",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_evo7": {
        "name": "Mitsubishi Lancer Evolution VII",
        "name_zh": "三菱 Lancer Evolution VII",
        "category": "sedan",
        "years": "2001-2003",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 35,
            "front_arb": 135, "rear_arb": 95,
            "front_track": 1515, "rear_track": 1510,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1400,
            "cg_height": 480, "wheelbase": 2625
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan A046",
        "oem_tire_size": "F: 235/45 R17 / R: 235/45 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "改用 CT9A 底盤加長軸距，4G63 渦輪引擎，ACD 主動中央差速器首度搭載",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_evo8_mr": {
        "name": "Mitsubishi Lancer Evolution VIII MR",
        "name_zh": "三菱 Lancer Evolution VIII MR",
        "category": "sedan",
        "years": "2003-2005",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1515, "rear_track": 1510,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1410,
            "cg_height": 475, "wheelbase": 2625
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan A048",
        "oem_tire_size": "F: 235/45 R17 / R: 235/45 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "MR 為 Mitsubishi Racing 版，Bilstein 阻尼器，Super AYC 超級主動偏擺控制系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_gto_z16a": {
        "name": "Mitsubishi GTO Twin Turbo (Z16A)",
        "name_zh": "三菱 GTO Twin Turbo (Z16A)",
        "category": "gt_car",
        "years": "1990-2000",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1530, "rear_track": 1535,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1710,
            "cg_height": 470, "wheelbase": 2470
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan",
        "oem_tire_size": "F: 225/55 R16 / R: 245/45 R16",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 16},
            "rear":  {"width": 245, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "6G72 雙渦輪 V6 引擎搭配四驅四輪轉向，重達 1710kg，海外以 3000GT VR-4 銷售",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mitsubishi_eclipse_cross": {
        "name": "Mitsubishi Eclipse Cross",
        "name_zh": "三菱 Eclipse Cross",
        "category": "suv",
        "years": "2017-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 28,
            "front_arb": 90, "rear_arb": 50,
            "front_track": 1545, "rear_track": 1545,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 58.0, "total_weight": 1550,
            "cg_height": 580, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.41, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Geolandar SUV",
        "oem_tire_size": "F: 225/55 R18 / R: 225/55 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 18},
            "rear":  {"width": 225, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "1.5L 直噴渦輪引擎，S-AWC 超級全輪控制系統，三菱最後的跨界 SUV 產品線",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "suzuki_cappuccino": {
        "name": "Suzuki Cappuccino (EA11R/EA21R)",
        "name_zh": "鈴木 Cappuccino (EA11R/EA21R)",
        "category": "kei_car",
        "years": "1991-1998",
        "layout": "FR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 24,
            "front_arb": 70, "rear_arb": 50,
            "front_track": 1195, "rear_track": 1205,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 49.0, "total_weight": 700,
            "cg_height": 400, "wheelbase": 2060
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama A539",
        "oem_tire_size": "F: 165/65 R14 / R: 165/65 R14",
        "oem_tire_specs": {
            "front": {"width": 165, "aspect": 65, "rim": 14},
            "rear":  {"width": 165, "aspect": 65, "rim": 14}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "660cc 渦輪三缸後驅輕跑，僅 700kg，前後雙 A 臂懸吊，三片式可拆車頂，ABC 三兄弟之一",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "suzuki_jimny_jb64": {
        "name": "Suzuki Jimny (JB64)",
        "name_zh": "鈴木 Jimny (JB64)",
        "category": "suv",
        "years": "2018-present",
        "layout": "4WD",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 20,
            "front_arb": 65, "rear_arb": 45,
            "front_track": 1395, "rear_track": 1405,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 52.0, "total_weight": 1090,
            "cg_height": 620, "wheelbase": 2250
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": 0.0, "rear_camber_deg": 0.0,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Bridgestone Dueler H/T 684",
        "oem_tire_size": "F: 175/80 R16 / R: 175/80 R16",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 80, "rim": 16},
            "rear":  {"width": 175, "aspect": 80, "rim": 16}
        },
        "suspension_type": "F: Rigid axle (3-link) / R: Rigid axle (3-link)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "R06A 660cc 渦輪引擎，非承載式車身梯型車架，前後硬軸懸吊，純粹越野小型 SUV",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "suzuki_alto_works": {
        "name": "Suzuki Alto Works (HA36S)",
        "name_zh": "鈴木 Alto Works (HA36S)",
        "category": "kei_car",
        "years": "2015-2021",
        "layout": "FF",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 18,
            "front_arb": 65, "rear_arb": 35,
            "front_track": 1295, "rear_track": 1290,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 61.0, "total_weight": 670,
            "cg_height": 430, "wheelbase": 2460
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Dunlop Enasave EC300+",
        "oem_tire_size": "F: 165/55 R15 / R: 165/55 R15",
        "oem_tire_specs": {
            "front": {"width": 165, "aspect": 55, "rim": 15},
            "rear":  {"width": 165, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "R06A 660cc 渦輪引擎搭配 5AGS/5MT，僅 670kg 的超輕量車身，山路利器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "daihatsu_copen_la400k": {
        "name": "Daihatsu Copen (LA400K)",
        "name_zh": "大發 Copen (LA400K)",
        "category": "kei_car",
        "years": "2014-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 20,
            "front_arb": 70, "rear_arb": 40,
            "front_track": 1305, "rear_track": 1295,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 850,
            "cg_height": 420, "wheelbase": 2230
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 165/50 R16 / R: 165/50 R16",
        "oem_tire_specs": {
            "front": {"width": 165, "aspect": 50, "rim": 16},
            "rear":  {"width": 165, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "KF-VET 660cc 渦輪引擎，D-Frame 骨架結構，電動硬頂敞篷，GR Sport 版可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "daihatsu_move_custom": {
        "name": "Daihatsu Move Custom (LA150S)",
        "name_zh": "大發 Move Custom (LA150S)",
        "category": "kei_car",
        "years": "2014-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 16,
            "front_arb": 55, "rear_arb": 25,
            "front_track": 1305, "rear_track": 1290,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 62.0, "total_weight": 820,
            "cg_height": 530, "wheelbase": 2455
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Dunlop Enasave EC300",
        "oem_tire_size": "F: 155/65 R14 / R: 155/65 R14",
        "oem_tire_specs": {
            "front": {"width": 155, "aspect": 65, "rim": 14},
            "rear":  {"width": 155, "aspect": 65, "rim": 14}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "KF-VE/KF-VET 660cc 引擎，輕量高頂輕自動車，日常通勤代步車款",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "honda_beat_pp1": {
        "name": "Honda Beat (PP1)",
        "name_zh": "本田 Beat (PP1)",
        "category": "kei_car",
        "years": "1991-1996",
        "layout": "MR",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 24,
            "front_arb": 65, "rear_arb": 50,
            "front_track": 1295, "rear_track": 1305,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 44.0, "total_weight": 760,
            "cg_height": 410, "wheelbase": 2280
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.07, "rear_optimal_pressure": 2.14
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama A008",
        "oem_tire_size": "F: 155/65 R13 / R: 165/60 R14",
        "oem_tire_specs": {
            "front": {"width": 155, "aspect": 65, "rim": 13},
            "rear":  {"width": 165, "aspect": 60, "rim": 14}
        },
        "suspension_type": "F: MacPherson strut / R: MacPherson strut",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "E07A 660cc MTREC 三氣缸中置引擎，自然進氣 8100rpm 紅線，ABC 三兄弟之一",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_march_nismo_s": {
        "name": "Nissan March NISMO S (K13)",
        "name_zh": "日產 March NISMO S (K13)",
        "category": "hatchback",
        "years": "2013-2022",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 20,
            "front_arb": 85, "rear_arb": 40,
            "front_track": 1460, "rear_track": 1450,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 63.0, "total_weight": 960,
            "cg_height": 455, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.27
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan Fleva",
        "oem_tire_size": "F: 185/55 R16 / R: 185/55 R16",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 16},
            "rear":  {"width": 185, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "HR15DE 1.5L 引擎搭配 5MT，NISMO 調校懸吊與車身剛性強化，輕量入門運動車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_note_nismo_s": {
        "name": "Nissan Note NISMO S (E12)",
        "name_zh": "日產 Note NISMO S (E12)",
        "category": "hatchback",
        "years": "2014-2020",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 90, "rear_arb": 45,
            "front_track": 1480, "rear_track": 1475,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1080,
            "cg_height": 470, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.27, "rear_optimal_pressure": 2.34
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Yokohama Advan Fleva",
        "oem_tire_size": "F: 195/55 R16 / R: 195/55 R16",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 16},
            "rear":  {"width": 195, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "HR16DE 1.6L 引擎搭配 5MT，NISMO 專用 ECU 調校與強化懸吊，實用型運動掀背",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_yaris_grmn": {
        "name": "Toyota Yaris GRMN",
        "name_zh": "豐田 Yaris GRMN",
        "category": "hatchback",
        "years": "2017-2018",
        "layout": "FF",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 70,
            "front_track": 1510, "rear_track": 1505,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 63.0, "total_weight": 1135,
            "cg_height": 455, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "1.8L 機械增壓引擎，Lotus 協助底盤調校，限量 400 台歐洲版，Gazoo Racing 首款量產車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_century_grmn": {
        "name": "Toyota Century GRMN",
        "name_zh": "豐田 Century GRMN",
        "category": "sedan",
        "years": "2018",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 26,
            "front_arb": 100, "rear_arb": 60,
            "front_track": 1590, "rear_track": 1595,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 52.0, "total_weight": 2130,
            "cg_height": 510, "wheelbase": 2925
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.48, "rear_optimal_pressure": 2.48
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Regno GR001",
        "oem_tire_size": "F: 235/50 R18 / R: 235/50 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 50, "rim": 18},
            "rear":  {"width": 235, "aspect": 50, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "V8 5.0L 2UR-FSE 引擎，日本皇室御用車 GRMN 特仕版，21 吋碳纖維鍛造輪框，僅一台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lexus_lfa": {
        "name": "Lexus LFA",
        "name_zh": "凌志 LFA",
        "category": "race_car",
        "years": "2010-2012",
        "layout": "FR",
        "params": {
            "front_spring_rate": 60, "rear_spring_rate": 55,
            "front_arb": 180, "rear_arb": 120,
            "front_track": 1580, "rear_track": 1570,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 48.0, "total_weight": 1480,
            "cg_height": 430, "wheelbase": 2605
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.34, "rear_optimal_pressure": 2.41
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza RE070R",
        "oem_tire_size": "F: 265/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "1LR-GUE 4.8L V10 自然進氣引擎，9000rpm 紅線，碳纖維複合材料車身，限量 500 台超級跑車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_gtv_916": {
        "name": "Alfa Romeo GTV (916)",
        "name_zh": "愛快羅密歐 GTV (916)",
        "category": "sports_car",
        "years": "1995-2005",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 22,
            "front_arb": 100, "rear_arb": 60,
            "front_track": 1510, "rear_track": 1490,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1410,
            "cg_height": 470, "wheelbase": 2540
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "經典義大利 GT 跑車，V6 引擎前驅配置",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_156_gta": {
        "name": "Alfa Romeo 156 GTA",
        "name_zh": "愛快羅密歐 156 GTA",
        "category": "sedan",
        "years": "2002-2005",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 25,
            "front_arb": 110, "rear_arb": 65,
            "front_track": 1510, "rear_track": 1490,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 61.0, "total_weight": 1410,
            "cg_height": 465, "wheelbase": 2595
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Rosso",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "搭載 3.2L V6 Busso 引擎的高性能房車，前驅配置",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_mito_qv": {
        "name": "Alfa Romeo MiTo QV",
        "name_zh": "愛快羅密歐 MiTo QV",
        "category": "hatchback",
        "years": "2008-2018",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 20,
            "front_arb": 85, "rear_arb": 45,
            "front_track": 1475, "rear_track": 1465,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1145,
            "cg_height": 455, "wheelbase": 2511
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -0.4,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Nero",
        "oem_tire_size": "F: 215/40 R18 / R: 215/40 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 40, "rim": 18},
            "rear":  {"width": 215, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "小型高性能掀背車，配備 DNA 駕駛模式選擇系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_stelvio_qv": {
        "name": "Alfa Romeo Stelvio Quadrifoglio",
        "name_zh": "愛快羅密歐 Stelvio 四葉草",
        "category": "suv",
        "years": "2018-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1600, "rear_track": 1615,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.75,
            "weight_front_pct": 52.0, "total_weight": 1830,
            "cg_height": 560, "wheelbase": 2818
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s_suv", "rear_compound": "michelin_ps4s_suv",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.7,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 255/45 R20 / R: 285/40 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 20},
            "rear":  {"width": 285, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "搭載 2.9L V6 雙渦輪引擎的高性能 SUV，紐柏林最速 SUV 紀錄保持者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_360_modena": {
        "name": "Ferrari 360 Modena",
        "name_zh": "法拉利 360 Modena",
        "category": "sports_car",
        "years": "1999-2005",
        "layout": "MR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 35,
            "front_arb": 90, "rear_arb": 100,
            "front_track": 1521, "rear_track": 1518,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.72,
            "weight_front_pct": 43.0, "total_weight": 1390,
            "cg_height": 440, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Potenza RE050",
        "oem_tire_size": "F: 215/45 ZR18 / R: 275/40 ZR18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 18},
            "rear":  {"width": 275, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "全鋁車身中置引擎超跑，搭載 3.6L V8 引擎",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_458_italia": {
        "name": "Ferrari 458 Italia",
        "name_zh": "法拉利 458 Italia",
        "category": "sports_car",
        "years": "2009-2015",
        "layout": "MR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 100, "rear_arb": 120,
            "front_track": 1583, "rear_track": 1551,
            "front_motion_ratio": 0.68, "rear_motion_ratio": 0.70,
            "weight_front_pct": 42.0, "total_weight": 1380,
            "cg_height": 430, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 235/35 ZR20 / R: 295/35 ZR20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "自然進氣 4.5L V8 中置引擎超跑，570 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_f40": {
        "name": "Ferrari F40",
        "name_zh": "法拉利 F40",
        "category": "sports_car",
        "years": "1987-1992",
        "layout": "MR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 55,
            "front_arb": 120, "rear_arb": 140,
            "front_track": 1594, "rear_track": 1606,
            "front_motion_ratio": 0.65, "rear_motion_ratio": 0.68,
            "weight_front_pct": 40.0, "total_weight": 1100,
            "cg_height": 410, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/40 ZR17 / R: 335/35 ZR17",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 17},
            "rear":  {"width": 335, "aspect": 35, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "恩佐·法拉利親自批准的最後一款超跑，雙渦輪 V8 引擎，碳纖維與凱夫拉車身",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_812_superfast": {
        "name": "Ferrari 812 Superfast",
        "name_zh": "法拉利 812 Superfast",
        "category": "gt_car",
        "years": "2017-2022",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 45,
            "front_arb": 120, "rear_arb": 110,
            "front_track": 1672, "rear_track": 1645,
            "front_motion_ratio": 0.68, "rear_motion_ratio": 0.70,
            "weight_front_pct": 47.0, "total_weight": 1525,
            "cg_height": 445, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.3, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 275/35 ZR20 / R: 315/35 ZR20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 20},
            "rear":  {"width": 315, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "搭載 6.5L V12 自然進氣引擎，800 匹馬力前置後驅 GT 超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_sf90": {
        "name": "Ferrari SF90 Stradale",
        "name_zh": "法拉利 SF90 Stradale",
        "category": "sports_car",
        "years": "2019-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 48,
            "front_arb": 130, "rear_arb": 120,
            "front_track": 1679, "rear_track": 1652,
            "front_motion_ratio": 0.65, "rear_motion_ratio": 0.68,
            "weight_front_pct": 44.0, "total_weight": 1570,
            "cg_height": 425, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 R",
        "oem_tire_size": "F: 255/35 ZR20 / R: 315/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 315, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "插電式混合動力超跑，V8 渦輪增壓加三具電動馬達，總輸出 986 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_gallardo": {
        "name": "Lamborghini Gallardo LP560-4",
        "name_zh": "藍寶堅尼 Gallardo LP560-4",
        "category": "sports_car",
        "years": "2008-2013",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 45,
            "front_arb": 110, "rear_arb": 130,
            "front_track": 1540, "rear_track": 1518,
            "front_motion_ratio": 0.68, "rear_motion_ratio": 0.70,
            "weight_front_pct": 43.0, "total_weight": 1410,
            "cg_height": 435, "wheelbase": 2560
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 235/35 ZR19 / R: 295/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "搭載 5.2L V10 自然進氣引擎的全時四驅超跑，560 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_aventador": {
        "name": "Lamborghini Aventador LP700-4",
        "name_zh": "藍寶堅尼 Aventador LP700-4",
        "category": "sports_car",
        "years": "2011-2022",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 50,
            "front_arb": 130, "rear_arb": 150,
            "front_track": 1720, "rear_track": 1700,
            "front_motion_ratio": 0.60, "rear_motion_ratio": 0.62,
            "weight_front_pct": 43.0, "total_weight": 1575,
            "cg_height": 430, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 255/30 ZR20 / R: 335/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 30, "rim": 20},
            "rear":  {"width": 335, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "搭載 6.5L V12 自然進氣引擎的旗艦超跑，碳纖維單體殼車身，700 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_urus": {
        "name": "Lamborghini Urus",
        "name_zh": "藍寶堅尼 Urus",
        "category": "suv",
        "years": "2018-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 40,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1695, "rear_track": 1710,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.72,
            "weight_front_pct": 57.0, "total_weight": 2200,
            "cg_height": 590, "wheelbase": 3003
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s_suv", "rear_compound": "michelin_ps4s_suv",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.6,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 285/40 R22 / R: 325/35 R22",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 40, "rim": 22},
            "rear":  {"width": 325, "aspect": 35, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "超級 SUV，搭載 4.0L V8 雙渦輪增壓引擎，650 匹馬力，氣壓式懸吊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "maserati_mc20": {
        "name": "Maserati MC20",
        "name_zh": "瑪莎拉蒂 MC20",
        "category": "sports_car",
        "years": "2021-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 45,
            "front_arb": 110, "rear_arb": 120,
            "front_track": 1594, "rear_track": 1580,
            "front_motion_ratio": 0.65, "rear_motion_ratio": 0.68,
            "weight_front_pct": 42.0, "total_weight": 1500,
            "cg_height": 430, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.3, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Bridgestone Potenza Sport",
        "oem_tire_size": "F: 245/35 ZR20 / R: 305/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "碳纖維單體殼中置引擎超跑，搭載自主研發 3.0L V6 Nettuno 雙渦輪引擎，630 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "maserati_ghibli_sq4": {
        "name": "Maserati Ghibli SQ4",
        "name_zh": "瑪莎拉蒂 Ghibli SQ4",
        "category": "sedan",
        "years": "2013-2023",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 110, "rear_arb": 80,
            "front_track": 1598, "rear_track": 1618,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.75,
            "weight_front_pct": 52.0, "total_weight": 1810,
            "cg_height": 480, "wheelbase": 2998
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/40 R20 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "四驅豪華運動房車，3.0L V6 雙渦輪增壓引擎，配備 Skyhook 主動式避震",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "pagani_huayra": {
        "name": "Pagani Huayra",
        "name_zh": "帕加尼 Huayra",
        "category": "sports_car",
        "years": "2012-2018",
        "layout": "MR",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 55,
            "front_arb": 130, "rear_arb": 150,
            "front_track": 1640, "rear_track": 1615,
            "front_motion_ratio": 0.62, "rear_motion_ratio": 0.65,
            "weight_front_pct": 44.0, "total_weight": 1350,
            "cg_height": 415, "wheelbase": 2795
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 255/35 ZR20 / R: 335/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 335, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "碳鈦合金單體殼車身，AMG 6.0L V12 雙渦輪引擎，主動式空氣力學翼片",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_elise_s1": {
        "name": "Lotus Elise S1",
        "name_zh": "蓮花 Elise S1",
        "category": "sports_car",
        "years": "1996-2001",
        "layout": "MR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 28,
            "front_arb": 55, "rear_arb": 65,
            "front_track": 1444, "rear_track": 1456,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 38.0, "total_weight": 725,
            "cg_height": 390, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.90
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Yokohama A539",
        "oem_tire_size": "F: 185/55 R15 / R: 225/45 R16",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 15},
            "rear":  {"width": 225, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "極致輕量化中置引擎跑車，鋁合金擠出底盤，僅重 725 公斤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_evora": {
        "name": "Lotus Evora 400",
        "name_zh": "蓮花 Evora 400",
        "category": "sports_car",
        "years": "2015-2021",
        "layout": "MR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 38,
            "front_arb": 80, "rear_arb": 100,
            "front_track": 1560, "rear_track": 1545,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 39.0, "total_weight": 1395,
            "cg_height": 420, "wheelbase": 2575
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 225/40 ZR18 / R: 285/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 285, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "中置 3.5L V6 機械增壓引擎，400 匹馬力，兼具 GT 舒適性與跑車操控",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_europa_s": {
        "name": "Lotus Europa S",
        "name_zh": "蓮花 Europa S",
        "category": "sports_car",
        "years": "2006-2010",
        "layout": "MR",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 30,
            "front_arb": 65, "rear_arb": 75,
            "front_track": 1456, "rear_track": 1474,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 38.0, "total_weight": 995,
            "cg_height": 400, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Yokohama Advan Neova",
        "oem_tire_size": "F: 195/50 R16 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 50, "rim": 16},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "基於 Elise 平台的封閉式 GT 跑車，搭載 Toyota 2ZZ-GE 引擎，渦輪增壓版本 200 匹",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_600lt": {
        "name": "McLaren 600LT",
        "name_zh": "麥拉倫 600LT",
        "category": "sports_car",
        "years": "2018-2020",
        "layout": "MR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 52,
            "front_arb": 120, "rear_arb": 130,
            "front_track": 1654, "rear_track": 1604,
            "front_motion_ratio": 0.62, "rear_motion_ratio": 0.65,
            "weight_front_pct": 42.0, "total_weight": 1247,
            "cg_height": 420, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero Trofeo R",
        "oem_tire_size": "F: 225/35 ZR19 / R: 285/35 ZR20",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "長尾版本輕量化跑車，碳纖維單體殼，頂置排氣管設計，600 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_765lt": {
        "name": "McLaren 765LT",
        "name_zh": "麥拉倫 765LT",
        "category": "sports_car",
        "years": "2020-2022",
        "layout": "MR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 58,
            "front_arb": 140, "rear_arb": 150,
            "front_track": 1658, "rear_track": 1612,
            "front_motion_ratio": 0.60, "rear_motion_ratio": 0.62,
            "weight_front_pct": 42.0, "total_weight": 1229,
            "cg_height": 415, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.8, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.06
        },
        "oem_tire": "Pirelli P Zero Trofeo R",
        "oem_tire_size": "F: 245/35 ZR19 / R: 305/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "極致長尾版本，碳纖維單體殼加碳纖維車身板件，765 匹馬力，限量生產",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_p1": {
        "name": "McLaren P1",
        "name_zh": "麥拉倫 P1",
        "category": "sports_car",
        "years": "2013-2015",
        "layout": "MR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 65,
            "front_arb": 150, "rear_arb": 170,
            "front_track": 1660, "rear_track": 1614,
            "front_motion_ratio": 0.58, "rear_motion_ratio": 0.60,
            "weight_front_pct": 42.0, "total_weight": 1395,
            "cg_height": 400, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 245/35 ZR19 / R: 315/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 315, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "油電混合動力超跑，碳纖維 MonoCage 單體殼，903 匹馬力，主動式空氣力學，限量 375 台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_db11": {
        "name": "Aston Martin DB11 V12",
        "name_zh": "奧斯頓馬丁 DB11 V12",
        "category": "gt_car",
        "years": "2016-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 30,
            "front_arb": 100, "rear_arb": 85,
            "front_track": 1610, "rear_track": 1600,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.75,
            "weight_front_pct": 51.0, "total_weight": 1770,
            "cg_height": 460, "wheelbase": 2805
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Potenza S007",
        "oem_tire_size": "F: 255/40 ZR20 / R: 295/35 ZR20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 20},
            "rear":  {"width": 295, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "全新鋁合金平台 GT 跑車，5.2L V12 雙渦輪增壓引擎，600 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_valhalla": {
        "name": "Aston Martin Valhalla",
        "name_zh": "奧斯頓馬丁 Valhalla",
        "category": "sports_car",
        "years": "2024-2026",
        "layout": "MR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 58,
            "front_arb": 140, "rear_arb": 160,
            "front_track": 1680, "rear_track": 1650,
            "front_motion_ratio": 0.58, "rear_motion_ratio": 0.60,
            "weight_front_pct": 42.0, "total_weight": 1550,
            "cg_height": 405, "wheelbase": 2740
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.8, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 R",
        "oem_tire_size": "F: 265/35 ZR20 / R: 325/30 ZR21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 325, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "中置混合動力超跑，4.0L V8 雙渦輪加雙電動馬達，碳纖維單體殼，目標 998 匹總輸出",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_dbs": {
        "name": "Aston Martin DBS Superleggera",
        "name_zh": "奧斯頓馬丁 DBS Superleggera",
        "category": "gt_car",
        "years": "2018-2023",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 33,
            "front_arb": 115, "rear_arb": 95,
            "front_track": 1615, "rear_track": 1605,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.72,
            "weight_front_pct": 51.0, "total_weight": 1693,
            "cg_height": 450, "wheelbase": 2805
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 265/35 ZR21 / R: 305/30 ZR21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 21},
            "rear":  {"width": 305, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "碳纖維車身板件的旗艦 GT 超跑，5.2L V12 雙渦輪，725 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bentley_continental_gt": {
        "name": "Bentley Continental GT V8",
        "name_zh": "賓利 Continental GT V8",
        "category": "gt_car",
        "years": "2018-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 90,
            "front_track": 1642, "rear_track": 1622,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.72,
            "weight_front_pct": 55.0, "total_weight": 2165,
            "cg_height": 510, "wheelbase": 2851
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/35 R22 / R: 275/35 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 22},
            "rear":  {"width": 275, "aspect": 35, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "頂級豪華 GT 轎跑，4.0L V8 雙渦輪增壓，氣壓懸吊搭配 48V 主動防傾桿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "rolls_royce_wraith": {
        "name": "Rolls-Royce Wraith",
        "name_zh": "勞斯萊斯 Wraith",
        "category": "gt_car",
        "years": "2013-2023",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 25,
            "front_arb": 100, "rear_arb": 75,
            "front_track": 1636, "rear_track": 1670,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.75,
            "weight_front_pct": 52.0, "total_weight": 2360,
            "cg_height": 530, "wheelbase": 3112
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 255/45 R20 / R: 285/40 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 20},
            "rear":  {"width": 285, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "超豪華 GT 轎跑，6.6L V12 雙渦輪，氣壓懸吊，對開式車門",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "morgan_plus_four": {
        "name": "Morgan Plus Four",
        "name_zh": "摩根 Plus Four",
        "category": "sports_car",
        "years": "2020-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 20,
            "front_arb": 65, "rear_arb": 50,
            "front_track": 1370, "rear_track": 1380,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.85,
            "weight_front_pct": 52.0, "total_weight": 1009,
            "cg_height": 430, "wheelbase": 2440
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Yokohama Advan Sport V105",
        "oem_tire_size": "F: 205/55 R16 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "鋁合金底盤搭配手工木質車身的經典英式跑車，搭載 BMW B48 2.0L 渦輪引擎",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tvr_sagaris": {
        "name": "TVR Sagaris",
        "name_zh": "TVR Sagaris",
        "category": "sports_car",
        "years": "2004-2006",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 90, "rear_arb": 100,
            "front_track": 1470, "rear_track": 1490,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 1078,
            "cg_height": 420, "wheelbase": 2360
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Toyo Proxes T1R",
        "oem_tire_size": "F: 235/40 ZR18 / R: 255/35 ZR18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 18},
            "rear":  {"width": 255, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "暴力英式跑車，自製 4.0L 直六引擎，406 匹馬力，無防滑控制系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "caterham_7_310r": {
        "name": "Caterham Seven 310R",
        "name_zh": "卡特漢姆 Seven 310R",
        "category": "sports_car",
        "years": "2016-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 22,
            "front_arb": 45, "rear_arb": 50,
            "front_track": 1295, "rear_track": 1340,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 46.0, "total_weight": 540,
            "cg_height": 360, "wheelbase": 2225
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Avon ZZR",
        "oem_tire_size": "F: 175/55 R13 / R: 205/45 R14",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 55, "rim": 13},
            "rear":  {"width": 205, "aspect": 45, "rim": 14}
        },
        "suspension_type": "F: Double wishbone / R: De Dion tube",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "極致輕量化賽道日用車，Suzuki 1.6L 引擎 152 匹馬力，僅重 540 公斤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bac_mono": {
        "name": "BAC Mono",
        "name_zh": "BAC Mono",
        "category": "race_car",
        "years": "2011-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 48,
            "front_arb": 100, "rear_arb": 120,
            "front_track": 1600, "rear_track": 1500,
            "front_motion_ratio": 0.60, "rear_motion_ratio": 0.62,
            "weight_front_pct": 44.0, "total_weight": 570,
            "cg_height": 330, "wheelbase": 2565
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.90
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Kumho Ecsta V720",
        "oem_tire_size": "F: 205/40 ZR17 / R: 255/40 ZR18",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "單座中置引擎超輕量跑車，碳纖維與石墨烯車身，可合法上路的方程式賽車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "peugeot_208_gti": {
        "name": "Peugeot 208 GTi",
        "name_zh": "寶獅 208 GTi",
        "category": "hatchback",
        "years": "2013-2019",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 18,
            "front_arb": 80, "rear_arb": 40,
            "front_track": 1480, "rear_track": 1470,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 1160,
            "cg_height": 450, "wheelbase": 2538
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 3",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "法系鋼炮掀背車，1.6L 渦輪增壓引擎，Torsen 限滑差速器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "peugeot_308_gti": {
        "name": "Peugeot 308 GTi",
        "name_zh": "寶獅 308 GTi",
        "category": "hatchback",
        "years": "2015-2021",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 20,
            "front_arb": 90, "rear_arb": 45,
            "front_track": 1520, "rear_track": 1505,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1205,
            "cg_height": 455, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "法系性能掀背，1.6L THP 渦輪增壓 270 匹馬力，Torsen 限滑差速器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "peugeot_508_sw": {
        "name": "Peugeot 508 PSE",
        "name_zh": "寶獅 508 PSE",
        "category": "sedan",
        "years": "2021-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 25,
            "front_arb": 95, "rear_arb": 60,
            "front_track": 1570, "rear_track": 1555,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 56.0, "total_weight": 1865,
            "cg_height": 470, "wheelbase": 2793
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -0.4,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 S",
        "oem_tire_size": "F: 245/35 R20 / R: 245/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 245, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Peugeot Sport Engineered 插電式混合動力高性能旅行車，360 匹綜合馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "renault_megane_rs": {
        "name": "Renault Megane RS Trophy",
        "name_zh": "雷諾 Megane RS Trophy",
        "category": "hatchback",
        "years": "2018-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 22,
            "front_arb": 100, "rear_arb": 50,
            "front_track": 1546, "rear_track": 1558,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1420,
            "cg_height": 460, "wheelbase": 2669
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Potenza S001",
        "oem_tire_size": "F: 245/35 R19 / R: 245/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 245, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson (4-control) / R: Torsion beam (4-control)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "紐柏林前驅最速紀錄保持者，四輪轉向系統，Torsen 限滑差速器，300 匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "renault_clio_rs": {
        "name": "Renault Clio RS 200",
        "name_zh": "雷諾 Clio RS 200",
        "category": "hatchback",
        "years": "2006-2012",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 18,
            "front_arb": 85, "rear_arb": 40,
            "front_track": 1465, "rear_track": 1450,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1204,
            "cg_height": 450, "wheelbase": 2585
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental SportContact 3",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "經典法系小鋼炮，自然進氣 2.0L 引擎搭配六速手排，操控靈活",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "renault_alpine_a110": {
        "name": "Alpine A110",
        "name_zh": "Alpine A110",
        "category": "sports_car",
        "years": "2017-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 28,
            "front_arb": 60, "rear_arb": 80,
            "front_track": 1553, "rear_track": 1528,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 44.0, "total_weight": 1098,
            "cg_height": 405, "wheelbase": 2420
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 205/40 ZR18 / R: 235/40 ZR18",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 18},
            "rear":  {"width": 235, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "全鋁底盤中置引擎輕量跑車，1.8L 渦輪增壓引擎，252 匹馬力，重視駕駛樂趣",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "citroen_ds3_racing": {
        "name": "Citroen DS3 Racing",
        "name_zh": "雪鐵龍 DS3 Racing",
        "category": "hatchback",
        "years": "2011-2012",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 20,
            "front_arb": 85, "rear_arb": 40,
            "front_track": 1480, "rear_track": 1470,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 63.0, "total_weight": 1165,
            "cg_height": 445, "wheelbase": 2455
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 3",
        "oem_tire_size": "F: 215/35 R18 / R: 215/35 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 35, "rim": 18},
            "rear":  {"width": 215, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "限量版高性能掀背，1.6L 渦輪增壓 207 匹馬力，降低車身 15mm，限量 200 台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "seat_leon_cupra": {
        "name": "SEAT Leon Cupra R",
        "name_zh": "西雅特 Leon Cupra R",
        "category": "hatchback",
        "years": "2017-2020",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 22,
            "front_arb": 95, "rear_arb": 50,
            "front_track": 1540, "rear_track": 1520,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 60.0, "total_weight": 1380,
            "cg_height": 455, "wheelbase": 2636
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "西班牙高性能掀背，2.0L TSI 引擎 300 匹馬力，VAQ 電子差速器，紐柏林前驅紀錄",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "volvo_s60_polestar": {
        "name": "Volvo S60 Polestar",
        "name_zh": "富豪 S60 Polestar",
        "category": "sedan",
        "years": "2014-2018",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 100, "rear_arb": 70,
            "front_track": 1560, "rear_track": 1540,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 58.0, "total_weight": 1675,
            "cg_height": 475, "wheelbase": 2776
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 S",
        "oem_tire_size": "F: 245/35 R20 / R: 245/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 245, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "瑞典高性能房車，3.0L 直六渦輪增壓引擎 367 匹馬力，Ohlins 避震器，限量生產",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "polestar_2": {
        "name": "Polestar 2",
        "name_zh": "極星 2",
        "category": "electric",
        "years": "2020-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 30,
            "front_arb": 100, "rear_arb": 70,
            "front_track": 1580, "rear_track": 1570,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 50.0, "total_weight": 2123,
            "cg_height": 430, "wheelbase": 2735
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4_ev", "rear_compound": "michelin_ps4_ev",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 EV",
        "oem_tire_size": "F: 245/40 R20 / R: 245/40 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 20},
            "rear":  {"width": 245, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "瑞典純電動高性能轎車，雙馬達四驅 408 匹馬力，可選配 Ohlins 避震器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "koenigsegg_agera_rs": {
        "name": "Koenigsegg Agera RS",
        "name_zh": "柯尼塞格 Agera RS",
        "category": "sports_car",
        "years": "2015-2018",
        "layout": "MR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 65,
            "front_arb": 150, "rear_arb": 170,
            "front_track": 1700, "rear_track": 1650,
            "front_motion_ratio": 0.55, "rear_motion_ratio": 0.58,
            "weight_front_pct": 44.0, "total_weight": 1295,
            "cg_height": 395, "wheelbase": 2662
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 265/35 ZR19 / R: 345/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 19},
            "rear":  {"width": 345, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "瑞典極速超跑，5.0L V8 雙渦輪 1160 匹馬力，最高時速 447 km/h 世界紀錄，限量 25 台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "saab_93_aero": {
        "name": "Saab 9-3 Aero",
        "name_zh": "紳寶 9-3 Aero",
        "category": "sedan",
        "years": "2002-2012",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 90, "rear_arb": 55,
            "front_track": 1524, "rear_track": 1507,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 62.0, "total_weight": 1510,
            "cg_height": 470, "wheelbase": 2675
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -0.4,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental ContiSportContact 5",
        "oem_tire_size": "F: 235/45 R17 / R: 235/45 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "瑞典渦輪增壓運動房車，2.8L V6 渦輪引擎 280 匹馬力，XWD 四驅可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "fiat_500_abarth": {
        "name": "Fiat 500 Abarth",
        "name_zh": "飛雅特 500 Abarth",
        "category": "hatchback",
        "years": "2008-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 70, "rear_arb": 35,
            "front_track": 1408, "rear_track": 1390,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.82,
            "weight_front_pct": 63.0, "total_weight": 1035,
            "cg_height": 445, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -0.4,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Pirelli P Zero Nero",
        "oem_tire_size": "F: 205/40 R17 / R: 205/40 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 17},
            "rear":  {"width": 205, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "義大利迷你鋼炮，1.4L 渦輪增壓引擎 160 匹馬力，Koni 避震器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lancia_delta_integrale": {
        "name": "Lancia Delta Integrale",
        "name_zh": "蘭吉雅 Delta Integrale",
        "category": "hatchback",
        "years": "1987-1994",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 25,
            "front_arb": 95, "rear_arb": 70,
            "front_track": 1468, "rear_track": 1444,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.82,
            "weight_front_pct": 58.0, "total_weight": 1340,
            "cg_height": 465, "wheelbase": 2480
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P700Z",
        "oem_tire_size": "F: 205/45 ZR16 / R: 205/45 ZR16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 16},
            "rear":  {"width": 205, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "WRC 傳奇拉力戰車，2.0L 渦輪增壓引擎 210 匹馬力，全時四驅，六屆 WRC 冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_cortina": {
        "name": "Lotus Cortina Mk1",
        "name_zh": "蓮花 Cortina Mk1",
        "category": "sedan",
        "years": "1963-1966",
        "layout": "FR",
        "params": {
            "front_spring_rate": 14, "rear_spring_rate": 12,
            "front_arb": 40, "rear_arb": 30,
            "front_track": 1270, "rear_track": 1245,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 53.0, "total_weight": 840,
            "cg_height": 450, "wheelbase": 2489
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "Dunlop SP Sport",
        "oem_tire_size": "F: 165/80 R13 / R: 165/80 R13",
        "oem_tire_specs": {
            "front": {"width": 165, "aspect": 80, "rim": 13},
            "rear":  {"width": 165, "aspect": 80, "rim": 13}
        },
        "suspension_type": "F: MacPherson / R: Leaf spring with A-frame",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "1960 年代經典英國房車賽傳奇，Lotus 調校的 Ford 1.6L 雙凸輪軸引擎，鋁合金部件輕量化",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_gt": {
        "name": "McLaren GT",
        "name_zh": "麥拉倫 GT",
        "category": "gt_car",
        "years": "2019-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 38,
            "front_arb": 90, "rear_arb": 100,
            "front_track": 1654, "rear_track": 1604,
            "front_motion_ratio": 0.65, "rear_motion_ratio": 0.68,
            "weight_front_pct": 42.0, "total_weight": 1466,
            "cg_height": 435, "wheelbase": 2675
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 225/35 ZR20 / R: 295/30 ZR21",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "注重長途舒適性的中置引擎 GT 跑車，620 匹馬力，碳纖維單體殼，行李空間 570 公升",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mini_gp3_f56": {
        "name": "MINI John Cooper Works GP3 (F56)",
        "name_zh": "MINI JCW GP3 (F56)",
        "category": "hatchback",
        "years": "2020-2021",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 25,
            "front_arb": 110, "rear_arb": 55,
            "front_track": 1530, "rear_track": 1565,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 61.0, "total_weight": 1255,
            "cg_height": 445, "wheelbase": 2495
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Hankook Ventus S1 evo3",
        "oem_tire_size": "F: 225/35 R18 / R: 225/35 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 35, "rim": 18},
            "rear":  {"width": 225, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "限量 3000 台的極致版本，2.0L 渦輪 306 匹馬力，機械式限滑差速器，碳纖維空力套件",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "noble_m400": {
        "name": "Noble M400",
        "name_zh": "Noble M400",
        "category": "sports_car",
        "years": "2004-2006",
        "layout": "MR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 42,
            "front_arb": 90, "rear_arb": 110,
            "front_track": 1500, "rear_track": 1490,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 42.0, "total_weight": 1060,
            "cg_height": 400, "wheelbase": 2415
        },
        "tire_defaults": {
            "front_compound": "michelin_psc2", "rear_compound": "michelin_psc2",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Yokohama A048",
        "oem_tire_size": "F: 225/40 ZR18 / R: 265/35 ZR18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 265, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "英國手工超跑，Ford Duratec 3.0L V6 雙渦輪增壓 425 匹馬力，無電子輔助系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ginetta_g40": {
        "name": "Ginetta G40",
        "name_zh": "吉內塔 G40",
        "category": "race_car",
        "years": "2010-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 30,
            "front_arb": 65, "rear_arb": 75,
            "front_track": 1420, "rear_track": 1430,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.85,
            "weight_front_pct": 44.0, "total_weight": 795,
            "cg_height": 380, "wheelbase": 2390
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.90
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Dunlop Direzza",
        "oem_tire_size": "F: 195/50 R15 / R: 225/45 R16",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 50, "rim": 15},
            "rear":  {"width": 225, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "英國入門級賽道跑車，Ford 1.8L 自然進氣引擎，玻璃纖維車身，GRDC 統規賽用車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e34_m5": {
        "name": "BMW M5 (E34)",
        "name_zh": "BMW M5 (E34)",
        "category": "sedan",
        "years": "1988-1995",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 24,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1510, "rear_track": 1530,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1680,
            "cg_height": 480, "wheelbase": 2760
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 235/45 R17 / R: 255/40 R17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "經典 E34 M5，自然進氣直六 S38 引擎，手排後驅，駕駛者之車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e39_m5": {
        "name": "BMW M5 (E39)",
        "name_zh": "BMW M5 (E39)",
        "category": "sedan",
        "years": "1998-2003",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 120, "rear_arb": 75,
            "front_track": 1516, "rear_track": 1528,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.5, "total_weight": 1795,
            "cg_height": 470, "wheelbase": 2830
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 245/40 R18 / R: 275/35 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 275, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": true,
        "notes": "E39 M5，S62 V8 自然進氣引擎 400 匹馬力，公認最佳 M5 世代，手排後驅經典",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_f90_m5": {
        "name": "BMW M5 (F90)",
        "name_zh": "BMW M5 (F90)",
        "category": "sedan",
        "years": "2017-2023",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 32,
            "front_arb": 140, "rear_arb": 90,
            "front_track": 1610, "rear_track": 1600,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1930,
            "cg_height": 460, "wheelbase": 2982
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/35 R20 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "F90 M5，S63 雙渦輪 V8 引擎 600 匹，M xDrive 全驅系統可切換純後驅模式，兼顧性能與日常",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e60_m5": {
        "name": "BMW M5 (E60)",
        "name_zh": "BMW M5 (E60)",
        "category": "sedan",
        "years": "2005-2010",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 85,
            "front_track": 1540, "rear_track": 1544,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1830,
            "cg_height": 465, "wheelbase": 2889
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport PS2",
        "oem_tire_size": "F: 255/40 R19 / R: 285/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 19},
            "rear":  {"width": 285, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "E60 M5，傳奇 S85 V10 引擎 507 匹，源自 F1 技術，轉速紅線 8250 RPM，聲浪無敵",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e24_m6": {
        "name": "BMW M6 (E24)",
        "name_zh": "BMW M6 (E24)",
        "category": "gt_car",
        "years": "1983-1989",
        "layout": "FR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 100, "rear_arb": 60,
            "front_track": 1470, "rear_track": 1490,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.5, "total_weight": 1510,
            "cg_height": 470, "wheelbase": 2626
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin TRX",
        "oem_tire_size": "F: 220/55 VR390 / R: 220/55 VR390",
        "oem_tire_specs": {
            "front": {"width": 220, "aspect": 55, "rim": 16},
            "rear":  {"width": 220, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "E24 M6，搭載 S38 直六引擎，優雅的鯊魚頭設計，80 年代經典 GT 跑車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_f13_m6": {
        "name": "BMW M6 (F13)",
        "name_zh": "BMW M6 (F13)",
        "category": "gt_car",
        "years": "2012-2018",
        "layout": "FR",
        "params": {
            "front_spring_rate": 36, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 85,
            "front_track": 1600, "rear_track": 1598,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.5, "total_weight": 1850,
            "cg_height": 450, "wheelbase": 2851
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 265/35 R20 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "F13 M6 雙門跑車，S63 雙渦輪 V8 引擎 560 匹，碳纖維車頂，豪華與性能兼備",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_e31_850csi": {
        "name": "BMW 850CSi (E31)",
        "name_zh": "BMW 850CSi (E31)",
        "category": "gt_car",
        "years": "1992-1996",
        "layout": "FR",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 115, "rear_arb": 70,
            "front_track": 1530, "rear_track": 1540,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 52.0, "total_weight": 1840,
            "cg_height": 455, "wheelbase": 2684
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone RE71",
        "oem_tire_size": "F: 235/45 ZR17 / R: 265/40 ZR17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 265, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (integral)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "E31 850CSi，S70 V12 引擎 380 匹，M 部門調校底盤，90 年代旗艦 GT 經典",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_z3m_coupe": {
        "name": "BMW Z3 M Coupe",
        "name_zh": "BMW Z3 M Coupé",
        "category": "sports_car",
        "years": "1998-2002",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 22,
            "front_arb": 115, "rear_arb": 70,
            "front_track": 1420, "rear_track": 1456,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 51.5, "total_weight": 1400,
            "cg_height": 450, "wheelbase": 2459
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 225/45 R17 / R: 245/40 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 245, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Z3 M Coupé，暱稱「麵包車」，S52/S54 直六引擎，短軸距剛性極佳，隱藏版經典",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_z4m40i_g29": {
        "name": "BMW Z4 M40i (G29)",
        "name_zh": "BMW Z4 M40i (G29)",
        "category": "sports_car",
        "years": "2019-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 26,
            "front_arb": 125, "rear_arb": 80,
            "front_track": 1540, "rear_track": 1556,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 51.0, "total_weight": 1535,
            "cg_height": 445, "wheelbase": 2470
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 255/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "G29 Z4 M40i，B58 直六渦輪 340 匹，與 Toyota Supra 共用平台，電子差速後驅敞篷",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_f82_m4": {
        "name": "BMW M4 (F82)",
        "name_zh": "BMW M4 (F82)",
        "category": "sports_car",
        "years": "2014-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 28,
            "front_arb": 130, "rear_arb": 85,
            "front_track": 1560, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.5, "total_weight": 1585,
            "cg_height": 450, "wheelbase": 2812
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 255/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "F82 M4，S55 直六雙渦輪 431 匹，碳纖維傳動軸，純後驅設定，賽道與街道兼備",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_128ti_f40": {
        "name": "BMW 128ti (F40)",
        "name_zh": "BMW 128ti (F40)",
        "category": "hatchback",
        "years": "2020-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 20,
            "front_arb": 100, "rear_arb": 55,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 60.0, "total_weight": 1440,
            "cg_height": 460, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 225/40 R18 / R: 225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "128ti，B48 四缸渦輪 265 匹前驅鋼砲，機械式 LSD，致敬經典 ti 傳統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_m240i_g42": {
        "name": "BMW M240i (G42)",
        "name_zh": "BMW M240i (G42)",
        "category": "sports_car",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 26,
            "front_arb": 120, "rear_arb": 75,
            "front_track": 1560, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1600,
            "cg_height": 455, "wheelbase": 2741
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 245/35 R19 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "G42 M240i，B58 直六渦輪 374 匹，xDrive 全驅系統，後驅為主的駕駛感受",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_x5m_f95": {
        "name": "BMW X5 M Competition (F95)",
        "name_zh": "BMW X5 M 雷霆版 (F95)",
        "category": "suv",
        "years": "2020-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 160, "rear_arb": 110,
            "front_track": 1658, "rear_track": 1680,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.5, "total_weight": 2370,
            "cg_height": 580, "wheelbase": 2975
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s_suv", "rear_compound": "michelin_ps4s_suv",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 295/35 R21 / R: 315/35 R21",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 35, "rim": 21},
            "rear":  {"width": 315, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link (adaptive air)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "X5 M Competition，S63 雙渦輪 V8 引擎 625 匹，自適應氣壓懸吊，超級 SUV",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_930_turbo": {
        "name": "Porsche 911 Turbo (930)",
        "name_zh": "保時捷 911 Turbo (930)",
        "category": "sports_car",
        "years": "1975-1989",
        "layout": "RR",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 28,
            "front_arb": 80, "rear_arb": 120,
            "front_track": 1432, "rear_track": 1500,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 40.0, "total_weight": 1300,
            "cg_height": 440, "wheelbase": 2272
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Pirelli P7",
        "oem_tire_size": "F: 205/55 VR16 / R: 245/45 VR16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 245, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: MacPherson (torsion bar) / R: Semi-trailing arm (torsion bar)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "930 Turbo，經典「寡婦製造機」，渦輪遲滯加後置引擎，極具挑戰性的駕駛體驗",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_964_carrera": {
        "name": "Porsche 911 Carrera (964)",
        "name_zh": "保時捷 911 Carrera (964)",
        "category": "sports_car",
        "years": "1989-1994",
        "layout": "RR",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 30,
            "front_arb": 90, "rear_arb": 110,
            "front_track": 1380, "rear_track": 1374,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 40.5, "total_weight": 1370,
            "cg_height": 440, "wheelbase": 2272
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Bridgestone RE71",
        "oem_tire_size": "F: 205/55 ZR16 / R: 225/50 ZR16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: MacPherson (coil) / R: Semi-trailing arm (coil)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "964 Carrera，首代配備 ABS 與動力轉向的 911，M64 水平對臥六缸 250 匹",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_993_carrera": {
        "name": "Porsche 911 Carrera (993)",
        "name_zh": "保時捷 911 Carrera (993)",
        "category": "sports_car",
        "years": "1994-1998",
        "layout": "RR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 32,
            "front_arb": 95, "rear_arb": 115,
            "front_track": 1405, "rear_track": 1444,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 39.5, "total_weight": 1370,
            "cg_height": 435, "wheelbase": 2272
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Bridgestone S-02",
        "oem_tire_size": "F: 205/55 ZR16 / R: 245/45 ZR16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 245, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (LSA)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "993 Carrera，最後一代氣冷 911，多連桿後懸吊大幅提升操控，被譽為最美 911",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_996_carrera": {
        "name": "Porsche 911 Carrera (996)",
        "name_zh": "保時捷 911 Carrera (996)",
        "category": "sports_car",
        "years": "1998-2004",
        "layout": "RR",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 34,
            "front_arb": 100, "rear_arb": 120,
            "front_track": 1455, "rear_track": 1500,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 39.0, "total_weight": 1370,
            "cg_height": 430, "wheelbase": 2350
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 205/50 R17 / R: 255/40 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 50, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (LSA)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "996 Carrera，首代水冷 911，M96 水平對臥六缸 300 匹，性價比最高的 911 入門",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_997_carrera_s": {
        "name": "Porsche 911 Carrera S (997)",
        "name_zh": "保時捷 911 Carrera S (997)",
        "category": "sports_car",
        "years": "2004-2012",
        "layout": "RR",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 38,
            "front_arb": 110, "rear_arb": 130,
            "front_track": 1486, "rear_track": 1534,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 38.5, "total_weight": 1440,
            "cg_height": 425, "wheelbase": 2350
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Michelin Pilot Sport 2",
        "oem_tire_size": "F: 235/35 R19 / R: 295/30 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (LSA)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "997 Carrera S，M97 水平對臥六缸 355 匹，回歸圓燈經典造型，PASM 可調阻尼可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_991_turbo_s": {
        "name": "Porsche 911 Turbo S (991)",
        "name_zh": "保時捷 911 Turbo S (991)",
        "category": "sports_car",
        "years": "2013-2019",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 48,
            "front_arb": 130, "rear_arb": 150,
            "front_track": 1530, "rear_track": 1554,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 39.0, "total_weight": 1600,
            "cg_height": 420, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.05, "rear_toe_deg": -0.05
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 ZR20 / R: 305/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (PASM Sport)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "991 Turbo S，雙渦輪水平對臥六缸 580 匹，全時四驅後軸轉向，0-100 僅 2.9 秒",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_992_carrera_s": {
        "name": "Porsche 911 Carrera S (992)",
        "name_zh": "保時捷 911 Carrera S (992)",
        "category": "sports_car",
        "years": "2019-present",
        "layout": "RR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 42,
            "front_arb": 120, "rear_arb": 140,
            "front_track": 1538, "rear_track": 1574,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 39.0, "total_weight": 1530,
            "cg_height": 420, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.1, "rear_toe_deg": -0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 R20 / R: 305/30 R21",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (PASM)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "992 Carrera S，雙渦輪水平對臥六缸 450 匹，最新世代 911，前後混合胎圈尺寸",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_944_turbo": {
        "name": "Porsche 944 Turbo",
        "name_zh": "保時捷 944 Turbo",
        "category": "sports_car",
        "years": "1985-1991",
        "layout": "FR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 24,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1477, "rear_track": 1451,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 50.5, "total_weight": 1350,
            "cg_height": 440, "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P7",
        "oem_tire_size": "F: 215/60 VR15 / R: 215/60 VR15",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 60, "rim": 15},
            "rear":  {"width": 215, "aspect": 60, "rim": 15}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm (torsion bar)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "944 Turbo，前置水冷四缸渦輪 250 匹，後置變速箱完美 50:50 配重，操控標竿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_928_gts": {
        "name": "Porsche 928 GTS",
        "name_zh": "保時捷 928 GTS",
        "category": "gt_car",
        "years": "1992-1995",
        "layout": "FR",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 26,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1551, "rear_track": 1530,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 51.0, "total_weight": 1600,
            "cg_height": 445, "wheelbase": 2500
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone RE71",
        "oem_tire_size": "F: 225/45 ZR17 / R: 255/40 ZR17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: Double-wishbone / R: Weissach multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "928 GTS，V8 前置引擎 GT 旗艦 350 匹，Weissach 後軸設計，被低估的保時捷經典",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_968": {
        "name": "Porsche 968",
        "name_zh": "保時捷 968",
        "category": "sports_car",
        "years": "1992-1995",
        "layout": "FR",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 22,
            "front_arb": 95, "rear_arb": 70,
            "front_track": 1477, "rear_track": 1451,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 50.0, "total_weight": 1370,
            "cg_height": 445, "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza",
        "oem_tire_size": "F: 205/55 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "保時捷 968，944 最終進化版，3.0 四缸可變氣門正時 240 匹，後置變速箱完美配重",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_boxster_986": {
        "name": "Porsche Boxster (986)",
        "name_zh": "保時捷 Boxster (986)",
        "category": "sports_car",
        "years": "1996-2004",
        "layout": "MR",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 28,
            "front_arb": 90, "rear_arb": 100,
            "front_track": 1465, "rear_track": 1522,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 46.0, "total_weight": 1295,
            "cg_height": 420, "wheelbase": 2415
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": -0.05
        },
        "oem_tire": "Continental ContiSportContact",
        "oem_tire_size": "F: 205/55 R16 / R: 225/50 R16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 225, "aspect": 50, "rim": 16}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "986 Boxster，中置水平對臥六缸敞篷，底盤平衡極佳，入門保時捷的最佳選擇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_boxster_987_s": {
        "name": "Porsche Boxster S (987)",
        "name_zh": "保時捷 Boxster S (987)",
        "category": "sports_car",
        "years": "2005-2012",
        "layout": "MR",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 30,
            "front_arb": 95, "rear_arb": 110,
            "front_track": 1490, "rear_track": 1534,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 45.5, "total_weight": 1355,
            "cg_height": 415, "wheelbase": 2415
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.3,
            "front_toe_deg": 0.05, "rear_toe_deg": -0.05
        },
        "oem_tire": "Continental ContiSportContact 3",
        "oem_tire_size": "F: 235/40 R18 / R: 265/40 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 18},
            "rear":  {"width": 265, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: MacPherson",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "987 Boxster S，3.4 水平對臥六缸 295 匹，PASM 可選，中置後驅操控教科書",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_cayman_981": {
        "name": "Porsche Cayman (981)",
        "name_zh": "保時捷 Cayman (981)",
        "category": "sports_car",
        "years": "2013-2016",
        "layout": "MR",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 32,
            "front_arb": 100, "rear_arb": 115,
            "front_track": 1526, "rear_track": 1540,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 45.0, "total_weight": 1340,
            "cg_height": 410, "wheelbase": 2475
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.3,
            "front_toe_deg": 0.05, "rear_toe_deg": -0.05
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 235/40 R19 / R: 265/40 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 19},
            "rear":  {"width": 265, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: MacPherson (PASM optional)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "981 Cayman，中置水平對臥六缸硬頂，比 Boxster 剛性更高，被譽為最佳駕駛機器之一",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_panamera_turbo": {
        "name": "Porsche Panamera Turbo (971)",
        "name_zh": "保時捷 Panamera Turbo (971)",
        "category": "sedan",
        "years": "2017-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 34,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1660, "rear_track": 1650,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 48.0, "total_weight": 2050,
            "cg_height": 465, "wheelbase": 2950
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 275/35 R21 / R: 315/30 R21",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 21},
            "rear":  {"width": 315, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link (adaptive air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "Panamera Turbo，雙渦輪 V8 引擎 550 匹，三腔氣壓懸吊後軸轉向，四門跑車標竿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_cayenne_turbo_gt": {
        "name": "Porsche Cayenne Turbo GT",
        "name_zh": "保時捷 Cayenne Turbo GT",
        "category": "suv",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 42,
            "front_arb": 170, "rear_arb": 120,
            "front_track": 1680, "rear_track": 1700,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.78,
            "weight_front_pct": 51.0, "total_weight": 2250,
            "cg_height": 560, "wheelbase": 2895
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero_corsa", "rear_compound": "pirelli_pzero_corsa",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 285/35 R22 / R: 315/30 R22",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 35, "rim": 22},
            "rear":  {"width": 315, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link (steel spring, PASM)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "Cayenne Turbo GT，雙渦輪 V8 引擎 640 匹，鋼製彈簧降低 17mm，紐柏林 SUV 紀錄保持者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_190e_evo2": {
        "name": "Mercedes-Benz 190E 2.5-16 Evo II",
        "name_zh": "賓士 190E 2.5-16 Evo II",
        "category": "sedan",
        "years": "1990-1990",
        "layout": "FR",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1470, "rear_track": 1462,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1340,
            "cg_height": 450, "wheelbase": 2665
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental ContiSportContact",
        "oem_tire_size": "F: 235/45 ZR17 / R: 235/45 ZR17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (5-link)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "190E Evo II，DTM 經典街車，Cosworth 引擎 235 匹，巨大尾翼，僅生產 502 台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_c63_w206": {
        "name": "Mercedes-AMG C63 S E Performance (W206)",
        "name_zh": "賓士 AMG C63 S E Performance (W206)",
        "category": "sedan",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 36,
            "front_arb": 140, "rear_arb": 95,
            "front_track": 1610, "rear_track": 1620,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 2165,
            "cg_height": 460, "wheelbase": 2865
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 265/35 R20 / R: 275/35 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 275, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (adaptive)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "W206 C63 S，四缸渦輪加電動馬達複合動力 680 匹，後軸電驅，新世代 AMG 方向",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_e63s_w213": {
        "name": "Mercedes-AMG E63 S (W213)",
        "name_zh": "賓士 AMG E63 S (W213)",
        "category": "sedan",
        "years": "2017-2023",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 34,
            "front_arb": 145, "rear_arb": 95,
            "front_track": 1630, "rear_track": 1618,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.0, "total_weight": 1990,
            "cg_height": 470, "wheelbase": 2939
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 265/35 R20 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "E63 S，M177 雙渦輪 V8 引擎 612 匹，4MATIC+ 可切純後驅，漂移模式，性能房車王",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_cls63_c218": {
        "name": "Mercedes-AMG CLS63 (C218)",
        "name_zh": "賓士 AMG CLS63 (C218)",
        "category": "sedan",
        "years": "2011-2018",
        "layout": "FR",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 30,
            "front_arb": 135, "rear_arb": 90,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.5, "total_weight": 1870,
            "cg_height": 460, "wheelbase": 2874
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental ContiSportContact 5P",
        "oem_tire_size": "F: 255/35 R19 / R: 285/30 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "CLS63 AMG，M157 雙渦輪 V8 引擎 557 匹，四門轎跑優雅造型，兼顧舒適與性能",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_amg_one": {
        "name": "Mercedes-AMG ONE",
        "name_zh": "賓士 AMG ONE",
        "category": "race_car",
        "years": "2022-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 120, "rear_spring_rate": 140,
            "front_arb": 200, "rear_arb": 180,
            "front_track": 1700, "rear_track": 1660,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 44.0, "total_weight": 1695,
            "cg_height": 340, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": -0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 R",
        "oem_tire_size": "F: 285/35 R19 / R: 335/30 R20",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 35, "rim": 19},
            "rear":  {"width": 335, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Push-rod (double-wishbone) / R: Push-rod (double-wishbone)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "AMG ONE，F1 級 1.6 V6 渦輪混合動力 1063 匹，碳纖維單體殼，紐柏林量產車紀錄",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_amg_gt_r": {
        "name": "Mercedes-AMG GT R",
        "name_zh": "賓士 AMG GT R",
        "category": "sports_car",
        "years": "2017-2021",
        "layout": "FR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 40,
            "front_arb": 155, "rear_arb": 110,
            "front_track": 1680, "rear_track": 1660,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.82,
            "weight_front_pct": 47.0, "total_weight": 1630,
            "cg_height": 410, "wheelbase": 2630
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.05, "rear_toe_deg": -0.1
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 275/35 ZR19 / R: 325/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 19},
            "rear":  {"width": 325, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double-wishbone / R: Double-wishbone (coilover)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "AMG GT R，「綠色地獄之獸」，M178 雙渦輪 V8 引擎 585 匹，後軸轉向，賽道利器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_a45_w177": {
        "name": "Mercedes-AMG A45 S (W177)",
        "name_zh": "賓士 AMG A45 S (W177)",
        "category": "hatchback",
        "years": "2019-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 120, "rear_arb": 80,
            "front_track": 1570, "rear_track": 1562,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1625,
            "cg_height": 460, "wheelbase": 2729
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 R19 / R: 245/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 245, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "A45 S AMG，世界最強四缸渦輪 421 匹，AMG Torque Control 後軸扭力分配，漂移鋼砲",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_rs4_b7": {
        "name": "Audi RS4 (B7)",
        "name_zh": "奧迪 RS4 (B7)",
        "category": "sedan",
        "years": "2006-2008",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 85,
            "front_track": 1558, "rear_track": 1569,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1650,
            "cg_height": 465, "wheelbase": 2651
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Pirelli P Zero Rosso",
        "oem_tire_size": "F: 255/35 R19 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Trapezoidal link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "B7 RS4，4.2 V8 自然進氣 420 匹紅線 8250 轉，Quattro 全驅，後期 Audi Sport 經典",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_rs5_b9": {
        "name": "Audi RS5 (B9)",
        "name_zh": "奧迪 RS5 (B9)",
        "category": "sports_car",
        "years": "2017-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 90,
            "front_track": 1588, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1755,
            "cg_height": 460, "wheelbase": 2766
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental ContiSportContact 6",
        "oem_tire_size": "F: 275/30 R20 / R: 275/30 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 30, "rim": 20},
            "rear":  {"width": 275, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "B9 RS5，2.9 雙渦輪 V6 引擎 450 匹，Quattro 全驅，Sport 差速器可選，全天候跑車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_rs6_c8": {
        "name": "Audi RS6 Avant (C8)",
        "name_zh": "奧迪 RS6 Avant (C8)",
        "category": "sedan",
        "years": "2020-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 36,
            "front_arb": 150, "rear_arb": 100,
            "front_track": 1670, "rear_track": 1660,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.5, "total_weight": 2075,
            "cg_height": 475, "wheelbase": 2926
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental ContiSportContact 6",
        "oem_tire_size": "F: 275/35 R21 / R: 275/35 R21",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 21},
            "rear":  {"width": 275, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link (adaptive air)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "C8 RS6 Avant，4.0 雙渦輪 V8 輕混 600 匹，寬體旅行車，載全家去紐柏林的最佳選擇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_s3_8y": {
        "name": "Audi S3 (8Y)",
        "name_zh": "奧迪 S3 (8Y)",
        "category": "sedan",
        "years": "2020-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 24,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1560, "rear_track": 1544,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1580,
            "cg_height": 460, "wheelbase": 2636
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S005",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "8Y S3，2.0 渦輪 310 匹，Quattro 全驅扭力分配後軸，日常性能小車好選擇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_tt_8n": {
        "name": "Audi TT (8N)",
        "name_zh": "奧迪 TT (8N)",
        "category": "sports_car",
        "years": "1998-2006",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 20,
            "front_arb": 100, "rear_arb": 60,
            "front_track": 1507, "rear_track": 1480,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 59.0, "total_weight": 1410,
            "cg_height": 450, "wheelbase": 2428
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental ContiSportContact",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "初代 TT 8N，包浩斯設計經典，1.8T 四缸渦輪 225 匹（Quattro 版），造型設計標竿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_rs_etron_gt": {
        "name": "Audi RS e-tron GT",
        "name_zh": "奧迪 RS e-tron GT",
        "category": "electric",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 150, "rear_arb": 105,
            "front_track": 1660, "rear_track": 1650,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 49.0, "total_weight": 2347,
            "cg_height": 380, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Continental EcoContact 6Q",
        "oem_tire_size": "F: 265/35 R21 / R: 305/30 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 21},
            "rear":  {"width": 305, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double-wishbone / R: Multi-link (adaptive air)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "RS e-tron GT，雙電動馬達 646 匹，J1 平台與 Taycan 共用，800V 架構，電動四門 GT",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_golf_gti_mk5": {
        "name": "Volkswagen Golf GTI (Mk5)",
        "name_zh": "福斯 Golf GTI (Mk5)",
        "category": "hatchback",
        "years": "2004-2009",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 90, "rear_arb": 50,
            "front_track": 1540, "rear_track": 1514,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 61.0, "total_weight": 1395,
            "cg_height": 470, "wheelbase": 2578
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 225/45 R17 / R: 225/45 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 225, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Mk5 GTI，PQ35 平台首代，2.0 TSI 200 匹 DSG 變速箱，復興 GTI 精神之作",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_golf_gti_mk6": {
        "name": "Volkswagen Golf GTI (Mk6)",
        "name_zh": "福斯 Golf GTI (Mk6)",
        "category": "hatchback",
        "years": "2009-2013",
        "layout": "FF",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 20,
            "front_arb": 95, "rear_arb": 55,
            "front_track": 1540, "rear_track": 1514,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 60.5, "total_weight": 1409,
            "cg_height": 465, "wheelbase": 2578
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 225/40 R18 / R: 225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Mk6 GTI，EA888 Gen2 引擎 210 匹，XDS 電子差速，Mk5 的精緻進化版",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_golf_r_mk8": {
        "name": "Volkswagen Golf R (Mk8)",
        "name_zh": "福斯 Golf R (Mk8)",
        "category": "hatchback",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 24,
            "front_arb": 110, "rear_arb": 70,
            "front_track": 1558, "rear_track": 1544,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.80,
            "weight_front_pct": 58.0, "total_weight": 1560,
            "cg_height": 455, "wheelbase": 2636
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.1
        },
        "oem_tire": "Bridgestone Potenza S005",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link (DCC)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Mk8 Golf R，EA888 Evo4 引擎 320 匹，R Performance 後軸扭力分配，漂移模式加持",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_scirocco_r": {
        "name": "Volkswagen Scirocco R",
        "name_zh": "福斯 Scirocco R",
        "category": "sports_car",
        "years": "2009-2017",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 100, "rear_arb": 60,
            "front_track": 1540, "rear_track": 1510,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 60.0, "total_weight": 1425,
            "cg_height": 445, "wheelbase": 2578
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental ContiSportContact 5",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Scirocco R，2.0 TSI 280 匹前驅轎跑，XDS+ 電子差速，低矮車身操控銳利",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_polo_gti_aw": {
        "name": "Volkswagen Polo GTI (AW)",
        "name_zh": "福斯 Polo GTI (AW)",
        "category": "hatchback",
        "years": "2018-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 16,
            "front_arb": 80, "rear_arb": 40,
            "front_track": 1504, "rear_track": 1492,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1280,
            "cg_height": 460, "wheelbase": 2564
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Hankook Ventus S1 evo3",
        "oem_tire_size": "F: 215/45 R17 / R: 215/45 R17",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 17},
            "rear":  {"width": 215, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Polo GTI AW，2.0 TSI 200 匹小鋼砲，MQB A0 平台，輕量靈活的都會性能車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vw_id4_gtx": {
        "name": "Volkswagen ID.4 GTX",
        "name_zh": "福斯 ID.4 GTX",
        "category": "electric",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 110, "rear_arb": 65,
            "front_track": 1584, "rear_track": 1576,
            "front_motion_ratio": 0.76, "rear_motion_ratio": 0.78,
            "weight_front_pct": 48.0, "total_weight": 2224,
            "cg_height": 430, "wheelbase": 2766
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_ev", "rear_compound": "michelin_ps_ev",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.1
        },
        "oem_tire": "Hankook iON evo",
        "oem_tire_size": "F: 235/50 R20 / R: 255/45 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 50, "rim": 20},
            "rear":  {"width": 255, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "ID.4 GTX，雙馬達全驅 299 匹，MEB 純電平台，低重心電動 SUV，實用性能兼備",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "opel_corsa_opc": {
        "name": "Opel Corsa OPC",
        "name_zh": "歐寶 Corsa OPC",
        "category": "hatchback",
        "years": "2015-2019",
        "layout": "FF",
        "params": {
            "front_spring_rate": 24, "rear_spring_rate": 16,
            "front_arb": 85, "rear_arb": 40,
            "front_track": 1470, "rear_track": 1460,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.76,
            "weight_front_pct": 63.0, "total_weight": 1280,
            "cg_height": 460, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.3,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental ContiSportContact 5",
        "oem_tire_size": "F: 215/40 R18 / R: 215/40 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 40, "rim": 18},
            "rear":  {"width": 215, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Corsa OPC，1.6 渦輪 207 匹，FSD 頻率選擇阻尼減震，輕量級小鋼砲",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "opel_astra_opc": {
        "name": "Opel Astra OPC (J)",
        "name_zh": "歐寶 Astra OPC (J)",
        "category": "hatchback",
        "years": "2012-2018",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 20,
            "front_arb": 100, "rear_arb": 55,
            "front_track": 1542, "rear_track": 1540,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1475,
            "cg_height": 455, "wheelbase": 2685
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 245/35 R20 / R: 245/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 245, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson (HiPerStrut) / R: Torsion beam (Watts link)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Astra OPC J，2.0 渦輪 280 匹，HiPerStrut 前懸吊消除扭力轉向，紐柏林前驅紀錄車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_gt_2005": {
        "name": "Ford GT (2005)",
        "name_zh": "福特 GT (2005)",
        "category": "gt_car",
        "years": "2005-2006",
        "layout": "MR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 180, "rear_arb": 140,
            "front_track": 1600, "rear_track": 1580,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 43.0, "total_weight": 1580,
            "cg_height": 430, "wheelbase": 2710
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Goodyear Eagle F1 Supercar",
        "oem_tire_size": "F: 235/45 ZR18 / R: 315/40 ZR19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 18},
            "rear":  {"width": 315, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "現代福特 GT，中置 5.4L V8 機械增壓引擎，賽道取向超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_gt_2017": {
        "name": "Ford GT (2017)",
        "name_zh": "福特 GT (2017)",
        "category": "gt_car",
        "years": "2017-2022",
        "layout": "MR",
        "params": {
            "front_spring_rate": 120, "rear_spring_rate": 140,
            "front_arb": 200, "rear_arb": 160,
            "front_track": 1610, "rear_track": 1590,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.88,
            "weight_front_pct": 43.0, "total_weight": 1385,
            "cg_height": 410, "wheelbase": 2710
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 245/35 ZR20 / R: 325/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 325, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "第二代福特 GT，碳纖維車身，3.5L V6 雙渦輪增壓，限量生產超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_fiesta_st": {
        "name": "Fiesta ST (Mk8)",
        "name_zh": "福特 Fiesta ST (Mk8)",
        "category": "hatchback",
        "years": "2018-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 22,
            "front_arb": 70, "rear_arb": 35,
            "front_track": 1490, "rear_track": 1480,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.75,
            "weight_front_pct": 62.0, "total_weight": 1262,
            "cg_height": 490, "wheelbase": 2493
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 205/40 R18 / R: 205/40 R18",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 18},
            "rear":  {"width": 205, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Twist-beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "輕巧靈活的鋼砲，1.5L 三缸渦輪引擎，駕駛樂趣極高",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_bronco_raptor": {
        "name": "Bronco Raptor",
        "name_zh": "福特 Bronco Raptor",
        "category": "suv",
        "years": "2022-present",
        "layout": "4WD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1830, "rear_track": 1830,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.65,
            "weight_front_pct": 54.0, "total_weight": 2540,
            "cg_height": 720, "wheelbase": 2948
        },
        "tire_defaults": {
            "front_compound": "bf_goodrich_ko2", "rear_compound": "bf_goodrich_ko2",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "BF Goodrich KO2",
        "oem_tire_size": "F: 37x12.50 R17 / R: 37x12.50 R17",
        "oem_tire_specs": {
            "front": {"width": 318, "aspect": 70, "rim": 17},
            "rear":  {"width": 318, "aspect": 70, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Five-link solid axle",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "越野性能猛獸，FOX 懸吊，3.0L V6 雙渦輪增壓，400匹馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_maverick_hybrid": {
        "name": "Maverick Hybrid",
        "name_zh": "福特 Maverick Hybrid",
        "category": "suv",
        "years": "2022-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 35,
            "front_arb": 65, "rear_arb": 40,
            "front_track": 1580, "rear_track": 1575,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.70,
            "weight_front_pct": 58.0, "total_weight": 1635,
            "cg_height": 580, "wheelbase": 3076
        },
        "tire_defaults": {
            "front_compound": "all_season", "rear_compound": "all_season",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Falken Wildpeak A/T Trail",
        "oem_tire_size": "F: 225/65 R17 / R: 225/65 R17",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 65, "rim": 17},
            "rear":  {"width": 225, "aspect": 65, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Twist-beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "小型皮卡混合動力，2.5L Atkinson 循環引擎搭配電動馬達，油耗極佳",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_f150_raptor": {
        "name": "F-150 Raptor",
        "name_zh": "福特 F-150 Raptor",
        "category": "suv",
        "years": "2021-present",
        "layout": "4WD",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 55,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1810, "rear_track": 1810,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.65,
            "weight_front_pct": 55.0, "total_weight": 2720,
            "cg_height": 750, "wheelbase": 3688
        },
        "tire_defaults": {
            "front_compound": "bf_goodrich_ko2", "rear_compound": "bf_goodrich_ko2",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "BF Goodrich KO2",
        "oem_tire_size": "F: 35x12.50 R17 / R: 35x12.50 R17",
        "oem_tire_specs": {
            "front": {"width": 318, "aspect": 70, "rim": 17},
            "rear":  {"width": 318, "aspect": 70, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Five-link live axle with trailing arms",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "沙漠越野皮卡之王，3.5L V6 雙渦輪增壓，FOX 內部旁通減震器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_shelby_gt500": {
        "name": "Shelby GT500 (S550)",
        "name_zh": "福特 Shelby GT500 (S550)",
        "category": "sports_car",
        "years": "2020-2022",
        "layout": "FR",
        "params": {
            "front_spring_rate": 70, "rear_spring_rate": 65,
            "front_arb": 160, "rear_arb": 130,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 56.0, "total_weight": 1916,
            "cg_height": 470, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.3, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 305/30 ZR20 / R: 315/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 305, "aspect": 30, "rim": 20},
            "rear":  {"width": 315, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Integral link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "760匹馬力機械增壓 V8，最強量產野馬，DCT 雙離合變速箱",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_mustang_mach_e_gt": {
        "name": "Mustang Mach-E GT",
        "name_zh": "福特 Mustang Mach-E GT",
        "category": "electric",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 45,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.78,
            "weight_front_pct": 50.0, "total_weight": 2260,
            "cg_height": 500, "wheelbase": 2984
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 245/45 R19 / R: 245/45 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 19},
            "rear":  {"width": 245, "aspect": 45, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "電動跨界 SUV，雙馬達全驅，480匹馬力，MagneRide 磁流變減震器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_corvette_c5_z06": {
        "name": "Corvette C5 Z06",
        "name_zh": "雪佛蘭 Corvette C5 Z06",
        "category": "sports_car",
        "years": "2001-2004",
        "layout": "FR",
        "params": {
            "front_spring_rate": 54, "rear_spring_rate": 63,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1522, "rear_track": 1544,
            "front_motion_ratio": 0.58, "rear_motion_ratio": 0.65,
            "weight_front_pct": 51.0, "total_weight": 1418,
            "cg_height": 460, "wheelbase": 2654
        },
        "tire_defaults": {
            "front_compound": "goodyear_eagle_f1", "rear_compound": "goodyear_eagle_f1",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Goodyear Eagle F1 Supercar",
        "oem_tire_size": "F: 265/40 ZR17 / R: 295/35 ZR18",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 40, "rim": 17},
            "rear":  {"width": 295, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "輕量化硬核 Corvette，LS6 V8 引擎 405匹馬力，橫置複合板簧懸吊",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "confirmed"
        }
    },
    "chevrolet_corvette_c6_z06": {
        "name": "Corvette C6 Z06",
        "name_zh": "雪佛蘭 Corvette C6 Z06",
        "category": "sports_car",
        "years": "2006-2013",
        "layout": "FR",
        "params": {
            "front_spring_rate": 58, "rear_spring_rate": 68,
            "front_arb": 150, "rear_arb": 130,
            "front_track": 1578, "rear_track": 1558,
            "front_motion_ratio": 0.60, "rear_motion_ratio": 0.67,
            "weight_front_pct": 50.7, "total_weight": 1421,
            "cg_height": 450, "wheelbase": 2686
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup", "rear_compound": "michelin_ps_cup",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup ZP",
        "oem_tire_size": "F: 275/35 ZR18 / R: 325/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 18},
            "rear":  {"width": 325, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "鋁合金車架 Z06，7.0L LS7 V8 自然進氣 505匹馬力，乾式油底殼",
        "confidence": {
            "spring_rate": "confirmed",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "confirmed"
        }
    },
    "chevrolet_corvette_c8_z06": {
        "name": "Corvette C8 Z06",
        "name_zh": "雪佛蘭 Corvette C8 Z06",
        "category": "sports_car",
        "years": "2023-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 75, "rear_spring_rate": 95,
            "front_arb": 170, "rear_arb": 150,
            "front_track": 1588, "rear_track": 1582,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 40.0, "total_weight": 1635,
            "cg_height": 430, "wheelbase": 2722
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2r", "rear_compound": "michelin_ps_cup2r",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 R",
        "oem_tire_size": "F: 275/30 ZR20 / R: 345/25 ZR21",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 30, "rim": 20},
            "rear":  {"width": 345, "aspect": 25, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "平面曲軸 5.5L V8 自然進氣 670匹馬力，紅線轉速 8600rpm，賽車級引擎",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_camaro_zl1_6g": {
        "name": "Camaro ZL1 (6th gen)",
        "name_zh": "雪佛蘭 Camaro ZL1 (第六代)",
        "category": "sports_car",
        "years": "2017-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 62, "rear_spring_rate": 55,
            "front_arb": 160, "rear_arb": 130,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 54.0, "total_weight": 1815,
            "cg_height": 460, "wheelbase": 2811
        },
        "tire_defaults": {
            "front_compound": "goodyear_eagle_f1", "rear_compound": "goodyear_eagle_f1",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Goodyear Eagle F1 Supercar 3R",
        "oem_tire_size": "F: 285/30 ZR20 / R: 305/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 30, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "650匹馬力 LT4 機械增壓 V8，MagneRide 3.0 磁流變減震器，1LE 套件可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_camaro_z28_5g": {
        "name": "Camaro Z/28 (5th gen)",
        "name_zh": "雪佛蘭 Camaro Z/28 (第五代)",
        "category": "sports_car",
        "years": "2014-2015",
        "layout": "FR",
        "params": {
            "front_spring_rate": 80, "rear_spring_rate": 70,
            "front_arb": 180, "rear_arb": 150,
            "front_track": 1596, "rear_track": 1588,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 54.0, "total_weight": 1732,
            "cg_height": 450, "wheelbase": 2852
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_r", "rear_compound": "pirelli_trofeo_r",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Pirelli P Zero Trofeo R",
        "oem_tire_size": "F: 305/30 ZR19 / R: 305/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 305, "aspect": 30, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "賽道特化版 Camaro，LS7 7.0L V8 自然進氣 505匹，無音響無空調輕量化",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chevrolet_ss_vf": {
        "name": "Chevy SS (VF)",
        "name_zh": "雪佛蘭 SS (VF)",
        "category": "sedan",
        "years": "2014-2017",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 100, "rear_arb": 85,
            "front_track": 1570, "rear_track": 1575,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.0, "total_weight": 1836,
            "cg_height": 490, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "continental_sc6", "rear_compound": "continental_sc6",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental ContiSportContact 5P",
        "oem_tire_size": "F: 245/40 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "澳洲 Holden Commodore 掛雪佛蘭標，LS3 V8 415匹，絕版後驅性能房車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dodge_viper_srt10": {
        "name": "Viper SRT-10",
        "name_zh": "道奇 Viper SRT-10",
        "category": "sports_car",
        "years": "2003-2010",
        "layout": "FR",
        "params": {
            "front_spring_rate": 58, "rear_spring_rate": 70,
            "front_arb": 180, "rear_arb": 150,
            "front_track": 1524, "rear_track": 1544,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 49.0, "total_weight": 1540,
            "cg_height": 440, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup", "rear_compound": "michelin_ps_cup",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 275/35 ZR18 / R: 345/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 18},
            "rear":  {"width": 345, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "8.3L V10 自然進氣怪獸，510匹馬力，純粹暴力的美式超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dodge_viper_acr": {
        "name": "Viper ACR (Gen V)",
        "name_zh": "道奇 Viper ACR (第五代)",
        "category": "gt_car",
        "years": "2016-2017",
        "layout": "FR",
        "params": {
            "front_spring_rate": 95, "rear_spring_rate": 110,
            "front_arb": 220, "rear_arb": 180,
            "front_track": 1544, "rear_track": 1570,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 49.5, "total_weight": 1538,
            "cg_height": 430, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "kumho_ecsta_v720", "rear_compound": "kumho_ecsta_v720",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Kumho Ecsta V720",
        "oem_tire_size": "F: 295/25 ZR19 / R: 355/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 25, "rim": 19},
            "rear":  {"width": 355, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "紐北傳奇，8.4L V10 645匹馬力，極端空力套件，賽道圈速紀錄保持者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dodge_charger_hellcat": {
        "name": "Charger SRT Hellcat",
        "name_zh": "道奇 Charger SRT Hellcat",
        "category": "sedan",
        "years": "2015-2023",
        "layout": "FR",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 120, "rear_arb": 100,
            "front_track": 1595, "rear_track": 1605,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 2075,
            "cg_height": 510, "wheelbase": 3052
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/40 ZR20 / R: 275/40 ZR20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 40, "rim": 20},
            "rear":  {"width": 275, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "707匹馬力四門轎車，6.2L HEMI V8 機械增壓，美式肌肉轎跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dodge_challenger_demon": {
        "name": "Challenger SRT Demon",
        "name_zh": "道奇 Challenger SRT Demon",
        "category": "sports_car",
        "years": "2018",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 50,
            "front_arb": 80, "rear_arb": 130,
            "front_track": 1590, "rear_track": 1610,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 1894,
            "cg_height": 510, "wheelbase": 2946
        },
        "tire_defaults": {
            "front_compound": "nitto_nt05r", "rear_compound": "nitto_nt05r",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 1.00
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "Nitto NT05R (drag radial)",
        "oem_tire_size": "F: 245/45 R18 / R: 315/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 18},
            "rear":  {"width": 315, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "直線加速特化，840匹馬力 6.2L 機械增壓 V8，TransBrake 起步系統，限量生產",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "cadillac_ct5v_blackwing": {
        "name": "CT5-V Blackwing",
        "name_zh": "凱迪拉克 CT5-V Blackwing",
        "category": "sedan",
        "years": "2022-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 52, "rear_spring_rate": 48,
            "front_arb": 140, "rear_arb": 110,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 54.0, "total_weight": 1860,
            "cg_height": 480, "wheelbase": 2947
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 275/35 ZR19 / R: 305/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "668匹馬力 6.2L 機械增壓 V8，MagneRide 4.0，可選手排，最終 V8 凱迪拉克",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "cadillac_cts_v3": {
        "name": "CTS-V (3rd gen)",
        "name_zh": "凱迪拉克 CTS-V (第三代)",
        "category": "sedan",
        "years": "2016-2019",
        "layout": "FR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 45,
            "front_arb": 130, "rear_arb": 105,
            "front_track": 1590, "rear_track": 1600,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 54.0, "total_weight": 1884,
            "cg_height": 490, "wheelbase": 2910
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 265/35 ZR19 / R: 295/30 ZR19",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "640匹馬力 LT4 機械增壓 V8，MagneRide 第三代，美式豪華性能房車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "cadillac_ats_v": {
        "name": "ATS-V",
        "name_zh": "凱迪拉克 ATS-V",
        "category": "sedan",
        "years": "2016-2019",
        "layout": "FR",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 38,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 53.0, "total_weight": 1710,
            "cg_height": 480, "wheelbase": 2775
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Super Sport",
        "oem_tire_size": "F: 255/35 R18 / R: 275/35 R18",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 18},
            "rear":  {"width": 275, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "464匹馬力 3.6L V6 雙渦輪增壓，MagneRide，挑戰 BMW M3 的美系性能車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "pontiac_gto_2004": {
        "name": "GTO (2004) / Monaro",
        "name_zh": "乃迪克 GTO (2004) / Monaro",
        "category": "sports_car",
        "years": "2004-2006",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 35,
            "front_arb": 90, "rear_arb": 75,
            "front_track": 1562, "rear_track": 1568,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.5, "total_weight": 1724,
            "cg_height": 490, "wheelbase": 2790
        },
        "tire_defaults": {
            "front_compound": "bf_goodrich_gforce", "rear_compound": "bf_goodrich_gforce",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "BF Goodrich g-Force T/A KDW",
        "oem_tire_size": "F: 245/45 R17 / R: 245/45 R17",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 17},
            "rear":  {"width": 245, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "澳洲 Holden Monaro 換標，LS2 V8 400匹馬力，經典美式肌肉車復刻",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "pontiac_firebird_trans_am": {
        "name": "Firebird Trans Am (4th gen)",
        "name_zh": "乃迪克 Firebird Trans Am (第四代)",
        "category": "sports_car",
        "years": "1993-2002",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 32,
            "front_arb": 90, "rear_arb": 75,
            "front_track": 1530, "rear_track": 1540,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1585,
            "cg_height": 490, "wheelbase": 2565
        },
        "tire_defaults": {
            "front_compound": "goodyear_eagle_f1", "rear_compound": "goodyear_eagle_f1",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Goodyear Eagle F1 GS-D3",
        "oem_tire_size": "F: 275/40 ZR17 / R: 275/40 ZR17",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 40, "rim": 17},
            "rear":  {"width": 275, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link live axle",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "最後一代 Firebird，LS1 V8 325匹馬力，WS6 套件提升操控性能",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "chrysler_300_srt8": {
        "name": "300 SRT8",
        "name_zh": "克萊斯勒 300 SRT8",
        "category": "sedan",
        "years": "2012-2014",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 100, "rear_arb": 85,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 1982,
            "cg_height": 520, "wheelbase": 3052
        },
        "tire_defaults": {
            "front_compound": "goodyear_eagle_f1", "rear_compound": "goodyear_eagle_f1",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Goodyear Eagle F1 Supercar",
        "oem_tire_size": "F: 245/45 R20 / R: 255/45 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 20},
            "rear":  {"width": 255, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "6.4L HEMI V8 470匹馬力，豪華性能大型轎車，自適應避震系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jeep_grand_cherokee_trackhawk": {
        "name": "Grand Cherokee Trackhawk",
        "name_zh": "吉普 Grand Cherokee Trackhawk",
        "category": "suv",
        "years": "2018-2021",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1620, "rear_track": 1630,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.75,
            "weight_front_pct": 55.0, "total_weight": 2433,
            "cg_height": 650, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "pirelli_scorpion", "rear_compound": "pirelli_scorpion",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli Scorpion Verde",
        "oem_tire_size": "F: 295/45 ZR20 / R: 295/45 ZR20",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 45, "rim": 20},
            "rear":  {"width": 295, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "707匹馬力 6.2L HEMI V8 機械增壓 SUV，3.5秒破百，全球最快量產 SUV 之一",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ram_trx": {
        "name": "Ram 1500 TRX",
        "name_zh": "Ram 1500 TRX",
        "category": "suv",
        "years": "2021-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 60,
            "front_arb": 120, "rear_arb": 95,
            "front_track": 1830, "rear_track": 1830,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.65,
            "weight_front_pct": 55.0, "total_weight": 2870,
            "cg_height": 780, "wheelbase": 3685
        },
        "tire_defaults": {
            "front_compound": "goodyear_wrangler", "rear_compound": "goodyear_wrangler",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "Goodyear Wrangler Territory AT",
        "oem_tire_size": "F: 325/65 R18 / R: 325/65 R18",
        "oem_tire_specs": {
            "front": {"width": 325, "aspect": 65, "rim": 18},
            "rear":  {"width": 325, "aspect": 65, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Five-link coil spring",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "702匹馬力 6.2L HEMI V8 機械增壓皮卡，Bilstein 避震，超級越野性能卡車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tesla_model_y_perf": {
        "name": "Model Y Performance",
        "name_zh": "特斯拉 Model Y Performance",
        "category": "electric",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 45,
            "front_arb": 80, "rear_arb": 65,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.78,
            "weight_front_pct": 48.0, "total_weight": 2003,
            "cg_height": 480, "wheelbase": 2890
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.90, "rear_optimal_pressure": 2.90
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 255/35 R21 / R: 275/35 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 21},
            "rear":  {"width": 275, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "雙馬達全輪驅動電動跨界，456匹馬力，低重心電池組佈局",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "rivian_r1t": {
        "name": "R1T Adventure",
        "name_zh": "Rivian R1T Adventure",
        "category": "electric",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 60,
            "front_arb": 100, "rear_arb": 85,
            "front_track": 1710, "rear_track": 1710,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.70,
            "weight_front_pct": 50.0, "total_weight": 3085,
            "cg_height": 580, "wheelbase": 3450
        },
        "tire_defaults": {
            "front_compound": "pirelli_scorpion", "rear_compound": "pirelli_scorpion",
            "front_optimal_pressure": 2.80, "rear_optimal_pressure": 2.80
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Pirelli Scorpion All Terrain Plus",
        "oem_tire_size": "F: 275/65 R20 / R: 275/65 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 65, "rim": 20},
            "rear":  {"width": 275, "aspect": 65, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "四馬達電動皮卡，835匹馬力，氣壓懸吊可調車身高度，涉水深度達1米",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lucid_air_gt": {
        "name": "Air Grand Touring",
        "name_zh": "Lucid Air Grand Touring",
        "category": "electric",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 52,
            "front_arb": 95, "rear_arb": 80,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 49.0, "total_weight": 2360,
            "cg_height": 450, "wheelbase": 2960
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.80, "rear_optimal_pressure": 2.80
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 245/45 R19 / R: 265/40 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 19},
            "rear":  {"width": 265, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "819匹馬力雙馬達豪華電動轎車，EPA 續航超過830公里，氣壓懸吊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "gmc_hummer_ev": {
        "name": "Hummer EV",
        "name_zh": "GMC Hummer EV",
        "category": "electric",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 65, "rear_spring_rate": 70,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1730, "rear_track": 1730,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.65,
            "weight_front_pct": 50.0, "total_weight": 4103,
            "cg_height": 680, "wheelbase": 3400
        },
        "tire_defaults": {
            "front_compound": "goodyear_wrangler", "rear_compound": "goodyear_wrangler",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "Goodyear Wrangler Territory MT",
        "oem_tire_size": "F: 305/70 R18 / R: 305/70 R18",
        "oem_tire_specs": {
            "front": {"width": 305, "aspect": 70, "rim": 18},
            "rear":  {"width": 305, "aspect": 70, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "三馬達 1000匹馬力電動巨獸，CrabWalk 橫行模式，可提取車頂，超過4噸車重",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "acura_integra_2023": {
        "name": "Integra (2023)",
        "name_zh": "謳歌 Integra (2023)",
        "category": "hatchback",
        "years": "2023-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 75, "rear_arb": 45,
            "front_track": 1535, "rear_track": 1540,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.78,
            "weight_front_pct": 61.0, "total_weight": 1420,
            "cg_height": 490, "wheelbase": 2735
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 235/40 R18 / R: 235/40 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 18},
            "rear":  {"width": 235, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "基於 Civic Si 平台，1.5L 渦輪增壓 200匹馬力，六速手排可選，運動掀背車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "acura_tlx_type_s": {
        "name": "TLX Type S",
        "name_zh": "謳歌 TLX Type S",
        "category": "sedan",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 95, "rear_arb": 75,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 57.0, "total_weight": 1805,
            "cg_height": 490, "wheelbase": 2870
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero PZ4",
        "oem_tire_size": "F: 255/35 R20 / R: 255/35 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 255, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "355匹馬力 3.0L V6 渦輪增壓，SH-AWD 超級四驅系統，自適應避震",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_kona_n": {
        "name": "Kona N",
        "name_zh": "現代 Kona N",
        "category": "suv",
        "years": "2022-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 80, "rear_arb": 50,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.0, "total_weight": 1510,
            "cg_height": 540, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 235/40 R19 / R: 235/40 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 19},
            "rear":  {"width": 235, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "276匹馬力 2.0T，N DCT 濕式雙離合變速箱，電子限滑差速器，小型性能跨界車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_n_vision_74": {
        "name": "N Vision 74 (concept)",
        "name_zh": "現代 N Vision 74 (概念車)",
        "category": "sports_car",
        "years": "2022",
        "layout": "FR",
        "params": {
            "front_spring_rate": 70, "rear_spring_rate": 80,
            "front_arb": 150, "rear_arb": 130,
            "front_track": 1680, "rear_track": 1700,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 46.0, "total_weight": 2100,
            "cg_height": 420, "wheelbase": 2905
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 (estimated)",
        "oem_tire_size": "F: 275/35 R21 / R: 305/30 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 21},
            "rear":  {"width": 305, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "致敬1974年 Pony Coupe，氫燃料電池混合動力，後驅雙馬達，概念超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_i30n": {
        "name": "i30 N Performance",
        "name_zh": "現代 i30 N Performance",
        "category": "hatchback",
        "years": "2018-2023",
        "layout": "FF",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 28,
            "front_arb": 85, "rear_arb": 45,
            "front_track": 1565, "rear_track": 1575,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.78,
            "weight_front_pct": 62.5, "total_weight": 1429,
            "cg_height": 490, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -0.8,
            "front_toe_deg": 0, "rear_toe_deg": 0.12
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 235/35 R19 / R: 235/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 235, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "280匹馬力 2.0T，電子控制懸吊，電子限滑差速器，紐北調校鋼砲",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hyundai_genesis_gv70": {
        "name": "Genesis GV70 3.5T",
        "name_zh": "捷尼賽思 GV70 3.5T",
        "category": "suv",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 40,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.0, "total_weight": 2035,
            "cg_height": 570, "wheelbase": 2875
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 255/40 R21 / R: 255/40 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 21},
            "rear":  {"width": 255, "aspect": 40, "rim": 21}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "375匹馬力 3.5L V6 雙渦輪增壓，電子控制懸吊，豪華運動中型 SUV",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "kia_ev6_gt": {
        "name": "EV6 GT",
        "name_zh": "起亞 EV6 GT",
        "category": "electric",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 48,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1610, "rear_track": 1620,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.78,
            "weight_front_pct": 48.0, "total_weight": 2205,
            "cg_height": 480, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "continental_sc6", "rear_compound": "continental_sc6",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 255/40 R21 / R: 255/40 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 21},
            "rear":  {"width": 255, "aspect": 40, "rim": 21}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "585匹馬力雙馬達電動跨界，E-GMP 800V 平台，3.5秒破百，電子限滑差速器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "kia_k5_gt": {
        "name": "K5 GT",
        "name_zh": "起亞 K5 GT",
        "category": "sedan",
        "years": "2021-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 28,
            "front_arb": 80, "rear_arb": 50,
            "front_track": 1575, "rear_track": 1585,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.78,
            "weight_front_pct": 60.0, "total_weight": 1580,
            "cg_height": 500, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 245/40 R19 / R: 245/40 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 19},
            "rear":  {"width": 245, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "290匹馬力 2.5L 渦輪增壓，8速 DCT 濕式雙離合，運動中型轎車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "kia_forte_gt": {
        "name": "Forte GT",
        "name_zh": "起亞 Forte GT",
        "category": "sedan",
        "years": "2020-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 26, "rear_spring_rate": 22,
            "front_arb": 65, "rear_arb": 35,
            "front_track": 1545, "rear_track": 1555,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.78,
            "weight_front_pct": 61.0, "total_weight": 1355,
            "cg_height": 490, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "goodyear_eagle_f1", "rear_compound": "goodyear_eagle_f1",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Goodyear Eagle F1 Asymmetric 3",
        "oem_tire_size": "F: 225/40 R18 / R: 225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "201匹馬力 1.6L 渦輪增壓，7速 DCT，入門級運動轎車，高性價比選擇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "genesis_g70": {
        "name": "Genesis G70 3.3T",
        "name_zh": "捷尼賽思 G70 3.3T",
        "category": "sedan",
        "years": "2019-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1575, "rear_track": 1580,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 1740,
            "cg_height": 490, "wheelbase": 2835
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 225/40 R19 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 19},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "365匹馬力 3.3L V6 雙渦輪增壓，後驅為主，挑戰 BMW 3 系的韓系豪華運動轎車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "genesis_g80_sport": {
        "name": "Genesis G80 Sport",
        "name_zh": "捷尼賽思 G80 Sport",
        "category": "sedan",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 38,
            "front_arb": 85, "rear_arb": 70,
            "front_track": 1620, "rear_track": 1630,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.0, "total_weight": 2010,
            "cg_height": 500, "wheelbase": 3010
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 245/40 R20 / R: 275/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 20},
            "rear":  {"width": 275, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Multi-link / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "375匹馬力 3.5L V6 雙渦輪增壓，後輪轉向，氣壓懸吊，豪華大型轎車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ssangyong_korando": {
        "name": "Korando (2020)",
        "name_zh": "雙龍 Korando (2020)",
        "category": "suv",
        "years": "2020-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 60, "rear_arb": 40,
            "front_track": 1570, "rear_track": 1575,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.75,
            "weight_front_pct": 58.0, "total_weight": 1590,
            "cg_height": 580, "wheelbase": 2675
        },
        "tire_defaults": {
            "front_compound": "all_season", "rear_compound": "all_season",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Kumho Crugen HP71",
        "oem_tire_size": "F: 235/50 R18 / R: 235/50 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 50, "rim": 18},
            "rear":  {"width": 235, "aspect": 50, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "1.5L 渦輪增壓或 1.6L 柴油，韓國雙龍緊湊型 SUV，實用取向",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "shelby_cobra_427": {
        "name": "Shelby Cobra 427 (replica spec)",
        "name_zh": "Shelby Cobra 427 (復刻規格)",
        "category": "sports_car",
        "years": "1965-1967",
        "layout": "FR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 65,
            "front_arb": 120, "rear_arb": 100,
            "front_track": 1340, "rear_track": 1372,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.90,
            "weight_front_pct": 49.0, "total_weight": 1060,
            "cg_height": 410, "wheelbase": 2286
        },
        "tire_defaults": {
            "front_compound": "avon_cr6zz", "rear_compound": "avon_cr6zz",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.90
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Goodyear Power Cushion (period) / Avon CR6ZZ (replica)",
        "oem_tire_size": "F: 255/60 R15 / R: 275/60 R15",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 60, "rim": 15},
            "rear":  {"width": 275, "aspect": 60, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "經典美式跑車之王，7.0L Ford 427 V8，極輕車重配暴力引擎，復刻車常用規格",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "delorean_alpha5": {
        "name": "DeLorean Alpha5",
        "name_zh": "DeLorean Alpha5",
        "category": "electric",
        "years": "2025-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 60,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1650, "rear_track": 1660,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 48.0, "total_weight": 2200,
            "cg_height": 430, "wheelbase": 2800
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 4S (estimated)",
        "oem_tire_size": "F: 255/35 R21 / R: 295/30 R22",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 21},
            "rear":  {"width": 295, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "DeLorean 品牌復活，電動 GT 跑車，鷗翼門設計，預計續航超過480公里",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hennessey_venom_f5": {
        "name": "Venom F5",
        "name_zh": "Hennessey Venom F5",
        "category": "gt_car",
        "years": "2021-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 110, "rear_spring_rate": 130,
            "front_arb": 220, "rear_arb": 180,
            "front_track": 1658, "rear_track": 1640,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.88,
            "weight_front_pct": 42.0, "total_weight": 1360,
            "cg_height": 400, "wheelbase": 2712
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup2", "rear_compound": "michelin_ps_cup2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 265/35 ZR19 / R: 345/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 19},
            "rear":  {"width": 345, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "1817匹馬力 6.6L 雙渦輪增壓 V8，碳纖維車身，目標極速超過500km/h",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "saleen_s7": {
        "name": "S7 Twin Turbo",
        "name_zh": "Saleen S7 Twin Turbo",
        "category": "gt_car",
        "years": "2005-2009",
        "layout": "MR",
        "params": {
            "front_spring_rate": 95, "rear_spring_rate": 110,
            "front_arb": 200, "rear_arb": 170,
            "front_track": 1600, "rear_track": 1615,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 40.0, "total_weight": 1361,
            "cg_height": 400, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "michelin_ps_cup", "rear_compound": "michelin_ps_cup",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.8, "rear_camber_deg": -2.2,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 275/35 ZR19 / R: 335/30 ZR20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 19},
            "rear":  {"width": 335, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "750匹馬力 7.0L 雙渦輪增壓 V8，全碳纖維車身，美國製造的稀有超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "panoz_esperante": {
        "name": "Esperante GT",
        "name_zh": "Panoz Esperante GT",
        "category": "sports_car",
        "years": "2000-2014",
        "layout": "FR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1524, "rear_track": 1534,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 1497,
            "cg_height": 460, "wheelbase": 2540
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.3,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport",
        "oem_tire_size": "F: 245/40 ZR18 / R: 285/35 ZR18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 285, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "鋁合金車架 GT 跑車，Ford SVT V8 引擎，手工製造的美國小眾跑車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "local_motors_rally_fighter": {
        "name": "Rally Fighter",
        "name_zh": "Local Motors Rally Fighter",
        "category": "suv",
        "years": "2010-2016",
        "layout": "FR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 55,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1700, "rear_track": 1700,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.70,
            "weight_front_pct": 53.0, "total_weight": 1633,
            "cg_height": 620, "wheelbase": 3048
        },
        "tire_defaults": {
            "front_compound": "bf_goodrich_ko2", "rear_compound": "bf_goodrich_ko2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "BF Goodrich KO2",
        "oem_tire_size": "F: 285/70 R17 / R: 285/70 R17",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 70, "rim": 17},
            "rear":  {"width": 285, "aspect": 70, "rim": 17}
        },
        "suspension_type": "F: Double wishbone long-travel / R: Multi-link long-travel",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "群眾設計越野超跑，LS3 V8 430匹馬力，長行程懸吊，街道合法沙漠拉力車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "polaris_slingshot": {
        "name": "Slingshot R",
        "name_zh": "Polaris Slingshot R",
        "category": "sports_car",
        "years": "2020-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 70,
            "front_arb": 100, "rear_arb": 0,
            "front_track": 1600, "rear_track": 0,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 1.00,
            "weight_front_pct": 48.0, "total_weight": 790,
            "cg_height": 380, "wheelbase": 2667
        },
        "tire_defaults": {
            "front_compound": "kenda_kr20a", "rear_compound": "kenda_kr20a",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": 0,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Kenda KR20A",
        "oem_tire_size": "F: 225/45 R18 / R: 305/30 R20 (single)",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Swing arm (single wheel)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "三輪街道跑車，2.0L ProStar 引擎 203匹馬力，單後輪設計，極致輕量化體驗",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_917k": {
        "name": "Porsche 917K",
        "name_zh": "保時捷 917K",
        "category": "race_car",
        "years": "1970-1971",
        "layout": "RR",
        "params": {
            "front_spring_rate": 140, "rear_spring_rate": 180,
            "front_arb": 200, "rear_arb": 160,
            "front_track": 1540, "rear_track": 1520,
            "front_motion_ratio": 1.00, "rear_motion_ratio": 1.00,
            "weight_front_pct": 41.0, "total_weight": 800,
            "cg_height": 350, "wheelbase": 2300
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Firestone Racing",
        "oem_tire_size": "F: 10.15-15 / R: 14.50-15",
        "oem_tire_specs": {
            "front": {"width": 260, "aspect": 50, "rim": 15},
            "rear":  {"width": 370, "aspect": 50, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "傳奇利曼賽車，氣冷水平對臥12缸，極致賽道機器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_gt40": {
        "name": "Ford GT40 Mk I",
        "name_zh": "福特 GT40 Mk I",
        "category": "race_car",
        "years": "1964-1969",
        "layout": "MR",
        "params": {
            "front_spring_rate": 120, "rear_spring_rate": 160,
            "front_arb": 180, "rear_arb": 140,
            "front_track": 1372, "rear_track": 1346,
            "front_motion_ratio": 1.00, "rear_motion_ratio": 1.00,
            "weight_front_pct": 42.0, "total_weight": 1015,
            "cg_height": 380, "wheelbase": 2413
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Goodyear Racing",
        "oem_tire_size": "F: 5.50-15 / R: 7.00-15",
        "oem_tire_specs": {
            "front": {"width": 200, "aspect": 70, "rim": 15},
            "rear":  {"width": 255, "aspect": 70, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Trailing arm",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "擊敗法拉利的利曼傳奇，美國V8中置引擎，車高僅40吋",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_250_gto": {
        "name": "Ferrari 250 GTO",
        "name_zh": "法拉利 250 GTO",
        "category": "race_car",
        "years": "1962-1964",
        "layout": "FR",
        "params": {
            "front_spring_rate": 90, "rear_spring_rate": 105,
            "front_arb": 120, "rear_arb": 100,
            "front_track": 1354, "rear_track": 1349,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 50.0, "total_weight": 950,
            "cg_height": 420, "wheelbase": 2400
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 1.90
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Dunlop Racing",
        "oem_tire_size": "F: 6.00-15 / R: 7.00-15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 80, "rim": 15},
            "rear":  {"width": 210, "aspect": 80, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Live axle",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "史上最昂貴汽車之一，Colombo V12引擎，60年代GT賽事霸主",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "shelby_daytona": {
        "name": "Shelby Daytona Coupe",
        "name_zh": "謝爾比 Daytona Coupe",
        "category": "race_car",
        "years": "1964-1965",
        "layout": "FR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 150, "rear_arb": 120,
            "front_track": 1384, "rear_track": 1384,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 48.0, "total_weight": 1040,
            "cg_height": 400, "wheelbase": 2286
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.85, "rear_optimal_pressure": 1.85
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Goodyear Racing",
        "oem_tire_size": "F: 7.00-15 / R: 8.00-15",
        "oem_tire_specs": {
            "front": {"width": 210, "aspect": 75, "rim": 15},
            "rear":  {"width": 235, "aspect": 75, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Live axle",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "空力設計先驅，Ford 289 V8引擎，首輛贏得FIA GT冠軍的美國車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_ts050": {
        "name": "Toyota TS050 Hybrid",
        "name_zh": "豐田 TS050 Hybrid",
        "category": "race_car",
        "years": "2016-2020",
        "layout": "MR",
        "params": {
            "front_spring_rate": 250, "rear_spring_rate": 300,
            "front_arb": 350, "rear_arb": 300,
            "front_track": 1470, "rear_track": 1410,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 46.0, "total_weight": 878,
            "cg_height": 280, "wheelbase": 3150
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 31/71-18 / R: 31/71-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "LMP1油電混合原型車，2.4升V6渦輪增壓＋電動馬達，終贏利曼冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mazda_787b": {
        "name": "Mazda 787B",
        "name_zh": "馬自達 787B",
        "category": "race_car",
        "years": "1991",
        "layout": "MR",
        "params": {
            "front_spring_rate": 180, "rear_spring_rate": 220,
            "front_arb": 250, "rear_arb": 200,
            "front_track": 1540, "rear_track": 1510,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 43.0, "total_weight": 830,
            "cg_height": 310, "wheelbase": 2760
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Dunlop Racing",
        "oem_tire_size": "F: 275/600-16 / R: 330/650-16",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 45, "rim": 16},
            "rear":  {"width": 330, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "史上唯一轉子引擎利曼冠軍車，R26B四轉子引擎，聲浪傳奇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r390_gt1": {
        "name": "Nissan R390 GT1",
        "name_zh": "日產 R390 GT1",
        "category": "race_car",
        "years": "1997-1998",
        "layout": "MR",
        "params": {
            "front_spring_rate": 170, "rear_spring_rate": 210,
            "front_arb": 240, "rear_arb": 190,
            "front_track": 1620, "rear_track": 1580,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 44.0, "total_weight": 1100,
            "cg_height": 320, "wheelbase": 2690
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Bridgestone Racing",
        "oem_tire_size": "F: 295/660-18 / R: 345/710-18",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 40, "rim": 18},
            "rear":  {"width": 345, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "GT1規格利曼賽車，VRH35L 3.5升V8雙渦輪，日產最接近利曼冠軍之作",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_f1_gtr": {
        "name": "McLaren F1 GTR",
        "name_zh": "麥拉倫 F1 GTR",
        "category": "race_car",
        "years": "1995-1997",
        "layout": "MR",
        "params": {
            "front_spring_rate": 160, "rear_spring_rate": 200,
            "front_arb": 220, "rear_arb": 180,
            "front_track": 1550, "rear_track": 1510,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 42.0, "total_weight": 1050,
            "cg_height": 330, "wheelbase": 2718
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot",
        "oem_tire_size": "F: 295/35-18 / R: 335/35-18",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 35, "rim": 18},
            "rear":  {"width": 335, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "F1公路車賽道版，BMW S70 V12引擎，1995年利曼冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_m3_e30_dtm": {
        "name": "BMW M3 E30 DTM",
        "name_zh": "BMW M3 E30 DTM",
        "category": "race_car",
        "years": "1987-1992",
        "layout": "FR",
        "params": {
            "front_spring_rate": 130, "rear_spring_rate": 110,
            "front_arb": 200, "rear_arb": 160,
            "front_track": 1470, "rear_track": 1460,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 52.0, "total_weight": 960,
            "cg_height": 400, "wheelbase": 2562
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.85, "rear_optimal_pressure": 1.85
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Yokohama Racing",
        "oem_tire_size": "F: 245/620-17 / R: 265/640-17",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 17},
            "rear":  {"width": 265, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Semi-trailing arm",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "DTM傳奇戰車，S14直列四缸引擎，80年代房車賽霸主",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_190e_dtm": {
        "name": "Mercedes-Benz 190E 2.5-16 DTM",
        "name_zh": "賓士 190E 2.5-16 DTM",
        "category": "race_car",
        "years": "1988-1993",
        "layout": "FR",
        "params": {
            "front_spring_rate": 125, "rear_spring_rate": 105,
            "front_arb": 190, "rear_arb": 150,
            "front_track": 1488, "rear_track": 1470,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 53.0, "total_weight": 980,
            "cg_height": 410, "wheelbase": 2665
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.85, "rear_optimal_pressure": 1.85
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Continental Racing",
        "oem_tire_size": "F: 245/620-17 / R: 265/640-17",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 17},
            "rear":  {"width": 265, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "DTM經典對手，Cosworth調校2.5升直四，與E30 M3世紀對決",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_r18_etron": {
        "name": "Audi R18 e-tron quattro",
        "name_zh": "奧迪 R18 e-tron quattro",
        "category": "race_car",
        "years": "2012-2016",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 240, "rear_spring_rate": 280,
            "front_arb": 330, "rear_arb": 280,
            "front_track": 1460, "rear_track": 1400,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 46.5, "total_weight": 870,
            "cg_height": 290, "wheelbase": 3150
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 31/71-18 / R: 31/71-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "LMP1柴電混合四驅賽車，TDI柴油渦輪+電動前軸，三連霸利曼",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bentley_speed_8": {
        "name": "Bentley Speed 8",
        "name_zh": "賓利 Speed 8",
        "category": "race_car",
        "years": "2003",
        "layout": "MR",
        "params": {
            "front_spring_rate": 190, "rear_spring_rate": 230,
            "front_arb": 260, "rear_arb": 210,
            "front_track": 1580, "rear_track": 1540,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 44.0, "total_weight": 900,
            "cg_height": 310, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 295/660-18 / R: 345/710-18",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 40, "rim": 18},
            "rear":  {"width": 345, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "賓利重返利曼，4.0升V8雙渦輪，時隔73年再奪利曼冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_xjr9": {
        "name": "Jaguar XJR-9",
        "name_zh": "捷豹 XJR-9",
        "category": "race_car",
        "years": "1988-1989",
        "layout": "MR",
        "params": {
            "front_spring_rate": 170, "rear_spring_rate": 210,
            "front_arb": 240, "rear_arb": 190,
            "front_track": 1530, "rear_track": 1490,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 43.0, "total_weight": 880,
            "cg_height": 320, "wheelbase": 2770
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Dunlop Racing",
        "oem_tire_size": "F: 280/640-17 / R: 330/680-17",
        "oem_tire_specs": {
            "front": {"width": 280, "aspect": 45, "rim": 17},
            "rear":  {"width": 330, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "捷豹C組賽車，7.0升V12引擎，1988年利曼冠軍，TWR打造",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_gt_one": {
        "name": "Toyota GT-One TS020",
        "name_zh": "豐田 GT-One TS020",
        "category": "race_car",
        "years": "1998-1999",
        "layout": "MR",
        "params": {
            "front_spring_rate": 185, "rear_spring_rate": 225,
            "front_arb": 260, "rear_arb": 210,
            "front_track": 1600, "rear_track": 1560,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 44.0, "total_weight": 1000,
            "cg_height": 310, "wheelbase": 2800
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Bridgestone Racing",
        "oem_tire_size": "F: 295/660-18 / R: 345/710-18",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 40, "rim": 18},
            "rear":  {"width": 345, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "GT1規格利曼賽車，3.6升V8雙渦輪，外型極度流線，惜未奪冠",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nissan_r89c": {
        "name": "Nissan R89C",
        "name_zh": "日產 R89C",
        "category": "race_car",
        "years": "1989",
        "layout": "MR",
        "params": {
            "front_spring_rate": 165, "rear_spring_rate": 200,
            "front_arb": 230, "rear_arb": 180,
            "front_track": 1520, "rear_track": 1480,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 43.0, "total_weight": 870,
            "cg_height": 330, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Dunlop Racing",
        "oem_tire_size": "F: 275/640-16 / R: 330/680-16",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 45, "rim": 16},
            "rear":  {"width": 330, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "C組原型賽車，VEJ30 3.5升V8雙渦輪，March底盤設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_956": {
        "name": "Porsche 956",
        "name_zh": "保時捷 956",
        "category": "race_car",
        "years": "1982-1986",
        "layout": "MR",
        "params": {
            "front_spring_rate": 150, "rear_spring_rate": 190,
            "front_arb": 220, "rear_arb": 170,
            "front_track": 1510, "rear_track": 1490,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.92,
            "weight_front_pct": 42.0, "total_weight": 820,
            "cg_height": 320, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Dunlop Racing",
        "oem_tire_size": "F: 270/600-16 / R: 330/640-16",
        "oem_tire_specs": {
            "front": {"width": 270, "aspect": 45, "rim": 16},
            "rear":  {"width": 330, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "C組王者，水平對臥六缸雙渦輪，地面效應設計，四連霸利曼",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_333sp": {
        "name": "Ferrari 333 SP",
        "name_zh": "法拉利 333 SP",
        "category": "race_car",
        "years": "1994-2003",
        "layout": "MR",
        "params": {
            "front_spring_rate": 175, "rear_spring_rate": 215,
            "front_arb": 240, "rear_arb": 190,
            "front_track": 1560, "rear_track": 1520,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 43.0, "total_weight": 850,
            "cg_height": 300, "wheelbase": 2780
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Goodyear Racing",
        "oem_tire_size": "F: 295/660-18 / R: 345/710-18",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 40, "rim": 18},
            "rear":  {"width": 345, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "開頂式原型賽車，F1衍生4.0升V12引擎，Dallara底盤，美國賽事霸主",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_v12_lmr": {
        "name": "BMW V12 LMR",
        "name_zh": "BMW V12 LMR",
        "category": "race_car",
        "years": "1999",
        "layout": "MR",
        "params": {
            "front_spring_rate": 180, "rear_spring_rate": 220,
            "front_arb": 250, "rear_arb": 200,
            "front_track": 1570, "rear_track": 1530,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 44.0, "total_weight": 900,
            "cg_height": 300, "wheelbase": 2800
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.75, "rear_optimal_pressure": 1.75
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 295/660-18 / R: 345/710-18",
        "oem_tire_specs": {
            "front": {"width": 295, "aspect": 40, "rim": 18},
            "rear":  {"width": 345, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "BMW唯一利曼冠軍車，P75 6.0升V12引擎，Williams F1技術打造",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_dbr9": {
        "name": "Aston Martin DBR9",
        "name_zh": "阿斯頓·馬丁 DBR9",
        "category": "race_car",
        "years": "2005-2009",
        "layout": "FR",
        "params": {
            "front_spring_rate": 160, "rear_spring_rate": 140,
            "front_arb": 220, "rear_arb": 180,
            "front_track": 1610, "rear_track": 1590,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 50.0, "total_weight": 1100,
            "cg_height": 370, "wheelbase": 2740
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 305/680-18 / R: 315/710-18",
        "oem_tire_specs": {
            "front": {"width": 305, "aspect": 40, "rim": 18},
            "rear":  {"width": 315, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "GT1級距賽車，6.0升V12引擎，DB9為基礎，利曼GT組冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "corvette_c6r": {
        "name": "Chevrolet Corvette C6.R",
        "name_zh": "雪佛蘭 Corvette C6.R",
        "category": "race_car",
        "years": "2005-2013",
        "layout": "FR",
        "params": {
            "front_spring_rate": 155, "rear_spring_rate": 135,
            "front_arb": 210, "rear_arb": 170,
            "front_track": 1600, "rear_track": 1580,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 51.0, "total_weight": 1145,
            "cg_height": 360, "wheelbase": 2686
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 300/680-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 300, "aspect": 40, "rim": 18},
            "rear":  {"width": 310, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Transverse leaf spring",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "美國GT賽車代表，LS7.R 5.5升V8引擎，多次利曼GT組冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_488_gte": {
        "name": "Ferrari 488 GTE",
        "name_zh": "法拉利 488 GTE",
        "category": "race_car",
        "years": "2016-2022",
        "layout": "MR",
        "params": {
            "front_spring_rate": 175, "rear_spring_rate": 200,
            "front_arb": 240, "rear_arb": 200,
            "front_track": 1660, "rear_track": 1610,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 45.0, "total_weight": 1245,
            "cg_height": 350, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 300/680-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 300, "aspect": 40, "rim": 18},
            "rear":  {"width": 310, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "GTE Pro級距賽車，3.9升V8雙渦輪，WEC及利曼GT組多次冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_911_rsr_991": {
        "name": "Porsche 911 RSR (991)",
        "name_zh": "保時捷 911 RSR (991)",
        "category": "race_car",
        "years": "2017-2022",
        "layout": "MR",
        "params": {
            "front_spring_rate": 170, "rear_spring_rate": 195,
            "front_arb": 235, "rear_arb": 195,
            "front_track": 1660, "rear_track": 1620,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 46.0, "total_weight": 1245,
            "cg_height": 355, "wheelbase": 2510
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 300/680-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 300, "aspect": 40, "rim": 18},
            "rear":  {"width": 310, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "首款中置引擎911賽車，4.0升水平對臥六缸，GTE級距強者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_m8_gte": {
        "name": "BMW M8 GTE",
        "name_zh": "BMW M8 GTE",
        "category": "race_car",
        "years": "2018-2021",
        "layout": "FR",
        "params": {
            "front_spring_rate": 165, "rear_spring_rate": 145,
            "front_arb": 225, "rear_arb": 185,
            "front_track": 1660, "rear_track": 1620,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 52.0, "total_weight": 1220,
            "cg_height": 365, "wheelbase": 2820
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -2.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 300/680-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 300, "aspect": 40, "rim": 18},
            "rear":  {"width": 310, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "GTE Pro級距賽車，4.0升V8雙渦輪，IMSA及WEC參賽",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_gt_gte": {
        "name": "Ford GT GTE",
        "name_zh": "福特 GT GTE",
        "category": "race_car",
        "years": "2016-2019",
        "layout": "MR",
        "params": {
            "front_spring_rate": 170, "rear_spring_rate": 195,
            "front_arb": 235, "rear_arb": 195,
            "front_track": 1650, "rear_track": 1610,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 45.5, "total_weight": 1245,
            "cg_height": 340, "wheelbase": 2710
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.80, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 300/680-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 300, "aspect": 40, "rim": 18},
            "rear":  {"width": 310, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "致敬GT40，3.5升V6 EcoBoost雙渦輪，2016利曼GT冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_gr010": {
        "name": "Toyota GR010 Hybrid",
        "name_zh": "豐田 GR010 Hybrid",
        "category": "race_car",
        "years": "2021-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 230, "rear_spring_rate": 270,
            "front_arb": 320, "rear_arb": 270,
            "front_track": 1620, "rear_track": 1560,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 47.0, "total_weight": 1040,
            "cg_height": 300, "wheelbase": 3040
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 310/710-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "Le Mans Hypercar規格，3.5升V6雙渦輪混合動力，連續利曼冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_499p": {
        "name": "Ferrari 499P",
        "name_zh": "法拉利 499P",
        "category": "race_car",
        "years": "2023-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 235, "rear_spring_rate": 275,
            "front_arb": 325, "rear_arb": 275,
            "front_track": 1620, "rear_track": 1560,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 47.0, "total_weight": 1030,
            "cg_height": 295, "wheelbase": 3020
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 310/710-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "Le Mans Hypercar，3.0升V6雙渦輪混合動力，2023利曼冠軍，法拉利回歸原型車巔峰",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_963": {
        "name": "Porsche 963",
        "name_zh": "保時捷 963",
        "category": "race_car",
        "years": "2023-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 225, "rear_spring_rate": 265,
            "front_arb": 310, "rear_arb": 260,
            "front_track": 1610, "rear_track": 1550,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 47.0, "total_weight": 1030,
            "cg_height": 300, "wheelbase": 3050
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 310/710-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "LMDh規格賽車，4.6升V8雙渦輪混合動力，Multimatic底盤，Penske團隊運營",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "cadillac_vr_01": {
        "name": "Cadillac V-Series.R",
        "name_zh": "凱迪拉克 V-Series.R",
        "category": "race_car",
        "years": "2023-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 220, "rear_spring_rate": 260,
            "front_arb": 310, "rear_arb": 260,
            "front_track": 1610, "rear_track": 1550,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 47.0, "total_weight": 1030,
            "cg_height": 305, "wheelbase": 3050
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 310/710-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "LMDh規格賽車，5.5升V8自然進氣混合動力，Dallara底盤，Action Express團隊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_m_hybrid_v8": {
        "name": "BMW M Hybrid V8",
        "name_zh": "BMW M Hybrid V8",
        "category": "race_car",
        "years": "2023-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 220, "rear_spring_rate": 260,
            "front_arb": 305, "rear_arb": 255,
            "front_track": 1610, "rear_track": 1550,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 47.0, "total_weight": 1030,
            "cg_height": 305, "wheelbase": 3050
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.70
        },
        "geometry_defaults": {
            "front_camber_deg": -4.0, "rear_camber_deg": -3.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin",
        "oem_tire_size": "F: 310/710-18 / R: 310/710-18",
        "oem_tire_specs": {
            "front": {"width": 310, "aspect": 45, "rim": 18},
            "rear":  {"width": 310, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "LMDh規格賽車，P66/3 4.0升V8雙渦輪混合動力，Dallara底盤，RLL團隊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_f50": {
        "name": "Ferrari F50",
        "name_zh": "法拉利 F50",
        "category": "sports_car",
        "years": "1995-1997",
        "layout": "MR",
        "params": {
            "front_spring_rate": 65, "rear_spring_rate": 80,
            "front_arb": 120, "rear_arb": 100,
            "front_track": 1620, "rear_track": 1602,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.70,
            "weight_front_pct": 43.0, "total_weight": 1230,
            "cg_height": 420, "wheelbase": 2580
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Goodyear Eagle GS Fiorano",
        "oem_tire_size": "F: 245/35-18 / R: 335/30-18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 18},
            "rear":  {"width": 335, "aspect": 30, "rim": 18}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Pushrod double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "F1技術下放公路車，4.7升V12源自641 F1引擎，碳纖維單體車身",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_f1": {
        "name": "McLaren F1",
        "name_zh": "麥拉倫 F1",
        "category": "sports_car",
        "years": "1992-1998",
        "layout": "MR",
        "params": {
            "front_spring_rate": 60, "rear_spring_rate": 75,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1550, "rear_track": 1460,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 42.0, "total_weight": 1138,
            "cg_height": 410, "wheelbase": 2718
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Goodyear Eagle F1",
        "oem_tire_size": "F: 235/45-17 / R: 315/45-17",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 17},
            "rear":  {"width": 315, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "90年代極速王者，BMW S70/2 V12引擎，三座佈局，金箔隔熱",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_etype": {
        "name": "Jaguar E-Type Series 1",
        "name_zh": "捷豹 E-Type Series 1",
        "category": "sports_car",
        "years": "1961-1968",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 35,
            "front_arb": 50, "rear_arb": 0,
            "front_track": 1270, "rear_track": 1270,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 51.0, "total_weight": 1220,
            "cg_height": 470, "wheelbase": 2438
        },
        "tire_defaults": {
            "front_compound": "continental_ec6", "rear_compound": "continental_ec6",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Dunlop RS5",
        "oem_tire_size": "F: 6.40-15 / R: 6.40-15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 80, "rim": 15},
            "rear":  {"width": 185, "aspect": 80, "rim": 15}
        },
        "suspension_type": "F: Double wishbone torsion bar / R: Independent lower wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "史上最美汽車之一，XK 3.8升直六引擎，60年代跑車典範",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_xj220": {
        "name": "Jaguar XJ220",
        "name_zh": "捷豹 XJ220",
        "category": "sports_car",
        "years": "1992-1994",
        "layout": "MR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 70,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1594, "rear_track": 1610,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 44.0, "total_weight": 1470,
            "cg_height": 430, "wheelbase": 2640
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone RE71",
        "oem_tire_size": "F: 255/45-17 / R: 345/35-18",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 17},
            "rear":  {"width": 345, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "曾為世界最快量產車，3.5升V6雙渦輪，TWR與捷豹合作傑作",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_f_type_r": {
        "name": "Jaguar F-Type R",
        "name_zh": "捷豹 F-Type R",
        "category": "sports_car",
        "years": "2014-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 45,
            "front_arb": 80, "rear_arb": 60,
            "front_track": 1585, "rear_track": 1627,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.70,
            "weight_front_pct": 52.0, "total_weight": 1720,
            "cg_height": 460, "wheelbase": 2622
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/35-20 / R: 295/30-20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "現代英倫GT跑車，5.0升機械增壓V8，鋁合金車身，迷人排氣聲浪",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_db5": {
        "name": "Aston Martin DB5",
        "name_zh": "阿斯頓·馬丁 DB5",
        "category": "gt_car",
        "years": "1963-1965",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 36,
            "front_arb": 45, "rear_arb": 0,
            "front_track": 1372, "rear_track": 1372,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 52.0, "total_weight": 1502,
            "cg_height": 480, "wheelbase": 2489
        },
        "tire_defaults": {
            "front_compound": "continental_ec6", "rear_compound": "continental_ec6",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0, "rear_toe_deg": 0
        },
        "oem_tire": "Avon Turbospeed",
        "oem_tire_size": "F: 6.70-15 / R: 6.70-15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 80, "rim": 15},
            "rear":  {"width": 185, "aspect": 80, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Live axle trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "007詹姆士龐德座駕，4.0升直六引擎，經典英倫紳士GT",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "aston_martin_valkyrie": {
        "name": "Aston Martin Valkyrie",
        "name_zh": "阿斯頓·馬丁 Valkyrie",
        "category": "sports_car",
        "years": "2021-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 200, "rear_spring_rate": 240,
            "front_arb": 300, "rear_arb": 250,
            "front_track": 1690, "rear_track": 1630,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 44.0, "total_weight": 1130,
            "cg_height": 310, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 1.90
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2R",
        "oem_tire_size": "F: 265/35-20 / R: 325/30-21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 325, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Pushrod inboard / R: Pushrod inboard",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "Adrian Newey設計，Cosworth 6.5升V12，地面效應公路車，F1技術極致",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bugatti_veyron": {
        "name": "Bugatti Veyron 16.4",
        "name_zh": "布加迪 Veyron 16.4",
        "category": "sports_car",
        "years": "2005-2015",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 80, "rear_spring_rate": 100,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1716, "rear_track": 1636,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.70,
            "weight_front_pct": 45.0, "total_weight": 1888,
            "cg_height": 440, "wheelbase": 2710
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin PAX",
        "oem_tire_size": "F: 265/680-500A / R: 365/710-540A",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 365, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "千匹馬力俱樂部始祖，8.0升W16四渦輪，極速407km/h，汽車工程奇蹟",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bugatti_chiron": {
        "name": "Bugatti Chiron",
        "name_zh": "布加迪 Chiron",
        "category": "sports_car",
        "years": "2016-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 85, "rear_spring_rate": 110,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1726, "rear_track": 1646,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.70,
            "weight_front_pct": 45.0, "total_weight": 1995,
            "cg_height": 430, "wheelbase": 2711
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 285/30-20 / R: 355/25-21",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 30, "rim": 20},
            "rear":  {"width": 355, "aspect": 25, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Veyron後繼者，8.0升W16四渦輪1500匹馬力，Super Sport極速490km/h",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "koenigsegg_jesko": {
        "name": "Koenigsegg Jesko",
        "name_zh": "科尼賽克 Jesko",
        "category": "sports_car",
        "years": "2022-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 90, "rear_spring_rate": 110,
            "front_arb": 150, "rear_arb": 130,
            "front_track": 1710, "rear_track": 1650,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 44.0, "total_weight": 1420,
            "cg_height": 390, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2R",
        "oem_tire_size": "F: 265/35-20 / R: 325/30-21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 325, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "瑞典極速猛獸，5.0升V8雙渦輪1600匹，Light Speed Transmission九速變速箱",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "rimac_nevera": {
        "name": "Rimac Nevera",
        "name_zh": "Rimac Nevera",
        "category": "electric",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 95, "rear_spring_rate": 115,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1700, "rear_track": 1660,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 48.0, "total_weight": 2150,
            "cg_height": 370, "wheelbase": 2745
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2R",
        "oem_tire_size": "F: 275/35-20 / R: 315/35-20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 20},
            "rear":  {"width": 315, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "克羅埃西亞電動超跑，四馬達1914匹，0-100僅1.81秒，電動車性能標竿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "gordon_murray_t50": {
        "name": "Gordon Murray T.50",
        "name_zh": "Gordon Murray T.50",
        "category": "sports_car",
        "years": "2022-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 65, "rear_spring_rate": 80,
            "front_arb": 110, "rear_arb": 90,
            "front_track": 1580, "rear_track": 1540,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 42.0, "total_weight": 986,
            "cg_height": 380, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 235/35-19 / R: 295/30-20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "F1傳奇設計師Gordon Murray傑作，Cosworth V12引擎，後置風扇，僅986公斤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_senna": {
        "name": "McLaren Senna",
        "name_zh": "麥拉倫 Senna",
        "category": "sports_car",
        "years": "2018-2020",
        "layout": "MR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 160, "rear_arb": 140,
            "front_track": 1670, "rear_track": 1620,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 43.0, "total_weight": 1198,
            "cg_height": 380, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_r", "rear_compound": "pirelli_trofeo_r",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero Trofeo R",
        "oem_tire_size": "F: 245/35-19 / R: 315/30-20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 315, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "致敬車神洗拿，4.0升V8雙渦輪800匹，極致賽道導向超跑",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_laferrari": {
        "name": "Ferrari LaFerrari",
        "name_zh": "法拉利 LaFerrari",
        "category": "sports_car",
        "years": "2013-2018",
        "layout": "MR",
        "params": {
            "front_spring_rate": 85, "rear_spring_rate": 105,
            "front_arb": 150, "rear_arb": 130,
            "front_track": 1672, "rear_track": 1632,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.70,
            "weight_front_pct": 42.0, "total_weight": 1255,
            "cg_height": 380, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 265/30-19 / R: 345/30-20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 30, "rim": 19},
            "rear":  {"width": 345, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "法拉利旗艦混合動力超跑，6.3升V12+HY-KERS系統，963匹總馬力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_918_spyder": {
        "name": "Porsche 918 Spyder",
        "name_zh": "保時捷 918 Spyder",
        "category": "sports_car",
        "years": "2013-2015",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 80, "rear_spring_rate": 100,
            "front_arb": 140, "rear_arb": 120,
            "front_track": 1664, "rear_track": 1612,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 43.0, "total_weight": 1640,
            "cg_height": 390, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 265/35-20 / R: 325/30-21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 325, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Pushrod double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "保時捷油電旗艦，4.6升V8+雙電動馬達，紐柏林6分57秒紀錄",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "documented",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_evija": {
        "name": "Lotus Evija",
        "name_zh": "蓮花 Evija",
        "category": "electric",
        "years": "2024-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 150, "rear_arb": 130,
            "front_track": 1690, "rear_track": 1650,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.72,
            "weight_front_pct": 47.0, "total_weight": 1680,
            "cg_height": 360, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -2.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 265/35-20 / R: 315/30-21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 315, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "蓮花首款純電超跑，四馬達2000匹，碳纖維單體車身，英國電動旗艦",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "de_tomaso_pantera": {
        "name": "De Tomaso Pantera GTS",
        "name_zh": "De Tomaso Pantera GTS",
        "category": "sports_car",
        "years": "1971-1991",
        "layout": "MR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 50,
            "front_arb": 70, "rear_arb": 55,
            "front_track": 1460, "rear_track": 1460,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 45.0, "total_weight": 1418,
            "cg_height": 450, "wheelbase": 2515
        },
        "tire_defaults": {
            "front_compound": "continental_ec6", "rear_compound": "continental_ec6",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Campagnolo",
        "oem_tire_size": "F: 225/50-15 / R: 285/50-15",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 50, "rim": 15},
            "rear":  {"width": 285, "aspect": 50, "rim": 15}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "義大利設計美國心臟，Ford 351 Cleveland V8，Ghia設計，中置引擎GT",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tvr_tuscan": {
        "name": "TVR Tuscan Speed Six",
        "name_zh": "TVR Tuscan Speed Six",
        "category": "sports_car",
        "years": "1999-2006",
        "layout": "FR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 50,
            "front_arb": 85, "rear_arb": 65,
            "front_track": 1460, "rear_track": 1480,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 51.0, "total_weight": 1100,
            "cg_height": 430, "wheelbase": 2360
        },
        "tire_defaults": {
            "front_compound": "hankook_rs4", "rear_compound": "hankook_rs4",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Toyo Proxes T1-R",
        "oem_tire_size": "F: 225/45-17 / R: 255/40-18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 17},
            "rear":  {"width": 255, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "英國手工跑車，TVR自製Speed Six直六引擎，玻璃纖維車身，純粹駕駛體驗",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alpine_a310": {
        "name": "Alpine A310 V6",
        "name_zh": "Alpine A310 V6",
        "category": "sports_car",
        "years": "1976-1984",
        "layout": "RR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 38,
            "front_arb": 45, "rear_arb": 35,
            "front_track": 1320, "rear_track": 1330,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 40.0, "total_weight": 1060,
            "cg_height": 450, "wheelbase": 2270
        },
        "tire_defaults": {
            "front_compound": "continental_ec6", "rear_compound": "continental_ec6",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin XVS",
        "oem_tire_size": "F: 185/55-13 / R: 220/55-13",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 13},
            "rear":  {"width": 220, "aspect": 55, "rim": 13}
        },
        "suspension_type": "F: Double wishbone / R: Swinging arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "法國後置引擎跑車，PRV 2.7升V6引擎，玻璃纖維車身，重量輕盈",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alpine_a610": {
        "name": "Alpine A610 Turbo",
        "name_zh": "Alpine A610 Turbo",
        "category": "sports_car",
        "years": "1991-1995",
        "layout": "RR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 48,
            "front_arb": 55, "rear_arb": 45,
            "front_track": 1416, "rear_track": 1470,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 38.0, "total_weight": 1300,
            "cg_height": 440, "wheelbase": 2340
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin MXX",
        "oem_tire_size": "F: 205/55-16 / R: 245/45-16",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 16},
            "rear":  {"width": 245, "aspect": 45, "rim": 16}
        },
        "suspension_type": "F: Double wishbone / R: Semi-trailing arm",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "Alpine最後的後置引擎跑車，PRV 3.0升V6渦輪增壓，法國GT末代傳奇",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_f_pace_svr": {
        "name": "Jaguar F-Pace SVR",
        "name_zh": "捷豹 F-Pace SVR",
        "category": "suv",
        "years": "2018-2023",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 38,
            "front_arb": 140, "rear_arb": 100,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.80,
            "weight_front_pct": 52.0, "total_weight": 2070,
            "cg_height": 580, "wheelbase": 2870
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 265/40 R22 / R: 295/35 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 40, "rim": 22},
            "rear":  {"width": 295, "aspect": 35, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "捷豹高性能 SUV，5.0L V8 機增引擎，運動化底盤調校",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_xe_sv_project8": {
        "name": "Jaguar XE SV Project 8",
        "name_zh": "捷豹 XE SV Project 8",
        "category": "sedan",
        "years": "2018-2019",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 80, "rear_spring_rate": 90,
            "front_arb": 200, "rear_arb": 180,
            "front_track": 1610, "rear_track": 1600,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.85,
            "weight_front_pct": 51.5, "total_weight": 1745,
            "cg_height": 440, "wheelbase": 2835
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 265/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "捷豹史上最強房車，5.0L V8 機增 600PS，紐柏林最速房車紀錄保持者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_xfr_s": {
        "name": "Jaguar XFR-S",
        "name_zh": "捷豹 XFR-S",
        "category": "sedan",
        "years": "2013-2015",
        "layout": "FR",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 160, "rear_arb": 130,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.82,
            "weight_front_pct": 52.5, "total_weight": 1894,
            "cg_height": 470, "wheelbase": 2909
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 265/35 R20 / R: 295/30 R20",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 295, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "捷豹高性能房車，5.0L V8 機增 550PS，後驅佈局提供純粹駕駛樂趣",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "jaguar_i_pace": {
        "name": "Jaguar I-Pace",
        "name_zh": "捷豹 I-Pace",
        "category": "electric",
        "years": "2018-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 40,
            "front_arb": 130, "rear_arb": 110,
            "front_track": 1644, "rear_track": 1658,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 2208,
            "cg_height": 480, "wheelbase": 2990
        },
        "tire_defaults": {
            "front_compound": "goodyear_f1a5", "rear_compound": "goodyear_f1a5",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Goodyear Eagle F1 Asymmetric 5",
        "oem_tire_size": "F: 245/50 R20 / R: 245/50 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 50, "rim": 20},
            "rear":  {"width": 245, "aspect": 50, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "捷豹純電動跨界 SUV，90kWh 電池組位於底盤，重心極低",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "land_rover_defender_v8": {
        "name": "Land Rover Defender V8",
        "name_zh": "路虎 Defender V8",
        "category": "suv",
        "years": "2021-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 35,
            "front_arb": 150, "rear_arb": 120,
            "front_track": 1706, "rear_track": 1706,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.78,
            "weight_front_pct": 53.0, "total_weight": 2360,
            "cg_height": 650, "wheelbase": 3022
        },
        "tire_defaults": {
            "front_compound": "goodyear_at", "rear_compound": "goodyear_at",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Goodyear Wrangler All-Terrain",
        "oem_tire_size": "F: 275/45 R22 / R: 275/45 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 45, "rim": 22},
            "rear":  {"width": 275, "aspect": 45, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "路虎經典越野車 V8 版本，5.0L 機增引擎，公路性能大幅提升",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "land_rover_range_rover_sport_svr": {
        "name": "Land Rover Range Rover Sport SVR",
        "name_zh": "路虎 Range Rover Sport SVR",
        "category": "suv",
        "years": "2018-2022",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 40,
            "front_arb": 155, "rear_arb": 115,
            "front_track": 1660, "rear_track": 1670,
            "front_motion_ratio": 0.83, "rear_motion_ratio": 0.80,
            "weight_front_pct": 53.5, "total_weight": 2310,
            "cg_height": 600, "wheelbase": 2923
        },
        "tire_defaults": {
            "front_compound": "continental_sc6", "rear_compound": "continental_sc6",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 275/40 R22 / R: 315/35 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 40, "rim": 22},
            "rear":  {"width": 315, "aspect": 35, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "路虎高性能 SUV，5.0L V8 機增 575PS，氣壓懸吊配可調阻尼",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mini_cooper_se": {
        "name": "MINI Cooper SE",
        "name_zh": "MINI Cooper SE",
        "category": "electric",
        "years": "2020-2024",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 25,
            "front_arb": 90, "rear_arb": 60,
            "front_track": 1500, "rear_track": 1520,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 56.0, "total_weight": 1365,
            "cg_height": 430, "wheelbase": 2495
        },
        "tire_defaults": {
            "front_compound": "bridgestone_ep500", "rear_compound": "bridgestone_ep500",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.15
        },
        "oem_tire": "Bridgestone Ecopia EP500",
        "oem_tire_size": "F: 195/55 R16 / R: 195/55 R16",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 16},
            "rear":  {"width": 195, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "MINI 純電版本，32.6kWh 電池，靈活操控保留 MINI 卡丁車感",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mini_countryman_jcw": {
        "name": "MINI Countryman JCW",
        "name_zh": "MINI Countryman JCW",
        "category": "suv",
        "years": "2019-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 30,
            "front_arb": 100, "rear_arb": 70,
            "front_track": 1550, "rear_track": 1560,
            "front_motion_ratio": 0.86, "rear_motion_ratio": 0.83,
            "weight_front_pct": 58.0, "total_weight": 1585,
            "cg_height": 520, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.12
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 225/45 R19 / R: 225/45 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 19},
            "rear":  {"width": 225, "aspect": 45, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "MINI Countryman 最強版本，2.0T 306PS，ALL4 四驅系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bentley_continental_gt_speed": {
        "name": "Bentley Continental GT Speed",
        "name_zh": "賓利 Continental GT Speed",
        "category": "gt_car",
        "years": "2021-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 50,
            "front_arb": 180, "rear_arb": 150,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.80,
            "weight_front_pct": 55.0, "total_weight": 2273,
            "cg_height": 490, "wheelbase": 2851
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.7, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/35 R22 / R: 315/30 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 35, "rim": 22},
            "rear":  {"width": 315, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "賓利頂級 GT 跑車，W12 雙渦輪 659PS，48V 主動防傾桿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bentley_bentayga_speed": {
        "name": "Bentley Bentayga Speed",
        "name_zh": "賓利 Bentayga Speed",
        "category": "suv",
        "years": "2020-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 42,
            "front_arb": 170, "rear_arb": 130,
            "front_track": 1680, "rear_track": 1690,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.5, "total_weight": 2510,
            "cg_height": 620, "wheelbase": 2995
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.7,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 285/35 R22 / R: 285/35 R22",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 35, "rim": 22},
            "rear":  {"width": 285, "aspect": 35, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "賓利最快 SUV，W12 雙渦輪 635PS，48V 主動防傾桿，氣壓懸吊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "rolls_royce_spectre": {
        "name": "Rolls-Royce Spectre",
        "name_zh": "勞斯萊斯 Spectre",
        "category": "electric",
        "years": "2023-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 35,
            "front_arb": 160, "rear_arb": 130,
            "front_track": 1680, "rear_track": 1700,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.76,
            "weight_front_pct": 51.0, "total_weight": 2975,
            "cg_height": 490, "wheelbase": 3210
        },
        "tire_defaults": {
            "front_compound": "continental_sc6", "rear_compound": "continental_sc6",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 255/45 R23 / R: 275/40 R23",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 23},
            "rear":  {"width": 275, "aspect": 40, "rim": 23}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "勞斯萊斯首款純電車，120kWh 電池，魔毯般的行駛質感",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_artura": {
        "name": "McLaren Artura",
        "name_zh": "麥拉倫 Artura",
        "category": "sports_car",
        "years": "2022-2025",
        "layout": "MR",
        "params": {
            "front_spring_rate": 75, "rear_spring_rate": 95,
            "front_arb": 160, "rear_arb": 200,
            "front_track": 1648, "rear_track": 1608,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.88,
            "weight_front_pct": 42.0, "total_weight": 1498,
            "cg_height": 410, "wheelbase": 2640
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 225/35 R19 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "麥拉倫油電超跑，V6 雙渦輪加電動馬達 680PS，碳纖維單體殼底盤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mclaren_elva": {
        "name": "McLaren Elva",
        "name_zh": "麥拉倫 Elva",
        "category": "sports_car",
        "years": "2021-2022",
        "layout": "MR",
        "params": {
            "front_spring_rate": 90, "rear_spring_rate": 110,
            "front_arb": 180, "rear_arb": 220,
            "front_track": 1660, "rear_track": 1620,
            "front_motion_ratio": 0.93, "rear_motion_ratio": 0.90,
            "weight_front_pct": 41.0, "total_weight": 1148,
            "cg_height": 380, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_trofeo_r", "rear_compound": "pirelli_trofeo_r",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Trofeo R",
        "oem_tire_size": "F: 245/35 R19 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "麥拉倫敞篷極致跑車，無擋風玻璃設計，4.0L V8 雙渦輪 815PS",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_roma": {
        "name": "Ferrari Roma",
        "name_zh": "法拉利 Roma",
        "category": "gt_car",
        "years": "2020-2025",
        "layout": "FR",
        "params": {
            "front_spring_rate": 60, "rear_spring_rate": 65,
            "front_arb": 160, "rear_arb": 150,
            "front_track": 1652, "rear_track": 1620,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 49.0, "total_weight": 1570,
            "cg_height": 430, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 R20 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "法拉利前置引擎 GT 跑車，3.9L V8 雙渦輪 620PS，優雅義式設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_portofino_m": {
        "name": "Ferrari Portofino M",
        "name_zh": "法拉利 Portofino M",
        "category": "gt_car",
        "years": "2021-2024",
        "layout": "FR",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 55,
            "front_arb": 145, "rear_arb": 130,
            "front_track": 1640, "rear_track": 1608,
            "front_motion_ratio": 0.86, "rear_motion_ratio": 0.83,
            "weight_front_pct": 50.0, "total_weight": 1664,
            "cg_height": 440, "wheelbase": 2670
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.2, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 245/35 R20 / R: 285/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 285, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "法拉利敞篷 GT，3.9L V8 雙渦輪 620PS，硬頂敞篷設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ferrari_purosangue": {
        "name": "Ferrari Purosangue",
        "name_zh": "法拉利 Purosangue",
        "category": "suv",
        "years": "2023-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 50,
            "front_arb": 170, "rear_arb": 140,
            "front_track": 1694, "rear_track": 1678,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.82,
            "weight_front_pct": 49.0, "total_weight": 2033,
            "cg_height": 520, "wheelbase": 3018
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/35 R22 / R: 315/30 R23",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 22},
            "rear":  {"width": 315, "aspect": 30, "rim": 23}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (active)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "法拉利首款四門四座車型，6.5L V12 自然進氣 725PS，主動懸吊系統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_revuelto": {
        "name": "Lamborghini Revuelto",
        "name_zh": "藍寶堅尼 Revuelto",
        "category": "sports_car",
        "years": "2024-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 95, "rear_spring_rate": 115,
            "front_arb": 210, "rear_arb": 240,
            "front_track": 1686, "rear_track": 1660,
            "front_motion_ratio": 0.93, "rear_motion_ratio": 0.90,
            "weight_front_pct": 43.0, "total_weight": 1772,
            "cg_height": 415, "wheelbase": 2779
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Potenza Sport",
        "oem_tire_size": "F: 265/35 R20 / R: 345/30 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 20},
            "rear":  {"width": 345, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "藍寶堅尼旗艦油電超跑，V12 加三電動馬達 1015PS，碳纖維單體殼",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_huracan_sto": {
        "name": "Lamborghini Huracan STO",
        "name_zh": "藍寶堅尼 Huracan STO",
        "category": "sports_car",
        "years": "2021-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 200, "rear_arb": 230,
            "front_track": 1668, "rear_track": 1620,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.88,
            "weight_front_pct": 43.0, "total_weight": 1339,
            "cg_height": 400, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re71rs", "rear_compound": "bridgestone_re71rs",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Potenza Race",
        "oem_tire_size": "F: 245/30 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 30, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "藍寶堅尼賽道取向超跑，V10 自然進氣 640PS，後驅佈局，大量碳纖維空力套件",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lamborghini_huracan_tecnica": {
        "name": "Lamborghini Huracan Tecnica",
        "name_zh": "藍寶堅尼 Huracan Tecnica",
        "category": "sports_car",
        "years": "2022-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 85, "rear_spring_rate": 105,
            "front_arb": 180, "rear_arb": 210,
            "front_track": 1668, "rear_track": 1620,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.88,
            "weight_front_pct": 43.0, "total_weight": 1379,
            "cg_height": 410, "wheelbase": 2620
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 245/30 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 30, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "藍寶堅尼公路取向後驅超跑，V10 自然進氣 640PS，兼顧賽道與日常",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "confirmed",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "maserati_mc_stradale": {
        "name": "Maserati MC Stradale",
        "name_zh": "瑪莎拉蒂 MC Stradale",
        "category": "sports_car",
        "years": "2011-2015",
        "layout": "MR",
        "params": {
            "front_spring_rate": 70, "rear_spring_rate": 80,
            "front_arb": 160, "rear_arb": 180,
            "front_track": 1590, "rear_track": 1580,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 42.0, "total_weight": 1370,
            "cg_height": 420, "wheelbase": 2660
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Corsa",
        "oem_tire_size": "F: 245/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "瑪莎拉蒂中置引擎超跑公路版，4.7L V8 自然進氣 460PS，源自 MC12 血統",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "pagani_zonda_f": {
        "name": "Pagani Zonda F",
        "name_zh": "帕加尼 Zonda F",
        "category": "sports_car",
        "years": "2005-2006",
        "layout": "MR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 200, "rear_arb": 240,
            "front_track": 1640, "rear_track": 1620,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.92,
            "weight_front_pct": 42.0, "total_weight": 1230,
            "cg_height": 390, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport Cup",
        "oem_tire_size": "F: 255/35 R19 / R: 335/30 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 19},
            "rear":  {"width": 335, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "帕加尼經典中置超跑，AMG V12 自然進氣 602PS，全碳纖維車身",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alfa_romeo_tonale": {
        "name": "Alfa Romeo Tonale",
        "name_zh": "愛快羅密歐 Tonale",
        "category": "suv",
        "years": "2022-2025",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 100, "rear_arb": 70,
            "front_track": 1580, "rear_track": 1570,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.82,
            "weight_front_pct": 59.0, "total_weight": 1566,
            "cg_height": 540, "wheelbase": 2636
        },
        "tire_defaults": {
            "front_compound": "pirelli_cinturato", "rear_compound": "pirelli_cinturato",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli Cinturato P7",
        "oem_tire_size": "F: 225/55 R18 / R: 225/55 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 18},
            "rear":  {"width": 225, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "愛快羅密歐緊湊型 SUV，1.5T 輕混動力，義式運動風格",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "fiat_124_spider": {
        "name": "Fiat 124 Spider Abarth",
        "name_zh": "飛雅特 124 Spider Abarth",
        "category": "sports_car",
        "years": "2016-2020",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 22,
            "front_arb": 80, "rear_arb": 50,
            "front_track": 1510, "rear_track": 1520,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.88,
            "weight_front_pct": 52.5, "total_weight": 1120,
            "cg_height": 420, "wheelbase": 2310
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re050a", "rear_compound": "bridgestone_re050a",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.05
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "飛雅特與馬自達 MX-5 共同開發，1.4T 渦輪 170PS，Bilstein 減震器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "peugeot_e208_gt": {
        "name": "Peugeot e-208 GT",
        "name_zh": "寶獅 e-208 GT",
        "category": "electric",
        "years": "2020-2025",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 22,
            "front_arb": 75, "rear_arb": 45,
            "front_track": 1500, "rear_track": 1490,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 58.0, "total_weight": 1455,
            "cg_height": 460, "wheelbase": 2540
        },
        "tire_defaults": {
            "front_compound": "michelin_e_primacy", "rear_compound": "michelin_e_primacy",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin e-Primacy",
        "oem_tire_size": "F: 205/45 R17 / R: 205/45 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 205, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "寶獅純電小型車，50kWh 電池 156PS，低重心電池佈局",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "peugeot_sport_508": {
        "name": "Peugeot 508 Sport Engineered",
        "name_zh": "寶獅 508 Sport Engineered",
        "category": "sedan",
        "years": "2021-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 33,
            "front_arb": 110, "rear_arb": 80,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.82,
            "weight_front_pct": 56.0, "total_weight": 1860,
            "cg_height": 470, "wheelbase": 2793
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 S",
        "oem_tire_size": "F: 245/40 R20 / R: 245/40 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 20},
            "rear":  {"width": 245, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "寶獅最強性能房車，1.6T 油電混合 360PS，四驅系統，低重心設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "renault_megane_e_tech": {
        "name": "Renault Megane E-Tech",
        "name_zh": "雷諾 Megane E-Tech",
        "category": "electric",
        "years": "2022-2025",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 25,
            "front_arb": 85, "rear_arb": 55,
            "front_track": 1560, "rear_track": 1550,
            "front_motion_ratio": 0.87, "rear_motion_ratio": 0.84,
            "weight_front_pct": 57.0, "total_weight": 1624,
            "cg_height": 470, "wheelbase": 2685
        },
        "tire_defaults": {
            "front_compound": "michelin_e_primacy", "rear_compound": "michelin_e_primacy",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.12
        },
        "oem_tire": "Michelin e-Primacy",
        "oem_tire_size": "F: 215/45 R20 / R: 215/45 R20",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 20},
            "rear":  {"width": 215, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "雷諾純電動掀背車，60kWh 電池 220PS，CMF-EV 平台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "renault_zoe": {
        "name": "Renault Zoe",
        "name_zh": "雷諾 Zoe",
        "category": "electric",
        "years": "2019-2024",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 20,
            "front_arb": 70, "rear_arb": 40,
            "front_track": 1500, "rear_track": 1490,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 58.0, "total_weight": 1502,
            "cg_height": 460, "wheelbase": 2588
        },
        "tire_defaults": {
            "front_compound": "michelin_e_primacy", "rear_compound": "michelin_e_primacy",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin e-Primacy",
        "oem_tire_size": "F: 195/55 R16 / R: 195/55 R16",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 55, "rim": 16},
            "rear":  {"width": 195, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "雷諾平價純電小車，52kWh 電池 135PS，歐洲電動車銷量冠軍",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "citroen_c4_vts": {
        "name": "Citroen C4 VTS",
        "name_zh": "雪鐵龍 C4 VTS",
        "category": "hatchback",
        "years": "2004-2010",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 22,
            "front_arb": 85, "rear_arb": 50,
            "front_track": 1500, "rear_track": 1490,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 62.0, "total_weight": 1290,
            "cg_height": 490, "wheelbase": 2608
        },
        "tire_defaults": {
            "front_compound": "michelin_ps3", "rear_compound": "michelin_ps3",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport 3",
        "oem_tire_size": "F: 225/40 R18 / R: 225/40 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 18},
            "rear":  {"width": 225, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "雪鐵龍運動版掀背車，2.0L 自然進氣 180PS，法式鋼砲",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "skoda_octavia_rs": {
        "name": "Skoda Octavia RS",
        "name_zh": "斯柯達 Octavia RS",
        "category": "sedan",
        "years": "2020-2025",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 95, "rear_arb": 65,
            "front_track": 1545, "rear_track": 1530,
            "front_motion_ratio": 0.87, "rear_motion_ratio": 0.84,
            "weight_front_pct": 60.0, "total_weight": 1430,
            "cg_height": 470, "wheelbase": 2686
        },
        "tire_defaults": {
            "front_compound": "bridgestone_s007", "rear_compound": "bridgestone_s007",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.12
        },
        "oem_tire": "Bridgestone Potenza S007",
        "oem_tire_size": "F: 225/40 R19 / R: 225/40 R19",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 40, "rim": 19},
            "rear":  {"width": 225, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "斯柯達性能房車，2.0T 245PS，MQB 平台，DCC 自適應減震",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "skoda_kodiaq_rs": {
        "name": "Skoda Kodiaq RS",
        "name_zh": "斯柯達 Kodiaq RS",
        "category": "suv",
        "years": "2019-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 33, "rear_spring_rate": 30,
            "front_arb": 120, "rear_arb": 85,
            "front_track": 1590, "rear_track": 1580,
            "front_motion_ratio": 0.84, "rear_motion_ratio": 0.81,
            "weight_front_pct": 57.0, "total_weight": 1810,
            "cg_height": 560, "wheelbase": 2791
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 235/45 R20 / R: 235/45 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 20},
            "rear":  {"width": 235, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "斯柯達性能 SUV，2.0T 245PS，紐柏林最速七座 SUV 紀錄保持者",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "seat_cupra_formentor": {
        "name": "Cupra Formentor VZ5",
        "name_zh": "Cupra Formentor VZ5",
        "category": "suv",
        "years": "2021-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 95,
            "front_track": 1570, "rear_track": 1560,
            "front_motion_ratio": 0.86, "rear_motion_ratio": 0.83,
            "weight_front_pct": 57.5, "total_weight": 1650,
            "cg_height": 530, "wheelbase": 2680
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re050a", "rear_compound": "bridgestone_re050a",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 245/35 R20 / R: 245/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 245, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Cupra 旗艦性能跨界 SUV，2.5T 五缸 390PS，源自奧迪 RS3 引擎",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "seat_cupra_born": {
        "name": "Cupra Born",
        "name_zh": "Cupra Born",
        "category": "electric",
        "years": "2021-2025",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 25,
            "front_arb": 85, "rear_arb": 55,
            "front_track": 1540, "rear_track": 1530,
            "front_motion_ratio": 0.87, "rear_motion_ratio": 0.84,
            "weight_front_pct": 55.0, "total_weight": 1785,
            "cg_height": 450, "wheelbase": 2766
        },
        "tire_defaults": {
            "front_compound": "bridgestone_turanza", "rear_compound": "bridgestone_turanza",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.12
        },
        "oem_tire": "Bridgestone Turanza Eco",
        "oem_tire_size": "F: 215/45 R20 / R: 215/45 R20",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 45, "rim": 20},
            "rear":  {"width": 215, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Cupra 純電性能掀背車，MEB 平台 231PS，DCC 自適應減震",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "volvo_xc60_polestar": {
        "name": "Volvo XC60 Polestar Engineered",
        "name_zh": "富豪 XC60 Polestar Engineered",
        "category": "suv",
        "years": "2020-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 35,
            "front_arb": 130, "rear_arb": 95,
            "front_track": 1620, "rear_track": 1630,
            "front_motion_ratio": 0.83, "rear_motion_ratio": 0.80,
            "weight_front_pct": 56.0, "total_weight": 2095,
            "cg_height": 560, "wheelbase": 2865
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/40 R21 / R: 255/40 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 21},
            "rear":  {"width": 255, "aspect": 40, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "富豪性能 SUV，2.0T 油電 421PS，Ohlins 可調減震器，金色剎車卡鉗",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "volvo_c40_recharge": {
        "name": "Volvo C40 Recharge",
        "name_zh": "富豪 C40 Recharge",
        "category": "electric",
        "years": "2022-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 30,
            "front_arb": 110, "rear_arb": 80,
            "front_track": 1590, "rear_track": 1600,
            "front_motion_ratio": 0.83, "rear_motion_ratio": 0.80,
            "weight_front_pct": 51.0, "total_weight": 2185,
            "cg_height": 490, "wheelbase": 2702
        },
        "tire_defaults": {
            "front_compound": "michelin_e_primacy", "rear_compound": "michelin_e_primacy",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin e-Primacy",
        "oem_tire_size": "F: 235/45 R20 / R: 235/45 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 20},
            "rear":  {"width": 235, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "富豪純電跨界 SUV，78kWh 電池雙馬達 408PS，CMA 平台",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "polestar_1": {
        "name": "Polestar 1",
        "name_zh": "極星 Polestar 1",
        "category": "gt_car",
        "years": "2019-2021",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 45,
            "front_arb": 150, "rear_arb": 120,
            "front_track": 1610, "rear_track": 1620,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.82,
            "weight_front_pct": 52.0, "total_weight": 2350,
            "cg_height": 450, "wheelbase": 2742
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.08
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/30 R21 / R: 275/30 R21",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 30, "rim": 21},
            "rear":  {"width": 275, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "極星油電混合 GT 跑車，2.0T 機增加渦輪加雙電動馬達 619PS，碳纖維車身",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "polestar_3": {
        "name": "Polestar 3",
        "name_zh": "極星 Polestar 3",
        "category": "electric",
        "years": "2024-2025",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 36,
            "front_arb": 135, "rear_arb": 100,
            "front_track": 1660, "rear_track": 1670,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.5, "total_weight": 2584,
            "cg_height": 510, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero_elect", "rear_compound": "pirelli_pzero_elect",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero Elect",
        "oem_tire_size": "F: 265/40 R22 / R: 265/40 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 40, "rim": 22},
            "rear":  {"width": 265, "aspect": 40, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "極星純電性能 SUV，111kWh 電池雙馬達 510PS，氣壓懸吊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "smart_brabus": {
        "name": "smart Brabus fortwo",
        "name_zh": "smart Brabus fortwo",
        "category": "hatchback",
        "years": "2016-2022",
        "layout": "RR",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 22,
            "front_arb": 50, "rear_arb": 40,
            "front_track": 1470, "rear_track": 1470,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.88,
            "weight_front_pct": 42.0, "total_weight": 1025,
            "cg_height": 460, "wheelbase": 1873
        },
        "tire_defaults": {
            "front_compound": "continental_sc5", "rear_compound": "continental_sc5",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental SportContact 5",
        "oem_tire_size": "F: 175/60 R15 / R: 205/55 R16",
        "oem_tire_specs": {
            "front": {"width": 175, "aspect": 60, "rim": 15},
            "rear":  {"width": 205, "aspect": 55, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: De Dion tube",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "smart 性能版，0.9L 三缸渦輪 109PS，後置後驅佈局，極短軸距",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dacia_sandero_stepway": {
        "name": "Dacia Sandero Stepway",
        "name_zh": "達契亞 Sandero Stepway",
        "category": "hatchback",
        "years": "2021-2025",
        "layout": "FF",
        "params": {
            "front_spring_rate": 22, "rear_spring_rate": 18,
            "front_arb": 65, "rear_arb": 35,
            "front_track": 1490, "rear_track": 1480,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.85,
            "weight_front_pct": 61.0, "total_weight": 1110,
            "cg_height": 510, "wheelbase": 2604
        },
        "tire_defaults": {
            "front_compound": "continental_eco6", "rear_compound": "continental_eco6",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.15
        },
        "oem_tire": "Continental EcoContact 6",
        "oem_tire_size": "F: 205/55 R17 / R: 205/55 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 55, "rim": 17},
            "rear":  {"width": 205, "aspect": 55, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "達契亞超值跨界小車，1.0T 三缸 90PS，歐洲最暢銷車款之一",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "wiesmann_mf5": {
        "name": "Wiesmann MF5",
        "name_zh": "威茲曼 MF5",
        "category": "sports_car",
        "years": "2009-2013",
        "layout": "FR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 60,
            "front_arb": 140, "rear_arb": 130,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.87,
            "weight_front_pct": 50.5, "total_weight": 1380,
            "cg_height": 420, "wheelbase": 2560
        },
        "tire_defaults": {
            "front_compound": "michelin_ps2", "rear_compound": "michelin_ps2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 2",
        "oem_tire_size": "F: 245/35 R19 / R: 285/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 285, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "德國手工跑車，BMW M5 V10 引擎 555PS，復古外觀配現代底盤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "donkervoort_d8_gto": {
        "name": "Donkervoort D8 GTO",
        "name_zh": "當克沃特 D8 GTO",
        "category": "sports_car",
        "years": "2013-2023",
        "layout": "FR",
        "params": {
            "front_spring_rate": 60, "rear_spring_rate": 70,
            "front_arb": 100, "rear_arb": 90,
            "front_track": 1510, "rear_track": 1530,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.92,
            "weight_front_pct": 47.0, "total_weight": 695,
            "cg_height": 370, "wheelbase": 2340
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -2.0, "rear_camber_deg": -1.8,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 205/40 R17 / R: 265/35 R18",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 17},
            "rear":  {"width": 265, "aspect": 35, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: De Dion tube",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "荷蘭手工輕量超跑，奧迪 2.5T 五缸 400PS，僅重 695kg，馬力重量比驚人",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "spyker_c8": {
        "name": "Spyker C8 Aileron",
        "name_zh": "世爵 C8 Aileron",
        "category": "sports_car",
        "years": "2008-2014",
        "layout": "MR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 65,
            "front_arb": 130, "rear_arb": 140,
            "front_track": 1580, "rear_track": 1560,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.87,
            "weight_front_pct": 44.0, "total_weight": 1400,
            "cg_height": 410, "wheelbase": 2580
        },
        "tire_defaults": {
            "front_compound": "michelin_ps2", "rear_compound": "michelin_ps2",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -1.5,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 2",
        "oem_tire_size": "F: 235/35 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 35, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "荷蘭手工超跑，奧迪 4.2L V8 400PS，航空風格內裝，限量生產",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alpina_b3": {
        "name": "ALPINA B3 (G20)",
        "name_zh": "ALPINA B3 (G20)",
        "category": "sedan",
        "years": "2020-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 38,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1575, "rear_track": 1585,
            "front_motion_ratio": 0.87, "rear_motion_ratio": 0.84,
            "weight_front_pct": 53.0, "total_weight": 1750,
            "cg_height": 460, "wheelbase": 2851
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/35 R20 / R: 255/35 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 255, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "ALPINA 高性能房車，基於 BMW 3 系列，3.0T 直六 462PS，獨家調校懸吊",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "confirmed",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "alpina_xb7": {
        "name": "ALPINA XB7",
        "name_zh": "ALPINA XB7",
        "category": "suv",
        "years": "2020-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 45,
            "front_arb": 165, "rear_arb": 125,
            "front_track": 1680, "rear_track": 1690,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.0, "total_weight": 2510,
            "cg_height": 610, "wheelbase": 3105
        },
        "tire_defaults": {
            "front_compound": "pirelli_pzero", "rear_compound": "pirelli_pzero",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.7,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 285/40 R23 / R: 325/35 R23",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 40, "rim": 23},
            "rear":  {"width": 325, "aspect": 35, "rim": 23}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "ALPINA 旗艦 SUV，基於 BMW X7，4.4T V8 621PS，主動防傾桿",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "brabus_rocket_900": {
        "name": "Brabus Rocket 900",
        "name_zh": "巴博斯 Rocket 900",
        "category": "sedan",
        "years": "2021-2024",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 50,
            "front_arb": 175, "rear_arb": 140,
            "front_track": 1660, "rear_track": 1670,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.80,
            "weight_front_pct": 54.0, "total_weight": 2280,
            "cg_height": 480, "wheelbase": 3106
        },
        "tire_defaults": {
            "front_compound": "continental_sc6", "rear_compound": "continental_sc6",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental SportContact 6",
        "oem_tire_size": "F: 265/35 R22 / R: 305/30 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 22},
            "rear":  {"width": 305, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Multi-link / R: Multi-link (air)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "巴博斯改裝極致房車，基於賓士 S 級，4.5L V8 雙渦輪 900PS",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ruf_ctr3": {
        "name": "RUF CTR3",
        "name_zh": "RUF CTR3",
        "category": "sports_car",
        "years": "2007-2015",
        "layout": "MR",
        "params": {
            "front_spring_rate": 80, "rear_spring_rate": 100,
            "front_arb": 170, "rear_arb": 200,
            "front_track": 1540, "rear_track": 1560,
            "front_motion_ratio": 0.92, "rear_motion_ratio": 0.88,
            "weight_front_pct": 40.0, "total_weight": 1375,
            "cg_height": 400, "wheelbase": 2560
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 2.00, "rear_optimal_pressure": 2.10
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 245/35 R19 / R: 315/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 19},
            "rear":  {"width": 315, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "RUF 中置引擎超跑，3.8L 水平對臥六缸雙渦輪 700PS，自主底盤設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ruf_scr": {
        "name": "RUF SCR",
        "name_zh": "RUF SCR",
        "category": "sports_car",
        "years": "2018-2023",
        "layout": "RR",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 75,
            "front_arb": 140, "rear_arb": 160,
            "front_track": 1520, "rear_track": 1550,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.87,
            "weight_front_pct": 38.5, "total_weight": 1350,
            "cg_height": 420, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.10, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -1.5, "rear_camber_deg": -2.0,
            "front_toe_deg": 0.00, "rear_toe_deg": 0.05
        },
        "oem_tire": "Michelin Pilot Sport 4 S",
        "oem_tire_size": "F: 245/35 R20 / R: 305/30 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 35, "rim": 20},
            "rear":  {"width": 305, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "RUF 自然進氣後驅跑車，4.0L 水平對臥六缸 510PS，碳纖維單體殼底盤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "zenvo_tsr_s": {
        "name": "Zenvo TSR-S",
        "name_zh": "真沃 TSR-S",
        "category": "sports_car",
        "years": "2018-2023",
        "layout": "MR",
        "params": {
            "front_spring_rate": 100, "rear_spring_rate": 120,
            "front_arb": 200, "rear_arb": 240,
            "front_track": 1680, "rear_track": 1660,
            "front_motion_ratio": 0.93, "rear_motion_ratio": 0.90,
            "weight_front_pct": 42.0, "total_weight": 1495,
            "cg_height": 395, "wheelbase": 2710
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 R",
        "oem_tire_size": "F: 265/30 R20 / R: 325/30 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 30, "rim": 20},
            "rear":  {"width": 325, "aspect": 30, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "丹麥超級跑車，5.8L V8 機增加渦輪 1177PS，獨特可傾斜式尾翼",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "dallara_stradale": {
        "name": "Dallara Stradale",
        "name_zh": "達拉拉 Stradale",
        "category": "sports_car",
        "years": "2018-2024",
        "layout": "MR",
        "params": {
            "front_spring_rate": 70, "rear_spring_rate": 85,
            "front_arb": 130, "rear_arb": 150,
            "front_track": 1570, "rear_track": 1560,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.92,
            "weight_front_pct": 42.0, "total_weight": 855,
            "cg_height": 370, "wheelbase": 2475
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2", "rear_compound": "michelin_cup2",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -2.5, "rear_camber_deg": -2.0,
            "front_toe_deg": -0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport Cup 2",
        "oem_tire_size": "F: 205/40 R18 / R: 255/35 R19",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 40, "rim": 18},
            "rear":  {"width": 255, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "達拉拉首款公路車，Ford 2.3T 400PS，僅重 855kg，可拆式車頂與擋風玻璃",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "radical_sr10": {
        "name": "Radical SR10",
        "name_zh": "瑞道 SR10",
        "category": "race_car",
        "years": "2020-2025",
        "layout": "MR",
        "params": {
            "front_spring_rate": 90, "rear_spring_rate": 110,
            "front_arb": 180, "rear_arb": 210,
            "front_track": 1580, "rear_track": 1560,
            "front_motion_ratio": 0.96, "rear_motion_ratio": 0.93,
            "weight_front_pct": 42.0, "total_weight": 795,
            "cg_height": 340, "wheelbase": 2560
        },
        "tire_defaults": {
            "front_compound": "avon_zzs", "rear_compound": "avon_zzs",
            "front_optimal_pressure": 1.70, "rear_optimal_pressure": 1.80
        },
        "geometry_defaults": {
            "front_camber_deg": -3.5, "rear_camber_deg": -3.0,
            "front_toe_deg": -0.08, "rear_toe_deg": 0.12
        },
        "oem_tire": "Avon ZZS",
        "oem_tire_size": "F: 225/540 R13 / R: 265/580 R13",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 540, "rim": 13},
            "rear":  {"width": 265, "aspect": 580, "rim": 13}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "英國賽道用車，Ford 2.3T EcoBoost 425PS，僅重 795kg，巨大地面效應下壓力",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mg_cyberster": {
        "name": "MG Cyberster",
        "name_zh": "MG Cyberster",
        "category": "sports_car",
        "years": "2024-present",
        "layout": "RR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 48.0, "total_weight": 1985,
            "cg_height": 430, "wheelbase": 2690
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -1.0,
            "front_toe_deg": 0, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental SportContact 7",
        "oem_tire_size": "F: 245/40 R20 / R: 275/35 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 20},
            "rear":  {"width": 275, "aspect": 35, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "MG 電動敞篷跑車，雙馬達四驅可選，復古設計現代底盤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mg_4_xpower": {
        "name": "MG4 XPOWER",
        "name_zh": "MG4 XPOWER",
        "category": "hatchback",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 35,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 50.0, "total_weight": 1836,
            "cg_height": 460, "wheelbase": 2705
        },
        "tire_defaults": {
            "front_compound": "continental_sc7", "rear_compound": "continental_sc7",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 7",
        "oem_tire_size": "F: 235/45 R18 / R: 235/45 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 45, "rim": 18},
            "rear":  {"width": 235, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "MG4 高性能雙馬達版，435匹馬力，電動鋼砲定位",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "byd_han_ev": {
        "name": "BYD Han EV",
        "name_zh": "比亞迪 漢 EV",
        "category": "sedan",
        "years": "2020-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 42,
            "front_arb": 95, "rear_arb": 75,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 49.0, "total_weight": 2170,
            "cg_height": 470, "wheelbase": 2920
        },
        "tire_defaults": {
            "front_compound": "continental_pc6", "rear_compound": "continental_pc6",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental PremiumContact 6",
        "oem_tire_size": "F: 245/45 R19 / R: 245/45 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 19},
            "rear":  {"width": 245, "aspect": 45, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "比亞迪旗艦電動轎車，刀片電池，風阻係數0.233",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "byd_atto3": {
        "name": "BYD Atto 3",
        "name_zh": "比亞迪 元 Plus",
        "category": "suv",
        "years": "2022-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 33,
            "front_arb": 80, "rear_arb": 60,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.0, "total_weight": 1750,
            "cg_height": 520, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "continental_uc6", "rear_compound": "continental_uc6",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental UltraContact UC6",
        "oem_tire_size": "F: 215/55 R18 / R: 215/55 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 55, "rim": 18},
            "rear":  {"width": 215, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "比亞迪小型電動 SUV，刀片電池，出口多國暢銷車型",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "byd_dolphin": {
        "name": "BYD Dolphin",
        "name_zh": "比亞迪 海豚",
        "category": "hatchback",
        "years": "2021-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 28,
            "front_arb": 70, "rear_arb": 55,
            "front_track": 1510, "rear_track": 1520,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 54.0, "total_weight": 1405,
            "cg_height": 480, "wheelbase": 2700
        },
        "tire_defaults": {
            "front_compound": "continental_cc7", "rear_compound": "continental_cc7",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental ComfortContact CC7",
        "oem_tire_size": "F: 195/60 R16 / R: 195/60 R16",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 60, "rim": 16},
            "rear":  {"width": 195, "aspect": 60, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "比亞迪入門電動掀背，e平台3.0，海洋系列熱銷車型",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nio_et7": {
        "name": "NIO ET7",
        "name_zh": "蔚來 ET7",
        "category": "sedan",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 45,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 49.5, "total_weight": 2379,
            "cg_height": 460, "wheelbase": 2960
        },
        "tire_defaults": {
            "front_compound": "continental_sc7", "rear_compound": "continental_sc7",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental SportContact 7",
        "oem_tire_size": "F: 245/40 R21 / R: 265/35 R21",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 21},
            "rear":  {"width": 265, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "蔚來旗艦電動轎車，空氣懸吊，150kWh電池可選，風阻0.208",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nio_ep9": {
        "name": "NIO EP9",
        "name_zh": "蔚來 EP9",
        "category": "race_car",
        "years": "2016-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 120, "rear_spring_rate": 140,
            "front_arb": 300, "rear_arb": 250,
            "front_track": 1710, "rear_track": 1700,
            "front_motion_ratio": 0.95, "rear_motion_ratio": 0.95,
            "weight_front_pct": 46.0, "total_weight": 1735,
            "cg_height": 320, "wheelbase": 2800
        },
        "tire_defaults": {
            "front_compound": "michelin_cup2r", "rear_compound": "michelin_cup2r",
            "front_optimal_pressure": 1.90, "rear_optimal_pressure": 2.00
        },
        "geometry_defaults": {
            "front_camber_deg": -3.0, "rear_camber_deg": -2.5,
            "front_toe_deg": -0.10, "rear_toe_deg": 0.15
        },
        "oem_tire": "Michelin Pilot Sport Cup 2 R",
        "oem_tire_size": "F: 285/650 R19 / R: 325/705 R20",
        "oem_tire_specs": {
            "front": {"width": 285, "aspect": 650, "rim": 19},
            "rear":  {"width": 325, "aspect": 705, "rim": 20}
        },
        "suspension_type": "F: Double wishbone (pushrod) / R: Double wishbone (pushrod)",
        "damper_adjustable": true,
        "arb_adjustable": true,
        "notes": "蔚來電動超跑，四馬達1360匹，紐柏林6分45秒紀錄，碳纖維車身",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "nio_es6": {
        "name": "NIO ES6",
        "name_zh": "蔚來 ES6",
        "category": "suv",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 42,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 2295,
            "cg_height": 530, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "continental_pc6", "rear_compound": "continental_pc6",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental PremiumContact 6",
        "oem_tire_size": "F: 255/45 R20 / R: 255/45 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 45, "rim": 20},
            "rear":  {"width": 255, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "蔚來中型電動 SUV，二代平台，換電體系，空氣懸吊標配",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "xpeng_p7": {
        "name": "XPeng P7",
        "name_zh": "小鵬 P7",
        "category": "sedan",
        "years": "2020-present",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 90, "rear_arb": 72,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 47.0, "total_weight": 1990,
            "cg_height": 455, "wheelbase": 2998
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 215/55 R18 / R: 215/55 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 55, "rim": 18},
            "rear":  {"width": 215, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "小鵬中大型電動轎車，風阻係數0.236，XPILOT智能輔助駕駛",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "xpeng_g9": {
        "name": "XPeng G9",
        "name_zh": "小鵬 G9",
        "category": "suv",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 45,
            "front_arb": 105, "rear_arb": 82,
            "front_track": 1660, "rear_track": 1670,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.5, "total_weight": 2355,
            "cg_height": 540, "wheelbase": 2998
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4_suv", "rear_compound": "michelin_ps4_suv",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 SUV",
        "oem_tire_size": "F: 265/45 R21 / R: 265/45 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 45, "rim": 21},
            "rear":  {"width": 265, "aspect": 45, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension optional)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "小鵬旗艦電動 SUV，800V架構，超快充，雙腔空氣懸吊可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "li_auto_l9": {
        "name": "Li Auto L9",
        "name_zh": "理想 L9",
        "category": "suv",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 48,
            "front_arb": 110, "rear_arb": 85,
            "front_track": 1680, "rear_track": 1690,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 51.0, "total_weight": 2560,
            "cg_height": 560, "wheelbase": 3105
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4_suv", "rear_compound": "michelin_ps4_suv",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 SUV",
        "oem_tire_size": "F: 265/45 R21 / R: 265/45 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 45, "rim": 21},
            "rear":  {"width": 265, "aspect": 45, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "理想旗艦增程式六座 SUV，空氣懸吊+CDC，家庭豪華定位",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "geely_zeekr_001": {
        "name": "Zeekr 001",
        "name_zh": "極氪 001",
        "category": "gt_car",
        "years": "2021-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 48,
            "front_arb": 115, "rear_arb": 90,
            "front_track": 1650, "rear_track": 1660,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 49.0, "total_weight": 2310,
            "cg_height": 490, "wheelbase": 3005
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 265/40 R22 / R: 265/40 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 40, "rim": 22},
            "rear":  {"width": 265, "aspect": 40, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "極氪獵裝轎跑，雙馬達544匹，空氣懸吊，浩瀚架構",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "geely_zeekr_009": {
        "name": "Zeekr 009",
        "name_zh": "極氪 009",
        "category": "suv",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 120, "rear_arb": 95,
            "front_track": 1700, "rear_track": 1710,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 51.0, "total_weight": 2850,
            "cg_height": 580, "wheelbase": 3205
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4_suv", "rear_compound": "michelin_ps4_suv",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.70
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4 SUV",
        "oem_tire_size": "F: 265/45 R22 / R: 265/45 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 45, "rim": 22},
            "rear":  {"width": 265, "aspect": 45, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "極氪純電豪華 MPV，雙馬達四驅，空氣懸吊，商務旗艦",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lynk_co_03_cyan": {
        "name": "Lynk & Co 03 Cyan",
        "name_zh": "領克 03 Cyan",
        "category": "sedan",
        "years": "2019-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 35,
            "front_arb": 120, "rear_arb": 85,
            "front_track": 1570, "rear_track": 1560,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.82,
            "weight_front_pct": 61.0, "total_weight": 1575,
            "cg_height": 450, "wheelbase": 2730
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 235/40 R18 / R: 235/40 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 18},
            "rear":  {"width": 235, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "領克高性能轎車，2.0T+愛信8AT，WTCR冠軍基因，Cyan賽車部門調校",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "changan_uni_v": {
        "name": "Changan UNI-V",
        "name_zh": "長安 UNI-V",
        "category": "sedan",
        "years": "2022-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 80, "rear_arb": 60,
            "front_track": 1550, "rear_track": 1560,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 60.0, "total_weight": 1455,
            "cg_height": 460, "wheelbase": 2750
        },
        "tire_defaults": {
            "front_compound": "continental_mc6", "rear_compound": "continental_mc6",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental MaxContact MC6",
        "oem_tire_size": "F: 225/45 R18 / R: 225/45 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 45, "rim": 18},
            "rear":  {"width": 225, "aspect": 45, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "長安運動轎跑，1.5T藍鯨動力，掀背造型，主打年輕市場",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "great_wall_tank_500": {
        "name": "Great Wall Tank 500",
        "name_zh": "長城 坦克 500",
        "category": "suv",
        "years": "2022-present",
        "layout": "4WD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 55,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1700, "rear_track": 1710,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 53.0, "total_weight": 2530,
            "cg_height": 620, "wheelbase": 2850
        },
        "tire_defaults": {
            "front_compound": "continental_lx_sport", "rear_compound": "continental_lx_sport",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental CrossContact LX Sport",
        "oem_tire_size": "F: 275/50 R20 / R: 275/50 R20",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 50, "rim": 20},
            "rear":  {"width": 275, "aspect": 50, "rim": 20}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "長城坦克中大型越野 SUV，3.0T V6混動，非承載式車身，硬派越野",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ora_cat_gt": {
        "name": "ORA Good Cat GT",
        "name_zh": "歐拉 好貓 GT",
        "category": "hatchback",
        "years": "2021-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 75, "rear_arb": 55,
            "front_track": 1530, "rear_track": 1540,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 55.0, "total_weight": 1555,
            "cg_height": 475, "wheelbase": 2650
        },
        "tire_defaults": {
            "front_compound": "continental_uc6", "rear_compound": "continental_uc6",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental UltraContact UC6",
        "oem_tire_size": "F: 215/50 R18 / R: 215/50 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 50, "rim": 18},
            "rear":  {"width": 215, "aspect": 50, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "歐拉電動掀背，復古造型，長城檸檬平台，女性市場定位",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hongqi_e_hs9": {
        "name": "Hongqi E-HS9",
        "name_zh": "紅旗 E-HS9",
        "category": "suv",
        "years": "2020-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 55,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1720, "rear_track": 1730,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 51.0, "total_weight": 2760,
            "cg_height": 580, "wheelbase": 3110
        },
        "tire_defaults": {
            "front_compound": "continental_pc6_suv", "rear_compound": "continental_pc6_suv",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.70
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental PremiumContact 6 SUV",
        "oem_tire_size": "F: 275/45 R22 / R: 275/45 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 45, "rim": 22},
            "rear":  {"width": 275, "aspect": 45, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "紅旗純電全尺寸 SUV，雙馬達551匹，空氣懸吊，官方旗艦",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "wuling_mini_ev": {
        "name": "Wuling Mini EV",
        "name_zh": "五菱 宏光 MINI EV",
        "category": "kei_car",
        "years": "2020-present",
        "layout": "RR",
        "params": {
            "front_spring_rate": 15, "rear_spring_rate": 18,
            "front_arb": 40, "rear_arb": 30,
            "front_track": 1270, "rear_track": 1260,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 42.0, "total_weight": 665,
            "cg_height": 450, "wheelbase": 1940
        },
        "tire_defaults": {
            "front_compound": "generic_comfort", "rear_compound": "generic_comfort",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Linglong Green-Max",
        "oem_tire_size": "F: 145/70 R12 / R: 145/70 R12",
        "oem_tire_specs": {
            "front": {"width": 145, "aspect": 70, "rim": 12},
            "rear":  {"width": 145, "aspect": 70, "rim": 12}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "五菱微型電動車，中國銷量冠軍，城市代步神車，後置後驅",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hsk_aion_v": {
        "name": "GAC Aion V Plus",
        "name_zh": "廣汽 埃安 V Plus",
        "category": "suv",
        "years": "2022-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 33,
            "front_arb": 85, "rear_arb": 65,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 56.0, "total_weight": 1780,
            "cg_height": 520, "wheelbase": 2740
        },
        "tire_defaults": {
            "front_compound": "michelin_primacy4", "rear_compound": "michelin_primacy4",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Primacy 4",
        "oem_tire_size": "F: 225/55 R18 / R: 225/55 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 18},
            "rear":  {"width": 225, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "廣汽埃安緊湊型電動 SUV，彈匣電池，超級快充可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "holden_commodore_ve_ss": {
        "name": "Holden Commodore VE SS",
        "name_zh": "霍頓 Commodore VE SS",
        "category": "sedan",
        "years": "2006-2013",
        "layout": "FR",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 30,
            "front_arb": 130, "rear_arb": 100,
            "front_track": 1570, "rear_track": 1590,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.70,
            "weight_front_pct": 53.0, "total_weight": 1748,
            "cg_height": 490, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re050a", "rear_compound": "bridgestone_re050a",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Potenza RE050A",
        "oem_tire_size": "F: 245/40 R19 / R: 245/40 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 19},
            "rear":  {"width": 245, "aspect": 40, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link (independent)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "霍頓經典澳洲肌肉車，6.0L LS2 V8，澳洲國民性能車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "holden_commodore_vf_ssv": {
        "name": "Holden Commodore VF SSV",
        "name_zh": "霍頓 Commodore VF SSV",
        "category": "sedan",
        "years": "2013-2017",
        "layout": "FR",
        "params": {
            "front_spring_rate": 34, "rear_spring_rate": 32,
            "front_arb": 135, "rear_arb": 105,
            "front_track": 1575, "rear_track": 1595,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.70,
            "weight_front_pct": 53.5, "total_weight": 1797,
            "cg_height": 485, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "continental_sc5p", "rear_compound": "continental_sc5p",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 5P",
        "oem_tire_size": "F: 245/40 R19 / R: 275/35 R19",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 19},
            "rear":  {"width": 275, "aspect": 35, "rim": 19}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link (independent)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "霍頓 VF 世代最後澳製 Commodore，6.2L LS3 V8，MRC磁流變避震",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hsv_gts_e3": {
        "name": "HSV GTS (E3)",
        "name_zh": "HSV GTS (E3)",
        "category": "sedan",
        "years": "2013-2017",
        "layout": "FR",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 38,
            "front_arb": 150, "rear_arb": 120,
            "front_track": 1585, "rear_track": 1605,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.72,
            "weight_front_pct": 54.0, "total_weight": 1876,
            "cg_height": 480, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "continental_sc5p", "rear_compound": "continental_sc5p",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 5P",
        "oem_tire_size": "F: 255/35 R20 / R: 275/30 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 275, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link (independent)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "HSV 旗艦性能車，6.2L LSA 機械增壓V8，585匹，澳洲性能之巔",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_falcon_xr6t": {
        "name": "Ford Falcon FG XR6 Turbo",
        "name_zh": "福特 Falcon FG XR6 Turbo",
        "category": "sedan",
        "years": "2008-2014",
        "layout": "FR",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 28,
            "front_arb": 120, "rear_arb": 90,
            "front_track": 1560, "rear_track": 1580,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.70,
            "weight_front_pct": 55.0, "total_weight": 1695,
            "cg_height": 485, "wheelbase": 2830
        },
        "tire_defaults": {
            "front_compound": "dunlop_sp_sport_maxx", "rear_compound": "dunlop_sp_sport_maxx",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Dunlop SP Sport Maxx",
        "oem_tire_size": "F: 245/40 R18 / R: 245/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 245, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (independent)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "福特澳洲 Falcon FG 渦輪直六，4.0L Barra I6T，270kW，漂移神器",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "ford_falcon_xr8": {
        "name": "Ford Falcon BA XR8",
        "name_zh": "福特 Falcon BA XR8",
        "category": "sedan",
        "years": "2002-2005",
        "layout": "FR",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 26,
            "front_arb": 115, "rear_arb": 85,
            "front_track": 1550, "rear_track": 1570,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.70,
            "weight_front_pct": 56.0, "total_weight": 1721,
            "cg_height": 495, "wheelbase": 2830
        },
        "tire_defaults": {
            "front_compound": "bridgestone_re050", "rear_compound": "bridgestone_re050",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.7,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Potenza RE050",
        "oem_tire_size": "F: 245/40 R18 / R: 245/40 R18",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 40, "rim": 18},
            "rear":  {"width": 245, "aspect": 40, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (independent)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "福特澳洲 BA Falcon V8，5.4L Boss 290 V8，經典澳洲後驅性能車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "toyota_hilux_gr_sport": {
        "name": "Toyota Hilux GR Sport",
        "name_zh": "豐田 Hilux GR Sport",
        "category": "suv",
        "years": "2022-present",
        "layout": "4WD",
        "params": {
            "front_spring_rate": 40, "rear_spring_rate": 50,
            "front_arb": 110, "rear_arb": 80,
            "front_track": 1535, "rear_track": 1550,
            "front_motion_ratio": 0.70, "rear_motion_ratio": 0.68,
            "weight_front_pct": 56.0, "total_weight": 2130,
            "cg_height": 650, "wheelbase": 3085
        },
        "tire_defaults": {
            "front_compound": "dunlop_at25", "rear_compound": "dunlop_at25",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": 0,
            "front_toe_deg": 0.05, "rear_toe_deg": 0
        },
        "oem_tire": "Dunlop Grandtrek AT25",
        "oem_tire_size": "F: 265/60 R18 / R: 265/60 R18",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 60, "rim": 18},
            "rear":  {"width": 265, "aspect": 60, "rim": 18}
        },
        "suspension_type": "F: Double wishbone / R: Leaf spring (live axle)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "豐田 Hilux GR Sport，2.8L柴油渦輪，Monotube避震，澳洲最暢銷皮卡",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "hsv_maloo_r8": {
        "name": "HSV Maloo R8",
        "name_zh": "HSV Maloo R8",
        "category": "sports_car",
        "years": "2007-2017",
        "layout": "FR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 30,
            "front_arb": 140, "rear_arb": 110,
            "front_track": 1570, "rear_track": 1590,
            "front_motion_ratio": 0.72, "rear_motion_ratio": 0.70,
            "weight_front_pct": 55.0, "total_weight": 1788,
            "cg_height": 510, "wheelbase": 2915
        },
        "tire_defaults": {
            "front_compound": "continental_sc5p", "rear_compound": "continental_sc5p",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 5P",
        "oem_tire_size": "F: 255/35 R20 / R: 275/30 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 35, "rim": 20},
            "rear":  {"width": 275, "aspect": 30, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link (independent)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "HSV 高性能 Ute，6.2L LS3 V8，世界最快量產皮卡之一",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mahindra_xuv700": {
        "name": "Mahindra XUV700",
        "name_zh": "馬恆達 XUV700",
        "category": "suv",
        "years": "2021-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 32, "rear_spring_rate": 35,
            "front_arb": 90, "rear_arb": 70,
            "front_track": 1590, "rear_track": 1600,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.75,
            "weight_front_pct": 57.0, "total_weight": 1755,
            "cg_height": 550, "wheelbase": 2750
        },
        "tire_defaults": {
            "front_compound": "bridgestone_alenza", "rear_compound": "bridgestone_alenza",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Alenza 001",
        "oem_tire_size": "F: 235/55 R18 / R: 235/55 R18",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 55, "rim": 18},
            "rear":  {"width": 235, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "馬恆達印度旗艦 SUV，2.0T汽油/2.2柴油，ADAS系統，印度年度車型",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tata_nexon_ev": {
        "name": "Tata Nexon EV Max",
        "name_zh": "塔塔 Nexon EV Max",
        "category": "suv",
        "years": "2022-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 28,
            "front_arb": 75, "rear_arb": 55,
            "front_track": 1510, "rear_track": 1520,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 56.0, "total_weight": 1620,
            "cg_height": 530, "wheelbase": 2498
        },
        "tire_defaults": {
            "front_compound": "goodyear_assurance", "rear_compound": "goodyear_assurance",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Goodyear Assurance",
        "oem_tire_size": "F: 215/60 R16 / R: 215/60 R16",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 60, "rim": 16},
            "rear":  {"width": 215, "aspect": 60, "rim": 16}
        },
        "suspension_type": "F: MacPherson strut / R: Twist beam (semi-independent)",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "塔塔小型電動 SUV，印度最暢銷電動車，Ziptron技術，五星安全",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "maruti_swift_sport": {
        "name": "Maruti Swift Sport",
        "name_zh": "鈴木 Swift Sport",
        "category": "hatchback",
        "years": "2018-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 25, "rear_spring_rate": 28,
            "front_arb": 80, "rear_arb": 55,
            "front_track": 1510, "rear_track": 1520,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.78,
            "weight_front_pct": 60.0, "total_weight": 970,
            "cg_height": 440, "wheelbase": 2450
        },
        "tire_defaults": {
            "front_compound": "continental_sc5", "rear_compound": "continental_sc5",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental SportContact 5",
        "oem_tire_size": "F: 195/45 R17 / R: 195/45 R17",
        "oem_tire_specs": {
            "front": {"width": 195, "aspect": 45, "rim": 17},
            "rear":  {"width": 195, "aspect": 45, "rim": 17}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "鈴木 Swift 運動版，1.4T BoosterJet，輕量化掀背鋼砲，僅970公斤",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "proton_x50": {
        "name": "Proton X50",
        "name_zh": "寶騰 X50",
        "category": "suv",
        "years": "2020-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 28, "rear_spring_rate": 30,
            "front_arb": 80, "rear_arb": 60,
            "front_track": 1560, "rear_track": 1570,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 59.0, "total_weight": 1380,
            "cg_height": 510, "wheelbase": 2600
        },
        "tire_defaults": {
            "front_compound": "continental_uc6", "rear_compound": "continental_uc6",
            "front_optimal_pressure": 2.30, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental UltraContact UC6",
        "oem_tire_size": "F: 215/55 R18 / R: 215/55 R18",
        "oem_tire_specs": {
            "front": {"width": 215, "aspect": 55, "rim": 18},
            "rear":  {"width": 215, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "寶騰小型 SUV，基於吉利繽越，1.5T+7DCT，馬來西亞熱銷車型",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "proton_saga": {
        "name": "Proton Saga",
        "name_zh": "寶騰 Saga",
        "category": "sedan",
        "years": "2016-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 20, "rear_spring_rate": 22,
            "front_arb": 60, "rear_arb": 40,
            "front_track": 1470, "rear_track": 1480,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 60.0, "total_weight": 1065,
            "cg_height": 470, "wheelbase": 2465
        },
        "tire_defaults": {
            "front_compound": "generic_comfort", "rear_compound": "generic_comfort",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Continental ComfortContact CC6",
        "oem_tire_size": "F: 185/55 R15 / R: 185/55 R15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 15},
            "rear":  {"width": 185, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "寶騰入門國民車，1.3L自然進氣，馬來西亞國民轎車代表",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "perodua_myvi": {
        "name": "Perodua Myvi",
        "name_zh": "第二國產車 Myvi",
        "category": "hatchback",
        "years": "2017-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 18, "rear_spring_rate": 20,
            "front_arb": 55, "rear_arb": 35,
            "front_track": 1460, "rear_track": 1470,
            "front_motion_ratio": 0.75, "rear_motion_ratio": 0.75,
            "weight_front_pct": 60.0, "total_weight": 1015,
            "cg_height": 470, "wheelbase": 2500
        },
        "tire_defaults": {
            "front_compound": "generic_comfort", "rear_compound": "generic_comfort",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.20
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.2,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.05
        },
        "oem_tire": "Toyo Proxes CR1",
        "oem_tire_size": "F: 185/55 R15 / R: 185/55 R15",
        "oem_tire_specs": {
            "front": {"width": 185, "aspect": 55, "rim": 15},
            "rear":  {"width": 185, "aspect": 55, "rim": 15}
        },
        "suspension_type": "F: MacPherson strut / R: Torsion beam",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "第二國產車 Myvi，基於大發 DNGA 平台，馬來西亞銷量冠軍掀背車",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vinfast_vf8": {
        "name": "VinFast VF 8",
        "name_zh": "VinFast VF 8",
        "category": "suv",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 42,
            "front_arb": 100, "rear_arb": 80,
            "front_track": 1630, "rear_track": 1640,
            "front_motion_ratio": 0.80, "rear_motion_ratio": 0.80,
            "weight_front_pct": 50.0, "total_weight": 2215,
            "cg_height": 530, "wheelbase": 2900
        },
        "tire_defaults": {
            "front_compound": "hankook_ventus_s1", "rear_compound": "hankook_ventus_s1",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Hankook Ventus S1 evo3",
        "oem_tire_size": "F: 245/45 R20 / R: 245/45 R20",
        "oem_tire_specs": {
            "front": {"width": 245, "aspect": 45, "rim": 20},
            "rear":  {"width": 245, "aspect": 45, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "VinFast 越南電動中型 SUV，雙馬達四驅，賓尼法利納設計",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "vinfast_vf9": {
        "name": "VinFast VF 9",
        "name_zh": "VinFast VF 9",
        "category": "suv",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 45, "rear_spring_rate": 50,
            "front_arb": 120, "rear_arb": 95,
            "front_track": 1710, "rear_track": 1720,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 51.0, "total_weight": 2755,
            "cg_height": 570, "wheelbase": 3150
        },
        "tire_defaults": {
            "front_compound": "hankook_ventus_s1", "rear_compound": "hankook_ventus_s1",
            "front_optimal_pressure": 2.60, "rear_optimal_pressure": 2.70
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Hankook Ventus S1 evo3",
        "oem_tire_size": "F: 265/45 R21 / R: 265/45 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 45, "rim": 21},
            "rear":  {"width": 265, "aspect": 45, "rim": 21}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "VinFast 越南旗艦全尺寸電動 SUV，三排座，402匹雙馬達",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "tamo_racemo": {
        "name": "TAMO Racemo",
        "name_zh": "塔塔 TAMO Racemo",
        "category": "sports_car",
        "years": "2018-present",
        "layout": "MR",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 100, "rear_arb": 85,
            "front_track": 1520, "rear_track": 1530,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 43.0, "total_weight": 1250,
            "cg_height": 400, "wheelbase": 2350
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.20, "rear_optimal_pressure": 2.30
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 205/45 R17 / R: 235/40 R17",
        "oem_tire_specs": {
            "front": {"width": 205, "aspect": 45, "rim": 17},
            "rear":  {"width": 235, "aspect": 40, "rim": 17}
        },
        "suspension_type": "F: Double wishbone / R: Double wishbone",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "塔塔中置引擎概念跑車，1.2T Revotron，MOFlex模組化平台，印度超跑夢",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "cupra_tavascan": {
        "name": "Cupra Tavascan",
        "name_zh": "Cupra Tavascan",
        "category": "suv",
        "years": "2024-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 38, "rear_spring_rate": 42,
            "front_arb": 105, "rear_arb": 82,
            "front_track": 1600, "rear_track": 1610,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 49.0, "total_weight": 2159,
            "cg_height": 520, "wheelbase": 2766
        },
        "tire_defaults": {
            "front_compound": "bridgestone_alenza", "rear_compound": "bridgestone_alenza",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Bridgestone Alenza 001",
        "oem_tire_size": "F: 255/40 R21 / R: 255/40 R21",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 40, "rim": 21},
            "rear":  {"width": 255, "aspect": 40, "rim": 21}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "Cupra 電動跑旅 SUV，MEB平台，340匹雙馬達，西班牙運動品牌",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_emeya": {
        "name": "Lotus Emeya",
        "name_zh": "蓮花 Emeya",
        "category": "gt_car",
        "years": "2024-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 55, "rear_spring_rate": 60,
            "front_arb": 150, "rear_arb": 120,
            "front_track": 1680, "rear_track": 1690,
            "front_motion_ratio": 0.90, "rear_motion_ratio": 0.90,
            "weight_front_pct": 48.0, "total_weight": 2485,
            "cg_height": 440, "wheelbase": 3069
        },
        "tire_defaults": {
            "front_compound": "pirelli_pz4", "rear_compound": "pirelli_pz4",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -1.0, "rear_camber_deg": -1.5,
            "front_toe_deg": 0, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 265/35 R22 / R: 305/30 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 22},
            "rear":  {"width": 305, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "蓮花電動GT轎跑，905匹雙馬達，空氣懸吊+CDC，2.78秒百公里加速",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "lotus_eletre": {
        "name": "Lotus Eletre",
        "name_zh": "蓮花 Eletre",
        "category": "suv",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 50, "rear_spring_rate": 55,
            "front_arb": 140, "rear_arb": 110,
            "front_track": 1700, "rear_track": 1710,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 49.0, "total_weight": 2620,
            "cg_height": 510, "wheelbase": 3019
        },
        "tire_defaults": {
            "front_compound": "pirelli_pz4", "rear_compound": "pirelli_pz4",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.0,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 275/40 R22 / R: 315/35 R22",
        "oem_tire_specs": {
            "front": {"width": 275, "aspect": 40, "rim": 22},
            "rear":  {"width": 315, "aspect": 35, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "蓮花首款電動 SUV，905匹R+版，主動空氣動力學，蓮花有史以來最快SUV",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mg_hs_phev": {
        "name": "MG HS PHEV",
        "name_zh": "MG HS 插電混動",
        "category": "suv",
        "years": "2021-present",
        "layout": "FF",
        "params": {
            "front_spring_rate": 30, "rear_spring_rate": 32,
            "front_arb": 85, "rear_arb": 65,
            "front_track": 1570, "rear_track": 1580,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 58.0, "total_weight": 1780,
            "cg_height": 530, "wheelbase": 2720
        },
        "tire_defaults": {
            "front_compound": "continental_uc6", "rear_compound": "continental_uc6",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.40
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Continental UltraContact UC6",
        "oem_tire_size": "F: 225/55 R18 / R: 225/55 R18",
        "oem_tire_specs": {
            "front": {"width": 225, "aspect": 55, "rim": 18},
            "rear":  {"width": 225, "aspect": 55, "rim": 18}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "MG HS 插電混動 SUV，1.5T+電機，純電續航52km，性價比高",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "smart_1_brabus": {
        "name": "smart #1 Brabus",
        "name_zh": "smart 精靈 #1 Brabus",
        "category": "suv",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 38,
            "front_arb": 95, "rear_arb": 75,
            "front_track": 1580, "rear_track": 1590,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 50.0, "total_weight": 1820,
            "cg_height": 500, "wheelbase": 2750
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4", "rear_compound": "michelin_ps4",
            "front_optimal_pressure": 2.40, "rear_optimal_pressure": 2.50
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4",
        "oem_tire_size": "F: 235/40 R20 / R: 235/40 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 40, "rim": 20},
            "rear":  {"width": 235, "aspect": 40, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "smart 精靈 Brabus 高性能版，雙馬達428匹，吉利SEA平台，3.7秒破百",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "bmw_ix_m60": {
        "name": "BMW iX M60",
        "name_zh": "BMW iX M60",
        "category": "suv",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 52,
            "front_arb": 140, "rear_arb": 110,
            "front_track": 1680, "rear_track": 1690,
            "front_motion_ratio": 0.85, "rear_motion_ratio": 0.85,
            "weight_front_pct": 49.0, "total_weight": 2620,
            "cg_height": 530, "wheelbase": 3000
        },
        "tire_defaults": {
            "front_compound": "pirelli_pz4", "rear_compound": "pirelli_pz4",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.5, "rear_camber_deg": -0.8,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 255/50 R21 / R: 275/45 R22",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 50, "rim": 21},
            "rear":  {"width": 275, "aspect": 45, "rim": 22}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "BMW 旗艦電動 SUV M性能版，619匹雙馬達，空氣懸吊，3.8秒百公里",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "mercedes_eqe_amg": {
        "name": "Mercedes-AMG EQE",
        "name_zh": "梅賽德斯 AMG EQE",
        "category": "sedan",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 52,
            "front_arb": 145, "rear_arb": 115,
            "front_track": 1670, "rear_track": 1680,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 49.5, "total_weight": 2525,
            "cg_height": 450, "wheelbase": 3120
        },
        "tire_defaults": {
            "front_compound": "michelin_ps4s", "rear_compound": "michelin_ps4s",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Michelin Pilot Sport 4S",
        "oem_tire_size": "F: 265/35 R22 / R: 295/30 R22",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 35, "rim": 22},
            "rear":  {"width": 295, "aspect": 30, "rim": 22}
        },
        "suspension_type": "F: Multi-link / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "AMG 電動性能轎車，687匹雙馬達，後軸轉向，空氣懸吊標配",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "audi_q8_etron": {
        "name": "Audi Q8 e-tron",
        "name_zh": "奧迪 Q8 e-tron",
        "category": "suv",
        "years": "2023-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 42, "rear_spring_rate": 48,
            "front_arb": 125, "rear_arb": 100,
            "front_track": 1660, "rear_track": 1670,
            "front_motion_ratio": 0.82, "rear_motion_ratio": 0.82,
            "weight_front_pct": 51.0, "total_weight": 2595,
            "cg_height": 540, "wheelbase": 2928
        },
        "tire_defaults": {
            "front_compound": "continental_sc7", "rear_compound": "continental_sc7",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.3, "rear_camber_deg": -0.5,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.10
        },
        "oem_tire": "Continental SportContact 7",
        "oem_tire_size": "F: 255/50 R20 / R: 255/50 R20",
        "oem_tire_specs": {
            "front": {"width": 255, "aspect": 50, "rim": 20},
            "rear":  {"width": 255, "aspect": 50, "rim": 20}
        },
        "suspension_type": "F: Multi-link / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "奧迪旗艦電動 SUV，三馬達 S 版503匹，空氣懸吊，quattro電動四驅",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "porsche_macan_ev": {
        "name": "Porsche Macan Electric",
        "name_zh": "保時捷 Macan 電動版",
        "category": "suv",
        "years": "2024-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 48, "rear_spring_rate": 52,
            "front_arb": 145, "rear_arb": 115,
            "front_track": 1660, "rear_track": 1650,
            "front_motion_ratio": 0.88, "rear_motion_ratio": 0.88,
            "weight_front_pct": 48.5, "total_weight": 2405,
            "cg_height": 490, "wheelbase": 2893
        },
        "tire_defaults": {
            "front_compound": "pirelli_pz4", "rear_compound": "pirelli_pz4",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.8, "rear_camber_deg": -1.2,
            "front_toe_deg": 0.03, "rear_toe_deg": 0.10
        },
        "oem_tire": "Pirelli P Zero",
        "oem_tire_size": "F: 265/40 R21 / R: 295/35 R21",
        "oem_tire_specs": {
            "front": {"width": 265, "aspect": 40, "rim": 21},
            "rear":  {"width": 295, "aspect": 35, "rim": 21}
        },
        "suspension_type": "F: Double wishbone / R: Multi-link (air suspension)",
        "damper_adjustable": true,
        "arb_adjustable": false,
        "notes": "保時捷全新電動 Macan，PPE平台，639匹 Turbo 版，後軸轉向，3.3秒破百",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
    "volkswagen_id_buzz": {
        "name": "Volkswagen ID. Buzz",
        "name_zh": "福斯 ID. Buzz",
        "category": "electric",
        "years": "2022-present",
        "layout": "AWD",
        "params": {
            "front_spring_rate": 35, "rear_spring_rate": 40,
            "front_arb": 95, "rear_arb": 75,
            "front_track": 1640, "rear_track": 1650,
            "front_motion_ratio": 0.78, "rear_motion_ratio": 0.78,
            "weight_front_pct": 49.0, "total_weight": 2560,
            "cg_height": 560, "wheelbase": 2988
        },
        "tire_defaults": {
            "front_compound": "bridgestone_turanza", "rear_compound": "bridgestone_turanza",
            "front_optimal_pressure": 2.50, "rear_optimal_pressure": 2.60
        },
        "geometry_defaults": {
            "front_camber_deg": -0.2, "rear_camber_deg": -0.3,
            "front_toe_deg": 0.05, "rear_toe_deg": 0.08
        },
        "oem_tire": "Bridgestone Turanza Eco",
        "oem_tire_size": "F: 235/55 R20 / R: 255/50 R20",
        "oem_tire_specs": {
            "front": {"width": 235, "aspect": 55, "rim": 20},
            "rear":  {"width": 255, "aspect": 50, "rim": 20}
        },
        "suspension_type": "F: MacPherson strut / R: Multi-link",
        "damper_adjustable": false,
        "arb_adjustable": false,
        "notes": "福斯電動復古 MPV，MEB平台，致敬經典 T1 廂型車，四驅339匹可選",
        "confidence": {
            "spring_rate": "estimated",
            "weight_dist": "estimated",
            "track_width": "estimated",
            "arb": "estimated",
            "cg_height": "estimated",
            "motion_ratio": "estimated"
        }
    },
};

// ============================================================
// GR Yaris 常見改裝彈簧率（供街車模式「改裝套件」快速切換）
// ============================================================
var GR_YARIS_AFTERMARKET = {
    "kw_v3": {"name": "KW V3 Inox", "front": 50, "rear": 50},
    "kw_clubsport": {"name": "KW Clubsport", "front": 50, "rear": 70},
    "ohlins_rt": {"name": "Ohlins Road & Track", "front": 80, "rear": 80},
    "hr_clubsport": {"name": "H&R Clubsport", "front": 90, "rear": 90},
    "tein_mono": {"name": "TEIN Mono Sport", "front": 60, "rear": 70},
    "bilstein_b16": {"name": "Bilstein B16 PSS10", "front": 60, "rear": 60},
    "cusco_sport": {"name": "CUSCO Sport X", "front": 98, "rear": 98},
    "hks_sp": {"name": "HKS Hipermax IV SP", "front": 118, "rear": 157}
};


/**
 * Get a car preset by ID.
 * @param {string} carId
 * @returns {object|null}
 */
function getPreset(carId) {
    return CAR_PRESETS[carId] || null;
}


/**
 * Return a list of all available presets (for dropdown).
 * @returns {Array<object>}
 */
function getAllPresetsSummary() {
    var result = [];
    var carIds = Object.keys(CAR_PRESETS);
    for (var i = 0; i < carIds.length; i++) {
        var carId = carIds[i];
        var data = CAR_PRESETS[carId];
        result.push({
            "id": carId,
            "name": data["name"],
            "name_zh": data["name_zh"],
            "category": data["category"],
            "years": data["years"],
            "layout": data["layout"],
            "weight": data["params"]["total_weight"],
            "weight_dist": data["params"]["weight_front_pct"] + "/" + (100 - data["params"]["weight_front_pct"]),
            "oem_tire": data["oem_tire"],
            "damper_adjustable": data["damper_adjustable"],
            "arb_adjustable": data["arb_adjustable"]
        });
    }
    return result;
}


/**
 * Return which fields a street car user can actually adjust.
 * Everything else is locked to the preset values.
 * @param {string} carId
 * @returns {object|null}
 */
function getStreetModeFields(carId) {
    var preset = CAR_PRESETS[carId];
    if (!preset) {
        return null;
    }

    // All street cars can adjust tire pressure
    var adjustable = ["tire_pressure"];

    if (preset["damper_adjustable"]) {
        adjustable.push("damper");
    }

    if (preset["arb_adjustable"]) {
        adjustable.push("arb");
    }

    // Tire compound is always selectable (user can change tires)
    adjustable.push("tire_compound");

    return {
        "car_id": carId,
        "car_name": preset["name_zh"],
        "adjustable_fields": adjustable,
        "locked_params": preset["params"],  // these are fixed for this car
        "tire_defaults": preset["tire_defaults"],
        "geometry_defaults": preset["geometry_defaults"],
        "notes": preset["notes"] || "",
        "confidence": preset["confidence"] || {}
    };
}
