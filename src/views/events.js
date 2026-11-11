// Events — what's on, with RSVPs. Backed by Supabase from Phase 7 of the
// "make it real" run; empty state until then.

export const eventsHTML = `
  <div class="page">
    <div class="page-head">
      <div class="page-key">EVENTS</div>
      <h1 class="page-title">What's <span class="accent">on</span>.</h1>
    </div>
    <div class="page-wrap">
      <div class="empty-state">No events yet.</div>
    </div>
  </div>
`;

export function initEvents() {}
