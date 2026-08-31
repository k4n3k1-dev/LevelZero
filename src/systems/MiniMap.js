// A lightweight top-down minimap. This is a 2D canvas drawing dots, not
// a second Three.js scene/camera - far cheaper to render every frame and
// plenty for showing relative position + points of interest.

export class MiniMap {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');

        // How many world units the map should show from edge to edge.
        // Smaller = more zoomed in. Tune per zone if zones differ in size.
        this.worldRange = options.worldRange ?? 60;

        // { x, z, color, label } - towns, checkpoints, etc.
        this.pointsOfInterest = options.pointsOfInterest ?? [];
    }

    setPointsOfInterest(points) {
        this.pointsOfInterest = points;
    }

    _worldToMap(worldX, worldZ) {
        const half = this.worldRange / 2;
        const nx = (worldX + half) / this.worldRange;
        const nz = (worldZ + half) / this.worldRange;
        return {
            x: nx * this.canvas.width,
            y: nz * this.canvas.height
        };
    }

    render(playerPosition, enemyPositions = []) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background grid, purely decorative
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            const p = (w / 4) * i;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, h);
            ctx.moveTo(0, p);
            ctx.lineTo(w, p);
            ctx.stroke();
        }

        // Points of interest (towns/checkpoints)
        for (const poi of this.pointsOfInterest) {
            const { x, y } = this._worldToMap(poi.x, poi.z);
            ctx.fillStyle = poi.color ?? '#ffd24a';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Enemies
        ctx.fillStyle = '#e33';
        for (const enemyPos of enemyPositions) {
            const { x, y } = this._worldToMap(enemyPos.x, enemyPos.z);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Player - always drawn last, on top, with a distinct marker
        const playerMapPos = this._worldToMap(playerPosition.x, playerPosition.z);
        ctx.fillStyle = '#4fc3ff';
        ctx.beginPath();
        ctx.arc(playerMapPos.x, playerMapPos.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}
