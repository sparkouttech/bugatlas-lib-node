# bugatlas

[![npm version](https://img.shields.io/npm/v/bugatlas.svg)](https://www.npmjs.com/package/bugatlas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`bugatlas` is a Node.js module designed for logging API requests, responses, and errors to an external API service. It provides an easy way to track API usage, monitor errors, and analyze response data.

## Installation

To use `bugatlas`, you need to have Node.js and npm installed on your machine. If you don't have them, you can download and install them from the official Node.js website (https://nodejs.org).

To install the package, run the following command in your project directory:

```
npm install bugatlas
```

## Usage

Here are the utility functions provided by `bugatlas` along with examples:

```javascript
import ApiLogger from "bugatlas";
```

### `const apiLogger = new ApiLogger("YourApiKey", "YourSecretKey");`

**Example:**

```javascript
`index.js`
import express from "express";
import { connectDB } from "./config/db";
import router from "./router/router";
import { config } from "dotenv";
import ApiLogger from "bugatlas";

config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

connectDB();

const apiLogger = new ApiLogger("YourApiKey", "YourSecretKey");// Initialize ApiLogger with your API key and secret

app.use(apiLogger.createLog);//add apiLogger as middleware in your express application

app.use("/", router);// Your routes and other middleware

// Start the server
app.listen(PORT, () => {
  console.log("Server is up and running on port " + PORT);
});
```

### `import { apiLogger } from "../index.js"`

Handle Errors in api `routes`.

**Example:**

```javascript
`router.js`
import { Project } from "../model/project";
import { responseHandler } from "../response/responseHandler";
import ApiLogger from "bugatlas";

const apiLogger = new ApiLogger("YourApiKey", "YourSecretKey") // Initialize ApiLogger with your API key and secret

export const createProject = async (req, res) => {
    try {
        const project = await Project.create(req.body)
        if(project)responseHandler(res, 200, "Project created successfully", project,true)
    } catch (error) {
        await apiLogger.caughtErrors(error)
        responseHandler(res, 400, error.message, {}, false)
    }
}
```





