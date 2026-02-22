const laneTypes = ['TOP', 'JG', 'MID', 'ADC', 'SUP'];
const roleIcons = {
    'FILL': 'assets/icons/fill.png',
    'TOP': 'assets/icons/top.png',
    'JG': 'assets/icons/jg.png',
    'MID': 'assets/icons/mid.png',
    'ADC': 'assets/icons/adc.png',
    'SUP': 'assets/icons/sup.png'
};

const rankOrder = ["IRON", "BRONZE", "SILVER", "GOLD", "PLAT", "EMD", "DIA", "MASTER", "CHALL"];
const taunts = [
    "勝って当然。格が違うんだよね。",
    "対戦ありがとうございました（笑）",
    "格付け完了。次はもう少しマシな相手を連れてきて。",
    "試合前から結果は見えてた。時間の無駄だったね。",
    "座ってるだけで勝てるレベル。お疲れ様。",
    "これが『差』だよ。理解できた？",
    "負ける要素が1ミリもないんだけど。",
    "格下相手に本気を出すまでもなかったな。",
    "実力の違いを思い知らされた気分はどう？",
    "もはや虐殺。GGWP。"
];

function getRatingFromSlider(val) {
    return 300 + (val * 24);
}

function getRankNameFromSlider(val) {
    const index = Math.min(Math.floor(val / 11.12), rankOrder.length - 1);
    return rankOrder[index];
}

function init() {
    const grid = document.getElementById('playerInputs');
    grid.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        grid.innerHTML += createPlayerCard(i);
    }
    for (let i = 1; i <= 10; i++) {
        selectLane(i, 'FILL');
    }
}

function createPlayerCard(id) {
    const lanesWithFill = ['FILL', ...laneTypes];
    return `
        <div class="player-card" id="player-${id}">
            <div class="card-header">
                <span class="player-id">PLAYER ${String(id).padStart(2, '0')}</span>
                <input type="text" id="name-${id}" class="player-name-input" placeholder="Summoner Name" value="Player ${id}">
            </div>
            
            <div class="card-body">
                <div class="role-selector">
                    ${lanesWithFill.map(lane => `
                        <div class="role-icon-wrapper" id="btn-${id}-${lane}" onclick="selectLane(${id}, '${lane}')" title="${lane}">
                            <img src="${roleIcons[lane]}" alt="${lane}">
                        </div>
                    `).join('')}
                </div>
                <input type="hidden" id="lane-${id}" value="FILL">
                
                <div class="strength-control">
                    <div class="strength-header">
                        <span class="label">POWER LEVEL</span>
                        <span id="rank-${id}" class="rank-name">${rankOrder[3]}</span>
                    </div>
                    <div class="slider-box">
                        <input type="range" class="strength-slider" id="strength-${id}" min="0" max="100" value="40" oninput="updateStrength(${id}, this.value)">
                        <span id="val-${id}" class="rating-value">1260</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function updateStrength(id, value) {
    const rankLabel = document.getElementById(`rank-${id}`);
    const ratingLabel = document.getElementById(`val-${id}`);
    rankLabel.innerText = getRankNameFromSlider(value);
    ratingLabel.innerText = getRatingFromSlider(value);
}

function selectLane(playerId, lane) {
    const wrappers = document.querySelectorAll(`#player-${playerId} .role-icon-wrapper`);
    wrappers.forEach(w => w.classList.remove('active'));
    document.getElementById(`btn-${playerId}-${lane}`).classList.add('active');
    document.getElementById(`lane-${playerId}`).value = lane;
}

function assignLanesAndSort(team) {
    let remainingLanes = [...laneTypes];
    let unassigned = [];
    team.forEach(p => {
        if (p.wish !== "FILL" && remainingLanes.includes(p.wish)) {
            p.assignedLane = p.wish;
            remainingLanes = remainingLanes.filter(l => l !== p.wish);
            p.hasPenalty = false;
        } else { unassigned.push(p); }
    });
    unassigned.forEach(p => {
        p.assignedLane = remainingLanes.shift();
        p.hasPenalty = (p.wish !== "FILL" && p.assignedLane !== p.wish);
    });
    return team.sort((a, b) => laneTypes.indexOf(a.assignedLane) - laneTypes.indexOf(b.assignedLane));
}

function startMatching() {
    let allPlayers = [];
    for (let i = 1; i <= 10; i++) {
        const sliderVal = parseInt(document.getElementById(`strength-${i}`).value);
        allPlayers.push({
            name: document.getElementById(`name-${id = i}`).value || `P${i}`,
            wish: document.getElementById(`lane-${i}`).value,
            rankName: getRankNameFromSlider(sliderVal),
            rating: getRatingFromSlider(sliderVal)
        });
    }

    let team1, team2, p1, p2, wr1;
    let found = false;

    // シャッフルしてから試行（毎回ランダムな結果にするため）
    for (let i = 0; i < 3000; i++) {
        allPlayers.sort(() => Math.random() - 0.5);
        let t1_raw = assignLanesAndSort(JSON.parse(JSON.stringify(allPlayers.slice(0, 5))));
        let t2_raw = assignLanesAndSort(JSON.parse(JSON.stringify(allPlayers.slice(5, 10))));

        const calcP = (t) => t.reduce((s, p) => s + (p.hasPenalty ? p.rating - 250 : p.rating), 0);
        p1 = calcP(t1_raw);
        p2 = calcP(t2_raw);

        wr1 = 1 / (1 + Math.pow(10, (p2 - p1) / 1000));

        // 勝率 40%〜60% (50±10) の範囲内でバランス調整
        if (wr1 >= 0.4 && wr1 <= 0.6) {
            team1 = t1_raw;
            team2 = t2_raw;
            found = true;
            break;
        }
    }

    if (!found) {
        alert("バランスが取れる組み合わせを探しています... 再度クリックしてください。");
        return;
    }

    displayResults(team1, team2, wr1);
}

function displayResults(t1, t2, wr1) {
    const resDiv = document.getElementById('results');
    const t1Div = document.getElementById('team1');
    const t2Div = document.getElementById('team2');

    resDiv.style.display = 'grid';

    const getTaunt = (winRate) => {
        if (winRate < 0.52) return ""; // 僅差なら煽らない
        return taunts[Math.floor(Math.random() * taunts.length)];
    }

    const renderTeam = (team, title, wr, accentClass) => `
        <div class="team-header">
            <h3>${title}</h3>
            <div class="team-winrate ${accentClass}">${(wr * 100).toFixed(1)}% WIN</div>
        </div>
        <div class="taunt-box" style="text-align: center; color: #ffca6e; font-size: 0.8rem; font-weight: bold; margin-bottom: 15px; min-height: 1.2rem;">
            ${getTaunt(wr)}
        </div>
        <div class="player-list">
            ${team.map(p => `
                <div class="result-row">
                    <img src="${roleIcons[p.assignedLane]}" class="result-role-icon">
                    <div style="flex: 1; display: flex; align-items: center; justify-content: space-between;">
                        <span class="res-name">${p.name}</span>
                        ${p.hasPenalty ? `
                            <div class="off-role-badge" style="background: rgba(255, 78, 80, 0.2); border: 1px solid #ff4e50; color: #ff4e50; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 900; margin-left: 10px;">
                                OFF-ROLE (-250)
                            </div>
                        ` : ''}
                    </div>
                    <span class="res-rank">${p.rankName}</span>
                </div>
            `).join('')}
        </div>
        <div class="team-power">TOTAL POWER: ${team.reduce((s, p) => s + (p.hasPenalty ? p.rating - 250 : p.rating), 0)}</div>
    `;

    t1Div.innerHTML = renderTeam(t1, "BLUE TEAM", wr1, "blue-text");
    t2Div.innerHTML = renderTeam(t2, "RED TEAM", 1 - wr1, "red-text");
}

function resetForm() {
    location.reload();
}

window.onload = init;
