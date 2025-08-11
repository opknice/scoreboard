// fcp_v2_assets/main.js

// 1. นำเข้าข้อมูลภาษาจากไฟล์ languages.js
import { translations } from './languages.js';
// 1. นำเข้าโมดูล (สำหรับ Firebase v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// 2. คอนฟิก Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBCC4P4EPj1W4Gu6ubI2xDozxpsCvJksOw",
  authDomain: "realtimescore-87528.firebaseapp.com",
  databaseURL: "https://realtimescore-87528-default-rtdb.firebaseio.com",
  projectId: "realtimescore-87528",
  storageBucket: "realtimescore-87528.firebasestorage.app",
  messagingSenderId: "354253424800",
  appId: "1:354253424800:web:a3554b47705a579d8d61c5",
  measurementId: "G-DZ43F4V999"
};

// 3. เริ่มต้นแอป และดึงอ็อบเจ็กต์ Database
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);



// --- DOM ELEMENTS ---
const $ = id => document.getElementById(id);
const elements = [
    "nameA", "nameB", "label1", "label2", "label3", "logoA", "logoB", "initialsA", "initialsB",
    "scoreA", "scoreB", "timerText", "halfText", "announcement-text", "matchID", 
    "colorA", "colorB", "colorA2", "colorB2",
    "countdownCheck", "languageSelector", "nameA-input", "nameB-input", "excelBtn", "loadBtn",
    "editBtnA", "okBtnA", "editBtnB", "okBtnB", "swapBtn", "scoreAPlusBtn", "scoreAMinusBtn",
    "scoreBPlusBtn", "scoreBMinusBtn", "resetScoreBtn", "halfBtn", "play1Btn", "play2Btn", "pauseBtn",
    "resetToStartBtn", "editTimeBtn", "settingsBtn", "copyBtn", "helpBtn", "donateBtn",
    "toast-container", "popupOverlay", "detailsPopup", "helpPopup", "donatePopup", "detailsText",
    "saveDetailsBtn", "closeDetailsBtn", "closeHelpBtn", "closeDonateBtn", "injuryTimeDisplay",
    "injuryTimePlusBtn", "injuryTimeMinusBtn", "resetToZeroBtn", "timeSettingsPopup",
    "startTimeMinutes", "startTimeSeconds", "saveTimeSettingsBtn", "saveAndUpdateTimeBtn", "closeTimeSettingsBtn",
    "timeSettingsError", "changelogBtn", "changelogPopup", "closeChangelogBtn",
    "logoPathBtn", "logoPathPopup", "currentLogoPath", "logoPathInput", "editLogoPathBtn", "closeLogoPathBtn",
    "halfpauseBtn", "fullEndBtn", "MatchSave"
].reduce((acc, id) => {
    acc[id.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())] = $(id);
    return acc;
}, {});


// --- STATE VARIABLES ---
let sheetData = [];
let currentLogoA = '', currentLogoB = '';
let scoreA = 0, scoreB = 0;
let timer = 0, interval = null, half = '1st';
let injuryTime = 0;
let isCountdown = false;
let countdownStartTime = 2700; // 45 minutes default
let currentLang = 'th';
let logoFolderPath = 'C:/OBSAssets/logos';

// --- OBS ---
const obs = new OBSWebSocket();
const setText = (source, text) => obs.call('SetInputSettings', { inputName: source, inputSettings: { text: String(text) } }).catch(err => {});
const setImage = (sourceName, filename) => {
    if (!filename) {
        obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { file: "" } }).catch(err => {});
        return;
    };
    const hasExt = /\.(png|jpe?g|gif|webp)$/i.test(filename);
    const filePath = `${logoFolderPath}/${filename}${hasExt ? '' : '.png'}`;
    obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { file: filePath } }).catch(err => {});
};
const setSourceColor = (sourceName, hexColor) => {
    const hexToObsColor = (hex) => {
        const cleanHex = hex.substring(1);
        const r = cleanHex.substring(0, 2);
        const g = cleanHex.substring(2, 4);
        const b = cleanHex.substring(4, 6);
        return parseInt("FF" + b + g + r, 16);
    };
    obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { color: hexToObsColor(hexColor) } }).catch(err => {});
};

// --- UI & Language ---
const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
};

const openPopup = (popup) => {
    elements.popupOverlay.style.display = 'block';
    popup.style.display = 'block';
};

const closeAllPopups = () => {
    elements.popupOverlay.style.display = 'none';
    elements.detailsPopup.style.display = 'none';
    elements.helpPopup.style.display = 'none';
    elements.donatePopup.style.display = 'none';
    elements.timeSettingsPopup.style.display = 'none';
    elements.changelogPopup.style.display = 'none';
    elements.logoPathPopup.style.display = 'none';
    elements.timeSettingsError.style.display = 'none';
};

const populateDynamicLists = (lang) => {
    const trans = translations[lang] || translations.en;
    // Details Popup
    const detailsListContainer = elements.detailsPopup.querySelector('.item-list');
    detailsListContainer.querySelectorAll('.item-list-item').forEach(item => item.remove());
    if (trans.tagsList) {
        trans.tagsList.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'item-list-item';
            listItem.innerHTML = `<code>${item.code}</code> <span>${item.desc}</span>`;
            detailsListContainer.appendChild(listItem);
        });
    }
    // Help Popup
    const helpListContainer = elements.helpPopup.querySelector('.item-list');
    helpListContainer.querySelectorAll('.item-list-item').forEach(item => item.remove());
    if (trans.sourcesList) {
        trans.sourcesList.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'item-list-item';
            listItem.innerHTML = `<code>${item.code}</code> <span>${item.desc}</span>`;
            helpListContainer.appendChild(listItem);
        });
    }
};

const setLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('scoreboardLang', lang);
    elements.languageSelector.value = lang;
    document.documentElement.lang = lang;
    const trans = translations[lang] || translations.en;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (trans[key]) el.textContent = trans[key];
    });
    document.querySelectorAll('[data-lang-title]').forEach(el => {
        const key = el.getAttribute('data-lang-title');
        if (trans[key]) el.title = trans[key];
    });
    document.querySelectorAll('[data-lang-html]').forEach(el => {
        const key = el.getAttribute('data-lang-html');
        if (trans[key]) el.innerHTML = trans[key];
    });

    // Update specific buttons that change text
    const editLogoPathBtnSpan = elements.editLogoPathBtn.querySelector('span');
    if (elements.logoPathInput.disabled) {
        editLogoPathBtnSpan.textContent = trans.edit;
    } else {
        editLogoPathBtnSpan.textContent = trans.save;
    }
    
    populateDynamicLists(lang);
};



// --- Scoreboard Logic ---
const getTeamInitials = (name) => name ? (name.split(' ').filter(Boolean).length >= 2 ? (name.split(' ')[0][0] + name.split(' ')[1][0]) : name.substring(0, 2)).toUpperCase() : '';

const updateTeamUI = (team, name, logoFile, color1, color2) => {
    const isA = team === 'A';
    const nameEl = isA ? elements.nameA : elements.nameB;
    const logoEl = isA ? elements.logoA : elements.logoB;
    const initialsEl = isA ? elements.initialsA : elements.initialsB;
    const colorEl1 = isA ? elements.colorA : elements.colorB;
    const colorEl2 = isA ? elements.colorA2 : elements.colorB2;

    const obsNameSource = isA ? 'name_team_a' : 'name_team_b';
    const obsLogoSource = isA ? 'logo_team_a' : 'logo_team_b';
    const obsColorSource1 = isA ? 'Color_Team_A' : 'Color_Team_B';
    const obsColorSource2 = isA ? 'Color_Team_A_2' : 'Color_Team_B_2';

    // โหลดสีที่เคยบันทึกไว้ ถ้ามี
    const savedColors = getTeamColors(name);
    const useColor1 = savedColors.color1 || color1;
    const useColor2 = savedColors.color2 || color2;

    nameEl.innerHTML = name.replace(/\//g, '<br>');
    colorEl1.value = useColor1;
    colorEl2.value = useColor2;
    initialsEl.textContent = getTeamInitials(name);
    logoEl.style.display = 'none';
    initialsEl.style.display = 'block';

    if (logoFile) {
        const hasExt = /\.(png|jpe?g|gif|webp)$/i.test(logoFile);
        logoEl.src = `file:///${logoFolderPath}/${logoFile}${hasExt ? '' : '.png'}`;
    }

    setText(obsNameSource, name.replace(/\//g, '\n'));
    setImage(obsLogoSource, logoFile);
    setSourceColor(obsColorSource1, useColor1);
    setSourceColor(obsColorSource2, useColor2);
};

const applyMatch = () => {
    if (!sheetData.length) return showToast(translations[currentLang].toastLoadFileFirst, 'error');
    const id = parseInt(elements.matchID.value);
    const header = sheetData[0];
    const match = sheetData.slice(1).find(r => parseInt(r[0]) === id);
    if (!match) return showToast(`${translations[currentLang].toastMatchNotFound} ${id}`, 'error');
    
    const get = key => match[header.indexOf(key)] || '';
    
    const teamAName = get('TeamA') || translations[currentLang].teamA;
    const teamBName = get('TeamB') || translations[currentLang].teamB;

    // โหลดสีที่เคยบันทึกไว้ ถ้ามี
    const savedA = getTeamColors(teamAName);
    const savedB = getTeamColors(teamBName);
    const colorA1 = savedA.color1 || get('ColorA') || '#ffffff';
    const colorB1 = savedB.color1 || get('ColorB') || '#ffffff';
    const colorA2 = savedA.color2 || get('ColorA2') || '#000000';
    const colorB2 = savedB.color2 || get('ColorB2') || '#000000';

    currentLogoA = get('LogoA');
    currentLogoB = get('LogoB');

    elements.label1.textContent = get('label1');
    elements.label2.textContent = get('label2');
    elements.label3.textContent = get('label3');
    
    updateTeamUI('A', teamAName, currentLogoA, colorA1, colorA2);
    updateTeamUI('B', teamBName, currentLogoB, colorB1, colorB2);

    setText('label_1', get('label1'));
    setText('label_2', get('label2'));
    setText('label_3', get('label3'));
    
    showToast(`${translations[currentLang].toastLoaded} ${id}`, 'success');
    resetToZero(); 
    resetScore();
    half = '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);

};

const swapTeams = () => {
    const [nameA, nameB] = [elements.nameA.innerHTML.replace(/<br\s*\/?>/gi, '/'), elements.nameB.innerHTML.replace(/<br\s*\/?>/gi, '/')];
    [scoreA, scoreB] = [scoreB, scoreA];
    [currentLogoA, currentLogoB] = [currentLogoB, currentLogoA];

    // โหลดสีที่เคยบันทึกไว้ ถ้ามี
    const savedA = getTeamColors(nameB);
    const savedB = getTeamColors(nameA);
    const colorA1 = savedA.color1 || '#ffffff';
    const colorA2 = savedA.color2 || '#000000';
    const colorB1 = savedB.color1 || '#ffffff';
    const colorB2 = savedB.color2 || '#000000';

    updateTeamUI('A', nameB, currentLogoA, colorA1, colorA2);
    updateTeamUI('B', nameA, currentLogoB, colorB1, colorB2);

    elements.scoreA.textContent = scoreA;
    setText('score_team_a', scoreA);
    elements.scoreB.textContent = scoreB;
    setText('score_team_b', scoreB);

    showToast(translations[currentLang].toastSwapped, 'info');
};

const changeScore = (team, delta) => {
    if (team === 'A') {
        scoreA = Math.max(0, scoreA + delta);
        elements.scoreA.textContent = scoreA;
        setText('score_team_a', scoreA);
    } else {
        scoreB = Math.max(0, scoreB + delta);
        elements.scoreB.textContent = scoreB;
        setText('score_team_b', scoreB);
    }
};

const resetScore = () => {
    scoreA = scoreB = 0;
    elements.scoreA.textContent = '0';
    elements.scoreB.textContent = '0';
    setText('score_team_a', '0');
    setText('score_team_b', '0');
    showToast(translations[currentLang].toastScoreReset, 'info');
};

const updateTimerDisplay = () => {
    const m = String(Math.floor(timer / 60)).padStart(2, '0');
    const s = String(timer % 60).padStart(2, '0');
    const timeString = `${m}:${s}`;
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
};

const startTimer1 = () => {
    half = '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);
    timer = 0;
    if (interval) return;
    interval = setInterval(() => {
        if (isCountdown) {
            if (timer > 0) timer--;
            else stopTimer();
        } else {
            timer++;
        }
        updateTimerDisplay();
    }, 1000);
};

const startTimer2 = () => {
    half = '2nd';
    elements.halfText.textContent = half;
    setText('half_text', half);
    timer = 900;
    if (interval) return;
    interval = setInterval(() => {
        if (isCountdown) {
            if (timer > 0) timer--;
            else stopTimer();
        } else {
            timer++;
        }
        updateTimerDisplay();
    }, 1000);
};

const stopTimer = () => { 
    clearInterval(interval);
    interval = null;
};

const halfpause = () => {
    const timeString = "HT";
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
    elements.halfText.textContent = timeString;
    setText('half_text', timeString);
    stopTimer();
};

const fulltime = () => {
    const timeString = "FT";
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
    elements.halfText.textContent = timeString;
    setText('half_text', timeString);
    stopTimer();
};


const resetToStartTime = () => {
    stopTimer();
    timer = countdownStartTime; 
    injuryTime = 0;
    updateTimerDisplay();
    updateInjuryTimeDisplay();
};

const resetToZero = () => {
    stopTimer();
    timer = 0;
    injuryTime = 0;
    updateTimerDisplay();
    updateInjuryTimeDisplay();
}

const saveinfo = () => {
  const now = Date.now();
  const matchInfo = {
    teamA: nameA.innerText,
    teamB: nameB.innerText,
    scoreA: parseInt(scoreA, 10),
    scoreB: parseInt(scoreB, 10),
    roundLabel: label2.innerText,
    timestamp: now,
    // ถ้าต้องการเก็บวันที่เป็น string
    date: new Date(now).toISOString().slice(0, 10) // format "YYYY-MM-DD"
  };

  push(ref(database, 'matches'), matchInfo)
    .then(() => alert('บันทึกคะแนนเรียบร้อยแล้ว'))
    .catch(err => alert('บันทึกไม่สำเร็จ: ' + err.message));
};


const openTimeSettings = () => {
    const minutes = Math.floor(countdownStartTime / 60);
    const seconds = countdownStartTime % 60;
    elements.startTimeMinutes.value = minutes;
    elements.startTimeSeconds.value = seconds;
    openPopup(elements.timeSettingsPopup);
};

const validateAndGetTime = () => {
    const trans = translations[currentLang] || translations.en;
    const minutes = parseInt(elements.startTimeMinutes.value, 10);
    const seconds = parseInt(elements.startTimeSeconds.value, 10);

    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
        elements.timeSettingsError.textContent = trans.toastInvalidTime;
        elements.timeSettingsError.style.display = 'block';
        return null;
    }
    return (minutes * 60) + seconds;
}

const saveTimeSettings = () => {
    const newTime = validateAndGetTime();
    if (newTime === null) return;
    
    countdownStartTime = newTime;
    localStorage.setItem('countdownStartTime', countdownStartTime);
    closeAllPopups();
    showToast(translations[currentLang].toastSaved, 'success');
};

const saveAndUpdateTime = () => {
    const newTime = validateAndGetTime();
    if (newTime === null) return;

    countdownStartTime = newTime;
    localStorage.setItem('countdownStartTime', countdownStartTime);
    
    timer = newTime;
    updateTimerDisplay();

    closeAllPopups();
    showToast(translations[currentLang].toastTimeSet, 'success');
}


const toggleHalf = () => {
    half = half === '1st' ? '2nd' : '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);
};

const updateInjuryTimeDisplay = () => {
    const displayString = injuryTime > 0 ? `+${injuryTime}` : '+0';
    elements.injuryTimeDisplay.textContent = displayString;
    setText('injury_time_text', displayString);
};

const changeInjuryTime = (delta) => {
    injuryTime = Math.max(0, injuryTime + delta);
    updateInjuryTimeDisplay();
};

const handleExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
                showToast(translations[currentLang].toastSuccess, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
};

const copyDetails = () => {
    const template = localStorage.getItem('detailsText') || '';
    if (!template.trim()) return showToast(translations[currentLang].toastNoTextToCopy, 'error');

    let teamAName = elements.nameA.innerHTML.replace(/<br\s*\/?>/gi, ' ');
    let teamBName = elements.nameB.innerHTML.replace(/<br\s*\/?>/gi, ' ');

    const filled = template
        .replace(/<TeamA>/gi, teamAName)
        .replace(/<TeamB>/gi, teamBName)
        .replace(/<label1>/gi, elements.label1.textContent)
        .replace(/<label2>/gi, elements.label2.textContent)
        .replace(/<label3>/gi, elements.label3.textContent)
        .replace(/<score_team_a>/gi, scoreA)
        .replace(/<score_team_b>/gi, scoreB)
        .replace(/<time_counter>/gi, elements.timerText.textContent)
        .replace(/<half_text>/gi, elements.halfText.textContent);
        
    navigator.clipboard.writeText(filled).then(()=>showToast(translations[currentLang].toastCopied,'info')).catch(err=>showToast(translations[currentLang].toastCopyFailed,'error'));
};

const enterEditMode = (team) => {
    const isA = team === 'A';
    const nameDiv = isA ? elements.nameA : elements.nameB;
    const nameInput = isA ? elements.nameAInput : elements.nameBInput;
    const editBtn = isA ? elements.editBtnA : elements.editBtnB;
    const okBtn = isA ? elements.okBtnA : elements.okBtnB;
    nameDiv.style.display = 'none';
    editBtn.style.display = 'none';
    nameInput.value = nameDiv.innerHTML.replace(/<br\s*\/?>/gi, '/');
    nameInput.style.display = 'block';
    okBtn.style.display = 'inline-flex';
    nameInput.focus();
};

const exitEditMode = (team, applyChanges) => {
    const isA = team === 'A';
    const nameDiv = isA ? elements.nameA : elements.nameB;
    const nameInput = isA ? elements.nameAInput : elements.nameBInput;
    const editBtn = isA ? elements.editBtnA : elements.editBtnB;
    const okBtn = isA ? elements.okBtnA : elements.okBtnB;
    if (applyChanges) {
        const newName = nameInput.value;
        const obsSourceName = isA ? 'name_team_a' : 'name_team_b';
        nameDiv.innerHTML = newName.replace(/\//g, '<br>');
        setText(obsSourceName, newName.replace(/\//g, '\n'));
        const initialsEl = isA ? elements.initialsA : elements.initialsB;
        initialsEl.textContent = getTeamInitials(newName.replace(/\//g, ' '));
        // โหลดสีที่เคยบันทึกไว้ ถ้ามี
        const savedColors = getTeamColors(newName);
        const colorEl1 = isA ? elements.colorA : elements.colorB;
        const colorEl2 = isA ? elements.colorA2 : elements.colorB2;
        colorEl1.value = savedColors.color1 || '#ffffff';
        colorEl2.value = savedColors.color2 || '#000000';
        setSourceColor(isA ? 'Color_Team_A' : 'Color_Team_B', colorEl1.value);
        setSourceColor(isA ? 'Color_Team_A_2' : 'Color_Team_B_2', colorEl2.value);
    }
    nameDiv.style.display = 'block';
    editBtn.style.display = 'inline-flex';
    nameInput.style.display = 'none';
    okBtn.style.display = 'none';
};

const setupEventListeners = () => {
    elements.languageSelector.addEventListener('change', (e) => setLanguage(e.target.value));
    elements.excelBtn.addEventListener('click', handleExcel);
    elements.loadBtn.addEventListener('click', applyMatch);
    // Previous/Next Match Buttons
    if (!elements.prevMatchBtn) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = translations[currentLang]?.prev || 'ก่อนหน้า';
        prevBtn.type = 'button';
        prevBtn.id = 'prev-match-btn';
        elements.matchID.parentNode.appendChild(prevBtn);
        elements.prevMatchBtn = prevBtn;
    }
    if (!elements.nextMatchBtn) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = translations[currentLang]?.next || 'ต่อไป';
        nextBtn.type = 'button';
        nextBtn.id = 'next-match-btn';
        elements.matchID.parentNode.appendChild(nextBtn);
        elements.nextMatchBtn = nextBtn;
    }

    elements.prevMatchBtn.addEventListener('click', () => {
        let id = parseInt(elements.matchID.value, 10) || 0;
        if (id > 1) {
            elements.matchID.value = id - 1;
            applyMatch();
        }
    });
    elements.nextMatchBtn.addEventListener('click', () => {
        let id = parseInt(elements.matchID.value, 10) || 0;
        elements.matchID.value = id + 1;
        applyMatch();
    });
    
    elements.swapBtn.addEventListener('click', swapTeams);
    elements.scoreAPlusBtn.addEventListener('click', () => changeScore('A', 1));
    elements.scoreAMinusBtn.addEventListener('click', () => changeScore('A', -1));
    elements.scoreBPlusBtn.addEventListener('click', () => changeScore('B', 1));
    elements.scoreBMinusBtn.addEventListener('click', () => changeScore('B', -1));
    elements.resetScoreBtn.addEventListener('click', resetScore);
    elements.halfBtn.addEventListener('click', toggleHalf);
    elements.play1Btn.addEventListener('click', startTimer1);
    elements.play2Btn.addEventListener('click', startTimer2);
    elements.halfpauseBtn.addEventListener('click', halfpause);
    elements.fullEndBtn.addEventListener('click', fulltime);
    elements.MatchSave.addEventListener('click', saveinfo);
    // elements.pauseBtn.addEventListener('click', stopTimer);
    elements.resetToStartBtn.addEventListener('click', resetToStartTime); 
    // elements.resetToZeroBtn.addEventListener('click', resetToZero);     
    elements.editTimeBtn.addEventListener('click', openTimeSettings);
    elements.countdownCheck.addEventListener('change', () => { isCountdown = elements.countdownCheck.checked; });
    elements.settingsBtn.addEventListener('click', () => { elements.detailsText.value = localStorage.getItem('detailsText') || ''; openPopup(elements.detailsPopup); });
    elements.copyBtn.addEventListener('click', copyDetails);
    elements.helpBtn.addEventListener('click', () => openPopup(elements.helpPopup));
    elements.donateBtn.addEventListener('click', () => openPopup(elements.donatePopup));
    elements.changelogBtn.addEventListener('click', () => openPopup(elements.changelogPopup));
    elements.popupOverlay.addEventListener('click', closeAllPopups);

    // Details Popup
    elements.saveDetailsBtn.addEventListener('click', () => { localStorage.setItem('detailsText', elements.detailsText.value); closeAllPopups(); showToast(translations[currentLang].toastSaved, 'success'); });
    elements.closeDetailsBtn.addEventListener('click', closeAllPopups);
    
    // Other Popups Close Buttons
    elements.closeHelpBtn.addEventListener('click', closeAllPopups);
    elements.closeDonateBtn.addEventListener('click', closeAllPopups);
    elements.closeChangelogBtn.addEventListener('click', closeAllPopups);
    elements.closeTimeSettingsBtn.addEventListener('click', closeAllPopups);
    elements.closeLogoPathBtn.addEventListener('click', closeAllPopups);
    
    // Time Settings
    elements.saveTimeSettingsBtn.addEventListener('click', saveTimeSettings);
    elements.saveAndUpdateTimeBtn.addEventListener('click', saveAndUpdateTime);

    // Edit Name
    elements.editBtnA.addEventListener('click', () => enterEditMode('A'));
    elements.okBtnA.addEventListener('click', () => exitEditMode('A', true));
    elements.editBtnB.addEventListener('click', () => enterEditMode('B'));
    elements.okBtnB.addEventListener('click', () => exitEditMode('B', true));
    
    // Colors
    elements.colorA.addEventListener('input', (e) => {
        setSourceColor('Color_Team_A', e.target.value);
    });
    elements.colorA2.addEventListener('input', (e) => {
        setSourceColor('Color_Team_A_2', e.target.value);
    });
    elements.colorB.addEventListener('input', (e) => {
        setSourceColor('Color_Team_B', e.target.value);
    });
    elements.colorB2.addEventListener('input', (e) => {
        setSourceColor('Color_Team_B_2', e.target.value);
    });

    // Save Color Buttons
    // Create save buttons if not exist
    if (!elements.colorASaveBtn) {
        const saveBtnA = document.createElement('button');
        saveBtnA.textContent = 'บันทึกชุด A';
        saveBtnA.type = 'button';
        saveBtnA.id = 'colorA-save-btn';
        elements.colorA.parentNode.appendChild(saveBtnA);
        elements.colorASaveBtn = saveBtnA;
    }
    if (!elements.colorBSaveBtn) {
        const saveBtnB = document.createElement('button');
        saveBtnB.textContent = 'บันทึกชุด B';
        saveBtnB.type = 'button';
        saveBtnB.id = 'colorB-save-btn';
        elements.colorB.parentNode.appendChild(saveBtnB);
        elements.colorBSaveBtn = saveBtnB;
    }

    elements.colorASaveBtn.addEventListener('click', () => {
        const teamAName = elements.nameA.innerHTML.replace(/<br\s*\/?>/gi, '/');
        setTeamColors(teamAName, {
            color1: elements.colorA.value,
            color2: elements.colorA2.value
        });
        showToast(translations[currentLang]?.toastSaved || 'Saved', 'success');
    });

    elements.colorBSaveBtn.addEventListener('click', () => {
        const teamBName = elements.nameB.innerHTML.replace(/<br\s*\/?>/gi, '/');
        setTeamColors(teamBName, {
            color1: elements.colorB.value,
            color2: elements.colorB2.value
        });
        showToast(translations[currentLang]?.toastSaved || 'Saved', 'success');
    });
    
    // Injury Time
    elements.injuryTimePlusBtn.addEventListener('click', () => changeInjuryTime(1));
    elements.injuryTimeMinusBtn.addEventListener('click', () => changeInjuryTime(-1));
    
    // Logo Path Settings
    elements.logoPathBtn.addEventListener('click', () => openPopup(elements.logoPathPopup));
    elements.editLogoPathBtn.addEventListener('click', () => {
        const trans = translations[currentLang] || translations.en;
        const btnSpan = elements.editLogoPathBtn.querySelector('span');

        if (elements.logoPathInput.disabled) { // Enter edit mode
            elements.logoPathInput.disabled = false;
            elements.logoPathInput.focus();
            btnSpan.textContent = trans.save;
        } else { // Save changes
            const newPath = elements.logoPathInput.value.trim();
            logoFolderPath = newPath;
            localStorage.setItem('logoFolderPath', newPath);
            elements.currentLogoPath.textContent = newPath;
            elements.logoPathInput.disabled = true;
            btnSpan.textContent = trans.edit;
            showToast(trans.toastSaved, 'success');
        }
    });
};


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings from localStorage
    const savedLang = localStorage.getItem('scoreboardLang') || 'th';
    const savedTime = localStorage.getItem('countdownStartTime');
    if (savedTime) {
        countdownStartTime = parseInt(savedTime, 10);
    }
    const savedPath = localStorage.getItem('logoFolderPath');
    if (savedPath) {
        logoFolderPath = savedPath;
    }
    elements.logoPathInput.value = logoFolderPath;
    elements.currentLogoPath.textContent = logoFolderPath;

    setupEventListeners();
    setLanguage(savedLang);
    resetToZero(); 
    resetScore();
    updateInjuryTimeDisplay();
    obs.connect('ws://localhost:4455').catch(err => showToast(translations[currentLang].toastObsError, 'error'));
});

// --- TEAM COLOR MEMORY ---
const TEAM_COLOR_KEY = 'teamColors';
function getTeamColors(teamName) {
    if (!teamName) return {};
    const all = JSON.parse(localStorage.getItem(TEAM_COLOR_KEY) || '{}');
    return all[teamName] || {};
}
function setTeamColors(teamName, colors) {
    if (!teamName) return;
    const all = JSON.parse(localStorage.getItem(TEAM_COLOR_KEY) || '{}');
    all[teamName] = { ...all[teamName], ...colors };
    localStorage.setItem(TEAM_COLOR_KEY, JSON.stringify(all));
}


document.querySelectorAll('.quick-color_B').forEach(el => {
    el.addEventListener('click', function() {
        document.getElementById('colorB').value = this.dataset.color;
        document.getElementById('colorB').dispatchEvent(new Event('input', { bubbles: true }));
    });
});
 document.querySelectorAll('.quick-color_A').forEach(el => {
    el.addEventListener('click', function() {
        document.getElementById('colorA').value = this.dataset.color;
        document.getElementById('colorA').dispatchEvent(new Event('input', { bubbles: true }));
    });
});



// function realtime scoreboard update --------------------------------------------------

