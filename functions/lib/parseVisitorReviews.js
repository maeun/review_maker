"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const cheerio = __importStar(require("cheerio"));
function parseVisitorReviews(html) {
    const $ = cheerio.load(html);
    const reviews = [];
    $('li.place_apply_pui.EjjAW').each((_, element) => {
        const author = $(element).find('.pui__NMi-Dp').text().trim();
        const reviewText = $(element).find('.pui__vn15t2 a').text().trim();
        const votedKeywords = [];
        $(element).find('.pui__jhpEyP').each((_, keywordElement) => {
            votedKeywords.push($(keywordElement).text().trim());
        });
        if (author && reviewText) {
            reviews.push({
                author,
                reviewText,
                votedKeywords,
            });
        }
    });
    return reviews;
}
const htmlFilePath = path.resolve(process.cwd(), 'naver_place_review.html');
const outputFilePath = path.resolve(process.cwd(), 'functions', 'visitor_reviews.json');
fs.readFile(htmlFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the HTML file:', err);
        return;
    }
    const reviews = parseVisitorReviews(data);
    if (reviews.length === 0) {
        console.log('No reviews found.');
        return;
    }
    fs.writeFile(outputFilePath, JSON.stringify(reviews, null, 2), (err) => {
        if (err) {
            console.error('Error writing the JSON file:', err);
            return;
        }
        console.log(`Successfully extracted and saved ${reviews.length} visitor reviews to ${outputFilePath}`);
    });
});
//# sourceMappingURL=parseVisitorReviews.js.map