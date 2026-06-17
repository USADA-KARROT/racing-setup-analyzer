/**
 * telemetry-metadata.js — telemetry catalog descriptor + diagnostics (Phase 3A)
 *
 * Same spirit as tyre-metadata.js: describe, honestly, what an imported .bmsbin gives us
 * RIGHT NOW (a channel catalog) and what it does NOT (time-series samples, physical
 * scaling, units) — so the UI can say "I know the channels, I haven't decoded the data".
 *
 * Diagnostics are capability statements, not quality judgements:
 *   error   — not usable at all (not a Darab file / no channels)
 *   warning — catalog readable but not yet correlatable (no samples decoded; a required
 *             channel is missing)
 *   info    — an available capability (catalog present, validation channels, dampers…)
 *
 * Pure descriptor; consumes the output of parseBms (bms-parser.js) and the canonical
 * mapping (telemetry-schema.js). Does NOT decode samples — that is Phase 3B.
 */

/** Capability-oriented diagnostics for an imported .bmsbin catalog. */
function validateTelemetryCatalog(bmsResult) {
  const diags = [];
  const D = (severity, code, messageKey, affectedOutputs) =>
    ({ severity, code, messageKey, affectedOutputs: affectedOutputs || [] });

  // ── error: unusable ──
  if (!bmsResult || !bmsResult.header || !bmsResult.header.valid) {
    diags.push(D('error', 'TELEM_NOT_DARAB', 'telem.error.notDarab'));
    return diags;
  }
  const channels = bmsResult.channels || [];
  if (!channels.length || !bmsResult.channelCount) {
    diags.push(D('error', 'TELEM_NO_CHANNELS', 'telem.error.noChannels'));
    return diags;
  }

  const map = mapTelemetryChannels(channels);

  // ── warning: catalog readable, but not yet correlatable ──
  diags.push(D('warning', 'TELEM_TIMESERIES_NOT_DECODED', 'telem.warning.timeSeriesNotDecoded',
    ['timeSeries', 'physicalScaling', 'units']));
  if (!map.lateral_accel.present) diags.push(D('warning', 'TELEM_NO_LATERAL_ACCEL', 'telem.warning.noLateralAccel', ['handlingCorrelation']));
  if (!map.yaw_rate.present) diags.push(D('warning', 'TELEM_NO_YAW_RATE', 'telem.warning.noYawRate', ['handlingCorrelation']));
  if (!map.steering.present) diags.push(D('warning', 'TELEM_NO_STEERING', 'telem.warning.noSteering', ['handlingCorrelation']));
  if (!map.speed.present) diags.push(D('warning', 'TELEM_NO_SPEED', 'telem.warning.noSpeed', ['handlingCorrelation']));

  // ── info: available capabilities ──
  diags.push(D('info', 'TELEM_CATALOG_AVAILABLE', 'telem.info.catalogAvailable'));
  const coreAll = TELEMETRY_REQUIRED_FOR_CORRELATION.every(k => map[k] && map[k].present);
  if (coreAll) diags.push(D('info', 'TELEM_VALIDATION_CHANNELS_DETECTED', 'telem.info.validationChannelsDetected'));
  if (['damper_fl', 'damper_fr', 'damper_rl', 'damper_rr'].some(k => map[k].present)) diags.push(D('info', 'TELEM_DAMPERS_DETECTED', 'telem.info.dampersDetected'));
  if (['ride_height_front', 'ride_height_rear'].some(k => map[k].present)) diags.push(D('info', 'TELEM_RIDE_HEIGHT_DETECTED', 'telem.info.rideHeightDetected'));
  if (['wheel_speed_fl', 'wheel_speed_fr', 'wheel_speed_rl', 'wheel_speed_rr'].some(k => map[k].present)) diags.push(D('info', 'TELEM_WHEEL_SPEED_DETECTED', 'telem.info.wheelSpeedDetected'));
  if (coreAll) diags.push(D('info', 'TELEM_READY_FOR_3B', 'telem.info.readyFor3B'));
  return diags;
}

/**
 * Build the telemetry descriptor for an imported .bmsbin (catalog-only in Phase 3A).
 * @param {object} bmsResult output of parseBms (header, channelCount, channels, …)
 */
function buildTelemetryMetadata(bmsResult) {
  const diagnostics = validateTelemetryCatalog(bmsResult);
  const hasError = diagnostics.some(d => d.severity === 'error');
  const map = hasError ? {} : mapTelemetryChannels(bmsResult.channels || []);

  // canonical descriptors for every detected channel (numeric fields null until 3B)
  const channels = [];
  for (const canon of Object.keys(map)) {
    if (map[canon].present) channels.push(telemetryChannelDescriptor(canon, map[canon].rawName));
  }
  // the correlation-required channels, with matched raw names, for the status panel
  const requiredChannels = {};
  for (const k of TELEMETRY_REQUIRED_FOR_CORRELATION) {
    requiredChannels[k] = (map[k] && map[k].present) ? map[k] : { present: false, rawName: null };
  }

  // Optional Phase 3B-0 probe report (attached by the app at import time). Catalog-only
  // unless the probe found candidate sample regions → then a conservative 'probe_available'.
  const probe = (bmsResult && bmsResult.probe) || null;
  const probeRegions = (probe && probe.candidateRegions) ? probe.candidateRegions.length : 0;
  const sampleProbe = !hasError && probeRegions > 0;
  const RANK = { low: 0, medium: 1, high: 2 };
  const probeSummary = probe ? {
    regionCount: probeRegions,
    bestConfidence: (probe.candidateRegions || []).reduce((b, r) => (RANK[r.confidence] > RANK[b] ? r.confidence : b), 'low'),
    hasTimebaseClue: (probe.timebaseClues || []).length > 0,
    encodingCandidates: Object.keys(probe.candidateEncodings || {}).filter(k => probe.candidateEncodings[k] && probe.candidateEncodings[k].plausible),
    diagnostics: probe.diagnostics || [],
  } : null;

  // Optional Phase 3B-1 raw extraction report (attached by the app at import time).
  const raw = (bmsResult && bmsResult.raw) || null;
  const rawCount = (raw && raw.rawSeriesCandidates) ? raw.rawSeriesCandidates.length : 0;
  const rawCandidates = !hasError && rawCount > 0;
  const rawSummary = raw ? {
    seriesCount: rawCount,
    bestEncoding: (raw.rawSeriesCandidates && raw.rawSeriesCandidates[0]) ? raw.rawSeriesCandidates[0].encoding : null,
    channelMapping: raw.channelMapping ? raw.channelMapping.status : 'not_mapped',
    timebasePresent: !!(raw.timebaseCandidate && raw.timebaseCandidate.present),
    diagnostics: raw.diagnostics || [],
  } : null;

  return {
    sourceType: 'bmsbin',
    sourceFileName: (bmsResult && bmsResult.fileName) || null,
    parser: 'parseBms',
    status: hasError ? 'decode_error' : (rawCandidates ? 'raw_candidates_only' : (sampleProbe ? 'probe_available' : 'catalog_only')),
    importer: (bmsResult && bmsResult.header && bmsResult.header.importer) || null,
    channelCount: (bmsResult && bmsResult.channelCount) || 0,
    channels,
    requiredChannels,
    capabilities: {
      channelCatalog: !hasError,
      sampleProbe,                  // Phase 3B-0: candidate sample regions found
      rawTimeSeriesCandidates: rawCandidates, // Phase 3B-1: raw series extracted (not decoded)
      timeSeries: false,            // Phase 3B-1+ (not confirmed usable telemetry)
      physicalScaling: false,       // Phase 3C
      lapSegmentation: false,       // Phase 3C
      handlingCorrelation: false,   // Phase 3C
    },
    probe: probeSummary,
    rawExtraction: rawSummary,
    diagnostics,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildTelemetryMetadata, validateTelemetryCatalog };
}
