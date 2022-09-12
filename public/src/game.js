const PLAYER_ON_FLOOR = '@';
const PLAYER_ON_TARGET = '+';
const BOX_ON_FLOOR = '$';
const BOX_ON_TARGET = '*';
const WALL = '#';
const TARGET = '.';
const FLOOR_INSIDE = '-';
const FLOOR_OUTSIDE = '_';

const DIRECTION = {
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
};

const DRAW_MODES = {
    FLAT: 'flat',
    INCLINED: 'inclined',
    ISOMETRIC: 'isometric',
};

let drawMode = DRAW_MODES.FLAT;

const savedProgress = localStorage.getItem('progress');
let progress = savedProgress ? parseInt(savedProgress, 10) : 0;

const splitLevels = levelsText.trim().split('\n\n');

const levelsSelect = document.getElementById('levels');
function drawLevelSelection() {
    levelsSelect.innerHTML = '';
    for (let i = 0; i < splitLevels.length; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.innerText = `Level ${i + 1}`;
        if (i > progress) {
            option.disabled = 'disabled';
        }
        levelsSelect.appendChild(option);
    }
}
drawLevelSelection();
levelsSelect.value = progress;

class Sokoban {
    constructor(levelText, levelIdx) {
        this.player = null;
        this.boxes = [];
        this.level = [];
        this.moves = 0;
        this.isWon = false;
        this.levelIdx = levelIdx;

        document.getElementById('win').style.display = 'none';
        document.getElementById('send').disabled = true;
        document.getElementById('moves').innerText = this.moves;

        const levelRows = levelText.split('\n');
        for (let y = 0; y < levelRows.length; y++) {
            const row = levelRows[y];
            const levelRowData = [];

            for (let x = 0; x < row.length; x++) {
                const char = row[x];

                switch (char) {
                    case PLAYER_ON_FLOOR:
                        if (this.player) {
                            throw new Error('Found multiple players');
                        }
                        this.player = { x, y };
                        levelRowData.push(FLOOR_INSIDE);
                        break;
                    case PLAYER_ON_TARGET:
                        if (this.player) {
                            throw new Error('Found multiple players');
                        }
                        this.player = { x, y };
                        levelRowData.push(TARGET);
                        break;
                    case BOX_ON_FLOOR:
                        this.boxes.push({ x, y });
                        levelRowData.push(FLOOR_INSIDE);
                        break;
                    case BOX_ON_TARGET:
                        this.boxes.push({ x, y });
                        levelRowData.push(TARGET);
                        break;
                    case WALL:
                    case TARGET:
                    case FLOOR_INSIDE:
                    case FLOOR_OUTSIDE:
                        levelRowData.push(char);
                        break;
                    default:
                        throw new Error('Discovered unknown level character: ' + char);
                }
            }

            this.level.push(levelRowData);
        }

        if (!this.player) {
            throw new Error('No player found!');
        }

        this.drawPlayfield();
        this.drawHighscores();
    }

    async drawHighscores() {
        const url = `/api/scores/${this.levelIdx}`;

        try {
            const response = await fetch(url);
            const scores = await response.json();
            scores.sort(function (a, b) {
                return a.score - b.score;
            });
            console.log('scores', scores);

            const table = document.getElementById('highscores');
            table.innerHTML = '';

            for (let i = 0; i < scores.length; i++) {
                const score = scores[i];
                const tr = document.createElement('tr');
                const positionCol = document.createElement('td');
                const nameCol = document.createElement('td');
                const movesCol = document.createElement('td');
                positionCol.innerText = i + 1;
                nameCol.innerText = score.name;
                movesCol.innerText = score.score;
                tr.appendChild(positionCol);
                tr.appendChild(nameCol);
                tr.appendChild(movesCol);
                table.appendChild(tr);
            }
        } catch (error) {
            console.error(error);
        }
        
    }

    drawPlayfield() {
        const playfield = document.getElementById('playfield');
        playfield.innerHTML = '';

        for (let y = 0; y < this.level.length; y++) {
            const row = this.level[y];
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                const img = document.createElement('img');
                this.drawImgAt(img, x, y);
                switch (char) {
                    case WALL:
                        img.src = `assets/${drawMode}/wall.png`;
                        img.alt = 'Wall';
                        break;
                    case TARGET:
                        img.src = `assets/${drawMode}/target.png`;
                        img.alt = 'Target';
                        break;
                    case FLOOR_INSIDE:
                        img.src = `assets/${drawMode}/floor.png`;
                        img.alt = 'Floor';
                        break;
                    case FLOOR_OUTSIDE:
                        img.src = `assets/${drawMode}/grass.png`;
                        img.alt = 'Grass';
                        break;
                }
                playfield.appendChild(img);
            }
        }

        const playerImg = document.createElement('img');
        this.drawImgAt(playerImg, this.player.x, this.player.y);
        playerImg.src = `assets/${drawMode}/player.png`;
        playerImg.alt = 'Player';
        playfield.appendChild(playerImg);
        this.player.img = playerImg;

        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            const boxImg = document.createElement('img');
            this.drawImgAt(boxImg, box.x, box.y);
            boxImg.src = `assets/${drawMode}/box.png`;
            boxImg.alt = 'Box';
            playfield.appendChild(boxImg);
            box.img = boxImg;
        }
    }

    move(direction) {
        if (this.isWon) {
            return;
        }
        let target;
        let boxTarget;
        switch (direction) {
            case DIRECTION.RIGHT:
                target = { x: this.player.x + 1, y: this.player.y };
                boxTarget = { x: this.player.x + 2, y: this.player.y };
                break;
            case DIRECTION.LEFT:
                target = { x: this.player.x - 1, y: this.player.y };
                boxTarget = { x: this.player.x - 2, y: this.player.y };
                break;
            case DIRECTION.DOWN:
                target = { x: this.player.x, y: this.player.y + 1 };
                boxTarget = { x: this.player.x, y: this.player.y + 2 };
                break;
            case DIRECTION.UP:
                target = { x: this.player.x, y: this.player.y - 1 };
                boxTarget = { x: this.player.x, y: this.player.y - 2 };
                break;
        }

        let canMove = true;

        // const box = this.boxes.find(function(b) {
        //     return b.x === target.x && b.y === target.y;
        // });

        // const box = this.boxes.find((b) => {
        //     return b.x === target.x && b.y === target.y;
        // });

        // const box = this.boxes.find((b) => b.x === target.x && b.y === target.y);

        const box = this.boxes.find(b => b.x === target.x && b.y === target.y);

        if (box) {
            const boxAtBoxTarget = this.boxes.find(b => b.x === boxTarget.x && b.y === boxTarget.y);

            if (boxAtBoxTarget || (this.level[boxTarget.y] && this.level[boxTarget.y][boxTarget.x] === WALL)) {
                canMove = false;
            } else {
                box.x = boxTarget.x;
                box.y = boxTarget.y;
                this.drawImgAt(box.img, box.x, box.y, direction);
            }
        } else {
            if (this.level[target.y] && this.level[target.y][target.x] === WALL) {
                canMove = false;
            }
        }

        if (canMove) {
            this.player.x = target.x;
            this.player.y = target.y;
            this.drawImgAt(this.player.img, this.player.x, this.player.y, direction);
            this.moves += 1;
            this.checkWin();
        }
        document.getElementById('moves').innerText = this.moves;
    }

    drawImgAt(img, x, y, direction) {
        switch (drawMode) {
            case DRAW_MODES.FLAT:
                img.style.width = '48px';
                img.style.height = '48px';
                img.style.left = `${x * 48}px`;
                img.style.top = `${y * 48}px`;
                break;
            case DRAW_MODES.INCLINED:
                img.style.width = '48px';
                img.style.height = '84px';
                img.style.left = `${x * 48}px`;
                img.style.top = `${y * 42}px`;
                if (direction === DIRECTION.UP) {
                    function transitionEnd() {
                        img.style.zIndex = y;
                        img.removeEventListener('transitionend', transitionEnd);
                    }
                    img.addEventListener('transitionend', transitionEnd);
                } else {
                    img.style.zIndex = y;
                }
                break;
            case DRAW_MODES.ISOMETRIC:
                img.style.width = '84px';
                img.style.height = '84px';
                img.style.left = `${((x - y) * 42) + (this.level.length * 42)}px`;
                img.style.top = `${(x + y) * 21}px`;
                if (direction === DIRECTION.UP || direction === DIRECTION.LEFT) {
                    function transitionEnd() {
                        img.style.zIndex = x + y;
                        img.removeEventListener('transitionend', transitionEnd);
                    }
                    img.addEventListener('transitionend', transitionEnd);
                } else {
                    img.style.zIndex = x + y;
                }
                break;
        }
    }

    checkWin() {
        this.isWon = true;
        for (let i = 0; i < this.boxes.length; i++) {
            const box = this.boxes[i];
            if (!this.level[box.y] || this.level[box.y][box.x] !== TARGET) {
                this.isWon = false;
            }
        }
        if (this.isWon) {
            document.getElementById('win').style.display = 'inline';
            document.getElementById('send').disabled = false;
            if (this.levelIdx >= progress) {
                progress += 1;
                localStorage.setItem('progress', progress);
                drawLevelSelection();
                levelsSelect.value = this.levelIdx;
            }
        }
    }
}

let game = new Sokoban(splitLevels[progress], progress);

// draw mode selection
const modeSelector = document.getElementById('drawmode');
modeSelector.addEventListener('change', function(event) {
    drawMode = event.target.value;
    game.drawPlayfield();
});

// level selection
levelsSelect.addEventListener('change', function(event) {
    console.log(event.target.value);
    const levelIdx = parseInt(event.target.value, 10);
    game = new Sokoban(splitLevels[levelIdx], levelIdx);
    levelsSelect.blur();
});

// reset button
document.getElementById('reset').addEventListener('click', function () {
    const levelIdx = parseInt(levelsSelect.value, 10);
    game = new Sokoban(splitLevels[levelIdx], levelIdx);
});

document.getElementById('send').addEventListener('click', async function () {
    if (game.isWon) {
        const name = document.getElementById('name').value.trim();
        if (name.length > 0) {
            const score = game.moves;
            const level = game.levelIdx;

            const url = '/api/scores';

            try {
                await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, score, level }),
                })
                document.getElementById('send').disabled = true;
                game.drawHighscores();
            } catch(error) {
                console.error(error);
            }
            
        }
    }
});

console.log('game', game);

document.getElementById('name').addEventListener('keydown', (e) => {
    e.stopPropagation();
});

// input handling
let lastAction = 0;
document.addEventListener('keydown', (e) => {
    const time = Date.now();
    if (time - lastAction > 300) {
        lastAction = time;
        console.log(e);
        switch (e.code) {
            case 'ArrowRight':
            case 'KeyD':
                game.move(DIRECTION.RIGHT);
                break;
            case 'ArrowLeft':
            case 'KeyA':
                game.move(DIRECTION.LEFT);
                break;
            case 'ArrowDown':
            case 'KeyS':
                game.move(DIRECTION.DOWN);
                break;
            case 'ArrowUp':
            case 'KeyW':
                game.move(DIRECTION.UP);
                break;
        }
    }
});