// PhantomJS script
// Takes screenshot of a given page. This correctly handles pages which
// dynamically load content making AJAX requests.

// Instead of waiting fixed amount of time before rendering, we give a short
// time for the page to make additional requests. (abstracted)

// Phantom internals
var system = require('system');
var webPage = require('webpage');

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
    };

    renderPage(opts);

}

function renderPage(opts) {
    var startTime = Date.now();
    var requestCount = 0;
    var forceRenderTimeout;
    var dynamicRenderTimeout;
    var firstResponseFlag = false;
    var pageReadyState = false;
    var htmlLoadedTime;
    var pageReadyTime;
    var beginRenderingTime;
    var waitBeforeRender = 0;
    var minimumWaitingTime = 500;
    var waitInterval;
    var successCallbacks = 0;
    var page = webPage.create();
    
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
      log('CONSOLE: ' + msg + ' (from line #' + lineNum + ' in "' + sourceId + '")');
    };

    page.onResourceRequested = function (request) {
        log('->', request.method, request.url);
        requestCount += 1;
        clearTimeout(dynamicRenderTimeout);
    };

    page.onResourceReceived = function (response) {
        log('<-', response.status, response.url);
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

    page.open(opts.url);


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

            if(opts.timestamps === 'true') str = (getElapsedTime() / 1000).toFixed(3) + ': ' + str;

            console.log(str);
        }
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
            fileType: 'png',
        };

        if (opts.fileType) {
            log("Adjusting File Type...");
            renderOpts.format = opts.fileType;
            oldOpts.fileType = opts.fileType;
        }

        elapsedTime = getElapsedTime();
        waitBeforeRender = Number(opts.requestTimeout);        

        log('Waiting ' + waitBeforeRender + 'ms before rendering image...');
        log('DEBUG:', 'Should grab screenshot at', (elapsedTime + waitBeforeRender) + 'ms');

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
                log('DEBUG:', 'PhantomJS rendering time', (elapsedTime - beginRenderingTime), 'ms');

                exit();
            }

            log('DEBUG:', 'Total processing time:', getElapsedTime(), 'ms');            
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
