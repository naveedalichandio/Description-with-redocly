const fs = require("fs");
const path = require("path");

const mainFolderPath = "collections";
const updatedMainFolderPath = `${mainFolderPath}_updated`;
// Ensure the updated main folder exists
const ensureDirectoryExists = (directory) => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// Function to process and update a single file
const processFile = (filePath, fileName, updatedFolderPath) => {
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error(`Error reading file ${fileName}:`, err);
      return;
    }

    try {
      let jsonData = JSON.parse(data);

      // Function to replace placeholders and modify URLs
      const processEndpoints = (json) => {
        json.item.forEach((item) => {
          if (item.request && item.request.url) {
            let url = item.request.url.raw;
            if (item.request.auth?.bearer?.[0]?.value) {
              let authValue = item?.request?.auth?.bearer[0]?.value || "";
              authValue = authValue.replace(
                /{{(.*?)}}/g,
                (_, placeholder) => placeholder
              );
              item.request.auth.bearer[0].value = authValue;
            }
            if (item.request.header[0]) {
              let headerValue = item?.request?.header[0]?.value || "";
              headerValue = headerValue.replace(
                /{{(.*?)}}/g,
                (_, placeholder) => placeholder
              );
              item.request.header[0].value = headerValue;
            }
            if (item.request.url.query) {
              item?.request?.url.query.forEach((query) => {
                let queryValue = query.value || "";
                queryValue = queryValue.replace(
                  /{{(.*?)}}/g,
                  (_, placeholder) => placeholder
                );
                query.value = queryValue;
              });
            }

            if (item.request?.body?.raw) {
              let bodyValue = item?.request?.body?.raw;
              bodyValue = bodyValue.replace(
                /{{(.*?)}}/g,
                (_, placeholder) => placeholder
              );
              item.request.body.raw = bodyValue;
            }

            url = url.replace(/{{endpoint}}/g, "http://localhost:3000");
            url = url.replace(/{{(.*?)}}/g, (_, placeholder) => placeholder);
            url = url.replace(/\/$/, "");

            item.request.url.raw = url;
            item.request.url.host = [url.split("/")[2]];
          }

          if (item.item) {
            processEndpoints(item);
          }
        });
      };

      processEndpoints(jsonData);

      const updatedJson = JSON.stringify(jsonData, null, 2);

      // Ensure the updated folder path exists
      ensureDirectoryExists(updatedFolderPath);

      const updatedFilePath = path.join(updatedFolderPath, `${fileName}`);

      fs.writeFile(updatedFilePath, updatedJson, "utf8", (err) => {
        if (err) {
          console.error(`Error writing file ${updatedFilePath}:`, err);
        } else {
          console.log(`File successfully updated: ${updatedFilePath}`);
        }
      });
    } catch (parseError) {
      console.error(`Error parsing JSON in file ${fileName}:`, parseError);
    }
  });
};

// Recursive function to traverse folders and process JSON files
const traverseFolders = (folderPath, updatedFolderPath) => {
  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error(`Error reading folder ${folderPath}:`, err);
      return;
    }

    entries.forEach((entry) => {
      const entryPath = path.join(folderPath, entry.name);
      const updatedEntryPath = path.join(updatedFolderPath, entry.name);

      if (entry.isDirectory()) {
        traverseFolders(entryPath, updatedEntryPath);
      } else if (entry.isFile() && path.extname(entry.name) === ".json") {
        processFile(entryPath, entry.name, updatedFolderPath);
      }
    });
  });
};

// Start the process
ensureDirectoryExists(updatedMainFolderPath);
traverseFolders(mainFolderPath, updatedMainFolderPath);
