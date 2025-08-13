import * as fs from "fs";
import * as path from "path";
import * as cheerio from "cheerio";

interface Review {
  author: string;
  reviewText: string;
  votedKeywords: string[];
}

function parseVisitorReviews(html: string): Review[] {
  const $ = cheerio.load(html);
  const reviews: Review[] = [];

  $("li.place_apply_pui.EjjAW").each((_: any, element: any) => {
    const author = $(element).find(".pui__NMi-Dp").text().trim();
    const reviewText = $(element).find(".pui__vn15t2 a").text().trim();
    const votedKeywords: string[] = [];
    $(element)
      .find(".pui__jhpEyP")
      .each((_: any, keywordElement: any) => {
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

const htmlFilePath = path.resolve(process.cwd(), "naver_place_review.html");
const outputFilePath = path.resolve(
  process.cwd(),
  "functions",
  "visitor_reviews.json"
);

fs.readFile(htmlFilePath, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading the HTML file:", err);
    return;
  }

  const reviews = parseVisitorReviews(data);

  if (reviews.length === 0) {
    console.log("No reviews found.");
    return;
  }

  fs.writeFile(outputFilePath, JSON.stringify(reviews, null, 2), (err) => {
    if (err) {
      console.error("Error writing the JSON file:", err);
      return;
    }
    console.log(
      `Successfully extracted and saved ${reviews.length} visitor reviews to ${outputFilePath}`
    );
  });
});
