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
    }
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
