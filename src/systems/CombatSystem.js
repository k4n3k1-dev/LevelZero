// Ties Player, Enemy list, and InputManager together each frame.
// Auto-targeting: on an attack press, find the nearest *living* enemy
// within range and hit it - no click-to-target needed.

const ATTACK_STATS = {
    lightAttack: { damage: 10, range: 2.5 },
    heavyAttack: { damage: 22, range: 2.2 },
    // Per the level design: skillAttack is meant to unlock once the
    // player reaches a level threshold on Floor 1/2. Enforce that here
    // once you've decided the exact level - left open for now so you
    // can playtest without the gate getting in the way.
    skillAttack: { damage: 35, range: 4 }
};

export class CombatSystem {
    constructor({ player, enemies, scene, input, onEnemyKilled }) {
        this.player = player;
        this.enemies = enemies; // array of Enemy instances - mutated in place
        this.scene = scene;
        this.input = input;
        this.onEnemyKilled = onEnemyKilled ?? (() => {});
    }

    _findNearestEnemyInRange(range) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const dist = enemy.position.distanceTo(this.player.position);
            if (dist <= range && dist < nearestDist) {
                nearest = enemy;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    update(delta) {
        // Update enemy hit-flash timers etc. regardless of attacks this frame
        for (const enemy of this.enemies) {
            enemy.update(delta);
        }

        const presses = this.input.consumeAttackPresses();

        for (const attackName of presses) {
            const stats = ATTACK_STATS[attackName];
            if (!stats) continue;
            if (!this.player.canAttack(attackName)) continue;

            const target = this._findNearestEnemyInRange(stats.range);

            // Cooldown starts even on a whiff (no target in range) -
            // change this if you'd rather whiffed attacks be free.
            this.player.triggerCooldown(attackName);

            if (target) {
                target.takeDamage(stats.damage);

                if (target.isDead) {
                    this.player.gainXp(target.xpValue);
                    this.onEnemyKilled(target);
                }
            }
        }

        // Clean up dead enemies from the scene + array
        this.enemies = this.enemies.filter((enemy) => {
            if (enemy.isDead) {
                enemy.removeFromScene(this.scene);
                return false;
            }
            return true;
        });
    }
}
