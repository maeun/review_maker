"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeLogging = exports.completeRequest = exports.generateBlogReviewText = exports.generateVisitorReviewText = exports.crawlBlogReviews = exports.crawlVisitorReviews = exports.generate = exports.crawl = void 0;
// 기존 함수들 (삭제 방지를 위해 유지)
var crawl_1 = require("./crawl");
Object.defineProperty(exports, "crawl", { enumerable: true, get: function () { return crawl_1.crawl; } });
var generate_1 = require("./generate");
Object.defineProperty(exports, "generate", { enumerable: true, get: function () { return generate_1.generate; } });
// export { generateVisitorReview } from './generateVisitorReview';
// export { generateBlogReview } from './generateBlogReview';
// 신규 아키텍처 함수들
var crawlVisitorReviews_1 = require("./crawlVisitorReviews");
Object.defineProperty(exports, "crawlVisitorReviews", { enumerable: true, get: function () { return crawlVisitorReviews_1.crawlVisitorReviews; } });
var crawlBlogReviews_1 = require("./crawlBlogReviews");
Object.defineProperty(exports, "crawlBlogReviews", { enumerable: true, get: function () { return crawlBlogReviews_1.crawlBlogReviews; } });
var generateVisitorReviewText_1 = require("./generateVisitorReviewText");
Object.defineProperty(exports, "generateVisitorReviewText", { enumerable: true, get: function () { return generateVisitorReviewText_1.generateVisitorReviewText; } });
var generateBlogReviewText_1 = require("./generateBlogReviewText");
Object.defineProperty(exports, "generateBlogReviewText", { enumerable: true, get: function () { return generateBlogReviewText_1.generateBlogReviewText; } });
var completeRequest_1 = require("./completeRequest");
Object.defineProperty(exports, "completeRequest", { enumerable: true, get: function () { return completeRequest_1.completeRequest; } });
var initializeLogging_1 = require("./initializeLogging");
Object.defineProperty(exports, "initializeLogging", { enumerable: true, get: function () { return initializeLogging_1.initializeLogging; } });
//# sourceMappingURL=index.js.map