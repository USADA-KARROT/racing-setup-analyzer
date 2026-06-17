/**
 * bms-channel-link.js — .bmsbin channel-identity / timebase / scaling HYPOTHESES (Phase 3C-0)
 *
 * Consumes the catalog (bmsResult), the 3B-0 probe report, and the 3B-1 raw extraction, and
 * builds a CHECKABLE HYPOTHESIS layer relating raw series candidates to catalog channels, a
 * timebase, and a scaling guess — each tagged with confidence. It does NOT confirm identity,
 * NOT decode physical values, NOT do overlay / Kus / correlation.
 *
 * Red lines: hypotheses only; channel identity stays `not_mapped`-grade unless EXPLICIT
 * evidence (channel index / offset table / an explicit mapping passed via opts) exists; no
 * physical value conversion; capabilities timeSeries / physicalScaling / handlingCorrelation
 * stay false. `.bmsbin` is an adapter — output flows back to the canonical descriptor.
 * Clean-room: synthetic fixtures only; an explicit-mapping test proves representation, not
 * that the Bosch format is decoded.
 */

function linkBmsRawCandidates(bmsResult, probeReport, rawExtraction, opts = {}) {
  const D = (severity, code, messageKey, confidence) => ({ severity, code, messageKey, confidence: confidence || 'medium' });
  const report = {
    sourceType: 'bmsbin', stage: 'channel_linking_hypothesis', status: 'linking_hypotheses_only',
    inputs: { channelCatalogCount: 0, rawSeriesCandidateCount: 0, timebaseCandidatePresent: false },
    channelIdentityHypotheses: [], timebaseHypotheses: [], scalingHypotheses: [],
    canonicalPreview: { available: false, reason: 'channel identity and scaling are not confirmed' },
    capabilities: {
      channelCatalog: false, sampleProbe: false, rawTimeSeriesCandidates: false,
      channelLinkingHypotheses: false, timebaseHypotheses: false, scalingHypotheses: false,
      timeSeries: false, physicalScaling: false, handlingCorrelation: false,
    },
    diagnostics: [], unknowns: [],
  };

  const raws = (rawExtraction && rawExtraction.rawSeriesCandidates) || [];
  if (!rawExtraction || !raws.length) { report.diagnostics.push(D('error', 'BMS_LINK_NO_RAW_EXTRACTION', 'telemetry.link.error.noRaw')); return report; }
  report.capabilities.rawTimeSeriesCandidates = true;
  report.capabilities.sampleProbe = !!probeReport;
  report.inputs.rawSeriesCandidateCount = raws.length;

  const catalogChannels = (bmsResult && bmsResult.channels) || [];
  report.inputs.channelCatalogCount = catalogChannels.length;
  report.capabilities.channelCatalog = catalogChannels.length > 0;
  const canonMap = (typeof mapTelemetryChannels === 'function' && catalogChannels.length) ? mapTelemetryChannels(catalogChannels) : {};
  const canonNameForRaw = (rawName) => Object.keys(canonMap).find(k => canonMap[k] && canonMap[k].rawName === rawName) || null;

  if (!catalogChannels.length) report.diagnostics.push(D('warning', 'BMS_LINK_NO_CATALOG', 'telemetry.link.warning.noCatalog'));

  // explicit mapping (synthetic fixture / future manual-mapping UI / metadata):
  // { 'candidate_001': { rawChannelName, canonicalName, scale, offset, unit } }
  const explicit = opts.explicitMapping || null;
  const countMatch = catalogChannels.length > 0 && raws.length === catalogChannels.length;
  if (countMatch) report.diagnostics.push(D('info', 'BMS_LINK_CHANNEL_COUNT_MATCH_CANDIDATE', 'telemetry.link.info.countMatch', 'low'));

  raws.forEach((s, i) => {
    const ex = explicit && explicit[s.id];
    // ── channel identity hypothesis ──
    const idH = { rawSeriesId: s.id, possibleRawChannelName: null, possibleCanonicalName: null, confidence: 'low', evidence: [], warnings: ['no explicit metadata offset link found'] };
    if (ex) {
      idH.possibleRawChannelName = ex.rawChannelName || null;
      idH.possibleCanonicalName = ex.canonicalName || null;
      idH.confidence = 'high';
      idH.evidence = ['explicit mapping provided (synthetic / metadata)'];
      idH.warnings = [];
    } else if (countMatch && catalogChannels[i]) {
      idH.possibleRawChannelName = catalogChannels[i].name || null;
      idH.possibleCanonicalName = canonNameForRaw(catalogChannels[i].name);
      idH.confidence = 'low';
      idH.evidence = ['candidate series count matches catalog count', 'series order hypothesis only'];
    }
    report.channelIdentityHypotheses.push(idH);

    // ── scaling hypothesis (no value conversion) ──
    const scH = { rawSeriesId: s.id, possibleCanonicalName: idH.possibleCanonicalName, scale: null, offset: null, unit: null, confidence: 'low', method: 'manual_required', notes: ['physical scaling not decoded'] };
    if (ex && ex.scale != null) {
      scH.scale = ex.scale; scH.offset = ex.offset != null ? ex.offset : 0; scH.unit = ex.unit || null;
      scH.confidence = 'medium'; scH.method = 'metadata_candidate';
      scH.notes = ['scale from explicit mapping (synthetic / metadata); not validated against physics'];
    }
    report.scalingHypotheses.push(scH);
  });

  // ── timebase hypotheses (relate a counter candidate's sample count to each series) ──
  const tbCand = (rawExtraction && rawExtraction.timebaseCandidate && rawExtraction.timebaseCandidate.present)
    ? rawExtraction.timebaseCandidate
    : ((probeReport && (probeReport.timebaseClues || [])[0]) || null);
  report.inputs.timebaseCandidatePresent = !!tbCand;
  if (tbCand) {
    const tbCount = tbCand.sampleCount != null ? tbCand.sampleCount : (tbCand.runLength != null ? tbCand.runLength : null);
    raws.forEach(s => {
      const match = tbCount != null && Math.abs(s.sampleCount - tbCount) <= Math.max(2, s.sampleCount * 0.05);
      report.timebaseHypotheses.push({
        rawSeriesId: s.id, timebaseSource: 'counter_candidate', sampleCountMatch: match,
        medianDelta: tbCand.medianDelta != null ? tbCand.medianDelta : null,
        confidence: match ? 'medium' : 'low', notes: ['timebase relation is not confirmed'],
      });
    });
  }

  report.capabilities.channelLinkingHypotheses = report.channelIdentityHypotheses.length > 0;
  report.capabilities.timebaseHypotheses = report.timebaseHypotheses.length > 0;
  report.capabilities.scalingHypotheses = report.scalingHypotheses.length > 0;

  // canonical preview only when an explicit mapping confirms identity + scale (still not Bosch decoding)
  const confirmed = !!(explicit && Object.keys(explicit).some(id => explicit[id] && explicit[id].canonicalName && explicit[id].scale != null));
  if (confirmed) report.canonicalPreview = { available: true, reason: 'explicit mapping provides identity + scale (synthetic / metadata only — not Bosch-format decoding)' };

  // ── diagnostics ──
  report.diagnostics.push(D('info', 'BMS_LINK_RAW_SERIES_AVAILABLE', 'telemetry.link.info.rawAvailable', 'low'));
  if (report.timebaseHypotheses.length) report.diagnostics.push(D('info', 'BMS_LINK_TIMEBASE_HYPOTHESIS_AVAILABLE', 'telemetry.link.info.timebaseHyp', 'low'));
  if (report.scalingHypotheses.some(h => h.scale != null)) report.diagnostics.push(D('info', 'BMS_LINK_SCALING_HYPOTHESIS_AVAILABLE', 'telemetry.link.info.scalingHyp', 'low'));
  report.diagnostics.push(D('warning', 'BMS_LINK_HYPOTHESES_ONLY', 'telemetry.link.warning.hypothesesOnly'));
  if (!confirmed) report.diagnostics.push(D('warning', 'BMS_LINK_CHANNEL_IDENTITY_NOT_CONFIRMED', 'telemetry.link.warning.identityNotConfirmed'));
  report.diagnostics.push(D('warning', 'BMS_LINK_TIMEBASE_NOT_CONFIRMED', 'telemetry.link.warning.timebaseNotConfirmed'));
  report.diagnostics.push(D('warning', 'BMS_LINK_SCALING_NOT_CONFIRMED', 'telemetry.link.warning.scalingNotConfirmed'));
  if (!report.canonicalPreview.available) report.diagnostics.push(D('warning', 'BMS_LINK_CANONICAL_VALUES_NOT_AVAILABLE', 'telemetry.link.warning.canonicalNotAvailable'));
  report.unknowns = ['channel identity unconfirmed', 'timebase unconfirmed', 'physical scaling unconfirmed', 'canonical telemetry values not available'];
  return report;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { linkBmsRawCandidates };
}
