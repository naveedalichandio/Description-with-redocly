const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

let message =
  "Read all the provided data and provide me with detailed description of each and every data in this endpoint. your response will be automatically saved in description field of postman api collection so please don't write anything that makes sense that its written by openAi, Just write the description of each data in plain english for other users who will use my collection. Refactor the each data";

const OPENAI_API_KEY = process.env.apiKey;
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

// Function to generate documentation using OpenAI
async function generateDocumentation(endpointDetails, message) {
  console.log("Generating documentation...");
  const response = await axios.post(
    OPENAI_URL,
    {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a documentation generator.",
        },
        {
          role: "user",
          content: `${message} ${JSON.stringify(endpointDetails, null, 2)}`,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content;
}

// Extract and process collection data
let copiedData = [];
async function processCollection(collection, fileName) {
  try {
    let finalDocuments = [];

    console.log("Processing collection", collection.item.length);

    let count = 0;

    for (let item of collection.item) {
      count += 1;
      console.log("progress: " + count);
      const endpointDetails = {
        name: item.name,
        request: {
          auth: item.request.auth,
          method: item.request.method,
          url: item.request.url?.raw,
          headers: item.request.header,
          body: item.request.body,
        },
      };
      let description = "";

      description = await generateDocumentation(endpointDetails, message);

      item.request.description = description;

      copiedData.push(item);

      finalDocuments.push(item);
    }
    let endResult = {
      info: collection.info,
      item: finalDocuments, //documentation,
    };

    // const outputPath = "ArticleSubCategory.postman_collection.json";
    fs.writeFileSync(fileName, JSON.stringify(endResult, null, 2));
    console.log(`Documentation generated successfully! Saved to ${fileName}`);
  } catch (error) {
    let endResult = {
      info: collection.info,
      item: copiedData, //documentation,
    };
    fs.writeFileSync(fileName, JSON.stringify(endResult, null, 2));
    console.log(`Documentation generated successfully! Saved to ${fileName}`);
    console.log(`Documentation didn't generate`, error.response.data);
  }
}

const folderPath = "./action";

(async () => {
  try {
    fs.readdir(folderPath, async (err, files) => {
      try {
        let totalHits = 0;
        console.log({ files });
        for (const file of files) {
          if (
            (path.extname(file) === ".json" && file === "ActionRequest.json") ||
            file === "ActionSearch.json" ||
            file === "ActionSticker.json" ||
            file === "ActionSuspend.json" ||
            file === "ActionUnlock.json"
          ) {
            const filePath = path.join(folderPath, file);
            const fileContent = fs.readFileSync(filePath, "utf8");
            const jsonData = JSON.parse(fileContent);
            totalHits += jsonData.item.length;
            await processCollection(jsonData, filePath).catch((err) =>
              console.error(err)
            );
          }
        }
        console.log(`Total hits: ${totalHits}`);
      } catch (error) {
        console.error("Error processCollection JSON files:", error);
      }
    });
  } catch (err) {
    console.error("Error reading JSON files:", err);
  }
})();
