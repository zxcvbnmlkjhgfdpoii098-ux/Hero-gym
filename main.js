function dayStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split("T")[0];
}

const seedMembers = [];

const seedTour = {
  title: "🏆 تحدي السرعة والقوة",
  runs: []
};

let members = JSON.parse(localStorage.getItem("gym_v5_members")) || JSON.parse(JSON.stringify(seedMembers));
let tour = JSON.parse(localStorage.getItem("gym_v5_tour")) || JSON.parse(JSON.stringify(seedTour));
let currentPlayer = JSON.parse(localStorage.getItem("gym_v5_player")) || null;

let timerInterval = null;
let elapsedSec = 0;
let confirmCallback = null;

function persist() {
  localStorage.setItem("gym_v5_members", JSON.stringify(members));
  localStorage.setItem("gym_v5_tour", JSON.stringify(tour));
  localStorage.setItem("gym_v5_player", JSON.stringify(currentPlayer));
}


/* نافذة تأكيد مخصصة شيك بدل رسالة المتصفح البيضاء */
function askConfirm({ title = "تأكيد العملية", message, icon = "⚠️", okText = "تأكيد", okClass = "btn-success", onConfirm }) {
  const modal = document.getElementById("confirmModal");
  if (!modal) {
    if (typeof onConfirm === "function") onConfirm();
    return;
  }
  document.getElementById("confirmTitle").textContent = title;
  document.getElementById("confirmText").textContent = message;
  document.getElementById("confirmIcon").textContent = icon;

  const yesBtn = document.getElementById("confirmYesBtn");
  yesBtn.textContent = okText;
  yesBtn.className = "btn btn-sm " + okClass;
  confirmCallback = onConfirm;

  yesBtn.onclick = function () {
    closeConfirm(true);
  };

  modal.classList.add("open");
}

function closeConfirm(accepted) {
  const modal = document.getElementById("confirmModal");
  if (modal) modal.classList.remove("open");
  const cb = confirmCallback;
  confirmCallback = null;
  if (accepted && typeof cb === "function") {
    cb();
  }
}

function openPage(pageId) {
  document.querySelectorAll(".page").forEach(function (p) {
    p.classList.remove("active");
  });
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(function (b) {
    b.classList.toggle("active", b.dataset.page === pageId);
  });

  if (pageId === "tourPage") {
    renderTourScreen();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function calcEnd() {
  const s = document.getElementById("mStart");
  const dur = document.getElementById("mDuration");
  const endEl = document.getElementById("mEnd");
  if (!s || !dur || !endEl || !s.value) return;
  const d = new Date(s.value);
  d.setDate(d.getDate() + parseInt(dur.value, 10));
  endEl.value = d.toISOString().split("T")[0];
}

function getStats(m) {
  const today = new Date(dayStr(0));
  const start = new Date(m.start);
  const end = new Date(m.end);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

  let status = "active";
  if (diff < 0) status = "expired";
  else if (diff <= 3) status = "soon";

  const capDate = today < end ? today : end;
  const elapsed = Math.max(0, Math.floor((capDate - start) / (1000 * 60 * 60 * 24)) + 1);
  const absent = Math.max(0, elapsed - m.present);
  return { diff: diff, status: status, absent: absent };
}

function addMember(e) {
  e.preventDefault();
  const name = document.getElementById("mName").value.trim();
  const phone = document.getElementById("mPhone").value.trim();
  const start = document.getElementById("mStart").value;
  const end = document.getElementById("mEnd").value;
  const file = document.getElementById("mPhoto").files[0];

  function saveItem(photo) {
    members.unshift({
      id: Date.now(),
      name: name,
      phone: phone,
      start: start,
      end: end,
      present: 1,
      lastIn: dayStr(0),
      photo: photo
    });
    persist();
    e.target.reset();
    document.getElementById("mStart").value = dayStr(0);
    calcEnd();
    renderAll();
    openPage("membersPage");
  }

  if (file) {
    const reader = new FileReader();
    reader.onload = function (ev) {
      saveItem(ev.target.result);
    };
    reader.readAsDataURL(file);
  } else {
    saveItem("");
  }
}

function checkIn(id) {
  const m = members.find(function (x) { return x.id === id; });
  if (!m) return;
  if (m.lastIn === dayStr(0)) {
    alert("تم تسجيل حضور " + m.name + " اليوم بالفعل ✅");
    return;
  }
  m.present += 1;
  m.lastIn = dayStr(0);
  persist();
  renderAll();
}

function renewMember(id) {
  const m = members.find(function (x) { return x.id === id; });
  if (!m) return;
  askConfirm({
    title: "تجديد الاشتراك",
    message: 'هل تريد تأكيد تجديد اشتراك "' + m.name + '" لمدة 30 يوم بدءاً من اليوم؟',
    icon: "🔄",
    okText: "تأكيد التجديد",
    okClass: "btn-success",
    onConfirm: function () {
      m.start = dayStr(0);
      m.end = dayStr(30);
      m.present = 1;
      m.lastIn = dayStr(0);
      persist();
      renderAll();
    }
  });
}

function removeMember(id) {
  const m = members.find(function (x) { return x.id === id; });
  if (!m) return;
  askConfirm({
    title: "حذف مشترك",
    message: 'هل أنت متأكد من حذف "' + m.name + '" نهائياً من القائمة؟',
    icon: "🗑️",
    okText: "تأكيد الحذف",
    okClass: "btn-danger",
    onConfirm: function () {
      members = members.filter(function (x) { return x.id !== id; });
      persist();
      renderAll();
    }
  });
}

function resetDemo() {
  askConfirm({
    title: "إعادة ضبط البيانات",
    message: "سيتم إرجاع البيانات التجريبية الأصلية، هل تريد المتابعة؟",
    icon: "♻️",
    okText: "تأكيد الضبط",
    okClass: "btn-danger",
    onConfirm: function () {
      members = JSON.parse(JSON.stringify(seedMembers));
      tour = JSON.parse(JSON.stringify(seedTour));
      currentPlayer = null;
      persist();
      renderAll();
    }
  });
}

function showCard(id) {
  const m = members.find(function (x) { return x.id === id; });
  if (!m) return;
  const stats = getStats(m);

  const av = document.getElementById("cAvatar");
  av.innerHTML = m.photo ? '<img src="' + m.photo + '" alt="' + m.name + '">' : m.name.charAt(0);
  document.getElementById("cName").textContent = m.name;
  document.getElementById("cPresent").textContent = m.present;
  document.getElementById("cAbsent").textContent = stats.absent;
  document.getElementById("cLeft").textContent = Math.max(0, stats.diff);
  document.getElementById("cDates").textContent = "من " + m.start + " إلى " + m.end;

  const b = document.getElementById("cBadge");
  if (stats.status === "expired") b.innerHTML = '<span class="badge b-expired">اشتراك منتهي</span>';
  else if (stats.status === "soon") b.innerHTML = '<span class="badge b-soon">ينتهي قريباً</span>';
  else b.innerHTML = '<span class="badge b-active">اشتراك نشط</span>';

  document.getElementById("cardModal").classList.add("open");
}

function renderCountsAndAlerts() {
  let active = 0, soon = 0, expired = 0;
  const alertBox = document.getElementById("alertsPageList");
  if (alertBox) alertBox.innerHTML = "";

  members.forEach(function (m) {
    const stats = getStats(m);
    if (stats.status === "active") active++;
    else if (stats.status === "soon") soon++;
    else expired++;

    if ((stats.status === "expired" || stats.status === "soon") && alertBox) {
      const isExp = stats.status === "expired";
      const note = isExp ? "منتهي (" + m.end + ")" : "باقي " + (stats.diff === 0 ? "اليوم" : stats.diff + " أيام") + " (" + m.end + ")";
      const phone = m.phone.startsWith("0") ? "2" + m.phone : m.phone;
      const msg = encodeURIComponent("أهلاً " + m.name + "، تذكير من الجيم إن اشتراكك " + (isExp ? "انتهى" : "قرب يخلص") + "، بننتظرك للتجديد 💪");

      alertBox.innerHTML +=
        '<div class="alert-card ' + (isExp ? "" : "soon") + '">' +
          "<div>" +
            "<strong>" + m.name + "</strong>" +
            '<div class="muted-sm">' + note + "</div>" +
          "</div>" +
          '<div style="display:flex; gap:6px;">' +
            '<a href="https://wa.me/' + phone + "?text=" + msg + '" target="_blank" class="btn btn-sm btn-ghost" style="text-decoration:none;">واتساب</a>' +
            '<button class="btn btn-sm btn-success" onclick="renewMember(' + m.id + ')">تجديد</button>' +
          "</div>" +
        "</div>";
    }
  });

  document.getElementById("stTotal").textContent = members.length;
  document.getElementById("stActive").textContent = active;
  document.getElementById("stSoon").textContent = soon;
  document.getElementById("stExpired").textContent = expired;

  const alertTotal = soon + expired;
  const badge = document.getElementById("notifCountBadge");
  if (badge) {
    badge.textContent = alertTotal;
    badge.classList.toggle("empty", alertTotal === 0);
  }

  if (alertBox && alertTotal === 0) {
    alertBox.innerHTML = '<div class="form-box c-green" style="text-align:center;">✅ مفيش أي اشتراكات منتهية حالياً</div>';
  }
}

function renderMembers() {
  const q = (document.getElementById("searchInput") ? document.getElementById("searchInput").value : "").trim().toLowerCase();
  const f = document.getElementById("filterSelect") ? document.getElementById("filterSelect").value : "all";
  const list = document.getElementById("membersList");
  if (!list) return;
  list.innerHTML = "";

  const rows = members.filter(function (m) {
    const stats = getStats(m);
    const matchText = m.name.toLowerCase().includes(q) || m.phone.includes(q);
    const matchFilter = f === "all" || stats.status === f;
    return matchText && matchFilter;
  });

  if (!rows.length) {
    list.innerHTML = '<div class="form-box" style="text-align:center; color:var(--muted);">لا يوجد مشتركين مطابقين</div>';
    return;
  }

  rows.forEach(function (m) {
    const stats = getStats(m);
    const doneToday = m.lastIn === dayStr(0);

    let badge = '<span class="badge b-active">نشط • باقي ' + stats.diff + ' يوم</span>';
    if (stats.status === "expired") badge = '<span class="badge b-expired">منتهي</span>';
    else if (stats.status === "soon") badge = '<span class="badge b-soon">قرب ينتهي (' + stats.diff + ' يوم)</span>';

    const av = m.photo ? '<img src="' + m.photo + '" alt="' + m.name + '">' : m.name.charAt(0);

    list.innerHTML +=
      '<div class="member-card">' +
        '<div class="member-head">' +
          '<div class="avatar">' + av + "</div>" +
          "<div>" +
            "<strong>" + m.name + "</strong>" +
            "<div>" + badge + "</div>" +
          "</div>" +
        "</div>" +
        '<div class="att-strip">' +
          '<div><span class="c-green">' + m.present + "</span><small>حضور</small></div>" +
          '<div><span class="c-red">' + stats.absent + "</span><small>غياب</small></div>" +
          '<div><span class="c-primary">' + m.end + "</span><small>الانتهاء</small></div>" +
        "</div>" +
        '<div class="card-btns">' +
          '<button class="btn btn-sm ' + (doneToday ? "btn-ghost" : "btn-success") + '" onclick="checkIn(' + m.id + ')">' +
            (doneToday ? "✔️ حضر اليوم" : "✅ حضور") +
          "</button>" +
          '<button class="btn btn-sm btn-ghost" onclick="showCard(' + m.id + ')">الكارت</button>' +
          (stats.status !== "active" ? '<button class="btn btn-sm" onclick="renewMember(' + m.id + ')">تجديد</button>' : "") +
          '<button class="btn btn-sm btn-danger" style="flex:0;" onclick="removeMember(' + m.id + ')">🗑️</button>' +
        "</div>" +
      "</div>";
  });
}

function submitPlayerLogin(e) {
  e.preventDefault();
  const name = document.getElementById("plName").value.trim();
  const age = parseInt(document.getElementById("plAge").value, 10);
  if (!name || !age) return;
  currentPlayer = { name: name, age: age };
  persist();
  renderTourScreen();
}

function logoutPlayer() {
  stopTimer();
  currentPlayer = null;
  persist();
  renderTourScreen();
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return m + ":" + s;
}

function updateTimerText() {
  const el = document.getElementById("liveTimer");
  if (el) el.textContent = formatTime(elapsedSec);
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(function () {
    elapsedSec += 1;
    updateTimerText();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  elapsedSec = 0;
  updateTimerText();
}

function finishChallenge(e) {
  e.preventDefault();
  if (!currentPlayer) return;
  stopTimer();
  const mode = document.getElementById("chMode").value;
  const workout = document.getElementById("chWorkout").value.trim();
  const finalSec = Math.max(1, elapsedSec);

  tour.runs.push({
    id: Date.now(),
    name: currentPlayer.name,
    age: currentPlayer.age,
    mode: mode,
    workout: workout,
    seconds: finalSec
  });
  persist();
  elapsedSec = 0;
  updateTimerText();
  document.getElementById("chWorkout").value = "";
  renderLeaderboard();
  alert("🔥 تم تسجيل وقتك: " + formatTime(finalSec) + " — الأسرع يتصدر!");
}

function delRun(id) {
  tour.runs = tour.runs.filter(function (r) { return r.id !== id; });
  persist();
  renderLeaderboard();
}

function renderTourScreen() {
  const loginBox = document.getElementById("playerLoginBox");
  const arenaBox = document.getElementById("challengeArenaBox");
  if (!loginBox || !arenaBox) return;

  if (!currentPlayer) {
    loginBox.style.display = "block";
    arenaBox.style.display = "none";
  } else {
    loginBox.style.display = "none";
    arenaBox.style.display = "block";
    document.getElementById("activePlayerInfo").textContent =
      "المتسابق: " + currentPlayer.name + " (" + currentPlayer.age + " سنة)";
    updateTimerText();
  }
  renderLeaderboard();
}

function renderLeaderboard() {
  const box = document.getElementById("leaderList");
  if (!box) return;
  box.innerHTML = "";

  const sorted = tour.runs.slice().sort(function (a, b) { return a.seconds - b.seconds; });

  if (!sorted.length) {
    box.innerHTML = '<div class="form-box" style="text-align:center; color:var(--muted);">مفيش نتائج متسجلة لسه</div>';
    return;
  }

  sorted.forEach(function (r, idx) {
    const rank = idx + 1;
    box.innerHTML +=
      '<div class="leader-row">' +
        '<div style="display:flex; align-items:center; gap:10px;">' +
          '<div class="rank-num ' + (rank <= 3 ? "rank-" + rank : "") + '">#' + rank + "</div>" +
          "<div>" +
            "<strong>" + r.name + ' <span class="muted-sm">(' + r.age + " سنة)</span></strong>" +
            '<div class="muted-sm">' + r.mode + " • " + r.workout + "</div>" +
          "</div>" +
        "</div>" +
        '<div style="display:flex; align-items:center; gap:6px;">' +
          '<strong class="c-green">' + formatTime(r.seconds) + "</strong>" +
          '<button class="btn btn-sm btn-danger" onclick="delRun(' + r.id + ')">✕</button>' +
        "</div>" +
      "</div>";
  });
}

function renderAll() {
  renderCountsAndAlerts();
  renderMembers();
  renderTourScreen();
}

window.addEventListener("DOMContentLoaded", function () {
  const startInp = document.getElementById("mStart");
  if (startInp) {
    startInp.value = dayStr(0);
    calcEnd();
  }
  renderAll();
});

function finishChallenge(e) {
  e.preventDefault();
  if (!currentPlayer) return;
  stopTimer();

  const modeEl = document.getElementById("chMode");
  const workoutEl = document.getElementById("chWorkout");
  const mode = modeEl ? modeEl.value : "بطولة سرعة";
  const workout = workoutEl ? workoutEl.value.trim() : "تحدي الجيم";
  const finalSec = Math.max(1, elapsedSec);

  askConfirm({
    title: "تأكيد إنهاء التحدي",
    message: 'هل تريد تأكيد إنهاء "' + workout + '" وتسجيل وقتك (' + formatTime(finalSec) + ') في جدول الأسرع؟',
    icon: "🏁",
    okText: "تأكيد التسجيل",
    okClass: "btn-success",
    onConfirm: function () {
      tour.runs.push({
        id: Date.now(),
        name: currentPlayer.name,
        age: currentPlayer.age,
        mode: mode,
        workout: workout,
        seconds: finalSec
      });
      persist();
      elapsedSec = 0;
      updateTimerText();
      if (typeof renderLeaderboard === "function") {
        renderLeaderboard();
      }

      askConfirm({
        title: "تم تسجيل نتيجتك بنجاح",
        message: "🔥 وقتك: " + formatTime(finalSec) + " — تم إضافتك للجدول والأسرع يتصدر!",
        icon: "🏆",
        okText: "تمام",
        okClass: "btn-success",
        onConfirm: function () {}
      });
    }
  });
}
