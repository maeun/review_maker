"use strict";
// 기존 함수들
// export { crawl } from './crawl';
// export { generate } from './generate';
// export { generateVisitorReview } from './generateVisitorReview';
// export { generateBlogReview } from './generateBlogReview';
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBlogReviewText = exports.generateVisitorReviewText = exports.crawlBlogReviews = exports.crawlVisitorReviews = void 0;
// 신규 아키텍처 함수들
var crawlVisitorReviews_1 = require("./crawlVisitorReviews");
Object.defineProperty(exports, "crawlVisitorReviews", { enumerable: true, get: function () { return crawlVisitorReviews_1.crawlVisitorReviews; } });
var crawlBlogReviews_1 = require("./crawlBlogReviews");
Object.defineProperty(exports, "crawlBlogReviews", { enumerable: true, get: function () { return crawlBlogReviews_1.crawlBlogReviews; } });
var generateVisitorReviewText_1 = require("./generateVisitorReviewText");
Object.defineProperty(exports, "generateVisitorReviewText", { enumerable: true, get: function () { return generateVisitorReviewText_1.generateVisitorReviewText; } });
var generateBlogReviewText_1 = require("./generateBlogReviewText");
Object.defineProperty(exports, "generateBlogReviewText", { enumerable: true, get: function () { return generateBlogReviewText_1.generateBlogReviewText; } });
//# sourceMappingURL=index.js.map