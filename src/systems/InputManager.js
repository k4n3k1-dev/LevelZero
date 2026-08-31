// Tracks keyboard + mouse state for the whole game. Other systems read
// from this each frame rather than attaching their own listeners, so
// there's one source of truth for "what is the player pressing right now".

export class InputManager {
    constructor(domElement) {
        this.domElement = domElement;

        // Movement keys currently held
        this.keys = {
            forward: false,
            back: false,
            left: false,
            right: false
        };

        // Fires once per keydown (not held) - consumed by CombatSystem
        // each frame via consumeAttackPress().
        this._attackPressQueue = [];

        // Attack key -> attack name. Extend this as you add more attacks.
        this.attackBindings = {
            Digit1: 'lightAttack',
            Digit2: 'heavyAttack',
            Digit3: 'skillAttack'
        };

        // Mouse-orbit state (drag with left button held to look around)
        this.isDragging = false;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        this._lastMouseX = 0;
        this._lastMouseY = 0;

        this._bindEvents();
    }

    _bindEvents() {
        window.addEventListener('keydown', (e) => this._onKeyDown(e));
        window.addEventListener('keyup', (e) => this._onKeyUp(e));

        this.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this._lastMouseX = e.clientX;
            this._lastMouseY = e.clientY;
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.mouseDeltaX += e.clientX - this._lastMouseX;
            this.mouseDeltaY += e.clientY - this._lastMouseY;
            this._lastMouseX = e.clientX;
            this._lastMouseY = e.clientY;
        });
    }

    _onKeyDown(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
            case 'KeyS': case 'ArrowDown': this.keys.back = true; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
        }

        const attackName = this.attackBindings[e.code];
        // repeat-guard: only queue on the actual first keydown, not
        // the browser's auto-repeat while held
        if (attackName && !e.repeat) {
            this._attackPressQueue.push(attackName);
        }
    }

    _onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
            case 'KeyS': case 'ArrowDown': this.keys.back = false; break;
            case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
            case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        }
    }

    // Call once per frame after you've read mouseDeltaX/Y, to avoid the
    // same drag motion being applied repeatedly across frames.
    consumeMouseDelta() {
        const dx = this.mouseDeltaX;
        const dy = this.mouseDeltaY;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        return { dx, dy };
    }

    // Returns and clears any attack keys pressed since the last call.
    consumeAttackPresses() {
        const presses = this._attackPressQueue;
        this._attackPressQueue = [];
        return presses;
    }
}
