// note that a language plugin has one or more 'workers' that run in separate threads
// so as to not hang the main window. This defines the behavior for the autocomplete worker 

define(function(require, exports, module) {
    var baseHandler = require("plugins/c9.ide.language/base_handler");
    var handler = module.exports = Object.create(baseHandler);
    
    //global flag for whether the user is in less/more comfy view
    var less_comfy;
    //global holding the details of each function autocomplete might suggest
    var suggestion_data;
    
    //declare that we run on C and C++ files
    handler.handlesLanguage = function(language) {
        return language === "c_cpp";
    };
    
    //runs when the worker is first set up
    handler.init = function(callback) {
        var emitter = handler.getEmitter();
        //when set comfy config is sent, update the more/less comfy flag
        emitter.on("set_comfy_config", function(e) {
            less_comfy = e.lessComfy;
            enabled = e.enabled;
        });
        //when send dataset occurs, update the suggestion data
        emitter.on("send_dataset", function(e) {
            suggestion_data = e.suggestion_data;
        });
        callback();
    };
    
    //sets when to attempt a completion
    handler.getCompletionRegex = function() {
        // attempt to complete whenever cursor is on a word boundary
        return /^\w$/; 
    };
    
    //sends completeion suggestions back to the main window
    handler.complete = function(doc, ast, pos, options, callback) {
        //if we're turned off, do nothing
        // this is the behavior used in the reference implementations, and gets us back to word-search suggestions,
        // but not a truly disabled autocomplete.
        console.log("######enabled")
        console.log(enabled)
        if (!enabled) {
            return callback();
        }
        //var line = doc.getLine(pos.row);
        //var identifier = options.identifierPrefix; //current var name
        
        //we always send back the full list of stdlib functions
        callback(null, suggestion_data);
    };
    
    //runs on updates to the code; meant to display wanrings,errors, etc in the gutter
    handler.analyze = function(value, ast, callback) {
        callback(null, [{
            pos: { sl: 0, el: 0, sc: 0, ec: 0 },
            type: "info",
            message: "You are in " + (less_comfy? "Less" : "More") + " Comfy mode"
        }]);
    };
});