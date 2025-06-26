"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPlaceId = extractPlaceId;
function extractPlaceId(url) {
    const match = url.match(/place\/(\d+)/);
    return match ? match[1] : null;
}
//# sourceMappingURL=extractPlaceId.js.map