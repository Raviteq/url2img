// module.js - example for defining custom callback functions

// define how to determine page ready state using a 
// custom callback function
exports.callback = function (page) { // <- receives the page var
    return page.evaluate(function() {
      // Add a test for determining readystate here.
      // It should return true if the page is ready, 
      // For now we simply check the document readystate.
      return document.readyState === 'complete';
    });
}

// a function called 'init' may be used for any script
// injection before the timers are started.
exports.init = function () {
  console.log('MODULE: Executing init callback function');
}

// a function called 'complete' may be used to manipulate the HTML
// after it has finished loading
exports.complete = function() {
  console.log('MODULE: Executing complete callback function');
}
