/**
 * @file TilingManager.js
 * @brief Manages isohedral tiling logic using tactile.js
 */

import { IsohedralTiling } from './lib/tactile.js';

export class TilingManager {
    constructor() {
        this.tilingType = 1; // Default to Type 1 (Square)
        this.tiling = new IsohedralTiling(this.tilingType);
        this.params = this.tiling.getParameters(); // Default parameters

        // Initial log
        console.log('TilingManager initialized. Type:', this.tilingType);
        this.debugLogVertices();
    }

    setTilingType(type) {
        if (type < 1 || type > 93) {
            console.error('Invalid tiling type:', type);
            return;
        }
        this.tilingType = type;
        this.tiling = new IsohedralTiling(type);
        this.params = this.tiling.getParameters();
        console.log('Tiling type changed to:', type, 'Params:', this.params);
    }

    getTilingParams() {
        return this.params;
    }

    setTilingParams(params) {
        this.params = params;
        this.tiling.setParameters(params);
        this.debugLogVertices();
    }

    getVertices() {
        // Return vertices for the current parameters
        return this.tiling.vertices();
    }

    debugLogVertices() {
        const verts = this.getVertices();
        console.log('Current Shape Vertices:', verts);
    }

    getPrototilePath() {
        const verts = this.getVertices();
        if (!verts || verts.length === 0) return '';

        let d = `M ${verts[0].x} ${verts[0].y}`;
        for (let i = 1; i < verts.length; i++) {
            d += ` L ${verts[i].x} ${verts[i].y}`;
        }
        d += ' Z';
        return d;
    }

    *getTilesInRegion(xmin, ymin, xmax, ymax) {
        if (!this.tiling) return;
        for (const tile of this.tiling.fillRegionBounds(xmin, ymin, xmax, ymax)) {
            yield tile;
        }
    }
}
