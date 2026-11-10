// Council — the live motion, voting bars, and past motions.
// Votes are kept in local state only (and move the animated bars); nothing
// persists across refresh yet.

import { state } from '../core/state.js';
import { toast } from '../core/toast.js';

export const councilHTML = `
  <div class="page">
    <div class="page-head">
      <div class="page-key">THE COUNCIL · MSCI 1</div>
      <h1 class="page-title">What should we <span class="accent">actually do</span> about it?</h1>
      <p style="font-size:14px;color:var(--muted);margin:8px 0 0;max-width:640px">Anyone can raise a motion. The whole class votes. Whatever wins, I bring it to the pedagogy team and tell you what they said — good or bad.</p>
    </div>

    <div class="page-wrap">
      <div class="council-grid">
        <div>
          <div class="motion">
            <div class="motion-top">
              <span class="pill pill-live">● ON THE TABLE</span>
              <span style="font-size:12px;color:var(--muted)">closes <span style="color:var(--fg)">Thu 20:00</span> · 1d 5h left</span>
            </div>
            <h2 class="motion-h">Move the Thursday defense slot — it clashes with the métro strike schedule.</h2>
            <div class="motion-meta">raised by <span class="accent">priya</span> · 2h ago · <span id="voters">18</span> of 28 voted</div>

            <div id="vote-rows">
              <div class="vote-row">
                <div class="vote-label yes">Yes</div>
                <div class="vote-track"><div class="vote-fill yes" id="fill-yes" style="width:72%"><span id="c-yes">13</span></div></div>
                <div class="vote-pct" id="pct-yes">72%</div>
              </div>
              <div class="vote-row">
                <div class="vote-label no">No</div>
                <div class="vote-track"><div class="vote-fill no" id="fill-no" style="width:17%"><span id="c-no">3</span></div></div>
                <div class="vote-pct" id="pct-no">17%</div>
              </div>
              <div class="vote-row">
                <div class="vote-label meh">Meh</div>
                <div class="vote-track"><div class="vote-fill meh" id="fill-meh" style="width:11%"><span id="c-meh">2</span></div></div>
                <div class="vote-pct" id="pct-meh">11%</div>
              </div>
            </div>

            <div class="vote-btns">
              <button class="vote-btn yes" data-v="yes">Yes, move it</button>
              <button class="vote-btn no" data-v="no">Keep it</button>
              <button class="vote-btn meh" data-v="meh">Meh</button>
            </div>
          </div>

          <div class="page-key" style="margin-bottom:10px;display:flex;justify-content:space-between">
            <span>PAST MOTIONS</span>
            <span style="color:var(--muted);text-transform:none;font-family:var(--sans);letter-spacing:0;font-size:12px">last 30 days</span>
          </div>

          <div class="past">
            <span class="pill pill-win">● PASSED</span>
            <div class="what">Shared project-defense rehearsal room, Mondays 18:00</div>
            <span class="pill pill-done">PEDAGOGY ✓ ROOM A12</span>
          </div>
          <div class="past">
            <span class="pill pill-win">● PASSED</span>
            <div class="what">Ask pedagogy for an English-track option on the Nov elective</div>
            <span class="pill pill-wait">RAISED · WAITING</span>
          </div>
          <div class="past">
            <span class="pill pill-lose">● LOST</span>
            <div class="what" style="color:var(--muted)">Rename the class group chat to "the-bored-ones"</div>
            <span class="mono" style="font-size:11px;color:var(--dim)">8 YES · 14 NO</span>
          </div>
          <div class="past">
            <span class="pill pill-win">● PASSED</span>
            <div class="what">Weekly movie night on Fridays (voted on Sundays)</div>
            <span class="pill pill-done">LIVE SINCE OCT 18</span>
          </div>
        </div>

        <aside>
          <div class="side-card">
            <div class="side-key">RAISE A MOTION</div>
            <div class="side-body" style="margin-bottom:12px">Something broken? Something missing? Say what you'd change in one line.</div>
            <textarea class="side-ta" placeholder="e.g. the printer on floor 2 has been down since Tuesday…"></textarea>
            <div style="display:flex;gap:6px;margin-top:10px;align-items:center">
              <button class="btn btn-primary" data-raise style="padding:9px 14px;font-size:13px">Raise it</button>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);margin-left:auto"><input type="checkbox" style="accent-color:var(--coral)"/> anonymous</label>
            </div>
          </div>

          <div class="side-card">
            <div class="side-key">NEXT COUNCIL MEETING</div>
            <div class="side-h">Friday · 15:00</div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Room A12 · pedagogy sits in</div>
            <div class="side-body">Wasi walks in with whatever passed this week. Comes back with answers.</div>
            <div style="display:flex;gap:6px;margin-top:12px">
              <button class="btn btn-ghost" data-cal style="flex:1;padding:9px;font-size:12px">Add to calendar</button>
              <button class="btn btn-ghost" data-who style="padding:9px 12px;font-size:12px">Who's on it?</button>
            </div>
          </div>

          <div class="side-card" style="border-color:var(--surface-2)">
            <div class="side-key">LAST READ-OUT</div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:4px">Fri 31 Oct · posted by wasi</div>
            <div class="side-body" style="font-style:italic">"Pedagogy agreed to the rehearsal room. English-track still being reviewed — answer by Nov 20. They said no to the group-chat rename, obviously."</div>
          </div>
        </aside>
      </div>
    </div>
  </div>
`;

const votes = { yes: 13, no: 3, meh: 2 };

function castVote(v) {
  if (state.vote === v) return;
  if (state.vote) votes[state.vote]--;
  votes[v]++;
  state.vote = v;
  renderVotes();
  toast(`Vote locked in: ${v === 'yes' ? 'yes, move it' : v === 'no' ? 'keep it' : 'meh'}.`);
}

function renderVotes() {
  const total = votes.yes + votes.no + votes.meh;
  document.getElementById('voters').textContent = total;
  for (const k of ['yes', 'no', 'meh']) {
    const pct = Math.round((votes[k] / total) * 100);
    document.getElementById('fill-' + k).style.width = Math.max(pct, 2) + '%';
    document.getElementById('c-' + k).textContent = votes[k];
    document.getElementById('pct-' + k).textContent = pct + '%';
  }
  document.querySelectorAll('.vote-btn').forEach((b) =>
    b.classList.toggle('on', b.dataset.v === state.vote)
  );
}

export function initCouncil() {
  const root = document.querySelector('.subview[data-sub="council"]');
  root.querySelectorAll('.vote-btn').forEach((b) =>
    b.addEventListener('click', () => castVote(b.dataset.v))
  );
  root.querySelector('[data-raise]').addEventListener('click', () =>
    toast('Motion raised. Vote opens tonight.')
  );
  root.querySelector('[data-cal]').addEventListener('click', () => toast('Added to your calendar.'));
  root.querySelector('[data-who]').addEventListener('click', () =>
    toast('Wasi + Priya + Lena are on it.')
  );
  renderVotes();
}
