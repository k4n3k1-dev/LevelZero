// Maps character LEVEL (from XP/combat) to which of the 3 game LEVELS
// (floors/zones) is unlocked. These are two different meanings of
// "level" living side by side - LevelManager only concerns itself with
// the zone/floor progression.

const ZONE_THRESHOLDS = [
    { id: 1, name: 'Novice Floor', requiredCharacterLevel: 1 },
    { id: 2, name: 'Sunken Crypt', requiredCharacterLevel: 40 },
    { id: 3, name: 'Sky Throne', requiredCharacterLevel: 105 }
];

export class LevelManager {
    constructor() {
        this.currentZoneId = 1;
    }

    // Call this whenever the player's character level changes (i.e. from
    // Player.gainXp). Returns the zone id that should be active - does
    // NOT force a zone change itself, since reaching a threshold should
    // unlock a zone, not teleport the player into it mid-fight.
    getHighestUnlockedZone(characterLevel) {
        let unlocked = ZONE_THRESHOLDS[0];
        for (const zone of ZONE_THRESHOLDS) {
            if (characterLevel >= zone.requiredCharacterLevel) {
                unlocked = zone;
            }
        }
        return unlocked;
    }

    isZoneUnlocked(zoneId, characterLevel) {
        const zone = ZONE_THRESHOLDS.find((z) => z.id === zoneId);
        return zone ? characterLevel >= zone.requiredCharacterLevel : false;
    }

    getZoneInfo(zoneId) {
        return ZONE_THRESHOLDS.find((z) => z.id === zoneId) ?? null;
    }

    getAllZones() {
        return ZONE_THRESHOLDS;
    }
}
