// Browser-local save system. No backend involved - this is what makes
// "checkpoint and save progress" possible on a static-file-only host
// like the LAMP server. Progress persists across page reloads on the
// SAME browser/device only - it is not an account system and does not
// sync across devices. Be upfront about that distinction if asked about
// it in your demo; overclaiming it as a "save system" without that
// caveat is the kind of thing that gets picked apart under questioning.

const SAVE_KEY = 'ascendant_save_v1';

export const SaveSystem = {
    save(state) {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify({
                ...state,
                savedAt: Date.now()
            }));
            return true;
        } catch (err) {
            console.error('Save failed (localStorage unavailable or full):', err);
            return false;
        }
    },

    load() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            console.error('Load failed (corrupted save data):', err);
            return null;
        }
    },

    hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    },

    clear() {
        localStorage.removeItem(SAVE_KEY);
    }
};

// Call this from a checkpoint trigger (e.g. entering a town) with the
// current player + zone state.
export function saveCheckpoint(player, currentZoneId, characterClass, tintColor) {
    return SaveSystem.save({
        level: player.level,
        xp: player.xp,
        xpToNextLevel: player.xpToNextLevel,
        maxHp: player.maxHp,
        hp: player.hp,
        currentZoneId,
        characterClass,
        tintColor
    });
}

// Applies a loaded save's stats back onto a Player instance. Call after
// the player + its model are already constructed.
export function applySaveToPlayer(player, saveData) {
    player.level = saveData.level;
    player.xp = saveData.xp;
    player.xpToNextLevel = saveData.xpToNextLevel;
    player.maxHp = saveData.maxHp;
    player.hp = saveData.hp;
}
