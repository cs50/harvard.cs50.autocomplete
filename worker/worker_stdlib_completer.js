// note that a language plugin has one or more 'workers' that run in separate threads
// so as to not hang the main window. This defines the behavior for the autocomplete worker 

define(function(require, exports, module) {
    var baseHandler = require("plugins/c9.ide.language/base_handler");
    var handler = module.exports = Object.create(baseHandler);
    
    var jsonalyzer_worker = require("plugins/c9.ide.language.jsonalyzer/worker/jsonalyzer_worker");
    var localCompleter = require("plugins/c9.ide.language.generic/local_completer");
    var openFilesCompleter = require("plugins/c9.ide.language.generic/open_files_local_completer");
    
    // global flag for whether the user is in less/more comfy view -- will be used to modify what page the student sees
    var less_comfy;
    // global holding the details of each libraey function autocomplete might suggest
    var suggestion_data;
    // how long (miliseconds) to wait before poping up the completion suggestions
    var box_delay;
    
    // declare that we run on C and C++ files
    handler.handlesLanguage = function(language) {
        return language === "c_cpp";
    };
    
    // runs when the worker is first set up
    handler.init = function(callback) {
        
        // absolute monkeyhack to disable the local completers (I can't believe JS allows this...)
        openFilesCompleter.complete = function(doc, fullAst, pos, options, callback) {
            callback(null, []);
        };
        localCompleter.complete = function(doc, fullAst, pos, options, callback) {
            callback(null, []);
        };
        jsonalyzer_worker.complete = function(doc, fullAst, pos, options, callback) {
            callback(null, []);
        };
        
        // when new options data is sent, update
        var emitter = handler.getEmitter();
        emitter.on("set_options", function(e) {
            less_comfy = e.lessComfy;
            enabled = e.enabled;
            box_delay = e.delay;
        });
        
        // when send dataset occurs, update the suggestion data
        emitter.on("send_dataset", function(e) {
            suggestion_data = e.suggestion_data;
        });
        callback();
    };
    
    // sets when to attempt a completion
    handler.getCompletionRegex = function() {
        // attempt to complete whenever cursor is on a word boundary
        return /^\w$/;
    };
    
    // sends completeion suggestions back to the main window
    handler.complete = function(doc, ast, pos, options, callback) {
        // if we're turned off, do nothing
        // this is the behavior used in the reference implementations, and gets us back to word-search suggestions,
        // but not a truly disabled autocomplete.
        console.log("########message in");
        setTimeout(
            function() {
                if (!enabled) {
                    return callback();
                }
                // var line = doc.getLine(pos.row);
                // var identifier = options.identifierPrefix; // current var name
                
                // we always send back the full list of stdlib functions
                callback(null, suggestion_data);
            },
            box_delay
        );
    };
    
});