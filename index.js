import mongoose from "mongoose";
import axios from "axios"

let key;
let secret;

class ApiLogger {
    constructor(apiKey, apiSecret) {
        key = apiKey;
        secret = apiSecret;

        if (!apiKey || !apiSecret) {
            if (!apiKey) {
                console.log("Please Provide apiKey");
            }
            if (!apiSecret) {
                console.log("Please Provide apiSecret");
            }
        }

        // Register uncaughtException handler
        process.on('uncaughtException', (err) => {
            if (err) {
                console.log("uncaughtException")
                this.storeError(err);
            }
        });


        // Register unhandledRejection handler
        process.on('unhandledRejection', (reason, promise) => {
            console.log("unhandledRejection")
            if (reason) {
                this.storeError(reason);
            }
        });

    }

    async storeError(err) {
        const { code, keyPattern } = err;
        if (code === 11000 && keyPattern) {
            return this.handleDuplicateKeyError(err);
        }
        if (err instanceof mongoose.Error.ValidationError) {
            return this.handleValidationError(err);
        }
        await this.sendErrorToApi(err.name, err.message, err.stack);
    }

    async caughtErrors(err) {
        const { code } = err;
        if (code === 11000) {
            return this.handleDuplicateKeyError(err);
        }
        if (err instanceof mongoose.Error.ValidationError) {
            return this.handleValidationError(err);
        }
        // console.log(err, "caughtErrors")
        await this.sendErrorToApi(err.name, err.message, err.stack);
    }

    async handleDuplicateKeyError(err) {
        const regex = /.*\{.*\:\s*"(.*)"\s*\}/; // Match the pattern: { key: "value" }
        const match = err.message.match(regex);
        if (match) {
            const duplicateValue = match[1];
            await this.sendErrorToApi("MongoDuplicateKeyError", `${duplicateValue} Already exists in DB`, err.stack);
        }
    }

    async handleValidationError(err) {
        for (const field in err.errors) {
            if (err.errors[field].kind === 'ObjectId') {
                // console.log(err, "handleValidationError");
                await this.sendErrorToApi(err.name, `Invalid ${field} ID provided!`, err.stack);
            } else {
                console.log(err.message);
            }
        }
    }

    async sendErrorToApi(errorName, errorMessage, errorStack) {
        try {
            const {data} = await axios.post("https://api.bugatlas.com/v1/api/errors",{
                    error_type: errorName,
                    error_message: errorMessage,
                    meta: {
                        meta: errorStack
                    }
                },
                {
                    headers: {
                        "api_key": key,
                        "secret_key": secret
                    }
                }
            );

            console.log("sendErrorToApiCompleted", data);
        } catch (error) {
            console.error("Error sending error to API:", error.message);
        }
    }

    createLog(req, res, next) {
        try {
            const startTime = new Date();
            let responseData = ''; // Variable to store response data

            res.on('finish', async () => {
                try {

                    const endTime = new Date();
                    const processTime = endTime - startTime;
                    // Create log data
                    const logData = {
                        request_user_agent: req.headers['user-agent'],
                        request_host: req.headers['origin'] || req.headers.host,
                        request_method: req.method,
                        payload: req.body,
                        protocol: req.protocol,
                        request_url: req.originalUrl,
                        type: res.statusCode !== 200 ? 2 : 1,
                        status_code: res.statusCode,
                        status_message: res.statusMessage,
                        content_length: `${res.get('Content-Length') || 0} bytes`,
                        requested_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                        remote_address: req.connection.remoteAddress,
                        request_ip: req.ip,
                        response_message: responseData?.message || '',
                        process_time: `${processTime} ${unitCalculation(processTime)}`,
                    };

                    if (res.statusCode !== 200 && res.statusCode !== 201) {
                        const data = await axios.post("https://api.bugatlas.com/v1/api/logs", {
                            request_url: req.originalUrl,
                            request_method: req.method,
                            payload: req.body,
                            meta: {
                                meta: responseData
                            }
                        }, {
                            headers: {
                                "api_key": key,
                                "secret_key": secret
                            }
                        });
                        // console.log("apiErrorData",data)
                    } else {
                        const data = await axios.post("https://api.bugatlas.com/v1/api/logs", logData, {
                            headers: {
                                "api_key": key,
                                "secret_key": secret
                            }
                        });

                        console.log(data, "apiLogData");
                    }
                    next();
                } catch (err) {
                    console.log('Error creating logs:', err.message);
                    next();
                }
            });

            // Override res.send to capture response data
            const originalSend = res.send;
            res.send = function (body) {
                responseData = body; // Capture response data
                originalSend.call(res, body); // Call the original send method
            };

            next();
        } catch (err) {
            console.log('Error in api logger middleware:', err.message);
            next();
        }
    }




}

export default ApiLogger;


const unitCalculation = (processTime) => {
    let unit = 'ms';

    // Convert to seconds if processTime is >= 1000 milliseconds
    if (processTime >= 1000) {
        if (processTime >= 60 * 60 * 1000) {
            // Convert to hours

            processTime /= 60 * 60 * 1000;
            unit = 'hrs';
        } else if (processTime >= 60 * 1000) {

            // Convert to minutes
            processTime /= 60 * 1000;
            unit = 'min';
        } else {

            // Convert to seconds
            processTime /= 1000;
            unit = 's';
        }
    }

    return unit;
}