// ---- Track Day Tire Database ----
// Converted from dynamics_model.py TRACKDAY_TIRES
// Each entry: {
//   name, name_zh, brand, category (race/semi_slick/sport),
//   treadwear, optimal_temp, temp_window, peak_grip,
//   optimal_pressure_front_bar, optimal_pressure_rear_bar,
//   available_widths, compound_type, notes
// }

const TRACKDAY_TIRES = {
    // === Semi-Slick / DOT Race (100-200TW) ===
    'michelin_cup2': {
        name: 'Michelin Pilot Sport Cup 2',
        name_zh: 'Michelin Cup 2',
        brand: 'Michelin',
        category: 'semi_slick',
        treadwear: 180,
        optimal_temp: 75, temp_window: 20, peak_grip: 1.12,
        optimal_pressure_front_bar: 2.07, optimal_pressure_rear_bar: 2.21,
        available_widths: [225, 235, 245, 255, 265, 275, 285, 295, 305, 315, 325, 345],
        compound_type: 'medium',
        notes: 'Porsche N-spec \u539f\u5ee0\u914d\u80ce\uff0c\u8cfd\u9053\u65e5\u9996\u9078',
    },
    'michelin_cup2r': {
        name: 'Michelin Pilot Sport Cup 2 R',
        name_zh: 'Michelin Cup 2 R',
        brand: 'Michelin',
        category: 'semi_slick',
        treadwear: 60,
        optimal_temp: 80, temp_window: 18, peak_grip: 1.18,
        optimal_pressure_front_bar: 1.93, optimal_pressure_rear_bar: 2.07,
        available_widths: [245, 255, 265, 275, 285, 295, 305, 315, 325],
        compound_type: 'soft',
        notes: '\u6bd4 Cup 2 \u66f4\u504f\u8cfd\u9053\u6027\u80fd\uff0c\u9700\u5145\u5206\u6696\u80ce',
    },
    'yokohama_a052': {
        name: 'Yokohama ADVAN A052',
        name_zh: 'Yokohama A052',
        brand: 'Yokohama',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 70, temp_window: 22, peak_grip: 1.14,
        optimal_pressure_front_bar: 2.07, optimal_pressure_rear_bar: 2.14,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295],
        compound_type: 'medium',
        notes: 'AD08R \u5f8c\u7e7c\uff0c\u53f0\u7063 GR Yaris \u71b1\u9580\u9078\u64c7',
    },
    'yokohama_ad08r': {
        name: 'Yokohama ADVAN Neova AD08R',
        name_zh: 'Yokohama AD08R',
        brand: 'Yokohama',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 65, temp_window: 25, peak_grip: 1.10,
        optimal_pressure_front_bar: 2.14, optimal_pressure_rear_bar: 2.21,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295],
        compound_type: 'medium',
        notes: '\u53f0\u7063\u6700\u53d7\u6b61\u8fce\u7684\u8cfd\u9053\u65e5\u7528\u80ce\u4e4b\u4e00\uff0c\u5de5\u4f5c\u6eab\u57df\u5bec\u5ee3',
    },
    'bridgestone_re71rs': {
        name: 'Bridgestone Potenza RE-71RS',
        name_zh: 'Bridgestone RE-71RS',
        brand: 'Bridgestone',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 70, temp_window: 22, peak_grip: 1.13,
        optimal_pressure_front_bar: 2.07, optimal_pressure_rear_bar: 2.14,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275],
        compound_type: 'medium',
        notes: 'RE-71R \u5f8c\u7e7c\uff0c\u6975\u5f37\u4e7e\u5730\u6293\u5730\u529b\uff0c\u53f0\u7063 Time Attack \u5e38\u5ba2',
    },
    'pirelli_trofeo_r': {
        name: 'Pirelli P Zero Trofeo R',
        name_zh: 'Pirelli Trofeo R',
        brand: 'Pirelli',
        category: 'semi_slick',
        treadwear: 60,
        optimal_temp: 80, temp_window: 16, peak_grip: 1.16,
        optimal_pressure_front_bar: 1.86, optimal_pressure_rear_bar: 2.00,
        available_widths: [225, 235, 245, 255, 265, 275, 285, 295, 305, 315, 325, 345],
        compound_type: 'soft',
        notes: '\u4fdd\u6642\u6377/\u6cd5\u62c9\u5229\u539f\u5ee0\u9078\u7528\uff0c\u9700\u6696\u5230\u5de5\u4f5c\u6eab\u5ea6',
    },
    'pirelli_trofeo_rs': {
        name: 'Pirelli P Zero Trofeo RS',
        name_zh: 'Pirelli Trofeo RS',
        brand: 'Pirelli',
        category: 'semi_slick',
        treadwear: 60,
        optimal_temp: 85, temp_window: 14, peak_grip: 1.20,
        optimal_pressure_front_bar: 1.83, optimal_pressure_rear_bar: 1.97,
        available_widths: [245, 255, 265, 275, 285, 295, 305, 315, 325],
        compound_type: 'soft',
        notes: 'Trofeo R \u5347\u7d1a\u7248\uff0c\u66f4\u504f\u8cfd\u9053\uff0c\u6696\u80ce\u9700\u6c42\u66f4\u9ad8',
    },
    'hankook_rs4': {
        name: 'Hankook Ventus RS4 (Z232)',
        name_zh: 'Hankook RS4',
        brand: 'Hankook',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 65, temp_window: 24, peak_grip: 1.08,
        optimal_pressure_front_bar: 2.14, optimal_pressure_rear_bar: 2.21,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295],
        compound_type: 'medium',
        notes: 'CP\u503c\u6975\u9ad8\u7684\u97d3\u570b\u534a\u71b1\u7194\u80ce',
    },
    'federal_rsrr': {
        name: 'Federal 595 RS-RR',
        name_zh: 'Federal RS-RR',
        brand: 'Federal',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 60, temp_window: 28, peak_grip: 1.05,
        optimal_pressure_front_bar: 2.21, optimal_pressure_rear_bar: 2.28,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275],
        compound_type: 'medium',
        notes: '\u53f0\u7063\u672c\u571f\u54c1\u724c\uff0c\u9ad8CP\u503c\u5165\u9580\u8cfd\u9053\u80ce',
    },
    'federal_rsr': {
        name: 'Federal 595 RS-R',
        name_zh: 'Federal RS-R',
        brand: 'Federal',
        category: 'sport',
        treadwear: 220,
        optimal_temp: 55, temp_window: 30, peak_grip: 1.02,
        optimal_pressure_front_bar: 2.28, optimal_pressure_rear_bar: 2.34,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275],
        compound_type: 'hard',
        notes: 'RS-RR \u4e4b\u4e0b\u7684\u5165\u9580\u9078\u64c7\uff0c\u8010\u4e45\u5ea6\u8f03\u4f73',
    },
    'nankang_ar1': {
        name: 'Nankang AR-1',
        name_zh: 'Nankang AR-1',
        brand: 'Nankang',
        category: 'semi_slick',
        treadwear: 80,
        optimal_temp: 75, temp_window: 18, peak_grip: 1.14,
        optimal_pressure_front_bar: 1.93, optimal_pressure_rear_bar: 2.07,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315],
        compound_type: 'soft',
        notes: '\u53f0\u7063\u54c1\u724c\uff0c\u8d85\u9ad8CP\u503c DOT Race \u80ce',
    },
    'nankang_ns2r': {
        name: 'Nankang NS-2R',
        name_zh: 'Nankang NS-2R',
        brand: 'Nankang',
        category: 'semi_slick',
        treadwear: 180,
        optimal_temp: 60, temp_window: 26, peak_grip: 1.06,
        optimal_pressure_front_bar: 2.21, optimal_pressure_rear_bar: 2.28,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295],
        compound_type: 'medium',
        notes: '\u53f0\u7063\u54c1\u724c\uff0c\u8857\u9053/\u8cfd\u9053\u517c\u7528',
    },
    'nankang_cr1': {
        name: 'Nankang CR-1',
        name_zh: 'Nankang CR-1',
        brand: 'Nankang',
        category: 'semi_slick',
        treadwear: 100,
        optimal_temp: 70, temp_window: 20, peak_grip: 1.10,
        optimal_pressure_front_bar: 2.00, optimal_pressure_rear_bar: 2.14,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295],
        compound_type: 'medium',
        notes: '\u53f0\u7063\u54c1\u724c\uff0cAR-1 \u8207 NS-2R \u4e4b\u9593\u7684\u9078\u64c7',
    },
    'toyo_r888r': {
        name: 'Toyo Proxes R888R',
        name_zh: 'Toyo R888R',
        brand: 'Toyo',
        category: 'semi_slick',
        treadwear: 100,
        optimal_temp: 75, temp_window: 18, peak_grip: 1.12,
        optimal_pressure_front_bar: 2.00, optimal_pressure_rear_bar: 2.07,
        available_widths: [185, 195, 205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315],
        compound_type: 'soft',
        notes: '\u7d93\u5178 DOT Race \u80ce\uff0c\u6b50\u7f8e Time Attack \u5e38\u7528',
    },
    'toyo_rr': {
        name: 'Toyo Proxes RR',
        name_zh: 'Toyo RR',
        brand: 'Toyo',
        category: 'semi_slick',
        treadwear: 100,
        optimal_temp: 80, temp_window: 16, peak_grip: 1.16,
        optimal_pressure_front_bar: 1.93, optimal_pressure_rear_bar: 2.00,
        available_widths: [205, 225, 245, 255, 275, 295, 315],
        compound_type: 'soft',
        notes: 'R888R \u4ee5\u4e0a\u7684\u7d14\u8cfd\u9053\u7248\u672c',
    },
    'continental_ecf': {
        name: 'Continental ExtremeContact Force',
        name_zh: 'Continental EC Force',
        brand: 'Continental',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 65, temp_window: 24, peak_grip: 1.11,
        optimal_pressure_front_bar: 2.07, optimal_pressure_rear_bar: 2.14,
        available_widths: [205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305],
        compound_type: 'medium',
        notes: 'BMW/AMG \u8eca\u4e3b\u71b1\u9580\u9078\u64c7',
    },
    'continental_sc7': {
        name: 'Continental SportContact 7',
        name_zh: 'Continental SC7',
        brand: 'Continental',
        category: 'sport',
        treadwear: 280,
        optimal_temp: 55, temp_window: 30, peak_grip: 1.03,
        optimal_pressure_front_bar: 2.34, optimal_pressure_rear_bar: 2.41,
        available_widths: [205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315, 325],
        compound_type: 'hard',
        notes: '\u8857\u9053/\u8cfd\u9053\u517c\u7528\uff0c\u65e5\u5e38\u5be6\u7528\u6027\u4f73',
    },
    'dunlop_ziii': {
        name: 'Dunlop Direzza ZIII',
        name_zh: 'Dunlop Direzza ZIII',
        brand: 'Dunlop',
        category: 'semi_slick',
        treadwear: 200,
        optimal_temp: 65, temp_window: 24, peak_grip: 1.09,
        optimal_pressure_front_bar: 2.14, optimal_pressure_rear_bar: 2.21,
        available_widths: [195, 205, 215, 225, 235, 245, 255, 265, 275],
        compound_type: 'medium',
        notes: 'ZII Star Spec \u5f8c\u7e7c\uff0c\u65e5\u7cfb\u534a\u71b1\u7194\u80ce',
    },
    // === High Performance Sport (280-400TW, for street/track dual use) ===
    'michelin_ps4s': {
        name: 'Michelin Pilot Sport 4S',
        name_zh: 'Michelin PS4S',
        brand: 'Michelin',
        category: 'sport',
        treadwear: 300,
        optimal_temp: 50, temp_window: 32, peak_grip: 1.00,
        optimal_pressure_front_bar: 2.41, optimal_pressure_rear_bar: 2.48,
        available_widths: [205, 215, 225, 235, 245, 255, 265, 275, 285, 295, 305, 315, 325, 345],
        compound_type: 'hard',
        notes: '\u9ad8\u6027\u80fd\u8857\u80ce\u6a19\u7aff\uff0c\u8cfd\u9053\u65e5\u5165\u9580\u63a8\u85a6',
    },
    // === Racing Slick (no treadwear, for reference) ===
    'slick_soft': {
        name: 'Racing Slick (Soft)',
        name_zh: '\u5149\u982d\u80ce (\u8edf)',
        brand: 'Generic',
        category: 'race',
        treadwear: 0,
        optimal_temp: 90, temp_window: 12, peak_grip: 1.30,
        optimal_pressure_front_bar: 1.52, optimal_pressure_rear_bar: 1.59,
        available_widths: [200, 225, 250, 270, 280, 300, 320, 340, 360],
        compound_type: 'soft',
        notes: '\u8cfd\u8eca\u7528\u5149\u982d\u80ce\uff08\u50c5\u4f9b\u53c3\u8003\uff09',
    },
    'slick_hard': {
        name: 'Racing Slick (Hard)',
        name_zh: '\u5149\u982d\u80ce (\u786c)',
        brand: 'Generic',
        category: 'race',
        treadwear: 0,
        optimal_temp: 100, temp_window: 18, peak_grip: 1.22,
        optimal_pressure_front_bar: 1.59, optimal_pressure_rear_bar: 1.66,
        available_widths: [200, 225, 250, 270, 280, 300, 320, 340, 360],
        compound_type: 'hard',
        notes: '\u8cfd\u8eca\u7528\u5149\u982d\u80ce\uff08\u50c5\u4f9b\u53c3\u8003\uff09',
    },
};

/**
 * Returns an array of all tire objects, each with its `id` field added from the dictionary key.
 * @returns {Array<Object>}
 */
function getAllTires() {
    return Object.keys(TRACKDAY_TIRES).map(function(key) {
        var tire = Object.assign({}, TRACKDAY_TIRES[key]);
        tire.id = key;
        return tire;
    });
}

/**
 * Returns a single tire object with its `id` field added, or null if not found.
 * @param {string} id - The tire key (e.g. 'michelin_cup2')
 * @returns {Object|null}
 */
function getTire(id) {
    if (!TRACKDAY_TIRES.hasOwnProperty(id)) {
        return null;
    }
    var tire = Object.assign({}, TRACKDAY_TIRES[id]);
    tire.id = id;
    return tire;
}
