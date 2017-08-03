define(function(require, exports, module) {
    main.consumes = ["Plugin", "language","settings","preferences"];
    main.provides = ["ccomplete"];
    return main;
    
    //this function runs once as the ide starts. Responsible for setting plugin's load/unload behavior
    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var plugin = new Plugin("CS50.net", main.consumes);
        var language = imports.language;
        var settings = imports.settings;
        var preferences = imports.preferences;
        
        /////
        //import and format the raw data about each function
        /////
        //function_details holds the raw data about each function we want to show up in the autocmplete suggestions
        var function_details=JSON.parse(require("text!./function_details.json"));
        
        //massage the raw data to include derived fields that c9 cares about
        //  ideally, this is done earlier in the pipeline
        function_details.forEach(function(cur_obj){
            cur_obj.id           = cur_obj.fun_name;
            cur_obj.name         = cur_obj.fun_name+"()";
            cur_obj.replaceText  = cur_obj.fun_name+"(^^)";
            cur_obj.icon         ="method";
            cur_obj.meta         = cur_obj.library_name+".h";
            cur_obj.docHead      = cur_obj.signature;
            cur_obj.priority     = 1;
            cur_obj.isContextual = true;
            cur_obj.doc          = '<p>' + cur_obj.description  + '</p>\
                                    <p>' + cur_obj.return_value + '</p>\
                                    <p><a href="https://reference.cs50.net/'+[cur_obj.library_name,cur_obj.fun_name].join("/")+ '" target="_blank">More...</a></p>';
        });
        
        /////
        // helper functions
        /////
        //helper function defining the data we send to the worker regarding user settngs [i.e. the less/more comfy view]
        function sendSettings(handler) {
            handler.emit("set_comfy_config", {
                lessComfy: settings.get("user/cs50/simple/@lessComfortable"),
                enabled: settings.get("project/C/@completion")
            } );
        }
        
        //helper function defining the data we send to the worker regarding autcomplete suggestions
        function sendAutocompleteData(handler) {
            handler.emit("send_dataset", {suggestion_data:function_details} );
        }
        
        //helper function defining how to spin up the worker thread and define its communication with the main thread
        // called either when user turns on completion, or when the plugin starts (and notices completion option is on)
        function registerUs(){
            language.registerLanguageHandler(
                "plugins/ccomplete.language/worker/ccomplete_handler",
                function(err, our_worker) {
                    if (err) {
                        return err;
                    }
                    
                    //send over the formatted function data and whether the user is currently in less/more comfy view
                    sendAutocompleteData(our_worker);
                    sendSettings(our_worker);
                    
                    //listen for changes to less/more comfy view and re-send if updated
                    settings.on("user/cs50/simple/@lessComfortable", sendSettings.bind(null, our_worker), plugin);
                    settings.on("project/C/@completion", sendSettings.bind(null, our_worker), plugin);
                },
                plugin //lets c9 keep track of who owns the handler
            );
        }
        
        
        /////
        // Event functions
        /////
        //runs when the plugin is loaded (plugins may load multiple times, e.g. if disabled and re-enabled in the plugin explorer)
        plugin.on("load", function(){
            
            ///
            // add and configure new menu settings
            ///
            //  note that this code beahves the same whether in here or out in main() [8/2/2017], and the latter feels cleaner.
            //  Leaving it in here to match the python/go/php examples, but it's very unclear which is better long-term
            
            //add a switch for c completion being on/off
            preferences.add({
                    "Project": {
                        "C": {
                            position: 1100,
                            "Enable C code completion": {
                                position: 1000,
                                type: "checkbox",
                                path: "project/C/@completion",
                            }
                        }
                    }
            }, plugin);
            
            //the new menu item defaults to off
            settings.on("read", function(e) {
                    settings.setDefaults("project/C", [
                        ["completion", false]
                    ]);
            }, plugin);
            
            //we need to listen to completion going on/off, as that means we need to register our handler,
            //but we don't care about less/more comfy at this time.
            settings.on(
                "project/C/@completion",
                function(enabled){
                    if (enabled) {
                        registerUs();
                    }else{
                        language.unregisterLanguageHandler("plugins/ccomplete.language/worker/ccomplete_handler");
                    }
                },
                plugin
            );
            
            ///
            // if completion is turned on, register
            ///
            enabled=settings.get("project/C/@completion");
            if (enabled){
                //sign in our worker code as a language-handling plugin
                registerUs();
            }else{
                //do nothing -- registering, even with no return values would enable c9's janky wordsearch-based completion
            }
        });
        
        //define unload behavior [unregister things, clear global variables]
        plugin.on("unload", function() {
            language.unregisterLanguageHandler("plugins/ccomplete.language/worker/ccomplete_handler");
        });
        
        //register the plugin's name
        register(null, { ccomplete: plugin });
    }
});