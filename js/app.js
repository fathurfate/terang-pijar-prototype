// MODEL_START
const CPI0 = 1572.3;
function fm(p) {
  const d = Object.assign({ inst: 1e6, reg: 0.8, act: 0.52, conv: 0.085, p1: 105000, rebuy: 0.3, cpi: CPI0, team: 600e6, sub: 0.1, play: 0.15, aiP: 12000, aiA: 300 }, p || {});
  const payers = d.inst * d.reg * d.act * d.conv, arppu = d.p1 + d.rebuy * 0.8 * d.p1, rev = payers * arppu;
  const ai = payers * d.aiP + d.inst * d.reg * d.act * d.aiA, contrib = rev * (1 - d.play) - ai, budget = d.cpi * d.inst + d.team;
  return { payers, arppu, rev, ai, contrib, budget, subsidi: rev * d.sub, net: contrib - budget - rev * d.sub, ltvcac: (contrib - rev * d.sub) / budget,
           reg: d.inst * d.reg, act: d.inst * d.reg * d.act };
}
const W = { Penalaran: 0.35, Inggris: 0.20, Wawancara: 0.25, Tekanan: 0.20 };
function core(s) { return Object.keys(W).reduce((a, k) => a + W[k] * s[k], 0); }
const STAMPS = [{ id: 'UTBK', thr: 65, tag: 'A' }, { id: 'LPDP', thr: 70, tag: 'A' }, { id: 'IELTS', thr: 65, tag: 'A' }];
function stampOn(s, st) { return core(s) >= st.thr && Math.min(s.Penalaran, s.Inggris, s.Wawancara, s.Tekanan) >= 55; }
// Gerbang (slide 8). ok(v): true bila lolos
const GATES = {
  G0: { name: 'G0 · Pilot tertutup', when: 'H+0 s.d. H+20', inst: '500 pengguna, 3 Squad', spend: 60e6, rel: 'Rilis ±Rp74 jt (G1)',
    m: [['H1 Aktivasi', 'act', 50, '%', 1, 'ge', 'A'], ['H2 D7 retensi', 'd7', 25, '%', 1, 'ge', 'A'], ['H3 Niat bayar', 'pay', 5, '%', 0.5, 'ge', 'A'], ['H4 Kepercayaan skor', 'trust', 3.8, '/5', 0.1, 'ge', 'A'], ['H5 Kartu dibagikan', 'share', 20, '%', 1, 'ge', 'A']] },
  G1: { name: 'G1 · Luncur terbatas', when: 'akhir Des', inst: '15 rb install', spend: 74e6, rel: 'Rilis fase berikut',
    m: [['Aktivasi', 'act', 50, '%', 1, 'ge', 'A'], ['Biaya/install (Rp)', 'cpi', 2000, '', 50, 'le', 'A'], ['Crash-free', 'crash', 99, '%', 0.1, 'ge', 'A'], ['K-factor', 'k', 0.2, '', 0.05, 'ge', 'A']] },
  G2: { name: 'G2 · Rilis dana musim puncak', when: 'akhir Mar', inst: '205 rb install', spend: 522e6, rel: 'Rilis dana musim puncak',
    m: [['CAC/bayar (Rp rb)', 'cac', 80, '', 1, 'le', 'A'], ['Konversi (terdaftar)', 'conv', 3, '%', 0.1, 'ge', 'A'], ['Trial→bayar', 'ttp', 8, '%', 0.1, 'ge', 'A']] },
  G3: { name: 'G3 · Rilis dana skala', when: 'akhir Jun', inst: '535 rb install', spend: 1190e6, rel: 'Rilis dana skala',
    m: [['D30 retensi', 'd30', 10, '%', 1, 'ge', 'A'], ['Beli ulang', 'rb', 15, '%', 1, 'ge', 'A'], ['LTV/CAC', 'lc', 1.3, '×', 0.05, 'ge', 'A']] },
};
function gateEval(id, vals) {
  const g = GATES[id], res = g.m.map((x, i) => (x[5] === 'ge' ? vals[i] >= x[2] : vals[i] <= x[2]));
  const fails = res.filter((r) => !r).length, passes = res.length - fails;
  let verdict;
  if (fails === 0) verdict = 'LOLOS';
  else if (id === 'G0') verdict = (fails >= 2 || !res[0] || !res[2]) ? 'HENTIKAN' : (passes >= 4 ? 'PERPANJANG' : 'HENTIKAN');
  else verdict = fails === 1 ? 'PERPANJANG' : 'HENTIKAN'; // G1-G3: aturan G0 diperluas [A]
  return { res, fails, passes, verdict };
}
const PRESETS = {
  dasar: { n: 'Dasar', p: {}, deck: { net: 0.73, lc: 1.34 } },
  haircut: { n: 'Haircut', p: { conv: 0.085 * 0.8, cpi: CPI0 * 1.2 }, deck: { net: -0.19, lc: 0.92 } },
  terburuk: { n: 'Terburuk', p: { inst: 550000, conv: 0.048, cpi: 2300, rebuy: 0.15 }, deck: { net: -0.95, lc: 0.45 } },
};
// MODEL_END
const $ = (id) => document.getElementById(id);
const sid = 's' + Math.random().toString(36).slice(2, 10);
const fmtN = (v) => Math.round(v).toLocaleString('id-ID');
const rpM = (v) => (v < 0 ? '−' : '') + 'Rp' + Math.abs(v / 1e9).toFixed(2).replace('.', ',') + ' M';
const rpJ = (v) => 'Rp' + Math.round(v / 1e6).toLocaleString('id-ID') + ' jt';
let ctx = { core: 0, payers: 0, net: 0, ltvcac: 0 };
const LOG_URL = ''; // opsional: tempel URL Apps Script /exec (doPost) untuk mencatat interaksi
function log(view, action, params) {
  const ev = { sid, view, action, params: params || {}, core: ctx.core, payers: ctx.payers, net: ctx.net, ltvcac: ctx.ltvcac, ua: navigator.userAgent };
  try {
    if (window.google && google.script && google.script.run) google.script.run.withFailureHandler(function () {}).logEvent(ev);
    else if (LOG_URL) fetch(LOG_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(ev) });
  } catch (e) {}
}
// ---------- NAV
const TABS = [['paspor', '🪪', 'Profil'], ['duel', '⚔️', 'Duel'], ['jalur', '🚦', 'Jalur'], ['sim', '📊', 'Simulator']];
$('nav').innerHTML = TABS.map((t) => `<button data-t="${t[0]}"><i></i><em>${t[1]}</em>${t[2]}</button>`).join('');
function go(t) { document.querySelectorAll('.view').forEach((v) => v.classList.toggle('on', v.id === 'v-' + t)); document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('on', b.dataset.t === t)); window.scrollTo(0, 0); ({ paspor: rProfil, duel: rDuel, jalur: rJalur, sim: rSim })[t](); log(t, 'view'); }
$('nav').onclick = (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.t); };

// ---------- PROFIL
const S0 = { Penalaran: 58, Inggris: 52, Wawancara: 40, Tekanan: 55 };
const S = Object.assign({}, S0); let session = 1, qi = -1, answered = false, left = 600, timer = null;
const DN = { Penalaran: 'Penalaran', Inggris: 'Bahasa Inggris', Wawancara: 'Wawancara', Tekanan: 'Tekanan' };
const QS = [
  { d: 'Penalaran', q: 'Jika semua A adalah B dan sebagian B adalah C, simpulan yang pasti benar adalah…', o: ['Sebagian A adalah C', 'Semua A adalah B', 'Tidak ada A yang C'], a: 1 },
  { d: 'Inggris', q: 'Choose the correct sentence.', o: ['She don\'t like coffee.', 'She doesn\'t like coffee.', 'She not like coffee.'], a: 1 },
  { d: 'Wawancara', q: '"Ceritakan pengalaman memimpin tim." Jawaban terbaik memakai struktur…', o: ['Jawaban singkat "pernah"', 'Situasi → tugas → aksi → hasil terukur', 'Pujian pada diri sendiri'], a: 1 },
  { d: 'Tekanan', q: 'Sisa waktu 2 menit, 4 soal belum dijawab. Langkah terbaik?', o: ['Berhenti dan menyerah', 'Kerjakan yang paling yakin dulu, tebak sisanya', 'Habiskan waktu di satu soal sulit'], a: 1 },
  { d: 'Penalaran', q: 'Deret 3, 6, 12, 24, … angka berikutnya?', o: ['36', '48', '30'], a: 1 },
];
const GAIN_OK = 6, GAIN_NO = 1; // [A] aturan demo
function rProfil() {
  const c = core(S); ctx.core = c;
  const weak = Object.keys(S).reduce((a, k) => (S[k] < S[a] ? k : a));
  const ss = STAMPS.map((st) => `<div class="stamp ${stampOn(S, st) ? 'on' : ''}"><b>${st.id}</b>≥ ${st.thr}</div>`).join('');
  const next = STAMPS.filter((st) => !stampOn(S, st)).sort((a, b) => a.thr - b.thr)[0];
  let h = `<div class="hero"><div class="k"><b>${c.toFixed(0)}</b><span>Skor Inti · sesi ${session}</span></div><div class="k gold"><b>${DN[weak]}</b><span>dimensi terlemah (${S[weak]})</span></div></div>
  <div class="sec">Skor Inti · 4 dimensi</div><div class="card">${Object.keys(S).map((k) => `<div class="row"><span>${DN[k]} <small>×${W[k] * 100}%</small></span><b>${S[k]}</b></div><div class="bar ${k === weak ? 'w' : ''}"><i style="width:${S[k]}%"></i></div>`).join('')}
  <div class="note">Skor Inti = 35% penalaran + 20% B. Inggris + 25% wawancara + 20% tekanan <span class="tag tH">H</span> Estimasi dengan rentang ±4 (galat pengukuran <span class="tag tA">A</span>), bukan jaminan lolos. Alasan: penalaran dan B. Inggris dari soal bank terverifikasi; wawancara dan tekanan masih estimasi awal sampai diukur di Duel 3 menit dan soal berwaktu.</div></div>
  <div class="sec g">Tes singkat 10 menit (demo 5 soal)</div><div class="card" id="qbox"></div>
  <div class="sec">Stempel kesiapan</div><div class="card"><div class="stamps">${ss}</div>
  <div class="note">Stempel bila Skor Inti ≥ ambang dan dimensi terlemah ≥ 55. Ambang UTBK 65 dan LPDP 70 <span class="tag tA">A</span> ; ambang IELTS belum ditetapkan, 65 hanya contoh <span class="tag tA">A</span>.</div></div>
  <div class="sec">Momen nilai · Profil Plus</div><div class="card">${session > 1 ? `<div class="q">Skormu bergerak. Lanjutkan dengan Profil Plus</div><div class="meta" style="margin:4px 0 8px">Season Pass 3 bulan <b>Rp79 rb</b> (paket utama) · Plus bulanan Rp25 rb · Tahunan Rp199 rb. Reverse trial 7 hari tanpa kartu; bayar via QRIS/e-wallet. Simulasi, tidak ada pembayaran.</div><button class="btn" onclick="log('paspor','trial_start',{})">Coba 7 hari gratis</button>` : `<div class="meta">Paywall hanya muncul di momen nilai (skor naik atau hasil wawancara), bukan di awal. Selesaikan 1 sesi untuk melihatnya.</div>`}</div>
  <div class="sec">Seleksi berikutnya</div><div class="card"><div class="q">${next ? `Rekomendasi: <span style="color:#8A6A1F">${next.id}</span>` : 'Semua stempel terbuka 🎉'}</div><div class="meta">${next ? `Selisih Skor Inti ke ambang: ${Math.max(0, next.thr - c).toFixed(1)} poin. Profil dibawa, bukan mengulang dari nol.` : 'Profil siap dibawa ke seleksi lain.'}</div></div>`;
  $('v-paspor').innerHTML = h; rQ();
}
function fmtT(t) { return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
function rQ() {
  const b = $('qbox'); if (!b) return;
  if (qi < 0) { b.innerHTML = `<div class="q">Ukur ulang Profil-mu. Tiap sesi memperbarui Skor Inti.</div><div class="meta" style="margin:4px 0 10px">5 soal · timer 10:00 · tiap jawaban menggeser satu dimensi [A: +${GAIN_OK} benar, +${GAIN_NO} salah]</div><button class="btn" id="go">Mulai sesi ${session}</button>`; $('go').onclick = () => { qi = 0; answered = false; left = 600; clearInterval(timer); timer = setInterval(() => { left = Math.max(0, left - 1); const e = $('tm'); if (e) e.textContent = fmtT(left); }, 1000); log('paspor', 'start', { session }); rQ(); }; return; }
  if (qi >= QS.length) { clearInterval(timer); b.innerHTML = `<div class="q">Sesi ${session} selesai ✓</div><div class="meta" style="margin:4px 0 10px">Skor Inti sekarang ${core(S).toFixed(1)}. Ukur ulang agar naik dan buka stempel.</div><button class="btn" id="again">Sesi berikutnya</button>`; $('again').onclick = () => { session++; qi = -1; rProfil(); }; return; }
  const q = QS[qi];
  b.innerHTML = `<div class="row"><span class="meta">Soal ${qi + 1} dari ${QS.length} · ${DN[q.d]}</span><b id="tm" style="color:#B8352B;font-size:12px">${fmtT(left)}</b></div><div class="q" style="margin-top:6px">${q.q}</div>${q.o.map((t, i) => `<button class="opt" data-i="${i}">${'ABC'[i]}. ${t}</button>`).join('')}<div id="fb"></div>`;
  b.querySelectorAll('.opt').forEach((el) => el.onclick = () => {
    if (answered) return; answered = true; const i = +el.dataset.i, ok = i === q.a;
    el.classList.add(ok ? 'good' : 'bad'); if (!ok) b.querySelectorAll('.opt')[q.a].classList.add('good');
    S[q.d] = Math.min(100, S[q.d] + (ok ? GAIN_OK : GAIN_NO)); log('paspor', ok ? 'answer_ok' : 'answer_no', { q: qi + 1, dim: q.d });
    $('fb').innerHTML = `<div class="meta" style="margin:8px 0">${ok ? 'Tepat.' : 'Belum tepat.'} ${DN[q.d]} → ${S[q.d]}. Skor Inti ${core(S).toFixed(1)}.</div><button class="btn n" id="nx">${qi === QS.length - 1 ? 'Selesai' : 'Soal berikutnya'}</button>`;
    ctx.core = core(S); $('nx').onclick = () => { qi++; answered = false; if (qi >= QS.length) { rProfil(); } else rQ(); };
  });
}
// ---------- DUEL
let rematch = 0, challenged = false;
function rDuel() {
  const c = core(S), c0 = core(S0), delta = c - c0, rival = 49 + rematch * 2; // [A] rival demo
  const ks = Object.keys(S).sort((a, b) => S[b] - S[a]), str = ks.slice(0, 3), weak = ks[3];
  ctx.core = c;
  $('v-duel').innerHTML = `<div class="sec g">Duel Wawancara · hasil jadi undangan</div>
  <div class="duel"><div><div class="lbl">PROFIL KESIAPAN · DUEL</div><div style="font-size:13px;margin-top:4px;font-weight:600">Aulia · Skor Inti minggu ini</div></div>
  <div><div class="big">${session > 1 ? (delta >= 0 ? '+' : '') + delta.toFixed(1) : 'Baru'}</div><div style="font-size:12px;margin-top:6px;color:#C9D8E8">${session > 1 ? 'poin Skor Inti sejak sesi 1' : 'sesi pertama: belum ada pembanding'} · skor mentah tidak dibagikan</div></div>
  <div><div><span class="pill">+3 kekuatan: ${str.map((k) => DN[k]).join(', ')}</span><span class="pill">+1 titik lemah: ${DN[weak]}</span></div>
  <div style="font-size:10px;color:#9FB6CE;margin-top:8px">Kartu hanya skor dan delta; tanpa suara/rekaman. Pratinjau sebelum dibagikan.</div></div></div>
  <div style="height:12px"></div><button class="btn" id="ch">${challenged ? 'Tantangan terkirim ✓ (salin lagi)' : 'Tantang teman'}</button>
  <button class="btn o" id="rm">Rematch · ronde ${rematch + 2}</button>
  <div class="card" style="margin-top:12px"><div class="sec">Alur duel (deck)</div><div class="note" style="font-size:11px;color:#0F1E33">① Simulasi 3 menit → ② Kartu 9:16: delta + 3 kekuatan + 1 titik lemah → ③ Tantang teman: deep link, teman tanpa akun bisa coba → ④ Rematch async; hadiah non-cash.</div>
  <div class="note">Target K ≥ 0,2 diuji di G1 <span class="tag tA">A</span> ; berbagi opt-in, dipantau ≥ 15% (risiko 10). Skor rival dan kenaikan per rematch adalah data demo.</div></div>`;
  $('ch').onclick = () => { const t = `Profil Kesiapan-ku berubah ${delta.toFixed(1)} poin di Terang Pijar. Berani duel wawancara?`; try { navigator.clipboard.writeText(t); } catch (e) {} challenged = true; log('duel', 'challenge', { core: +c.toFixed(1) }); rDuel(); };
  $('rm').onclick = () => { rematch++; log('duel', 'rematch', { round: rematch + 1 }); rDuel(); };
}
// ---------- JALUR
const GV = {}; Object.keys(GATES).forEach((id) => GV[id] = GATES[id].m.map((x) => x[2]));
let openG = 'G0';
const TESTED = {};
function rJalur() {
  let cumSp = 0;
  const html = Object.keys(GATES).map((id) => {
    const g = GATES[id], r = gateEval(id, GV[id]); cumSp = g.spend; if (!TESTED[id]) r.verdict = 'BELUM DIUJI';
    const cls = r.verdict === 'BELUM DIUJI' ? 'pend' : r.verdict === 'LOLOS' ? 'pass' : r.verdict === 'PERPANJANG' ? 'ext' : 'stop';
    const body = openG === id ? `<div class="m">${g.m.map((x, i) => `<span>${x[0]} <small>${x[5] === 'ge' ? '≥' : '≤'} ${x[2]}${x[3]}</small><span class="tag t${x[6]}">${x[6] === 'A' ? 'A' : 'K'}</span></span><span class="v ${r.res[i] ? 'ok' : 'no'}">${GV[id][i]}${x[3]} ${r.res[i] ? '✓' : '✗'}</span><input type="range" style="grid-column:1/3" data-g="${id}" data-i="${i}" min="0" max="${x[2] * 2}" step="${x[4]}" value="${GV[id][i]}">`).join('')}</div>
      <div class="note">Dana terpakai kumulatif: <b>${rpJ(g.spend)}</b> · ${g.rel}.</div>${id === 'G0' ? '<div class="chips" style="margin-top:8px"><button class="pc" data-sc="ok">Semua lolos</button><button class="pc" data-sc="ext">1 gagal</button><button class="pc" data-sc="stop">H1 gagal</button></div><div class="note">Aturan G0 (deck): semua lolos → luncur; 1 H gagal dan ≥ 4 lolos → perpanjang 4 minggu (+≤ Rp30 jt); ≥ 2 gagal atau H1/H3 gagal → hentikan/pivot, Rp0 tambahan.</div>' : '<div class="note">Aturan perpanjang/hentikan G1–G3 diperluas dari G0 <span class="tag tA">A</span>.</div>'}` : '';
    return `<div class="card gate ${cls}" data-card="${id}"><div class="gh" data-open="${id}"><span>${g.name}<br><small class="meta" style="font-weight:400">${g.when} · ${g.inst}</small></span><span class="st ${cls}">${r.verdict}</span></div>${body}</div>`;
  }).join('');
  $('v-jalur').innerHTML = `<div class="hero"><div class="k"><b>±Rp0,52 M</b><span>eksposur dana maksimum sampai Gate 2</span></div><div class="k gold"><b>4 gerbang</b><span>dana dilepas saat bukti tiba</span></div></div><div class="sec">Jalur UTBK bergerbang G0–G3</div>${html}<div class="note">Ketuk gerbang untuk membuka. Ambang bertanda <span class="tag tA">A</span> adalah asumsi tim; <span class="tag tK">K</span> = dari buku kasus/benchmark. Semua gerbang berstatus BELUM DIUJI sampai kamu menggeser hasil. Ini simulasi keputusan, bukan data pengguna.</div>`;
  document.querySelectorAll('[data-open]').forEach((e) => e.onclick = () => { openG = openG === e.dataset.open ? '' : e.dataset.open; log('jalur', 'gate_open', { g: openG }); rJalur(); });
  document.querySelectorAll('input[data-g]').forEach((e) => e.oninput = () => { GV[e.dataset.g][+e.dataset.i] = +e.value; const y = window.scrollY; rJalur(); window.scrollTo(0, y); });
  document.querySelectorAll('input[data-g]').forEach((e) => e.onchange = () => log('jalur', 'gate_set', { g: e.dataset.g, i: +e.dataset.i, v: +e.value }));
  document.querySelectorAll('[data-sc]').forEach((e) => e.onclick = () => { const m = GATES.G0.m; GV.G0 = m.map((x) => x[2]); if (e.dataset.sc === 'ext') GV.G0[1] = 20; if (e.dataset.sc === 'stop') GV.G0[0] = 40; log('jalur', 'preset_g0', { sc: e.dataset.sc }); rJalur(); });
}
// ---------- SIMULATOR
const P = { inst: 1e6, reg: 80, act: 52, conv: 8.5, p1: 105000, rebuy: 30, cpi: CPI0 }; let pre = 'dasar';
const SL = [['inst', 'Install 12 bulan', 100000, 1500000, 50000, (v) => fmtN(v), 'K'], ['reg', 'Terdaftar (% install)', 50, 95, 1, (v) => v + '%', 'A'], ['act', 'Aktif (% terdaftar)', 30, 80, 1, (v) => v + '%', 'A'], ['conv', 'Bayar (% aktif)', 2, 12, 0.1, (v) => v.toFixed(1).replace('.', ',') + '%', 'H'], ['p1', 'Harga Season Pass (Rp)', 50000, 150000, 5000, (v) => fmtN(v), 'A'], ['rebuy', 'Beli ulang (%)', 0, 50, 1, (v) => v + '%', 'A'], ['cpi', 'Biaya per install (Rp)', 800, 3000, 10, (v) => fmtN(v), 'H']];
function calc() { return fm({ inst: P.inst, reg: P.reg / 100, act: P.act / 100, conv: P.conv / 100, p1: P.p1, rebuy: P.rebuy / 100, cpi: P.cpi }); }
function setPre(k) { const p = Object.assign({ inst: 1e6, reg: 0.8, act: 0.52, conv: 0.085, p1: 105000, rebuy: 0.3, cpi: CPI0 }, PRESETS[k].p); P.inst = p.inst; P.reg = Math.round(p.reg * 100); P.act = Math.round(p.act * 100); P.conv = +(p.conv * 100).toFixed(1); P.p1 = p.p1; P.rebuy = Math.round(p.rebuy * 100); P.cpi = Math.round(p.cpi * 10) / 10; pre = k; }
function rSim(keep) {
  const r = calc(); ctx.payers = r.payers; ctx.net = r.net; ctx.ltvcac = r.ltvcac;
  const mx = P.inst, fun = [['Install', P.inst], ['Terdaftar', r.reg], ['Aktif', r.act], ['Pembayar', r.payers]];
  const dk = PRESETS[pre]; const ex = pre === 'terburuk' ? 'Selisih dengan deck: model memberi ' + rpM(r.net) + ' karena beli ulang dan subsidi tidak dirinci di deck <span class="tag tA">A</span>.' : '';
  const maxSp = 1190e6, gates = [['G0', 60e6], ['G1', 74e6], ['G2', 522e6], ['G3', 1190e6]];
  if (!keep) $('v-sim').innerHTML = `<div id="s-out"></div><div class="sec">Skenario</div><div class="chips" id="pr">${Object.keys(PRESETS).map((k) => `<button class="pc" data-p="${k}">${PRESETS[k].n}</button>`).join('')}</div><div class="card sl" id="sls">${SL.map((s) => `<label><span>${s[1]} <span class="tag t${s[6]}">${s[6]}</span></span><b id="lv-${s[0]}"></b></label><input type="range" id="sl-${s[0]}" min="${s[2]}" max="${s[3]}" step="${s[4]}">`).join('')}<div class="note">Tetap: tim & alat Rp600 jt, subsidi 3T 10%, biaya platform 15%, biaya AI Rp12 rb/pembayar + Rp300/aktif <span class="tag tA">A</span>.</div></div>`;
  $('s-out').innerHTML = `<div class="hero"><div class="k"><b>${fmtN(r.payers)}</b><span>pembayar · ${(r.payers / r.reg * 100).toFixed(1).replace('.', ',')}% dari terdaftar</span></div><div class="k gold"><b>${rpM(r.rev)}</b><span>pendapatan 12 bulan</span></div>
  <div class="k"><b class="${r.net < 0 ? 'neg' : ''}" style="${r.net < 0 ? 'color:#F2A39B' : ''}">${rpM(r.net)}</b><span>kontribusi bersih (setelah subsidi)</span></div><div class="k gold"><b>${r.ltvcac.toFixed(2).replace('.', ',')}×</b><span>LTV/CAC · gerbang G3 ≥ 1,3×</span></div></div>
  <div class="sec">Funnel 12 bulan</div><div class="card">${fun.map((f) => `<div class="row"><span>${f[0]}</span><b>${fmtN(f[1])}</b></div><div class="bar ${f[0] === 'Pembayar' ? 'w' : ''}"><i style="width:${Math.max(1.5, f[1] / mx * 100)}%"></i></div>`).join('')}<div class="note">${fmtN(P.inst)} × ${P.reg}% × ${P.act}% × ${P.conv.toFixed(1).replace('.', ',')}% = ${fmtN(r.payers)} pembayar <span class="tag tH">H</span> · Pendapatan/pembayar 12 bln ${fmtN(r.arppu)} · anggaran ${rpM(r.budget)}.</div></div>
  <div class="sec g">Eksposur dana per gerbang</div><div class="card"><table><tr><th>Berhenti di</th><th class="r">Dana kum.</th><th class="r">% anggaran</th></tr>${gates.map((g) => `<tr class="${g[0] === 'G2' ? 'hl' : ''}"><td>${g[0]}</td><td class="r">${rpJ(g[1])}</td><td class="r">${(g[1] / r.budget * 100).toFixed(0)}%</td></tr>`).join('')}</table><div class="note">Eksposur dana maksimum sampai Gate 2 ≈ Rp0,52 M (Rp522 jt) <span class="tag tH">H</span>: gagal di G0 hanya ±Rp60 jt. Dana dilepas per gerbang, bukan di muka.</div></div>
  <div class="note">Skenario aktif: <b>${dk.n}</b> · deck: kontribusi ${dk.deck.net > 0 ? '+' : '−'}Rp${Math.abs(dk.deck.net).toFixed(2).replace('.', ',')} M, LTV/CAC ${dk.deck.lc.toFixed(2).replace('.', ',')}×. ${ex}</div>`;
  document.querySelectorAll('#pr .pc').forEach((e) => e.classList.toggle('on', e.dataset.p === pre));
  SL.forEach((s) => { const el = $('sl-' + s[0]); if (el !== document.activeElement) el.value = P[s[0]]; $('lv-' + s[0]).textContent = s[5](P[s[0]]); });
  if (!keep) {
    document.querySelectorAll('#pr .pc').forEach((e) => e.onclick = () => { setPre(e.dataset.p); log('sim', 'preset_' + e.dataset.p, { P }); rSim(true); });
    SL.forEach((s) => { const el = $('sl-' + s[0]); el.oninput = () => { P[s[0]] = +el.value; pre = ''; rSim(true); }; el.onchange = () => log('sim', 'slider', { k: s[0], v: +el.value }); });
  }
}
window.__t = { fm, core, gateEval, setPre, P, S, go };
go('paspor');
