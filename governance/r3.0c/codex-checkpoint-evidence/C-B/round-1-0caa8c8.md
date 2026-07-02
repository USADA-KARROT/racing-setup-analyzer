FINAL VERDICT: BLOCK

Finding C8-CB-RN-01: Renderer callers can mint arbitrary “authentic” case records
  file: renderer/index.html:3312
  attack vector: Any renderer/Alpine caller invokes `_r3cC7RegisterAuthenticCaseRecord(forgedRecord)` directly; the WeakSet then accepts the forged object.
  blast radius: The orchestrator authenticity gate is bypassed, compromising comparison eligibility and export authority.
  recommended fix: Move the WeakSet and registration function into a closure inaccessible from the Alpine component; expose only trusted `openCase` and demo-boundary operations.

Finding C8-CB-RN-02: Authentic records lose identity before reaching the WeakSet predicate
  file: renderer/js/r3-0c-comparison-viewmodel.js:267
  attack vector: `setAssociation` shallow-copies the authoritative `caseRecord`; WeakSet membership is identity-based, so the copy is always rejected.
  blast radius: Legitimate case-store and demo comparisons cannot pass authentication without exploiting the public registration API.
  recommended fix: Preserve the original frozen canonical record reference after validating it; never clone the object whose identity carries authority.

Finding C8-CB-RN-03: Case reopen preserves stale authority, framing, result, and export state
  file: renderer/index.html:3858
  attack vector: Open a valid case, obtain a ready comparison, then open another or an `imported_summary` case. `openCase` neither clears `_r3cC8LatestAuthorityRecord` nor calls `notifyCaseReopen`; degraded rejection also leaves prior authority intact.
  blast radius: Cross-case or imported-summary navigation can display and potentially export a previous case’s comparison state.
  recommended fix: At open initiation, clear latest authority and call `notifyCaseReopen`; keep authority null on failure/degraded records and only populate it after successful validation.

Finding C8-CB-RN-04: Concurrent opens can commit an older case after a newer navigation
  file: renderer/index.html:3858
  attack vector: Start two `openCase` requests; because no operation token binds the promise completion, a slower first request can overwrite the newer case and authority.
  blast radius: UI case identity, session association, and comparison authority can become cross-case inconsistent.
  recommended fix: Add a monotonically increasing open token and discard completions whose token is no longer current.

Finding C8-CB-RN-05: Degraded-case rejection accepts truthy non-boolean values
  file: renderer/index.html:3348
  attack vector: A record with `degraded: 1`, `"yes"`, or an accessor returning any value except literal `true` passes the helper; throwing accessors leave stale authority unchanged.
  blast radius: Malformed or hostile imported records can be elevated, or retain authority from a prior case.
  recommended fix: Require `o.degraded === false`, snapshot fields inside one guarded validation block, and clear authority before reading hostile input.

Finding C8-CB-RN-06: Activated comparison route exposes a non-functional workspace
  file: renderer/index.html:230
  attack vector: Navigate to any newly available comparison feature. Both selectors are empty and have no bindings; the export button has no click handler, and no production call invokes `setAssociation`, `setReference`, or `setComparison`.
  blast radius: All three activated feature IDs route to an inert pane and cannot perform their advertised operations.
  recommended fix: Wire authoritative case/session data into the viewmodel mutators, populate selectors, render metric values, and bind export through the guarded export service before activation.

Finding C8-CB-RN-07: Activation tests bypass the actual renderer authority implementation
  file: tests/r3-0c-activation.test.js:215
  attack vector: Tests construct a separate local WeakSet and manually add records instead of executing the helpers from `renderer/index.html`; therefore they miss public registration, identity cloning, degraded-value, stale-state, and open-race failures.
  blast radius: The reported 126 assertions provide false confidence in the central C8 activation boundary.
  recommended fix: Extract the renderer authority controller into a testable module and add end-to-end tests for direct minting attempts, real viewmodel identity flow, hostile accessors, degraded variants, reopen clearing, and out-of-order opens.

Finding C8-CB-RN-08: Required test-integrity exits were not achieved
  file: tests/r3.0c-contract-foundation.test.js:531
  attack vector: `npm test` exited 1 at `mkdtemp` with `EPERM`; all nine governance scripts likewise failed with `EPERM` while writing artifacts.
  blast radius: The mandatory full-suite and governance-script exit-zero evidence is absent.
  recommended fix: Rerun the exact commands in a writable CI/worktree environment and require recorded exit code 0 before merge.
