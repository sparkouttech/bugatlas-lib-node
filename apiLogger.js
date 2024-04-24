import mongoose from "mongoose";

class ApiLogger {
    constructor() {
        // Register uncaughtException handler
        process.on('uncaughtException', (err) => {
            if (err) {
                // console.log("asfadfcadscasx", err)
                const stackTrace = err.stack.replace(/^Error: /, '');
                this.storeError(err.name, err.message, stackTrace);
            }
            process.exit(1); // Exit the process
        });


        // Register unhandledRejection handler
        process.on('unhandledRejection', (reason, promise) => {
            if (reason) {
                this.storeError(reason.name, reason.message, reason.stack);
            }
        });

    }

    storeError(errName, errMessage, errStack) {
        console.log("storeError")
        console.log(errName, "name")
        console.log(errMessage, "message")
        console.log(errStack, "stack")
    }

    caughtErrors(err){
        console.log("storeError")
        console.log(err.name, "name")
        console.log(err.message, "message")
        console.log(err.stack, "stack")
    }

    createLog(apiKey, apiSecret) {
        return async (err, req, res, next) => {
            // console.log(err,"err")

            try {
                if (!apiKey || !apiSecret) {
                    if (!apiKey) {
                        console.log("Please Provide apiKey");
                    }
                    if (!apiSecret) {
                        console.log("Please Provide apiSecret");
                    }
                    return next();
                }

                const { code, keyPattern } = err;

                if (code === 11000 && keyPattern) {
                    const regex = /\{ name: "(.*?)" \}/; // Match the pattern "{ name: "..." }"
                    const match = err.message.match(regex);
                    if (match) {
                        const duplicateValue = match[1];
                        this.storeError(err.name, duplicateValue + "Already exits in DB", err.stack);
                    }
                } else if (err instanceof mongoose.Error.ValidationError) {
                    for (const field in err.errors) {
                        if (err.errors[field].kind === 'ObjectId') {
                            this.storeError(err.name, `Invalid ${field} ID provided!`, err.stack);
                            // console.error("Casting error details:", err.errors[field]);
                        } else {
                            console.log(err.message);
                        }
                    }
                }else {
                    // console.log("error",err)
                    this.storeError(err.name, err.message, err.stack);
                }
                next();


                const startTime = new Date(); // Record the start time
                let responseData = ''; // Variable to store response data

                // Override res.send to capture response data
                const originalSend = res.send;
                res.send = function (body) {
                    responseData = JSON.parse(body); // Capture response data
                    originalSend.call(res, body); // Call the original send method
                };

                res.on('finish', async () => {
                    try {
                        const endTime = new Date();
                        const processTime = endTime - startTime;
                        // Create log data
                        const logData = {
                            apiKey,
                            apiSecret,
                            request_user_agent: req.headers['user-agent'],
                            request_host: req.headers['origin'] || req.headers.host,
                            method: req.method,
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
                            process_time: `${processTime} ${this.unitCalculation(processTime)}`, // using 'this' to refer to the class method
                        };
                        // Here you can perform the logging action using logData
                        console.log(logData);
                    } catch (err) {
                        console.log('Error creating logs:', err.message);
                    }
                });

                next();
            } catch (err) {
                console.log('Error in api logger middleware:', err.message);
                next();
            }
        }
    }

    unitCalculation(processTime) {
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
}

module.exports = new ApiLogger();
