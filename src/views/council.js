// Council — motions the class raises and votes on. Backed by Supabase from
// Phase 6 of the "make it real" run; until then it shows an honest empty state.

export const councilHTML = `
  <div class="page">
    <div class="page-head">
      <div class="page-key">THE COUNCIL · MSCI 1</div>
      <h1 class="page-title">What should we <span class="accent">actually do</span> about it?</h1>
      <p style="font-size:14px;color:var(--muted);margin:8px 0 0;max-width:640px">Anyone can raise a motion. The whole class votes. Whatever wins gets brought to the pedagogy team, and the answer comes back here.</p>
    </div>
    <div class="page-wrap">
      <div class="empty-state" id="council-empty">No motions yet.</div>
    </div>
  </div>
`;

export function initCouncil() {}
