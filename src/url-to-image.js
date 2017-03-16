// PhantomJS script
// Takes screenshot of a given page. This correctly handles pages which
// dynamically load content making AJAX requests.

// Instead of waiting fixed amount of time before rendering, we give a short
// time for the page to make additional requests. (abstracted)

// Phantom internals
var system = require('system');
var webPage = require('webpage');
var fs = require('fs');
var color = require('./color.js');

function main() {
    // I tried to use yargs as a nicer commandline option parser but
    // it doesn't run in phantomjs environment
    var args = system.args;
    var opts = {
        url: args[1],
        filePath: args[2],
        width: args[3],
        height: args[4],
        requestTimeout: args[5],
        maxTimeout: args[6],
        verbose: args[7] === 'true',
        fileType: args[8],
        fileQuality: args[9] ? args[9] : 100,
        cropWidth: args[10],
        cropHeight: args[11],
        cropOffsetLeft: args[12] ? args[12] : 0,
        cropOffsetTop: args[13] ? args[13] : 0,
        timestamps: args[14] ? args[14] : 0,
        wait: args[15] ? args[15] : 0,
        script: args[16] ? args[16] : 0,
    };

    renderPage(opts);

}

function renderPage(opts) {
    var startTime = Date.now();
    var requestCount = 0;
    var forceRenderTimeout;
    var dynamicRenderTimeout;
    var firstResponseFlag = false;
    var completedRequests = [];
    var pageReadyState = false;
    var readyState = false;
    var limiterVar;
    var htmlLoadedTime;
    var pageReadyTime;
    var beginRenderingTime;
    var waitBeforeRender = 0;
    var minimumWaitingTime = 500;
    var pageCheckInterval;
    var checkCheckInterval;
    var waitInterval;
    var successCallbacks = 0;
    var checkingInterval = 100;
    var numChecks = 0;
    var externalScript;
    var maxUrlLength = 128;
    var isAdRapid = false;
    var page = webPage.create();

    if(opts.script !== 'false') {
        var scriptPath = (opts.script[0] === '.')
            ? system.env.PWD + 'src/' + opts.script.replace('./', '')
            : opts.script
        ;
        
        if(scriptPath.indexOf('.js') < 1) scriptPath += '.js';

        if(fs.exists(scriptPath)) {
            log('Loading script:', scriptPath);
            externalScript = require(scriptPath);
            if(typeof externalScript.start === 'function') externalScript.start();
        } else {
            log('Script not found @', scriptPath);
        }
    }

    page.viewportSize = {
        width: opts.width,
        height: opts.height
    };

    // Silence confirmation messages and errors
    page.onConfirm = page.onPrompt = function noOp() {
    };
    
    page.onError = function (err) {
        log('Page error:', err);
    };

    page.onConsoleMessage = function(msg, lineNum, sourceId) {
        log(color.cyan('CONSOLE:'), msg);
    };

    page.onResourceRequested = function (request) {
        if(request.url.length > maxUrlLength) request.url = request.url.substring(0, maxUrlLength) + '[...]';
        log(color.cyan('▶'), color.dim(request.method), request.url);
        requestCount += 1;
        clearTimeout(dynamicRenderTimeout);
    };

    page.onResourceReceived = function (response) {
        var responseString = '[' + response.status + '] ' + response.url;

        // avoid logging the same request multiple times
        if(completedRequests.indexOf(responseString) === -1) {
            if(response.url.length > maxUrlLength) response.url = response.url.substring(0, maxUrlLength) + '[...]';
            log(color.magenta('◀'), color.dim(response.status), response.url);
            completedRequests.push(responseString);
        }

        if (!response.stage || response.stage === 'end') {
            // start force rendering timer now that we have a 200 response
            if (firstResponseFlag === true && response.status == 200) {
                firstResponseFlag = false;
                forceRenderTimeout = setTimeout(beginRenderAndExit, opts.maxTimeout);
            }

            requestCount -= 1;
            if (requestCount === 0 && successCallbacks === 0) {
                dynamicRenderTimeout = setTimeout(beginRenderAndExit, opts.requestTimeout);
            }
        }
    };

    //start the the timer to force rendering once the first request is made.
    page.onLoadStarted = function () {
        firstResponseFlag = true;
    };

    // direct callback that PhantomJS page.open uses.
    page.onLoadFinished = function (status) {
        if (status !== 'success') {
            log('Unable to load url:', opts.url);
            phantom.exit(10);
        } else {
            beginRenderAndExit();
        }
    };

    page.open(opts.url, function (status) {
        startReadyStateCheck();
    });


    function log() {
        // PhangomJS doesn't stringify objects very well, doing that manually
        if (opts.verbose) {
            var args = Array.prototype.slice.call(arguments);

            var str = '';
            args.forEach(function (arg) {
                if (isString) {
                    str += arg;
                } else {
                    str += JSON.stringify(arg, null, 2);
                }

                str += ' '
            });

            if(opts.timestamps === 'true') str = color.dim((getElapsedTime() / 1000).toFixed(3) + ' ') + str;
            console.log(str);
        }
    }

    function checkReadyState() {
        log('Checking readyState, checked', (numChecks++), 'times, readyState? ', readyState);
        
        if(pageReadyState === true) {
            clearTimeout(checkCheckInterval);
            return true;
        } else {
            readyState = (externalScript && typeof externalScript.callback === 'function') 
                ? externalScript.callback(page)
                : checkDocumentReadyState()
            ;

            if(readyState === true) onPageReady();
        }
    }

    function onPageReady() {
        if(readyState === true && limiterVar !== 'test') {
            log(color.green('Got page readyState!'));
            pageReadyState = true;
            isAdRapid = isAdrapid(); // determine if the banner is an AdRapid banner
            pageReadyTime = getElapsedTime();
            clearTimeout(pageCheckInterval);
            clearTimeout(checkCheckInterval);
            limiterVar = 'test';
        }
    }

    function startReadyStateCheck() {
        if(pageReadyState !== true && !limiterVar) {
            checkCheckInterval = setInterval(checkReadyState, checkingInterval);
        }
    }

    function checkDocumentReadyState() {
        return page.evaluate(function() {
            return document.readyState === 'complete';
        });
    }

    function isAdrapid() {
        return page.evaluate(function() {
            return typeof timeline !== 'undefined';
        });
    }

    function seekAdRapid(ms) {
        return page.evaluate(function(ms) {
            return timeline.seek(ms/1000).stop();
        }, ms);
    }

    function getElapsedTime() {
        return Date.now() - startTime;
    }

    function beginRenderAndExit() {
        successCallbacks += 1;
        if (successCallbacks == 1) {
            clearTimeout(dynamicRenderTimeout);
            waitForFrameToRender();
        }
    }

    // Wait for frame to solve the about:blank frame access complaint
    function waitForFrameToRender(interval) {
        if (typeof interval === 'undefined') {
            interval = minimumWaitingTime;
        }

        log('Waiting for frame (' + interval + 'ms)...');

        setTimeout(function () {
            renderAndExit();
        }, interval);
    }

    function renderAndExit() {
        log('Waiting to start rendering...');
        if (opts.cropWidth && opts.cropHeight) {
            log("Cropping...");
            page.clipRect = {
                top: opts.cropOffsetTop,
                left: opts.cropOffsetLeft,
                width: opts.cropWidth,
                height: opts.cropHeight
            };
        }

        var renderOpts = {
            quality: opts.fileQuality,
            format:'png'
        };

        var oldOpts = {
            fileQuality: opts.fileQuality,
            // quality: opts.fileQuality, // required! will fall back to 75 quality (phantom default) unless specified
            quality: 100, // force 100% jpeg quality
            fileType: 'png',
        };

        if (opts.fileType) {
            log("Adjusting File Type...");
            renderOpts.format = opts.fileType;
            oldOpts.fileType = opts.fileType;
        }

        elapsedTime = getElapsedTime();
        waitBeforeRender = Number(opts.requestTimeout);        

        if(isAdRapid) {
            log('AdRapid banner, seeking to ' + waitBeforeRender + ' ...');
            seekAdRapid(waitBeforeRender); // navigate in timeline in the banner
            waitBeforeRender = 0; // since we do not need to wait manually, reset the waiting timeout
        }

        log('Waiting ' + waitBeforeRender + 'ms before rendering image...');
        log(color.yellow('DEBUG:'), 'Should grab screenshot at', (elapsedTime + waitBeforeRender) + 'ms');

        waitInterval = setInterval(function() {
            log('...still waiting...');
        }, 1000);

        var count = 0;
        setInterval(function () {
            clearTimeout(waitInterval); // stop outputting 'still waiting' messages
            beginRenderingTime = getElapsedTime();
            log('...timeout completed, starting rendering image...');

            if (count > opts.maxTimeout / opts.requestTimeout) {
                log('timeout.');
                exit(1);
            }

            if (page.render(opts.filePath, renderOpts) || page.render(opts.filePath, oldOpts)) {
                elapsedTime = getElapsedTime();
                page.close();

                log('Done rendering image:', opts.filePath);
                log(color.yellow('DEBUG:'), 'PhantomJS rendering time', (elapsedTime - beginRenderingTime), 'ms');

                exit();
            }

            log(color.yellow('DEBUG:'), 'Total processing time:', getElapsedTime(), 'ms');
            log('All done, exiting PhantomJS');

            count++;
        }, waitBeforeRender);
    }
}
//custom exit function
function exit(code) {
    setTimeout(function () {
        phantom.exit(code);
    }, 0);
    phantom.onError = function () {
    };
}

function isString(value) {
    return typeof value == 'string'
}
main();
