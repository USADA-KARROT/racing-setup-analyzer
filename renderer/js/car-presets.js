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
